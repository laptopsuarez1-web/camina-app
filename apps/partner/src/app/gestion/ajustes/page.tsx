'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Download, Pencil, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { Badge, Button, Card, CardTitle, Field, Modal, Notice, inputCls, textareaCls } from '@/components/gestion/ui';
import { downloadJson } from '@/lib/export';
import { invalidateGestionAccess, money, type CustomField, type GestionSettings, type Service } from '@/lib/gestion';

const PRESETS: Record<string, Partial<GestionSettings>> = {
  'Fisioterapia / kinesiología': { client_singular: 'Paciente', client_plural: 'Pacientes', session_singular: 'Sesión', session_plural: 'Sesiones' },
  'Psicología / consultorio': { client_singular: 'Paciente', client_plural: 'Pacientes', session_singular: 'Consulta', session_plural: 'Consultas' },
  'Centro médico': { client_singular: 'Paciente', client_plural: 'Pacientes', session_singular: 'Consulta', session_plural: 'Consultas' },
  'Centro de estética': { client_singular: 'Cliente', client_plural: 'Clientes', session_singular: 'Turno', session_plural: 'Turnos' },
  'Entrenamiento personal / gimnasio': { client_singular: 'Socio', client_plural: 'Socios', session_singular: 'Clase', session_plural: 'Clases' },
  'Academia / formación': { client_singular: 'Alumno', client_plural: 'Alumnos', session_singular: 'Clase', session_plural: 'Clases' },
  Otro: {},
};

