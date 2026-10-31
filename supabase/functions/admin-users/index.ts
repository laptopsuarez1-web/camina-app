// Acciones del equipo de Camina sobre cuentas: banear, desbanear y eliminar.
// Vive en una Edge Function porque banear o borrar un usuario de auth necesita la service role key.
// Quién llama se verifica acá, en el servidor: el JWT tiene que ser de alguien en app_admins (is_admin()).
// Un admin no puede actuar sobre sí mismo ni sobre otro admin.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ~100 años: Supabase no tiene "ban permanente", se usa una duración enorme.
const BAN_FOREVER = '876000h';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Sin sesión' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const callerClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: caller, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller.user) return json({ error: 'Sesión inválida' }, 401);

  const { data: isAdmin } = await callerClient.rpc('is_admin');
  if (isAdmin !== true) return json({ error: 'Solo el equipo de Camina puede hacer esto.' }, 403);

  let body: { action?: string; user_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Pedido inválido' }, 400);
  }
  const { action, user_id: target } = body;
  if (!target || !['ban', 'unban', 'delete'].includes(action ?? '')) return json({ error: 'Pedido inválido' }, 400);
  if (target === caller.user.id) return json({ error: 'No puedes hacer esto sobre tu propia cuenta.' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: targetIsAdmin } = await admin.from('app_admins').select('user_id').eq('user_id', target).maybeSingle();
  if (targetIsAdmin) return json({ error: 'No se puede actuar sobre otra cuenta de administración.' }, 400);

  if (action === 'ban') {
    const reason = (body.reason ?? '').trim().slice(0, 300) || null;
    const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: BAN_FOREVER });
    if (error) return json({ error: error.message }, 500);
    await admin.from('profiles').update({ banned_at: new Date().toISOString(), ban_reason: reason, suspended: true, photo_url: null }).eq('id', target);
    await admin.rpc('admin_revoke_sessions', { p_user: target });
    return json({ ok: true });
  }

  if (action === 'unban') {
    const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: 'none' });
    if (error) return json({ error: error.message }, 500);
    await admin.from('profiles').update({ banned_at: null, ban_reason: null, suspended: false }).eq('id', target);
    return json({ ok: true });
  }

  // delete: mismo recorrido que delete-account / delete-business-account, pero sobre otra persona.
  const { data: avatarFiles } = await admin.storage.from('avatars').list(target);
  if (avatarFiles && avatarFiles.length > 0) await admin.storage.from('avatars').remove(avatarFiles.map((f) => `${target}/${f.name}`));
  const { data: owned } = await admin.from('businesses').select('id').eq('owner_user_id', target);
  for (const b of owned ?? []) {
    const { data: files } = await admin.storage.from('business-logos').list(b.id);
    if (files && files.length > 0) await admin.storage.from('business-logos').remove(files.map((f) => `${b.id}/${f.name}`));
  }
  // owner_user_id es "on delete set null": sin borrar el comercio a mano quedaría huérfano en la app.
  await admin.from('businesses').delete().eq('owner_user_id', target);
  const { error } = await admin.auth.admin.deleteUser(target);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
