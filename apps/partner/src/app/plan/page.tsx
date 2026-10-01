'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { type BusinessPlan } from '@/lib/supabase';
import { PLANS, PAYMENT_QR, WHATSAPP_NUMBER } from '@/lib/plans';
import { PaymentModal } from '@/components/PaymentModal';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

export default function PlanPage() {
  const { business } = useBusinessAuth();
  const [confirmId, setConfirmId] = useState<BusinessPlan | null>(null);
  const [payingId, setPayingId] = useState<BusinessPlan | null>(null);
  const pending = PLANS.find((p) => p.id === confirmId);
  const paying = PLANS.find((p) => p.id === payingId);
  const payingQr = payingId ? PAYMENT_QR[payingId] : undefined;

  function selectPlan(planId: BusinessPlan) {
    if (PAYMENT_QR[planId]) {
      setPayingId(planId);
    } else {
      setConfirmId(planId);
    }
  }

  function requestDowngradeLink(planName: string) {
    const text = `Hola! Soy dueño de un comercio en Camina y quiero pasar al plan ${planName}.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  return (
    <DashboardShell>
      <TopBar title="Tu plan" subtitle="Cambiá cuando quieras — sin permanencia." />

      {paying && payingQr && (
        <PaymentModal planName={paying.name} qr={payingQr} onClose={() => setPayingId(null)} />
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[340px] text-center">
            <p className="font-bold text-[15px] mb-2">Pasar a {pending.name}</p>
            <p className="text-muted text-[12.5px] mb-4.5">
              Bajar de plan no es inmediato: si todavía te queda período pagado del plan actual, el cambio se
              aplica recién cuando termine ese mes. Escribinos y coordinamos.
            </p>
            <a
              href={requestDowngradeLink(pending.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-[10px] py-2.5 font-semibold text-[13px] mb-2"
              style={{ background: '#25D366', color: '#fff' }}
            >
              Pedirlo por WhatsApp
            </a>
            <button
              onClick={() => setConfirmId(null)}
              className="w-full bg-bg text-muted border border-line rounded-[10px] py-2.5 font-semibold text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {PLANS.map((p) => {
          const active = p.id === business?.plan;
          return (
            <div
              key={p.id}
              className="flex-1 rounded-[18px] p-5.5 relative"
              style={{
                background: p.featured ? '#241748' : '#fff',
                border: `1.5px solid ${active ? '#7FEDC4' : p.featured ? '#241748' : '#E1D2F5'}`,
                color: p.featured ? '#fff' : '#291C47',
              }}
            >
              {p.featured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-mint text-mint-dark text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                  Más elegido
                </span>
              )}
              {active && (
                <span
                  className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10.5px] font-bold"
                  style={{ color: p.featured ? '#7FEDC4' : '#4FC3A8' }}
                >
                  <Check size={12} /> Actual
                </span>
              )}
              <p className="text-[17px] font-bold mb-0.5">{p.name}</p>
              <p className="text-xl font-bold mb-1.5" style={{ color: p.featured ? '#7FEDC4' : '#291C47' }}>
                {p.price}
              </p>
              <p
                className="text-[12.5px] mb-4 leading-relaxed"
                style={{ color: p.featured ? '#C4B8E8' : '#7C6A9C' }}
              >
                {p.blurb}
              </p>
              <div
                className="pt-3.5 mb-4.5"
                style={{ borderTop: `1px solid ${p.featured ? '#4A3A78' : '#E1D2F5'}` }}
              >
                {p.features.map((f) => (
                  <div key={f} className="flex gap-2 mb-2.5 items-start">
                    <Check size={13} color={p.featured ? '#7FEDC4' : '#4FC3A8'} className="mt-0.5 shrink-0" />
                    <span className="text-xs leading-relaxed" style={{ color: p.featured ? '#E4DBFA' : '#291C47' }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => selectPlan(p.id)}
                disabled={active}
                className="w-full py-2.5 rounded-[10px] font-semibold text-[13px] disabled:cursor-default"
                style={{
                  background: active ? (p.featured ? 'rgba(127,237,196,0.15)' : '#F7F3FC') : p.featured ? '#7FEDC4' : '#241748',
                  color: active ? (p.featured ? '#7FEDC4' : '#7C6A9C') : p.featured ? '#12281F' : '#7FEDC4',
                }}
              >
                {active ? 'Tu plan actual' : 'Cambiar a este plan'}
              </button>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
