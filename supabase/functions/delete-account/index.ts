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
import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

// Cuentas creadas con "Iniciar sesión con Apple": Apple exige que al borrar la cuenta se revoque el
// permiso que la persona le dio a la app (https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens).
// La app manda un código de autorización recién pedido a Apple; acá se cambia por un token y se revoca.
// Necesita los secretos APPLE_TEAM_ID, APPLE_KEY_ID y APPLE_PRIVATE_KEY (llave .p8 con "Sign in with Apple").
// Es best-effort: si falta algo o Apple falla, la cuenta se borra igual (borrarla es lo que no puede fallar).
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') ?? 'bo.camina.app';

async function appleClientSecret() {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!teamId || !keyId || !privateKey) return null;
  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(APPLE_CLIENT_ID)
    .sign(key);
}

async function revokeAppleToken(authorizationCode: string) {
  const clientSecret = await appleClientSecret();
  if (!clientSecret) {
    console.warn('delete-account: faltan los secretos de Apple, no se revocó el token');
    return;
  }
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    console.warn('delete-account: Apple no aceptó el código', tokenRes.status, await tokenRes.text());
    return;
  }
  const tokens = await tokenRes.json();
  const token = tokens.refresh_token ?? tokens.access_token;
  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }),
  });
  if (!revokeRes.ok) {
    console.warn('delete-account: Apple no revocó el token', revokeRes.status, await revokeRes.text());
  }
}

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

  const body = await req.json().catch(() => ({}));
  const appleAuthorizationCode = typeof body?.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  if (appleAuthorizationCode) {
    try {
      await revokeAppleToken(appleAuthorizationCode);
    } catch (e) {
      console.warn('delete-account: error al revocar el token de Apple', e);
    }
  }

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
