'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';
import { PLAN_KINDS, ESTADO_LABEL, bs, fecha, planLabel, type PartnerLead, type PartnerTotals, type PlanKind, type LeadStatus } from '@/lib/partners';

type Fila = {
  id: string;
  code: string;
  full_name: string;
  phone: string;
  zone: string | null;
  status: 'active' | 'paused';
  created_at: string;
  email: string | null;
  totals: PartnerTotals;
};

const ESTADOS: LeadStatus[] = ['reportado', 'publicado', 'activo', 'rechazado'];
const CAMPO = 'bg-white border border-line rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-text';

function LeadFila({ lead, onSaved }: { lead: PartnerLead; onSaved: () => void }) {
  const [estado, setEstado] = useState<LeadStatus>(lead.status);
  const [plan, setPlan] = useState<PlanKind>(lead.plan_kind);
  const [nota, setNota] = useState(lead.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [enCamina, setEnCamina] = useState<string | null>(null);
  const cambio = estado !== lead.status || plan !== lead.plan_kind || nota !== (lead.admin_note ?? '');

  // Avisa si el WhatsApp del dueño ya aparece en un comercio de Camina (para confirmar que el local de verdad se cargó).
  useEffect(() => {
    const d = lead.owner_phone.replace(/\D/g, '');
    const key = d.length > 8 && d.startsWith('591') ? d.slice(3) : d;
    if (key.length < 7) return;
    supabase.from('businesses').select('name, approved, phone').ilike('phone', `%${key.slice(-7)}%`).limit(1).then(({ data }) => {
      const b = data?.[0] as { name: string; approved: boolean } | undefined;
      setEnCamina(b ? `${b.name} (${b.approved ? 'aprobado' : 'sin aprobar'})` : null);
    });
  }, [lead.owner_phone]);

  async function guardar() {
    setBusy(true);
    await supabase.from('partner_leads').update({ status: estado, plan_kind: plan, admin_note: nota.trim() || null }).eq('id', lead.id);
    setBusy(false);
    onSaved();
  }

  return (
    <div className="border-t border-line pt-2.5 mt-2.5">
      <p className="text-text text-[13px] font-semibold">
        {lead.business_name} <span className="text-muted font-normal">· {lead.owner_name || 'sin nombre'} · {lead.owner_phone} · {lead.zone || 'sin zona'} · {fecha(lead.reported_at)}</span>
      </p>
      {lead.note && <p className="text-muted text-[12px]">Nota del partner: {lead.note}</p>}
      {enCamina && <p className="text-[12px] mt-0.5" style={{ color: 'var(--c-ok-text)' }}>Está en Camina: {enCamina}</p>}
      <div className="flex flex-wrap gap-2 mt-2 items-center">
        <select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as LeadStatus)} className={CAMPO}>
          {ESTADOS.map((s) => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
        </select>
        <select aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as PlanKind)} className={CAMPO}>
          {PLAN_KINDS.map((p) => <option key={p.id} value={p.id}>{p.label} · {bs(p.amount)}</option>)}
        </select>
        <input aria-label="Aviso para el partner" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Aviso para el partner (opcional)" className={`${CAMPO} flex-1 min-w-[180px]`} />
        <button onClick={guardar} disabled={!cambio || busy} className="rounded-[8px] px-3 py-1.5 text-[12px] font-bold disabled:opacity-40" style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <p className="text-muted text-[11.5px] mt-1">{planLabel(lead.plan_kind)} · se paga {bs(estado === 'activo' ? PLAN_KINDS.find((p) => p.id === plan)?.amount ?? 0 : 0)} cuando está activo</p>
    </div>
  );
}

