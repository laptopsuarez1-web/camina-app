'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { RutaVisitas } from '@/components/RutaVisitas';
import { mensajeError } from '@/lib/errors';

type Resumen = {
  month: string;
  in_route: number;
  visits: number;
  is_featured: boolean;
  prize_title: string | null;
  prize_detail: string | null;
};

function mesLargo(iso: string) {
  const m = new Date(iso + 'T12:00:00').toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
  return m.charAt(0).toUpperCase() + m.slice(1);
}

// Todo lo de la Ruta del mes para este local, en un solo lugar y en orden: código, visitas por confirmar, números, premio y cómo funciona.
export default function RutaPage() {
  const { business } = useBusinessAuth();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    supabase.rpc('my_route_code', { p_business: business.id }).then(({ data, error: e }) => {
      if (e) setError(mensajeError(e));
      else setCodigo((data as string) ?? null);
    });
    supabase.rpc('route_business_overview', { p_business: business.id }).then(({ data }) => {
      if (data) setResumen(data as Resumen);
    });
  }, [business]);

  async function cambiarCodigo() {
    if (!business) return;
    if (!window.confirm('¿Cambiar el código de la Ruta? El anterior deja de servir y tienes que avisarle el nuevo a tu equipo.')) return;
    const { data, error: e } = await supabase.rpc('reset_route_code', { p_business: business.id });
    if (e) setError(mensajeError(e));
    else setCodigo(data as string);
  }

  return (
    <DashboardShell>
      <TopBar
        title="Ruta del mes"
        subtitle={resumen ? `${mesLargo(resumen.month)}. Todo lo de la Ruta para tu local.` : 'Todo lo de la Ruta para tu local.'}
      />

      <div className="max-w-[520px]">
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#241748', color: '#fff' }}>
          <p className="text-[13px] font-bold tracking-[0.08em]" style={{ color: '#7FEDC4' }}>CÓDIGO DE LA RUTA</p>
          <p className="text-[48px] font-extrabold tracking-[0.3em] leading-tight mt-1">{codigo ?? '····'}</p>
          <p className="text-[15px] leading-snug mt-1" style={{ color: '#E4DDF7' }}>
            Dáselo a quien viene por la Ruta cuando paga. La persona lo escribe en la app, estando en tu local.
          </p>
          <p className="text-[13px] mt-2" style={{ color: '#C4B8E8' }}>No es el mismo que el código de Canjes.</p>
          <button
            onClick={cambiarCodigo}
            disabled={!codigo}
            className="mt-4 rounded-xl px-4 py-2.5 text-[14px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            Cambiar código
          </button>
          {error && <p className="text-[14px] mt-2" style={{ color: '#F2985C' }}>{error}</p>}
        </div>

        {resumen && (
          <div className="bg-card border border-line rounded-2xl p-5 mb-5 flex items-center gap-4">
            <p className="text-[40px] font-extrabold leading-none">{resumen.in_route}</p>
            <p className="text-[15px] font-semibold leading-snug">
              {resumen.in_route === 1 ? 'persona tiene' : 'personas tienen'} tu local en su Ruta este mes
            </p>
          </div>
        )}

        {business && <RutaVisitas businessId={business.id} />}

        {resumen?.is_featured && (
          <div className="rounded-2xl p-5 mb-5 border" style={{ background: '#FFF4D6', borderColor: '#E2B33C', color: '#5C4306' }}>
            <p className="font-bold text-[16px]">Tu local es el protagonista de este mes</p>
            <p className="text-[14px] mt-1">Se ve con marco dorado en el mapa de la Ruta para todas las personas.</p>
          </div>
        )}

        {resumen?.prize_title && (
          <div className="bg-card border border-line rounded-2xl p-5 mb-5">
            <p className="text-muted text-[13px] font-bold tracking-[0.06em]">PREMIO DEL MES</p>
            <p className="font-bold text-[17px] mt-1">{resumen.prize_title}</p>
            {resumen.prize_detail && <p className="text-muted text-[14px] mt-1">{resumen.prize_detail}</p>}
          </div>
        )}

        <div className="bg-card border border-line rounded-2xl p-5 mb-5">
          <p className="font-bold text-[16px] mb-3">Cómo funciona</p>
          <ol className="text-[14.5px] leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>Cada mes las personas arman su Ruta con locales y la recorren.</li>
            <li>Cuando llegan a tu local, tú les das el código de la Ruta al pagar.</li>
            <li>La persona lo escribe en la app y aparece arriba como visita por confirmar.</li>
            <li>Confirmas si compró. Es una venta normal: no das descuento ni Puntos.</li>
          </ol>
        </div>
      </div>
    </DashboardShell>
  );
}
