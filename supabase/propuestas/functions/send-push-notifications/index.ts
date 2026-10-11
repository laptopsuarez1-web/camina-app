// PROPUESTA (no desplegada): versión corregida de supabase/functions/send-push-notifications/index.ts
// Hallazgos: SEC-12 (secreto opcional / confianza en el body) y CR-10 (reintentos y duplicados). Explicación completa en supabase/propuestas/README.md.
//
// Envía las notificaciones encoladas en notifications_outbox a través de la API de push de Expo. Se dispara de dos formas:
//   1) Database Webhook / trigger notify_send_push en insert sobre notifications_outbox — llega con { type: "INSERT", table: "...", record: {...} }.
//   2) Invocación manual/cron sin body — procesa en batch todo lo pendiente (sent_at is null), como red de seguridad.
//
// QUÉ CAMBIA respecto de la versión viva:
//   * SEC-12 (a): el secreto PUSH_WEBHOOK_SECRET deja de ser opcional. Si no está definido o no coincide, la función responde sin enviar nada
//     (401 si no coincide, 500 si falta la variable). Se compara en tiempo constante.
//   * SEC-12 (b): en la ruta "record" ya NO se confía en el contenido del body (usuario, título, texto). Solo se usa el id, y la fila se vuelve a leer de la
//     base (solo si sigue pendiente). Así, aunque alguien conociera el secreto, no puede inventar destinatario ni texto.
//   * CR-10 (a): si falla un lote hacia Expo, solo se dejan pendientes las filas que iban en ese lote; las demás se marcan como enviadas. El reintento ya no repite
//     los avisos de los lotes que sí salieron.
//   * CR-10 (c): un ticket con error "MessageRateExceeded" cuenta como fallo reintentable; "DeviceNotRegistered" borra el token; cualquier otro error de ticket se
//     registra en el log (console.error) y se informa en la respuesta (ticketErrors) pero no se reintenta (suele ser permanente).
//     NO se revisan recibos de Expo (segunda consulta con los ids de ticket): requeriría guardar los ids; queda como mejora futura.
//
// ANTES DE DESPLEGAR (si no, se cortan los push): confirmar en el dashboard (Edge Functions > Secrets) que PUSH_WEBHOOK_SECRET existe y es IGUAL al secreto
// "push_webhook_secret" de Vault que usa el trigger notify_send_push. Ver README: "Qué no pude probar".
//
// Requiere las env vars que Supabase inyecta automático (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) y PUSH_WEBHOOK_SECRET (obligatoria).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_LIMIT = 50; // filas pendientes por corrida en modo "sin body"
const EXPO_CHUNK = 100; // Expo admite hasta 100 mensajes por llamada
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OutboxRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  rowId: string; // fila de notifications_outbox de la que sale (no se manda a Expo)
}

// Comparación en tiempo constante: se comparan los SHA-256 de ambos textos byte a byte, sin cortar en la primera diferencia.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  // --- SEC-12: el secreto es obligatorio (fail-closed) ---
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('PUSH_WEBHOOK_SECRET no está configurado: la función no envía nada hasta que se defina.');
    return json({ error: 'Función sin configurar' }, 500);
  }
  const provided = req.headers.get('x-webhook-secret') ?? '';
  if (!(await safeEqual(provided, webhookSecret))) {
    return new Response('No autorizado', { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let payload: { record?: { id?: unknown } } | null = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  let rows: OutboxRow[] = [];

  if (payload?.record) {
    // --- SEC-12: de la ruta "record" solo se usa el id; el contenido se relee de la base ---
    const id = payload.record.id;
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return json({ sent: 0 }, 200);
    }
    const { data, error } = await supabase
      .from('notifications_outbox')
      .select('id, user_id, title, body, data')
      .eq('id', id)
      .is('sent_at', null)
      .maybeSingle();
    if (error) {
      return json({ error: error.message }, 500);
    }
    rows = data ? [data as OutboxRow] : [];
  } else {
    const { data, error } = await supabase
      .from('notifications_outbox')
      .select('id, user_id, title, body, data')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);
    if (error) {
      return json({ error: error.message }, 500);
    }
    rows = (data ?? []) as OutboxRow[];
  }

  if (rows.length === 0) {
    return json({ sent: 0 }, 200);
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: tokenRows, error: tokenError } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);
  if (tokenError) {
    return json({ error: tokenError.message }, 500);
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokenRows ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  const messages: PushMessage[] = [];
  for (const row of rows) {
    for (const token of tokensByUser.get(row.user_id) ?? []) {
      messages.push({ to: token, title: row.title, body: row.body, data: row.data ?? {}, rowId: row.id });
    }
  }

  // --- CR-10: se lleva la cuenta de qué filas quedaron mal para dejar pendientes SOLO esas ---
  const failedRows = new Set<string>();
  const deadTokens: string[] = [];
  let ticketErrors = 0;

  for (let i = 0; i < messages.length; i += EXPO_CHUNK) {
    const chunk = messages.slice(i, i + EXPO_CHUNK);
    const chunkRowIds = [...new Set(chunk.map((m) => m.rowId))];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        // rowId es interno: no se manda a Expo
        body: JSON.stringify(chunk.map(({ rowId: _rowId, ...m }) => m)),
      });
      if (!res.ok) {
        for (const id of chunkRowIds) failedRows.add(id);
        continue;
      }
      const body = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
      (body.data ?? []).forEach((ticket, idx) => {
        if (ticket.status !== 'error') return;
        const err = ticket.details?.error;
        if (err === 'DeviceNotRegistered') {
          deadTokens.push(chunk[idx].to);
        } else if (err === 'MessageRateExceeded') {
          failedRows.add(chunk[idx].rowId); // transitorio: se reintenta en la próxima corrida
        } else {
          ticketErrors++;
          console.error('Ticket de Expo con error', err ?? '(sin detalle)', 'fila', chunk[idx].rowId);
        }
      });
    } catch {
      for (const id of chunkRowIds) failedRows.add(id);
    }
  }

  if (deadTokens.length > 0) await supabase.from('push_tokens').delete().in('token', deadTokens);

  // Se marcan como enviadas todas las filas que NO quedaron en failedRows (incluidas las que no tienen ningún token).
  const okIds = rows.map((r) => r.id).filter((id) => !failedRows.has(id));
  if (okIds.length > 0) {
    await supabase.from('notifications_outbox').update({ sent_at: new Date().toISOString() }).in('id', okIds);
  }

  if (failedRows.size > 0) {
    return json(
      { error: 'Expo no respondió bien para algunas filas; se reintentan', failedRows: failedRows.size, sent: okIds.length, pushes: messages.length, ticketErrors },
      502,
    );
  }

  return json({ sent: rows.length, pushes: messages.length, ticketErrors }, 200);
});