function Tarjeta({ fila, onChange }: { fila: Fila; onChange: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const t = fila.totals;

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('partner_leads').select('*').eq('partner_id', fila.id).order('reported_at', { ascending: false });
    setLeads((data as PartnerLead[]) ?? []);
  }, [fila.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (abierto) void cargar(); }, [abierto, cargar]);

  async function pagar() {
    const n = Math.round(Number(monto));
    if (!n || n <= 0) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('partner_payments').insert({ partner_id: fila.id, amount_bs: n, note: nota.trim() || null, created_by: u.user?.id ?? null });
    setBusy(false);
    setMonto('');
    setNota('');
    onChange();
  }

  async function pausar() {
    await supabase.from('partners').update({ status: fila.status === 'active' ? 'paused' : 'active' }).eq('id', fila.id);
    onChange();
  }

  return (
    <div className="bg-card border border-line rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-text text-[14px]">
            {fila.full_name} <span className="text-mint-dark bg-mint/20 rounded-full px-2 py-0.5 text-[11px] font-bold ml-1">{fila.code}</span>
            {fila.status === 'paused' && <span className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger-text)' }}>En pausa</span>}
          </p>
          <p className="text-muted text-[12px]">
            <a className="underline" href={`https://wa.me/${fila.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{fila.phone}</a> · {fila.email} · {fila.zone || 'sin zona'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-text font-bold text-[15px]">Debemos {bs(t.pendiente)}</p>
          <p className="text-muted text-[11.5px]">{t.activos} activos · {t.publicados} publicados · {t.reportados} en revisión · ganado {bs(t.ganado)} · pagado {bs(t.pagado)}</p>
        </div>
      </div>
      <button onClick={() => setAbierto(!abierto)} className="text-purple text-[12.5px] font-semibold mt-1.5">{abierto ? 'Ocultar' : 'Ver locales y pagar'}</button>
      {abierto && (
        <div className="mt-1">
          {leads.length === 0 && <p className="text-muted text-[12.5px] mt-2">No reportó locales todavía.</p>}
          {leads.map((l) => <LeadFila key={l.id} lead={l} onSaved={() => { void cargar(); onChange(); }} />)}
          <div className="border-t border-line pt-2.5 mt-2.5 flex flex-wrap gap-2 items-center">
            <input aria-label="Monto a pagar" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder={`Pagar Bs (debemos ${t.pendiente})`} className={`${CAMPO} w-[170px]`} />
            <input aria-label="Nota del pago" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (QR, efectivo…)" className={`${CAMPO} flex-1 min-w-[140px]`} />
            <button onClick={pagar} disabled={busy || !monto} className="rounded-[8px] px-3 py-1.5 text-[12px] font-bold disabled:opacity-40" style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}>Registrar pago</button>
            <button onClick={pausar} className="rounded-[8px] px-3 py-1.5 text-[12px] font-bold" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>{fila.status === 'active' ? 'Pausar partner' : 'Reactivar'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPartnersPage() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_partner_overview');
    if (error) {
      setMsg(/admin_partner_overview/i.test(error.message) ? 'Falta aplicar la migración 0122 en la base de datos.' : error.message);
      setFilas([]);
      return;
    }
    setMsg(null);
    setFilas((data as Fila[]) ?? []);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void cargar(); }, [cargar]);

  const debemos = (filas ?? []).reduce((s, f) => s + Math.max(0, f.totals.pendiente), 0);
  const porRevisar = (filas ?? []).reduce((s, f) => s + f.totals.reportados, 0);

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Partners</h1>
      <p className="text-muted text-[13.5px] mb-4">
        Quienes visitan locales y cobran comisión. Cuando un local queda publicado o tiene su primer canje, cámbiale el estado: el monto se calcula solo según el plan.
      </p>
      <div className="flex gap-3 flex-wrap mb-4">
        <div className="bg-card border border-line rounded-xl px-4 py-2.5"><p className="text-muted text-[11.5px]">Debemos en total</p><p className="font-bold text-text text-[18px]">{bs(debemos)}</p></div>
        <div className="bg-card border border-line rounded-xl px-4 py-2.5"><p className="text-muted text-[11.5px]">Locales por revisar</p><p className="font-bold text-text text-[18px]">{porRevisar}</p></div>
        <div className="bg-card border border-line rounded-xl px-4 py-2.5"><p className="text-muted text-[11.5px]">Partners</p><p className="font-bold text-text text-[18px]">{filas?.length ?? '…'}</p></div>
      </div>
      <p className="text-muted text-[12.5px] mb-4">Link para mandarles: <b className="text-text">caminaapp.com/partners</b></p>
      {msg && <p className="text-warn text-[12.5px] mb-3">{msg}</p>}
      {filas === null ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-muted text-[13.5px]">Todavía no hay partners registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">{filas.map((f) => <Tarjeta key={f.id} fila={f} onChange={cargar} />)}</div>
      )}
    </AdminShell>
  );
}
