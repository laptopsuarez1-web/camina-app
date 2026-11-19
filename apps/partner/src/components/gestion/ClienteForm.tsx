'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { localDay, type Client, type ClientStatus } from '@/lib/gestion';
import { useGestion } from './GestionShell';
import { Button, Field, Modal, Notice, inputCls, textareaCls } from './ui';

type Form = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  registered_at: string;
  service_id: string;
  status: ClientStatus;
  notes: string;
  custom: Record<string, string>;
};

export function ClienteForm({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
  onSaved: (c: Client) => void;
}) {
  const { business, settings, services } = useGestion();
  const [f, setF] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF({
      first_name: client?.first_name ?? '',
      last_name: client?.last_name ?? '',
      phone: client?.phone ?? '',
      email: client?.email ?? '',
      registered_at: client?.registered_at ?? localDay(new Date(), settings.timezone),
      service_id: client?.service_id ?? '',
      status: client?.status ?? 'activo',
      notes: client?.notes ?? '',
      custom: Object.fromEntries(Object.entries(client?.custom ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)])),
    });
  }, [open, client, settings.timezone]);

  if (!f) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });

  async function save() {
    if (!f) return;
    if (!f.first_name.trim()) return setError('Escribe el nombre.');
    setSaving(true);
    setError(null);
    const custom: Record<string, string | number | null> = {};
    for (const cf of settings.custom_fields) {
      const v = f.custom[cf.key] ?? '';
      custom[cf.key] = v === '' ? null : cf.type === 'number' ? Number(v) : v;
    }
    const { data, error: err } = await supabase.rpc('gestion_save_client', {
      p_business: business.id,
      p: { ...f, id: client?.id ?? null, custom, service_id: f.service_id || null },
    });
    setSaving(false);
    if (err) return setError(mensajeError(err));
    onSaved(data as Client);
  }

  const s = settings.client_singular.toLowerCase();
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={client ? `Editar ${s}` : `Nuevo ${s}`}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Nombre">
          <input value={f.first_name} onChange={(e) => set('first_name', e.target.value)} className={inputCls} required maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Apellido">
          <input value={f.last_name} onChange={(e) => set('last_name', e.target.value)} className={inputCls} maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Teléfono">
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} inputMode="tel" maxLength={40} />
        </Field>
        <Field label="Correo electrónico">
          <input value={f.email} onChange={(e) => set('email', e.target.value)} className={inputCls} type="email" maxLength={160} />
        </Field>
        <Field label="Fecha de registro">
          <input type="date" value={f.registered_at} onChange={(e) => set('registered_at', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tipo de servicio">
          <select value={f.service_id} onChange={(e) => set('service_id', e.target.value)} className={inputCls}>
            <option value="">Sin definir</option>
            {services
              .filter((x) => x.active || x.id === f.service_id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Estado">
          <select value={f.status} onChange={(e) => set('status', e.target.value as ClientStatus)} className={inputCls}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </Field>
        {settings.custom_fields.map((cf) => (
          <Field key={cf.key} label={cf.label}>
            {cf.type === 'select' ? (
              <select value={f.custom[cf.key] ?? ''} onChange={(e) => set('custom', { ...f.custom, [cf.key]: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {(cf.options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                value={f.custom[cf.key] ?? ''}
                onChange={(e) => set('custom', { ...f.custom, [cf.key]: e.target.value })}
                className={inputCls}
              />
            )}
          </Field>
        ))}
        <Field label="Notas administrativas" className="sm:col-span-2" hint={settings.clinical_enabled ? 'Las notas clínicas van aparte, en la ficha.' : undefined}>
          <textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} className={textareaCls} maxLength={2000} />
        </Field>
        {error && (
          <div className="sm:col-span-2">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
