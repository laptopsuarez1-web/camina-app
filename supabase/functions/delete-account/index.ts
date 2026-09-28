// Borra la cuenta del usuario que llama, de punta a punta — lo exige Apple
// (App Store Review Guideline 5.1.1(v)) para cualquier app que permite crear
// cuenta: tiene que poder borrarse desde adentro de la app, no solo por
// pedido a soporte.
//
// auth.admin.deleteUser requiere la service role key (no se puede hacer desde
// el cliente con el anon key), por eso esto vive en una Edge Function. Borrar
// el usuario de auth.users dispara el "on delete cascade" de profiles y, en
// cadena, de steps_daily / points_ledger / redemptions / group_members /
// group_notes / referrals / push_tokens / notifications_outbox — no hace
// falta borrar cada tabla a mano.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Sin sesión' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Cliente "como el usuario": valida el JWT y nos dice quién es, sin que el
  // usuario pueda mandar un id ajeno en el body y borrar a otra persona.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });
  }
  const userId = userData.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Best-effort: borrar archivos en Storage (avatars/<user_id>/...) — no
  // están enlazados por FK, así que el cascade de auth.users no los toca.
  const { data: avatarFiles } = await adminClient.storage.from('avatars').list(userId);
  if (avatarFiles && avatarFiles.length > 0) {
    await adminClient.storage.from('avatars').remove(avatarFiles.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
