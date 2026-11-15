'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PartnerShell } from '@/components/PartnerShell';
import { ESTADO_LABEL, bs, fecha, planLabel, type Partner, type PartnerLead } from '@/lib/partners';

const TONO: Record<PartnerLead['status'], { bg: string; fg: string }> = {
  reportado: { bg: 'var(--c-purple-light)', fg: 'var(--c-purple-text)' },
  publicado: { bg: 'var(--c-warn-light)', fg: 'var(--c-warn-text)' },
  activo: { bg: 'var(--c-aqua-light)', fg: 'var(--c-ok-text)' },
  rechazado: { bg: 'var(--c-danger-light)', fg: 'var(--c-danger-text)' },
};

function Lista({ partner }: { partner: Partner }) {
  const [leads, setLeads] = useState<PartnerLead[] | null>(null);

  useEffect(() => {
    supabase
      .from('partner_leads')
      .select('*')
      .eq('partner_id', partner.id)
      .order('reported_at', { ascending: false })
      .then(({ data }) => setLeads((data as PartnerLead[]) ?? []));
  }, [partner.id]);

  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">Mis locales</h1>
      <p className="text-muted text-[13.5px] mb-5">Aquí ves en qué paso va cada local que reportaste.</p>
      {leads === null ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : leads.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-5 text-center max-w-[460px]">
          <p className="text-text font-semibold mb-1">Todavía no reportaste ningún local</p>
          <p className="text-muted text-[13px] mb-3">Cuando cargues el primero con el dueño, repórtalo aquí.</p>
          <Link href="/partners/panel/reportar" className="inline-block bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-xl px-5 py-2.5 font-bold text-[13.5px]">Reportar un local</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 max-w-[640px]">
          {leads.map((l) => (
            <div key={l.id} className="bg-card border border-line rounded-2xl px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text text-[14.5px] truncate">{l.business_name}</p>
                  <p className="text-muted text-[12.5px]">{[l.zone, planLabel(l.plan_kind), `reportado el ${fecha(l.reported_at)}`].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0" style={{ background: TONO[l.status].bg, color: TONO[l.status].fg }}>{ESTADO_LABEL[l.status]}</span>
              </div>
              {l.status === 'activo' && <p className="text-[13px] mt-2" style={{ color: 'var(--c-ok-text)' }}>Te corresponden {bs(l.amount_bs)}.</p>}
              {l.status === 'publicado' && <p className="text-muted text-[12.5px] mt-2">Falta el primer canje real. Invita a un amigo que camine con la app a canjear ahí.</p>}
              {l.status === 'reportado' && (
                <Link href={`/partners/panel/reportar?id=${l.id}`} className="inline-block mt-2 text-purple text-[13px] font-semibold">Editar datos y ver cómo queda</Link>
              )}
              {l.admin_note && <p className="text-[12.5px] mt-2 rounded-lg px-3 py-2" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>Camina dice: {l.admin_note}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function LocalesPage() {
  return <PartnerShell>{(p) => <Lista partner={p} />}</PartnerShell>;
}
