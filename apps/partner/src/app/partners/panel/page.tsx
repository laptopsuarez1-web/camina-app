'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, MessageCircle, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PartnerShell } from '@/components/PartnerShell';
import { bs, partnersWa, type Partner, type PartnerTotals } from '@/lib/partners';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'main' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'main' ? 'bg-auth-bg border-transparent' : 'bg-card border-line'}`}>
      <p className={`text-[12px] ${tone === 'main' ? 'text-auth-muted' : 'text-muted'}`}>{label}</p>
      <p className={`text-[26px] font-extrabold leading-tight mt-0.5 ${tone === 'main' ? 'text-mint' : 'text-text'}`}>{value}</p>
    </div>
  );
}

function Inicio({ partner }: { partner: Partner }) {
  const [t, setT] = useState<PartnerTotals | null>(null);

  useEffect(() => {
    supabase.rpc('partner_summary').then(({ data }) => setT((data as PartnerTotals) ?? null));
  }, []);

  const falta = t?.siguiente_bono ? t.siguiente_bono - t.activos : 0;

  return (
    <>
      <h1 className="text-[22px] font-bold text-text">Hola, {partner.full_name.split(' ')[0]}</h1>
      <p className="text-muted text-[13.5px] mb-5">
        Tu código es <b className="text-text">{partner.code}</b>. Úsalo siempre que reportes un local.
      </p>

      <Link href="/partners/panel/reportar" className="flex items-center justify-center gap-2 bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-2xl py-4 font-bold text-[15px] mb-5">
        <PlusCircle size={18} /> Reportar un local
      </Link>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="Te debemos" value={t ? bs(t.pendiente) : '…'} tone="main" />
        <Stat label="Ya cobraste" value={t ? bs(t.pagado) : '…'} />
        <Stat label="Locales activos" value={t ? String(t.activos) : '…'} />
        <Stat label="En camino" value={t ? String(t.publicados + t.reportados) : '…'} />
      </div>

      {t && t.siguiente_bono && (
        <p className="text-muted text-[13px] mb-5">
          {falta === 1 ? 'Te falta 1 local activo' : `Te faltan ${falta} locales activos`} para tu próximo bono de {t.siguiente_bono === 5 ? 'Bs 50' : 'Bs 100'}.
        </p>
      )}
      {t && !t.siguiente_bono && <p className="text-muted text-[13px] mb-5">Ya tienes todos los bonos. Sigue sumando locales.</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/partners/panel/guia" className="flex items-center gap-3 bg-card border border-line rounded-2xl p-4">
          <BookOpen size={22} className="text-purple shrink-0" />
          <div>
            <p className="font-semibold text-text text-[14px]">Guía y qué decir</p>
            <p className="text-muted text-[12.5px]">Guion, dudas del dueño y carga en 5 minutos.</p>
          </div>
        </Link>
        <a
          href={partnersWa(`Hola! Soy ${partner.full_name}, partner ${partner.code}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-card border border-line rounded-2xl p-4"
        >
          <MessageCircle size={22} className="text-aqua shrink-0" />
          <div>
            <p className="font-semibold text-text text-[14px]">Escribir a Camina</p>
            <p className="text-muted text-[12.5px]">Por WhatsApp: dudas, avisos o un local con problemas.</p>
          </div>
        </a>
      </div>
    </>
  );
}

export default function PanelPage() {
  return <PartnerShell>{(p) => <Inicio partner={p} />}</PartnerShell>;
}
