'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PartnerShell } from '@/components/PartnerShell';
import { PLAN_KINDS, bs, fecha, partnersWa, type Partner, type PartnerPayment, type PartnerTotals } from '@/lib/partners';

function Cobros({ partner }: { partner: Partner }) {
  const [t, setT] = useState<PartnerTotals | null>(null);
  const [pagos, setPagos] = useState<PartnerPayment[] | null>(null);

  useEffect(() => {
    supabase.rpc('partner_summary').then(({ data }) => setT((data as PartnerTotals) ?? null));
    supabase.from('partner_payments').select('*').eq('partner_id', partner.id).order('paid_at', { ascending: false })
      .then(({ data }) => setPagos((data as PartnerPayment[]) ?? []));
  }, [partner.id]);

  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">Mis cobros</h1>
      <p className="text-muted text-[13.5px] mb-5">Se paga los viernes lo que quedó activo esa semana.</p>

      <div className="bg-auth-bg rounded-2xl p-5 mb-4 max-w-[460px]">
        <p className="text-auth-muted text-[12px]">Te debemos</p>
        <p className="text-mint text-[34px] font-extrabold leading-tight">{t ? bs(t.pendiente) : '…'}</p>
        {t && (
          <p className="text-auth-muted text-[12.5px] mt-1">
            Ganado {bs(t.ganado)} ({bs(t.ganado_locales)} por locales{t.bono > 0 ? ` + ${bs(t.bono)} de bono` : ''}) · pagado {bs(t.pagado)}
          </p>
        )}
        <a
          href={partnersWa(`Hola! Soy ${partner.full_name}, partner ${partner.code}. Quiero consultar mi cobro.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 border border-mint/40 text-mint rounded-xl px-4 py-2 text-[13px] font-semibold"
        >
          Consultar mi cobro por WhatsApp
        </a>
      </div>

      <h2 className="text-[16px] font-bold text-text mb-2">Cuánto se paga por local activo</h2>
      <div className="bg-card border border-line rounded-2xl divide-y divide-line max-w-[460px] mb-3">
        {PLAN_KINDS.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-text text-[14px]">Local con {p.label.charAt(0).toLowerCase() + p.label.slice(1)}</span>
            <span className="font-extrabold text-[18px] text-text">{bs(p.amount)}</span>
          </div>
        ))}
      </div>
      <ul className="text-muted text-[13px] list-disc pl-5 mb-6 max-w-[520px] space-y-1">
        <li>Local activo = publicado, con premio cargado y un primer canje real (no tuyo, ni de tu familia, ni del dueño).</li>
        <li>Cobras una sola vez por cada local. No hay pagos por renovación ni porcentajes.</li>
        <li>Bonos: +Bs 50 al llegar a 5 locales activos y +Bs 100 más al llegar a 10.</li>
        <li>Un local, un partner: gana quien lo reportó primero.</li>
        <li>Quien canjee en sus propios locales, cree cuentas falsas o cargue un local sin permiso del dueño sale del programa y no cobra lo pendiente.</li>
      </ul>

      <h2 className="text-[16px] font-bold text-text mb-2">Pagos recibidos</h2>
      {pagos === null ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : pagos.length === 0 ? (
        <p className="text-muted text-[13.5px]">Todavía no hay pagos.</p>
      ) : (
        <div className="bg-card border border-line rounded-2xl divide-y divide-line max-w-[460px]">
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-text text-[14px] font-semibold">{bs(p.amount_bs)}</p>
                <p className="text-muted text-[12px]">{fecha(p.paid_at)}{p.note ? ` · ${p.note}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function CobrosPage() {
  return <PartnerShell>{(p) => <Cobros partner={p} />}</PartnerShell>;
}
