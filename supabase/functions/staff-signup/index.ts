// Alta de un cajero invitado, sin confirmar el correo.
// El link del correo de invitación trae el correo y un código (el id de la invitación, imposible de adivinar).
// Si coinciden con una invitación que todavía nadie usó, se crea la cuenta ya confirmada y la persona entra directo.
// Sin ese código no se crea nada: el alta normal (con confirmación de correo) sigue siendo la de /unirme sin link.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let body: { email?: string; password?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Pedido inválido' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const token = (body.token ?? '').trim();
  if (!email || !UUID.test(token)) return json({ error: 'El link de la invitación no es válido.' }, 400);
  if (password.length < 8) return json({ error: 'La contraseña tiene que tener al menos 8 caracteres.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: invite } = await admin
    .from('business_staff')
    .select('id, email, user_id')
    .eq('id', token)
    .maybeSingle();
  if (!invite || invite.email.toLowerCase() !== email) return json({ error: 'El link de la invitación no es válido.' }, 400);
  if (invite.user_id) return json({ exists: true });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    // Ya existía una cuenta con ese correo (por ejemplo, de la app): con la invitación se le pone la contraseña elegida.
    if (/already|registered|exists/i.test(error.message)) {
      // Si esa cuenta quedó a medias (nunca confirmó el correo), con la invitación se confirma y se le pone la contraseña elegida.
      for (let page = 1; page <= 20; page++) {
        const { data: lista } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const users = lista?.users ?? [];
        const u = users.find((x) => x.email?.toLowerCase() === email);
        if (u) {
          // La invitación (código secreto que solo llegó a ese correo) prueba que la persona es dueña del correo:
          // se confirma la cuenta si hacía falta y se le pone la contraseña elegida. Nunca a dueños de comercio ni admins.
          const { data: dueno } = await admin.from('businesses').select('id').eq('owner_user_id', u.id).maybeSingle();
          const { data: esAdmin } = await admin.from('app_admins').select('user_id').eq('user_id', u.id).maybeSingle();
          if (dueno || esAdmin) return json({ exists: true });
          await admin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
          return json({ ok: true });
        }
        if (users.length < 1000) break;
      }
      return json({ exists: true });
    }
    return json({ error: 'No pudimos crear la cuenta. Intenta de nuevo.' }, 500);
  }
  return json({ ok: true });
});
