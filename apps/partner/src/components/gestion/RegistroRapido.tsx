'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { inputToIso, money, nowLocalInput, fullName, type Client, type ClientSummary, type Visit } from '@/lib/gestion';
import { useGestion } from './GestionShell';
import { ClientPicker, getClient } from './ClientPicker';
import { Button, Field, Modal, Notice, Segmented, inputCls, textareaCls } from './ui';

// Registro rápido de asistencia (+ cobro opcional) en un solo paso.
export function RegistroRapido({
  open,
  clientId,
  appointmentId,
  onClose,
  onSaved,
}: {
  open: boolean;
  clientId?: string;
  appointmentId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { business, settings, services, can } = useGestion();
  const [client, setClient] = useState<Client | null>(null);
  const [status, setStatus] = useState<Visit['status']>('asistio');
  const [when, setWhen] = useState(nowLocalInput());
  const [serviceId, setServiceId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [charge, setCharge] = useState('');
  const [pay, setPay] = useState('');
  const [method, setMethod] = useState(settings.payment_methods[0] ?? '');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; paymentId?: string; receipt?: number } | null>(null);
  const canPay = can('payments.create');
  const activeServices = services.filter((s) => s.active && s.sessions_included === 1);

  // Al abrir: todo limpio y, si viene de una ficha, el cliente ya elegido.
  useEffect(() => {
    if (!open) return;
    setStatus('asistio');
    setWhen(nowLocalInput());
    setPackageId('');
    setNotes('');
    setError(null);
    setDone(null);
    setMethod(settings.payment_methods[0] ?? '');
    if (clientId) getClient(clientId).then(setClient);
    else setClient(null);
  }, [open, clientId, settings.payment_methods]);

  // Al elegir cliente: su servicio habitual y sus paquetes con sesiones.
  useEffect(() => {
    setSummary(null);
    if (!client) return;
    const s = activeServices.find((x) => x.id === client.service_id) ?? activeServices[0];
    setServiceId(s?.id ?? '');
    supabase.rpc('gestion_client_summary', { p_client: client.id }).then(({ data }) => {
      const sum = (data as ClientSummary) ?? null;
      setSummary(sum);
      const usable = sum?.packages.find((p) => p.remaining > 0 && (!p.expires_on || p.expires_on >= new Date().toISOString().slice(0, 10)));
      setPackageId(usable?.id ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Valor del servicio y cobro sugeridos.
  useEffect(() => {
    const s = services.find((x) => x.id === serviceId);
    const v = packageId || status !== 'asistio' ? 0 : Number(s?.price ?? 0);
    setCharge(String(v));
    setPay(v > 0 ? String(v) : '');
  }, [serviceId, packageId, status, services]);

  const packages = (summary?.packages ?? []).filter((p) => p.remaining > 0);

  async function save() {
    if (!client) return setError(`Elige un ${settings.client_singular.toLowerCase()}.`);
    const payNum = Number(pay || 0);
    if (Number.isNaN(Number(charge)) || Number(charge) < 0) return setError('El valor del servicio no es válido.');
    if (Number.isNaN(payNum) || payNum < 0) return setError('El importe abonado no es válido.');
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('gestion_register_visit', {
      p_business: business.id,
      p: {
        client_id: client.id,
        status,
        occurred_at: inputToIso(when),
        service_id: serviceId || null,
        package_id: packageId || null,
        charge: packageId ? 0 : Number(charge || 0),
        payment_amount: canPay ? payNum : 0,
        payment_method: method,
        notes,
        appointment_id: appointmentId ?? null,
      },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    const p = (data as { payment: { id: string; receipt_number: number } | null }).payment;
    setDone({ name: fullName(client), paymentId: p?.id, receipt: p?.receipt_number });
    onSaved();
  }

  const debt = summary ? Number(summary.balance) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? 'Listo' : `Registrar ${settings.session_singular.toLowerCase()}`}
      footer={
        done ? (
          <>
            {done.paymentId && can('receipts.issue') && (
              <Link href={`/gestion/comprobante?id=${done.paymentId}`} className="inline-flex items-center h-11 px-4 rounded-[10px] border border-line font-semibold text-[13.5px]">
                Ver comprobante
              </Link>
            )}
            <Button
              onClick={() => {
                setDone(null);
                setClient(null);
                setWhen(nowLocalInput());
                setNotes('');
              }}
            >
              Registrar otra
            </Button>
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={saving || !client}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle2 size={40} className="mx-auto gx-text-ok mb-2" />
          <p className="font-bold text-[15px]">Quedó registrada la {settings.session_singular.toLowerCase()} de {done.name}.</p>
          {done.receipt && <p className="text-muted text-[13px] mt-1">Comprobante Nº {done.receipt}</p>}
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
          {debt != null && debt !== 0 && (
            <Notice tone={debt > 0 ? 'warn' : 'ok'}>
              {debt > 0 ? `Tiene un saldo pendiente de ${money(debt, settings.currency)}.` : `Tiene ${money(-debt, settings.currency)} a favor.`}
            </Notice>
          )}
          <Segmented
            label="Asistencia"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'asistio', label: 'Asistió' },
              { value: 'falto', label: 'Faltó' },
              { value: 'cancelo', label: 'Canceló' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fecha y hora">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Servicio">
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
                <option value="">Sin servicio</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {money(s.price, settings.currency)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {packages.length > 0 && (
            <Field label="Usar paquete" hint="Con paquete, la sesión se descuenta del paquete y no genera cargo.">
              <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputCls}>
                <option value="">No, cobrar por separado</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · quedan {p.remaining} de {p.sessions_total}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!packageId && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={`Valor (${settings.currency})`} hint="Lo que se le carga.">
                <input inputMode="decimal" type="number" min={0} step="0.01" value={charge} onChange={(e) => setCharge(e.target.value)} className={inputCls} />
              </Field>
              {canPay && (
                <>
                  <Field label={`Abona (${settings.currency})`} hint="0 = paga después.">
                    <input inputMode="decimal" type="number" min={0} step="0.01" value={pay} onChange={(e) => setPay(e.target.value)} className={inputCls} placeholder="0" />
                  </Field>
                  <Field label="Método">
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls} disabled={!Number(pay)}>
                      {settings.payment_methods.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>
          )}
          {packageId && canPay && (
            <p className="text-[12px] text-muted">Si además quiere abonar algo del paquete, regístralo desde Caja.</p>
          )}
          <Field label="Observaciones">
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaCls} maxLength={2000} />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  );
}
