'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { supabase, type BusinessPlan } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { PLANS, PAYMENT_QR, WHATSAPP_NUMBER } from '@/lib/plans';
import { PaymentModal } from '@/components/PaymentModal';

// Pantalla que ve un comercio nuevo antes de entrar al panel: elige empezar gratis o un plan de pago.
export default function ElegirPlanPage() {
  const { session, business, role, loading } = useBusinessAuth();
  const router = useRouter();
  const [payingId, setPayingId] = useState<BusinessPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/login');
    else if (!business || role !== 'owner' || business.account_kind === 'events_only' || business.plan_onboarded) router.replace('/inicio');
  }, [loading, session, business, role, router]);

  async function finish() {
    if (!business) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from('businesses').update({ plan_onboarded: true }).eq('id', business.id);
    setSaving(false);
    if (e) {
      setError('No pudimos guardar tu elección. Intentá de nuevo.');
      return;
    }
    router.replace('/inicio');
  }

  const paying = PLANS.find((p) => p.id === payingId);
  const payingQr = payingId ? PAYMENT_QR[payingId] : undefined;

  if (loading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      {paying && payingQr && (
        <PaymentModal
          planName={paying.name}
          qr={payingQr}
          doneLabel="Listo, ya mandé el pago — entrar al panel"
          onClose={() => {
            setPayingId(null);
            finish();
          }}
        />
      )}
      <div className="w-full max-w-[980px] px-5 py-8">
        <div className="flex items-center gap-2.5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camina-logo.png" alt="Camina" width={36} height={36} className="rounded-full" />
          <span className="font-extrabold tracking-wide text-[18px]" style={{ color: '#241748' }}>CAMINA</span>
        </div>

        <p className="text-mint-dark font-semibold text-[13px] mb-1">¡Tu cuenta está lista, {business.name}!</p>
        <h1 className="text-[24px] font-bold mb-1.5">Elegí cómo querés empezar</h1>
        <p className="text-muted text-[13.5px] mb-6 max-w-[560px]">
          Podés empezar gratis y cambiar cuando quieras, sin permanencia. Con un plan de pago tu local se ve más y recibe más clientes.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-5">
          {PLANS.map((p) => {
            const free = p.id === 'primer_paso';
            return (
              <div
                key={p.id}
                className="flex-1 rounded-[18px] p-5.5 relative flex flex-col"
                style={{
                  background: p.featured ? '#241748' : '#fff',
                  border: `1.5px solid ${p.featured ? '#241748' : '#E1D2F5'}`,
                  color: p.featured ? '#fff' : '#291C47',
                }}
              >
                {p.featured && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-mint text-mint-dark text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                    Más elegido
                  </span>
                )}
                <p className="text-[17px] font-bold mb-0.5">{p.name}</p>
                <p className="text-xl font-bold mb-1.5" style={{ color: p.featured ? '#7FEDC4' : '#291C47' }}>{p.price}</p>
                <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: p.featured ? '#C4B8E8' : '#7C6A9C' }}>{p.blurb}</p>
                <div className="pt-3.5 mb-4.5 flex-1" style={{ borderTop: `1px solid ${p.featured ? '#4A3A78' : '#E1D2F5'}` }}>
                  {p.features.map((f) => (
                    <div key={f} className="flex gap-2 mb-2.5 items-start">
                      <Check size={13} color={p.featured ? '#7FEDC4' : '#4FC3A8'} className="mt-0.5 shrink-0" />
                      <span className="text-xs leading-relaxed" style={{ color: p.featured ? '#E4DBFA' : '#291C47' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => (free ? finish() : setPayingId(p.id))}
                  disabled={saving}
                  className="w-full py-2.5 rounded-[10px] font-semibold text-[13px] disabled:opacity-60"
                  style={{
                    background: p.featured ? '#7FEDC4' : free ? '#241748' : '#241748',
                    color: p.featured ? '#12281F' : '#7FEDC4',
                  }}
                >
                  {free ? (saving ? 'Entrando…' : 'Empezar gratis') : `Elegir ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="text-[13px] mb-3" style={{ color: '#c0392b' }}>{error}</p>}

        <p className="text-muted text-[12.5px] leading-relaxed max-w-[640px]">
          Los planes de pago se activan cuando confirmamos tu transferencia (te pedimos el comprobante por WhatsApp). Mientras tanto
          podés usar el panel. ¿Sos de los primeros 20 comercios? Tenés 3 meses gratis de Paso Firme:{' '}
          <a
            className="underline font-semibold"
            style={{ color: '#1f7d68' }}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Soy de los primeros comercios de Camina y quiero mis 3 meses gratis de Paso Firme.')}`}
          >
            pedilos por WhatsApp
          </a>
          .
        </p>
      </div>
    </div>
  );
}
