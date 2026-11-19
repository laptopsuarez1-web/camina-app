'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { inputToIso, money, nowLocalInput, type Appointment, type Client, type ClientSummary } from '@/lib/gestion';
import { useGestion } from './GestionShell';
import { ClientPicker, getClient } from './ClientPicker';
import { Button, Field, Modal, Notice, Segmented, inputCls, textareaCls } from './ui';

// ---------------------------------------------------------------- Cobro

export function CobroModal({ open, clientId, onClose, onSaved }: { open: boolean; clientId?: string; onClose: () => void; onSaved: () => void }) {
  const { business, settings, can } = useGestion();
  const [client, setClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [when, setWhen] = useState(nowLocalInput());
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; receipt: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setConcept('');
    setNotes('');
    setError(null);
    setDone(null);
    setWhen(nowLocalInput());
    setMethod(settings.payment_methods[0] ?? '');
    if (clientId) getClient(clientId).then(setClient);
    else setClient(null);
  }, [open, clientId, settings.payment_methods]);

  useEffect(() => {
    setBalance(null);
    if (!client) return;
    supabase.rpc('gestion_client_summary', { p_client: client.id }).then(({ data }) => {
      const b = data ? Number((data as ClientSummary).balance) : null;
      setBalance(b);
      if (b && b > 0) setAmount(String(b));
    });
  }, [client]);

  async function save() {
    if (!client) return setError('Elige a quién cobrar.');
    const n = Number(amount);
    if (!n || n <= 0) return setError('Escribe un importe mayor a 0.');
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('gestion_register_payment', {
      p_business: business.id,
      p: { client_id: client.id, amount: n, method, paid_at: inputToIso(when), concept, notes },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    const p = data as { id: string; receipt_number: number };
    setDone({ id: p.id, receipt: p.receipt_number });
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? 'Cobro registrado' : 'Registrar cobro'}
      footer={
        done ? (
          <>
            {can('receipts.issue') && (
              <Link href={`/gestion/comprobante?id=${done.id}`} className="inline-flex items-center h-11 px-4 rounded-[10px] border border-line font-semibold text-[13.5px]">
                Ver comprobante
              </Link>
            )}
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={saving || !client}>
              {saving ? 'Guardando…' : 'Cobrar'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle2 size={40} className="mx-auto gx-text-ok mb-2" />
          <p className="font-bold text-[15px]">Comprobante Nº {done.receipt}</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label={settings.client_singular}>
            <ClientPicker value={client} onChange={setClient} autoFocus={!clientId} />
          </Field>
          {balance != null && (
            <Notice tone={balance > 0 ? 'warn' : 'ok'}>
              {balance > 0
                ? `Saldo pendiente: ${money(balance, settings.currency)}.`
                : balance < 0
                  ? `Tiene ${money(-balance, settings.currency)} a favor. Un cobro nuevo queda como pago anticipado.`
                  : 'Está al día. Un cobro nuevo queda como pago anticipado.'}
            </Notice>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={`Importe (${settings.currency})`}>
              <input type="number" inputMode="decimal" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Método de pago">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {settings.payment_methods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha y hora">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Concepto">
              <input value={concept} onChange={(e) => setConcept(e.target.value)} className={inputCls} placeholder="Ej.: pago de cuenta" maxLength={200} />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaCls} maxLength={1000} />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- Paquete

export function PaqueteModal({ open, clientId, onClose, onSaved }: { open: boolean; clientId: string; onClose: () => void; onSaved: () => void }) {
  const { business, settings, services, can } = useGestion();
  const paquetes = services.filter((s) => s.active);
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState('');
  const [price, setPrice] = useState('');
  const [expires, setExpires] = useState('');
  const [pay, setPay] = useState('');
  const [method, setMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const first = paquetes.find((s) => s.sessions_included > 1) ?? paquetes[0];
    setServiceId(first?.id ?? '');
    setExpires('');
    setPay('');
    setError(null);
    setMethod(settings.payment_methods[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const s = services.find((x) => x.id === serviceId);
    setName(s?.name ?? '');
    setSessions(String(s?.sessions_included && s.sessions_included > 1 ? s.sessions_included : 10));
    setPrice(String(s ? (s.sessions_included > 1 ? s.price : s.price * 10) : ''));
  }, [serviceId, services]);

  async function save() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.rpc('gestion_sell_package', {
      p_business: business.id,
      p: {
        client_id: clientId,
        service_id: serviceId || null,
        name,
        sessions_total: Number(sessions),
        price: Number(price),
        expires_on: expires || null,
        payment_amount: can('payments.create') ? Number(pay || 0) : 0,
        payment_method: method,
      },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vender paquete"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !name || !Number(sessions)}>
            {saving ? 'Guardando…' : 'Vender'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Servicio">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            <option value="">Otro</option>
            {paquetes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.sessions_included > 1 ? ` (${s.sessions_included} ${settings.session_plural.toLowerCase()})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre del paquete">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${settings.session_plural} incluidas`}>
            <input type="number" min={1} max={500} value={sessions} onChange={(e) => setSessions(e.target.value)} className={inputCls} />
          </Field>
          <Field label={`Precio total (${settings.currency})`}>
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Vence el (opcional)">
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} />
        </Field>
        {can('payments.create') && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Abona ahora (${settings.currency})`} hint="Puede pagar en cuotas después.">
              <input type="number" min={0} step="0.01" value={pay} onChange={(e) => setPay(e.target.value)} className={inputCls} placeholder="0" />
            </Field>
            <Field label="Método">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls} disabled={!Number(pay)}>
                {settings.payment_methods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Ajuste / descuento

export function AjusteModal({ open, clientId, onClose, onSaved }: { open: boolean; clientId: string; onClose: () => void; onSaved: () => void }) {
  const { business, settings } = useGestion();
  const [kind, setKind] = useState<'descuento' | 'cargo'>('descuento');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.rpc('gestion_add_adjustment', {
      p_business: business.id,
      p: { client_id: clientId, kind, amount: Number(amount), reason },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Descuento o ajuste"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !Number(amount) || reason.trim().length < 3}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Segmented
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'descuento', label: 'Descuento (resta deuda)' },
            { value: 'cargo', label: 'Cargo extra (suma deuda)' },
          ]}
        />
        <Field label={`Importe (${settings.currency})`}>
          <input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Motivo" hint="Queda en el historial y en la auditoría.">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} maxLength={300} placeholder="Ej.: descuento por pronto pago" />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Anular (pide motivo)

export function AnularModal({
  open,
  what,
  onClose,
  onConfirm,
}: {
  open: boolean;
  what: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Anular ${what}`}
      footer={
        <>
          <Button onClick={onClose}>Volver</Button>
          <Button
            variant="danger"
            disabled={saving || reason.trim().length < 3}
            onClick={async () => {
              setSaving(true);
              const e = await onConfirm(reason);
              setSaving(false);
              if (e) setError(e);
              else onClose();
            }}
          >
            {saving ? 'Anulando…' : 'Anular'}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-muted mb-3">No se borra: queda en el historial marcado como anulado, con el motivo y quién lo hizo. Deja de contar en los saldos.</p>
      <Field label="Motivo">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} maxLength={300} />
      </Field>
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- Cita

export function CitaModal({
  open,
  cita,
  clientId,
  defaultStart,
  onClose,
  onSaved,
}: {
  open: boolean;
  cita?: Appointment | null;
  clientId?: string;
  defaultStart?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { business, settings, services } = useGestion();
  const [client, setClient] = useState<Client | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const cid = cita?.client_id ?? clientId;
    if (cid) getClient(cid).then(setClient);
    else setClient(null);
    setServiceId(cita?.service_id ?? '');
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    setStart(cita ? toLocal(cita.starts_at) : defaultStart ?? nowLocalInput());
    setDuration(String(cita?.duration_min ?? 60));
    setNotes(cita?.notes ?? '');
  }, [open, cita, clientId, defaultStart]);

  useEffect(() => {
    if (!client || cita) return;
    if (client.service_id) setServiceId(client.service_id);
  }, [client, cita]);

  useEffect(() => {
    const s = services.find((x) => x.id === serviceId);
    if (s?.duration_min && !cita) setDuration(String(s.duration_min));
  }, [serviceId, services, cita]);

  async function save() {
    if (!client) return setError(`Elige un ${settings.client_singular.toLowerCase()}.`);
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.rpc('gestion_save_appointment', {
      p_business: business.id,
      p: { id: cita?.id ?? null, client_id: client.id, service_id: serviceId || null, starts_at: inputToIso(start), duration_min: Number(duration), notes },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cita ? 'Editar cita' : 'Nueva cita'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !client || !start}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label={settings.client_singular}>
          <ClientPicker value={client} onChange={setClient} />
        </Field>
        <Field label="Servicio">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            <option value="">Sin servicio</option>
            {services
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha y hora">
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Duración (min)">
            <input type="number" min={5} max={1440} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Notas">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaCls} maxLength={1000} />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </Modal>
  );
}
