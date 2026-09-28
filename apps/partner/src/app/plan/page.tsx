'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { supabase, type BusinessPlan } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

const WHATSAPP_NUMBER = '59162714286';

const PAYMENT_QR: Partial<Record<BusinessPlan, { image: string; amount: string }>> = {
  paso_firme: { image: '/payment/qr-paso-firme.jpg', amount: 'Bs 100' },
  paso_adelante: { image: '/payment/qr-paso-adelante.webp', amount: 'Bs 300' },
};

function whatsappLink(planName: string, amount: string) {
  const text = `Hola! Soy dueño de un comercio en Camina y quiero pasar al plan ${planName} (${amount}). Te mando el comprobante de la transferencia.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const PLANS: {
  id: BusinessPlan;
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
}[] = [
  {
    id: 'primer_paso',
    name: 'Primer Paso',
    price: 'Gratis',
    blurb: 'Empezá a recibir clientes sin costo fijo.',
    features: [
      'Aparecés en el mapa y tu categoría',
      '1 solo beneficio activo, 100% gratis',
      'Mínimo 3 cupones por día',
      'Sin estadísticas',
    ],
  },
  {
    id: 'paso_firme',
    name: 'Paso Firme',
    price: 'Bs 100/mes',
    blurb: 'Combiná regalos y descuentos, sin límite.',
    features: [
      'Todo lo de Primer Paso',
      'Podés combinar regalo y descuento',
      'Cupones ilimitados',
      'Varios beneficios a la vez',
      'Estadísticas básicas',
    ],
    featured: true,
  },
  {
    id: 'paso_adelante',
    name: 'Paso Adelante',
    price: 'Bs 300/mes',
    blurb: 'Sé la primera opción de tu zona.',
    features: [
      'Todo lo de Paso Firme',
      'Pin destacado en el mapa',
      'Primero en tu categoría',
      'Notificaciones push cerca tuyo',
      'Elegible para sorteos',
    ],
  },
];

export default function PlanPage() {
  const { business, refreshBusiness, session } = useBusinessAuth();
  const [confirmId, setConfirmId] = useState<BusinessPlan | null>(null);
  const [payingId, setPayingId] = useState<BusinessPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function confirmChange() {
    if (!business || !confirmId) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('businesses').update({ plan: confirmId }).eq('id', business.id);
    setSaving(false);
    setConfirmId(null);
    if (error) {
      setError('No pudimos aplicar el cambio. Intentá de nuevo o escribinos.');
      return;
    }
    if (session) await refreshBusiness(session.user.id, session.user.email);
  }

  return (
    <DashboardShell>
      <TopBar title="Tu plan" subtitle="Cambiá cuando quieras — sin permanencia." />

      {error && (
        <div className="bg-warn-light text-[13px] rounded-xl px-4 py-3 mb-5 max-w-[620px]" style={{ color: '#8A5A2E' }}>
          {error}
        </div>
      )}

      {paying && payingQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[360px] w-full text-center">
            <p className="font-bold text-[15px] mb-1">Pasar a {paying.name}</p>
            <p className="text-muted text-[12.5px] mb-4">
              Escaneá el código con tu app del banco y transferí el monto exacto ({payingQr.amount}).
              Después mandanos el comprobante por WhatsApp y activamos tu plan.
            </p>
            <div className="rounded-xl overflow-hidden border border-line mb-4">
              <Image src={payingQr.image} alt={`QR de pago ${paying.name}`} width={340} height={480} className="w-full h-auto" />
            </div>
            <a
              href={whatsappLink(paying.name, payingQr.amount)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-[10px] py-2.5 font-semibold text-[13px] mb-2"
              style={{ background: '#25D366', color: '#fff' }}
            >
              Enviar comprobante por WhatsApp
            </a>
            <button
              onClick={() => setPayingId(null)}
              className="w-full bg-bg text-muted border border-line rounded-[10px] py-2.5 font-semibold text-[13px]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-[340px] text-center">
            <p className="font-bold text-[15px] mb-2">¿Cambiar a {pending.name}?</p>
            <p className="text-muted text-[12.5px] mb-4.5">
              {pending.price === 'Gratis'
                ? 'No se te va a cobrar nada.'
                : `Se te va a facturar ${pending.price} desde hoy.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmChange}
                disabled={saving}
                className="flex-1 rounded-[10px] py-2.5 font-semibold"
                style={{ background: '#241748', color: '#7FEDC4' }}
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 bg-bg text-muted border border-line rounded-[10px] py-2.5 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
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
