// Envía las notificaciones encoladas en notifications_outbox a través de la
// API de push de Expo. Se dispara de dos formas:
//   1) Database Webhook en insert sobre notifications_outbox (recomendado,
//      ver README de supabase/ para el paso de configuración en el dashboard)
//      — llega con { type: "INSERT", table: "...", record: {...} }.
//   2) Invocación manual/cron sin body — en ese caso procesa en batch todo lo
//      que esté pendiente (sent_at is null), como red de seguridad por si el
//      webhook no se configuró o falló una entrega puntual.
//
// Requiere las env vars que Supabase inyecta automático en toda Edge Function
// (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) y, opcionalmente, PUSH_WEBHOOK_SECRET
// si se configuró un secret en el Database Webhook (recomendado en producción
// para que no cualquiera pueda pegarle a este endpoint).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_LIMIT = 50;

interface OutboxRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (webhookSecret) {
    const provided = req.headers.get('x-webhook-secret');
    if (provided !== webhookSecret) {
      return new Response('No autorizado', { status: 401 });
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let rows: OutboxRow[] = [];

  let payload: { record?: OutboxRow } | null = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  if (payload?.record) {
    rows = [payload.record];
  } else {
    const { data, error } = await supabase
      .from('notifications_outbox')
      .select('id, user_id, title, body, data')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    rows = data ?? [];
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: tokenRows, error: tokenError } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokenRows ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  const messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }> = [];
  for (const row of rows) {
    const tokens = tokensByUser.get(row.user_id) ?? [];
    for (const token of tokens) {
      messages.push({ to: token, title: row.title, body: row.body, data: row.data ?? {} });
    }
  }

  // Expo admite hasta 100 mensajes por llamada. Si una llamada falla, no se marcan como enviadas
  // las filas para reintentarlas en la próxima corrida; los tokens inválidos se borran.
  let failed = false;
  const deadTokens: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        failed = true;
        continue;
      }
      const body = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
      (body.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') deadTokens.push(chunk[idx].to);
      });
    } catch {
      failed = true;
    }
  }
  if (deadTokens.length > 0) await supabase.from('push_tokens').delete().in('token', deadTokens);

  if (failed) {
    return new Response(JSON.stringify({ error: 'Expo no respondió bien; se reintenta', pushes: messages.length }), { status: 502 });
  }

  const ids = rows.map((r) => r.id);
  await supabase.from('notifications_outbox').update({ sent_at: new Date().toISOString() }).in('id', ids);

  return new Response(JSON.stringify({ sent: rows.length, pushes: messages.length }), { status: 200 });
});
