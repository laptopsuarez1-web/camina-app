// Alta del panel de comercios sin confirmar el correo antes, y verificación del correo después.
//   - signup: crea la cuenta ya confirmada (la persona entra directo) y le manda un correo para verificar el correo.
//             Si ese correo ya tiene cuenta, no toca nada: responde { exists: true } (el panel lo manda a elegir clave por correo).
//   - verify_code: con la sesión, valida el código de 6 números que llegó al correo (5 intentos, 30 minutos).
//   - verify: marca el correo como verificado con el código del link. No pide sesión (se abre desde el correo).
//   - resend: con la sesión de quien está en el panel, manda otra vez el correo de verificación.
// Secrets: RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO (los mismos que business-email).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function correo(codigo: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#F7F3FC;font-family:Arial,Helvetica,sans-serif;color:#291C47">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<img src="https://caminaapp.com/camina-logo.png" width="64" height="64" alt="Camina" style="display:block;border-radius:32px;margin:0 0 18px">
<div style="background:#fff;border:1px solid #E1D2F5;border-radius:16px;padding:22px">
<h1 style="font-size:20px;margin:0 0 12px">Verifica tu correo</h1>
<p style="font-size:14px;line-height:21px;margin:0 0 12px">Ya puedes usar el panel de tu comercio. Escribe este código en el panel, en Mi cuenta, para verificar que este correo es tuyo:</p>
<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:6px 0 12px;color:#241748">${esc(codigo)}</p>
<p style="font-size:13px;line-height:19px;margin:0;color:#7C6A9C">El código dura 30 minutos.</p>
</div>
<p style="font-size:12px;color:#7C6A9C;margin:16px 4px 0">¿Dudas? Escribinos por WhatsApp al +591 62714286.</p>
</div></body></html>`;
  const text = `Verifica tu correo\n\nYa puedes usar el panel de tu comercio. Escribe este código en el panel, en Mi cuenta, para verificar que este correo es tuyo:\n\n${codigo}\n\nEl código dura 30 minutos.\n\n¿Dudas? Escribinos por WhatsApp al +591 62714286.`;
  return { html, text };
}

async function mandar(to: string, codigo: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;
  const { html, text } = correo(codigo);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? 'Camina <onboarding@resend.dev>',
      to: [to],
      subject: `${codigo} es tu código para verificar tu correo en Camina`,
      html,
      text,
      reply_to: Deno.env.get('EMAIL_REPLY_TO') ?? 'soporte@caminaapp.com',
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let body: { action?: string; email?: string; password?: string; token?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Pedido inválido' }, 400);
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const panelUrl = (Deno.env.get('PANEL_URL') ?? req.headers.get('origin') ?? 'https://caminaapp.com').replace(/\/$/, '');

  async function nuevoCodigo(userId: string, email: string) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const codigo = String(n).padStart(6, '0');
    const { error } = await admin.from('panel_email_verifications').insert({ user_id: userId, email, code: codigo });
    return error ? null : codigo;
  }

  if (body.action === 'signup') {
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    if (!EMAIL.test(email)) return json({ error: 'Ese correo no parece válido.' }, 400);
    if (password.length < 8) return json({ error: 'La contraseña tiene que tener al menos 8 caracteres.' }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      if (error && /already|registered|exists/i.test(error.message)) return json({ exists: true });
      return json({ error: 'No pudimos crear la cuenta. Intenta de nuevo.' }, 500);
    }
    const codigo = await nuevoCodigo(data.user.id, email);
    const sent = codigo ? await mandar(email, codigo) : false;
    return json({ ok: true, sent });
  }

  if (body.action === 'verify') {
    const token = (body.token ?? '').trim();
    if (!UUID.test(token)) return json({ error: 'El link no es válido.' }, 400);
    const { data: fila } = await admin
      .from('panel_email_verifications')
      .select('token, verified_at')
      .eq('token', token)
      .maybeSingle();
    if (!fila) return json({ error: 'El link no es válido o ya venció.' }, 400);
    if (!fila.verified_at) await admin.from('panel_email_verifications').update({ verified_at: new Date().toISOString() }).eq('token', token);
    return json({ ok: true });
  }

  if (body.action === 'verify_code') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sin sesión' }, 401);
    const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await caller.auth.getUser();
    const user = data.user;
    if (!user?.email) return json({ error: 'Sesión inválida' }, 401);
    const codigo = (body.code ?? '').replace(/\D/g, '');
    if (codigo.length !== 6) return json({ ok: false, error: 'El código tiene 6 números.' });
    const { data: fila } = await admin
      .from('panel_email_verifications')
      .select('token, code, attempts, created_at, verified_at')
      .eq('user_id', user.id)
      .ilike('email', user.email)
      .not('code', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fila) return json({ ok: false, error: 'Primero pide un código.' });
    if (fila.verified_at) return json({ ok: true });
    if (Date.now() - new Date(fila.created_at).getTime() > 30 * 60_000) return json({ ok: false, error: 'El código venció. Pide uno nuevo.' });
    if (fila.attempts >= 5) return json({ ok: false, error: 'Demasiados intentos. Pide un código nuevo.' });
    if (fila.code !== codigo) {
      await admin.from('panel_email_verifications').update({ attempts: fila.attempts + 1 }).eq('token', fila.token);
      return json({ ok: false, error: 'Ese código no es correcto.' });
    }
    await admin.from('panel_email_verifications').update({ verified_at: new Date().toISOString() }).eq('token', fila.token);
    return json({ ok: true });
  }

  if (body.action === 'resend') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sin sesión' }, 401);
    const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await caller.auth.getUser();
    const user = data.user;
    if (!user?.email) return json({ error: 'Sesión inválida' }, 401);
    // Se limita a un correo por minuto por cuenta.
    const { data: ultima } = await admin
      .from('panel_email_verifications')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ultima && Date.now() - new Date(ultima.created_at).getTime() < 60_000) return json({ ok: true, sent: false, wait: true });
    const codigo = await nuevoCodigo(user.id, user.email);
    const sent = codigo ? await mandar(user.email, codigo) : false;
    return json({ ok: true, sent });
  }

  return json({ error: 'Pedido desconocido' }, 400);
});
