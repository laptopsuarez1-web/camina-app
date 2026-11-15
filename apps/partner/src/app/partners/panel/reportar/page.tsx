'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { PartnerShell } from '@/components/PartnerShell';
import { PLAN_KINDS, partnersWa, bs, type Partner, type PlanKind } from '@/lib/partners';

const CAMPO = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[14px] text-text';

function Formulario({ partner }: { partner: Partner }) {
  const [local, setLocal] = useState('');
  const [dueno, setDueno] = useState('');
  const [tel, setTel] = useState('');
  const [zona, setZona] = useState('');
  const [plan, setPlan] = useState<PlanKind>('gratis');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('partner_report_lead', {
      p_business: local, p_owner: dueno, p_phone: tel, p_zone: zona, p_plan: plan, p_note: nota,
    });
    setBusy(false);
    if (err) {
      setError(mensajeError(err));
      return;
    }
    setHecho(local);
    setLocal(''); setDueno(''); setTel(''); setZona(''); setNota(''); setPlan('gratis');
  }

  if (hecho) {
    return (
      <div className="max-w-[460px]">
        <div className="bg-card border border-line rounded-2xl p-5 text-center">
          <CheckCircle2 size={40} className="text-aqua mx-auto mb-2" />
          <p className="font-bold text-text text-[17px] mb-1">¡{hecho} quedó reportado!</p>
          <p className="text-muted text-[13.5px] mb-4">Camina lo revisa y lo ves cambiar de estado en “Mis locales”. Si tiene algún problema, te avisamos ahí.</p>
          <button onClick={() => setHecho(null)} className="w-full bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-xl py-3 font-bold text-[14px] mb-2">Reportar otro local</button>
          <Link href="/partners/panel/locales" className="block text-muted text-[13px] py-1.5">Ver mis locales</Link>
          <a href={partnersWa(`Hola! Soy ${partner.code}. Reporté el local ${hecho} y quiero avisar.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-aqua text-[13px] font-semibold mt-1">
            <MessageCircle size={14} /> Avisar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">Reportar un local</h1>
      <p className="text-muted text-[13.5px] mb-5">Hazlo apenas termines la carga con el dueño. Gana quien lo reporta primero.</p>
      <form onSubmit={enviar} className="max-w-[460px] flex flex-col gap-3">
        <label className="grid gap-1 text-[13px] font-semibold text-text">Nombre del local
          <input value={local} onChange={(e) => setLocal(e.target.value)} required placeholder="Café Central" className={CAMPO} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-text">Nombre del dueño
          <input value={dueno} onChange={(e) => setDueno(e.target.value)} placeholder="María Pérez" className={CAMPO} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-text">WhatsApp del dueño
          <input value={tel} onChange={(e) => setTel(e.target.value)} required inputMode="tel" placeholder="71234567" className={CAMPO} />
          <span className="text-muted text-[12px] font-normal">Es el dato que identifica al local: no se puede reportar dos veces.</span>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-text">Zona
          <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Centro" className={CAMPO} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-text">Plan con el que entró
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKind)} className={CAMPO}>
            {PLAN_KINDS.map((p) => <option key={p.id} value={p.id}>{p.label} · cobras {bs(p.amount)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-text">Nota (opcional)
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Falta subir la portada" className={CAMPO} />
        </label>
        {error && <p className="text-warn text-[13px]">{error}</p>}
        <button type="submit" disabled={busy} className="bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-xl py-3.5 font-bold text-[14.5px] disabled:opacity-60">
          {busy ? 'Enviando…' : 'Reportar local'}
        </button>
        <p className="text-muted text-[12px]">El monto final depende del plan que tenga el local cuando quede activo. Camina lo confirma.</p>
      </form>
    </>
  );
}

export default function ReportarPage() {
  return <PartnerShell>{(p) => <Formulario partner={p} />}</PartnerShell>;
}