const TZS = ['America/La_Paz', 'America/Lima', 'America/Bogota', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Asuncion', 'America/Sao_Paulo', 'America/Mexico_City', 'America/Caracas', 'Europe/Madrid'];

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

function General() {
  const { business, settings, can } = useGestion();
  const [f, setF] = useState(settings);
  const [newMethod, setNewMethod] = useState('');
  const [newField, setNewField] = useState<{ label: string; type: CustomField['type']; options: string }>({ label: '', type: 'text', options: '' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setF(settings), [settings]);
  const set = <K extends keyof GestionSettings>(k: K, v: GestionSettings[K]) => setF({ ...f, [k]: v });

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc('gestion_save_settings', {
      p_business: business.id,
      p: {
        display_name: f.display_name,
        activity_type: f.activity_type,
        client_singular: f.client_singular,
        client_plural: f.client_plural,
        session_singular: f.session_singular,
        session_plural: f.session_plural,
        currency: f.currency,
        timezone: f.timezone,
        payment_methods: f.payment_methods,
        custom_fields: f.custom_fields,
        clinical_enabled: f.clinical_enabled,
        receipt_footer: f.receipt_footer ?? '',
      },
    });
    setSaving(false);
    if (error) return setMsg({ tone: 'danger', text: mensajeError(error) });
    setMsg({ tone: 'ok', text: 'Guardado.' });
    invalidateGestionAccess();
  }

  async function backup() {
    const { data, error } = await supabase.rpc('gestion_export_all', { p_business: business.id });
    if (error) return setMsg({ tone: 'danger', text: mensajeError(error) });
    downloadJson(`copia-${business.name}-${new Date().toISOString().slice(0, 10)}`, data);
  }

  return (
    <Card>
      <CardTitle>Tu negocio</CardTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Nombre del negocio (comprobantes)">
          <input value={f.display_name ?? ''} onChange={(e) => set('display_name', e.target.value)} className={inputCls} maxLength={80} />
        </Field>
        <Field label="Tipo de actividad" hint="Al elegir uno se sugieren los nombres de abajo.">
          <select
            value={Object.keys(PRESETS).includes(f.activity_type) ? f.activity_type : 'Otro'}
            onChange={(e) => setF({ ...f, activity_type: e.target.value, ...PRESETS[e.target.value] })}
            className={inputCls}
          >
            {Object.keys(PRESETS).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        {!Object.keys(PRESETS).includes(f.activity_type) || f.activity_type === 'Otro' ? (
          <Field label="Actividad (texto libre)" className="sm:col-span-2">
            <input value={f.activity_type === 'Otro' ? '' : f.activity_type} onChange={(e) => set('activity_type', e.target.value || 'Otro')} className={inputCls} maxLength={60} />
          </Field>
        ) : null}
        <Field label="Cómo llamas a tus clientes (singular)">
          <input value={f.client_singular} onChange={(e) => set('client_singular', e.target.value)} className={inputCls} maxLength={30} />
        </Field>
        <Field label="Plural">
          <input value={f.client_plural} onChange={(e) => set('client_plural', e.target.value)} className={inputCls} maxLength={30} />
        </Field>
        <Field label="Cómo llamas a cada visita (singular)">
          <input value={f.session_singular} onChange={(e) => set('session_singular', e.target.value)} className={inputCls} maxLength={30} />
        </Field>
        <Field label="Plural">
          <input value={f.session_plural} onChange={(e) => set('session_plural', e.target.value)} className={inputCls} maxLength={30} />
        </Field>
        <Field label="Moneda">
          <input value={f.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls} maxLength={8} />
        </Field>
        <Field label="Zona horaria">
          <select value={f.timezone} onChange={(e) => set('timezone', e.target.value)} className={inputCls}>
            {(TZS.includes(f.timezone) ? TZS : [f.timezone, ...TZS]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold mb-1.5">Métodos de pago</p>
        <div className="flex flex-wrap gap-2">
          {f.payment_methods.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 bg-purple-light rounded-full pl-3 pr-1 h-8 text-[12.5px] font-semibold">
              {m}
              <button
                type="button"
                aria-label={`Quitar ${m}`}
                onClick={() => set('payment_methods', f.payment_methods.filter((x) => x !== m))}
                className="w-6 h-6 rounded-full hover:bg-card flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const m = newMethod.trim();
              if (m && !f.payment_methods.includes(m)) set('payment_methods', [...f.payment_methods, m]);
              setNewMethod('');
            }}
          >
            <input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} placeholder="Agregar…" className={`${inputCls} h-8 w-32`} maxLength={40} />
            <Button type="submit" size="sm" icon={Plus} aria-label="Agregar método" className="h-8" />
          </form>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold mb-1.5">Campos adicionales de la ficha</p>
        <p className="text-[12px] text-muted mb-2">Datos propios de tu actividad (ej.: fecha de nacimiento, nivel, objetivo). Evita guardar información médica innecesaria.</p>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5 mb-2">
          {f.custom_fields.map((cf) => (
            <li key={cf.key} className="flex items-center gap-2 border border-line rounded-[10px] px-3 h-10 text-[13px]">
              <span className="font-semibold flex-1 truncate">{cf.label}</span>
              <Badge>{{ text: 'Texto', number: 'Número', date: 'Fecha', select: 'Lista' }[cf.type]}</Badge>
              <button
                type="button"
                aria-label={`Quitar ${cf.label}`}
                onClick={() => set('custom_fields', f.custom_fields.filter((x) => x.key !== cf.key))}
                className="w-8 h-8 rounded-full hover:bg-purple-light flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="Nombre del campo" className={`${inputCls} flex-1 min-w-[160px]`} maxLength={60} />
          <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as CustomField['type'] })} className={`${inputCls} w-auto`}>
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="date">Fecha</option>
            <option value="select">Lista de opciones</option>
          </select>
          {newField.type === 'select' && (
            <input value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} placeholder="Opciones separadas por coma" className={`${inputCls} flex-1 min-w-[160px]`} />
          )}
          <Button
            icon={Plus}
            disabled={!newField.label.trim()}
            onClick={() => {
              const key = slug(newField.label) || `campo_${f.custom_fields.length + 1}`;
              if (f.custom_fields.some((x) => x.key === key)) return;
              set('custom_fields', [
                ...f.custom_fields,
                {
                  key,
                  label: newField.label.trim(),
                  type: newField.type,
                  ...(newField.type === 'select' ? { options: newField.options.split(',').map((o) => o.trim()).filter(Boolean) } : {}),
                },
              ]);
              setNewField({ label: '', type: 'text', options: '' });
            }}
          >
            Agregar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Pie del comprobante" className="sm:col-span-2">
          <textarea rows={2} value={f.receipt_footer ?? ''} onChange={(e) => set('receipt_footer', e.target.value)} className={textareaCls} maxLength={300} placeholder="Ej.: Gracias por tu visita. NIT 123456." />
        </Field>
        <label className="flex items-start gap-2.5 text-[13px] sm:col-span-2 cursor-pointer">
          <input type="checkbox" checked={f.clinical_enabled} onChange={(e) => set('clinical_enabled', e.target.checked)} className="w-4 h-4 mt-0.5" />
          <span>
            <b>Activar notas clínicas</b>
            <span className="block text-muted text-[12px]">
              Solo para actividades sanitarias. Se guardan separadas de los datos administrativos, solo las ven los roles con permiso clínico y cada lectura queda auditada.
            </span>
          </span>
        </label>
      </div>

      {msg && (
        <div className="mt-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-5">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </Button>
        {can('reports.export') && (
          <Button icon={Download} onClick={backup}>
            Descargar copia de seguridad
          </Button>
        )}
      </div>
    </Card>
  );
}

function Servicios() {
  const { business, services, reloadServices, settings } = useGestion();
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.rpc('gestion_save_service', {
      p_business: business.id,
      p: {
        id: edit.id ?? null,
        name: edit.name,
        price: Number(edit.price ?? 0),
        duration_min: edit.duration_min ? Number(edit.duration_min) : '',
        sessions_included: Number(edit.sessions_included ?? 1),
        active: edit.active ?? true,
      },
    });
    setSaving(false);
    if (e) return setError(mensajeError(e));
    setEdit(null);
    reloadServices();
  }

  return (
    <Card pad={false}>
      <div className="p-4 sm:p-5 pb-2">
        <CardTitle
          action={
            <Button size="sm" icon={Plus} onClick={() => setEdit({ active: true, sessions_included: 1, price: 0 })}>
              Nuevo servicio
            </Button>
          }
        >
          Servicios, precios y paquetes
        </CardTitle>
      </div>
      {services.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-muted">Carga tus servicios para que el registro rápido sugiera el precio.</p>
      ) : (
        <ul className="m-0 p-0 list-none">
          {services.map((s) => (
            <li key={s.id} className={`border-t border-line px-4 sm:px-5 py-3 flex items-center gap-3 ${s.active ? '' : 'opacity-55'}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[13.5px] truncate">{s.name}</p>
                <p className="text-[12px] text-muted">
                  {money(s.price, settings.currency)}
                  {s.sessions_included > 1 ? ` · paquete de ${s.sessions_included} ${settings.session_plural.toLowerCase()}` : ''}
                  {s.duration_min ? ` · ${s.duration_min} min` : ''}
                  {!s.active ? ' · inactivo' : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Editar ${s.name}`} onClick={() => setEdit(s)} />
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Editar servicio' : 'Nuevo servicio'}
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={saving || !edit?.name?.trim()}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Nombre" className="col-span-2">
              <input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} maxLength={80} />
            </Field>
            <Field label={`Precio (${settings.currency})`}>
              <input type="number" min={0} step="0.01" value={edit.price ?? ''} onChange={(e) => setEdit({ ...edit, price: e.target.value as unknown as number })} className={inputCls} />
            </Field>
            <Field label="Duración (min)">
              <input type="number" min={5} step={5} value={edit.duration_min ?? ''} onChange={(e) => setEdit({ ...edit, duration_min: (e.target.value || null) as unknown as number })} className={inputCls} />
            </Field>
            <Field label={`${settings.session_plural} incluidas`} hint="1 = sesión suelta. Más de 1 = paquete." className="col-span-2">
              <input type="number" min={1} max={500} value={edit.sessions_included ?? 1} onChange={(e) => setEdit({ ...edit, sessions_included: Number(e.target.value) })} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] col-span-2 cursor-pointer">
              <input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="w-4 h-4" />
              Activo (aparece al registrar)
            </label>
            {error && (
              <div className="col-span-2">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}

export default function AjustesPage() {
  return (
    <GestionShell need={['settings.manage']} title="Configuración" subtitle="Adapta el sistema a tu actividad: nombres, servicios, precios y pagos.">
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4 items-start">
        <General />
        <Servicios />
      </div>
    </GestionShell>
  );
}
