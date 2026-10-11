// Correos del panel de comercios. Lo llama el panel (con la sesión de quien hace la acción) y
// manda el mail con Resend:
//   - new_business / resubmitted: el dueño se registró o corrigió su local -> aviso a los admins.
//   - approved / rejected: un admin aprobó o rechazó el local -> aviso al dueño (con el motivo).
//   - staff_invite: el dueño invitó a un cajero -> mail al cajero con el link para crear su cuenta.
//
// Secrets: RESEND_API_KEY (sin ella no se manda nada y responde { sent: false }), EMAIL_FROM
// (ej. "Camina <comercios@camina.app>", dominio verificado en Resend) y PANEL_URL (ej.
// "https://panel.camina.app"; si falta se usa el Origin de la llamada).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Tipo = 'new_business' | 'resubmitted' | 'approved' | 'rejected' | 'staff_invite';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function plantilla(titulo: string, parrafos: string[], boton?: { texto: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F7F3FC;font-family:Arial,Helvetica,sans-serif;color:#291C47">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<p style="font-weight:800;letter-spacing:1px;color:#241748;margin:0 0 18px">CAMINA</p>
<div style="background:#fff;border:1px solid #E1D2F5;border-radius:16px;padding:22px">
<h1 style="font-size:20px;margin:0 0 12px">${esc(titulo)}</h1>
${parrafos.map((p) => `<p style="font-size:14px;line-height:21px;margin:0 0 12px">${p}</p>`).join('')}
${boton ? `<a href="${esc(boton.url)}" style="display:inline-block;margin-top:6px;background:#241748;color:#7FEDC4;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">${esc(boton.texto)}</a>` : ''}
</div>
<p style="font-size:12px;color:#7C6A9C;margin:16px 4px 0">¿Dudas? Escribinos por WhatsApp al +591 62714286.</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Sin sesión' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Camina <onboarding@resend.dev>';
  const panelUrl = (Deno.env.get('PANEL_URL') ?? req.headers.get('origin') ?? '').replace(/\/$/, '');

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await caller.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Sesión inválida' }, 401);

  let body: { type?: Tipo; business_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Pedido inválido' }, 400);
  }
  const { type, business_id: businessId } = body;
  if (!type || !businessId) return json({ error: 'Faltan datos' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, owner_user_id, category, city, address, phone, rejection_reason, approved')
    .eq('id', businessId)
    .maybeSingle();
  if (!business) return json({ error: 'Comercio no encontrado' }, 404);

  const { data: isAdminRow } = await admin.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  const esAdmin = !!isAdminRow;
  const esDueno = business.owner_user_id === user.id;

  const nombre = esc(business.name);
  let to: string[] = [];
  let subject = '';
  let html = '';

  if (type === 'new_business' || type === 'resubmitted') {
    if (!esDueno) return json({ error: 'No autorizado' }, 403);
    const { data: admins } = await admin.from('app_admins').select('user_id');
    for (const a of admins ?? []) {
      const { data } = await admin.auth.admin.getUserById(a.user_id);
      if (data.user?.email) to.push(data.user.email);
    }
    const nuevo = type === 'new_business';
    subject = nuevo ? `Nuevo comercio para revisar: ${business.name}` : `${business.name} corrigió su ficha`;
    html = plantilla(
      nuevo ? 'Se registró un comercio nuevo' : 'Un comercio volvió a enviar su ficha',
      [
        `<strong>${nombre}</strong> · ${esc(business.category ?? '')} · ${esc(business.city ?? 'Tarija')}`,
        `${esc(business.address ?? 'Sin dirección')} · ${esc(business.phone ?? 'sin teléfono')}`,
        nuevo ? 'Está esperando que lo revises.' : 'Corrigió lo que le pediste y espera otra revisión.',
      ],
      panelUrl ? { texto: 'Revisarlo en el panel', url: `${panelUrl}/admin` } : undefined
    );
  } else if (type === 'approved' || type === 'rejected') {
    if (!esAdmin) return json({ error: 'No autorizado' }, 403);
    if (!business.owner_user_id) return json({ ok: true, sent: false });
    const { data } = await admin.auth.admin.getUserById(business.owner_user_id);
    if (data.user?.email) to = [data.user.email];
    if (type === 'approved') {
      subject = '¡Tu comercio ya está en Camina!';
      html = plantilla(
        '¡Tu comercio ya está publicado! 🎉',
        [
          `Revisamos <strong>${nombre}</strong> y ya aparece en el mapa y en la lista de la app.`,
          'Desde el panel podés ver tus canjes, validar los códigos de tus clientes y sumar más beneficios.',
        ],
        panelUrl ? { texto: 'Entrar al panel', url: `${panelUrl}/inicio` } : undefined
      );
    } else {
      subject = 'Revisamos tu comercio: falta corregir algo';
      html = plantilla(
        'Todavía no podemos publicar tu comercio',
        [
          `Revisamos <strong>${nombre}</strong> y hay algo para corregir antes de publicarlo:`,
          `<em>${esc(business.rejection_reason ?? '')}</em>`,
          'Corregilo desde Perfil del local y tocá "Ya lo corregí, volver a enviar". Lo revisamos de nuevo enseguida.',
        ],
        panelUrl ? { texto: 'Corregir mi ficha', url: `${panelUrl}/perfil` } : undefined
      );
    }
  } else if (type === 'staff_invite') {
    if (!esDueno) return json({ error: 'No autorizado' }, 403);
    const email = (body.email ?? '').trim().toLowerCase();
    // Solo a un correo que el dueño ya cargó como cajero de este comercio.
    const { data: staff } = await admin
      .from('business_staff')
      .select('id')
      .eq('business_id', businessId)
      .eq('email', email)
      .maybeSingle();
    if (!staff) return json({ error: 'Ese correo no está invitado' }, 400);
    to = [email];
    subject = `${business.name} te invitó a validar canjes en Camina`;
    html = plantilla(
      'Te invitaron como cajero',
      [
        `<strong>${nombre}</strong> te sumó a su equipo en Camina para que valides los códigos de los clientes.`,
        'Creá tu cuenta con este mismo correo (es gratis y tarda un minuto). Después entrás directo a la pantalla de canjes.',
      ],
      panelUrl ? { texto: 'Crear mi cuenta de cajero', url: `${panelUrl}/unirme?email=${encodeURIComponent(email)}` } : undefined
    );
  } else {
    return json({ error: 'Tipo desconocido' }, 400);
  }

  if (!resendKey || to.length === 0) return json({ ok: true, sent: false });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) return json({ ok: false, sent: false, error: await res.text() }, 502);
  return json({ ok: true, sent: true });
});
