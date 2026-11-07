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

// Todo lo de la Ruta del mes para este local, en un solo lugar.
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
      <TopBar title="Ruta del mes" subtitle={resumen ? `${mesLargo(resumen.month)}. Todo lo de la Ruta para tu local.` : 'Todo lo de la Ruta para tu local.'} />

      <div className="max-w-[480px]">
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#241748', color: '#fff' }}>
          <p className="text-[11px] font-bold tracking-[0.1em]" style={{ color: '#7FEDC4' }}>CÓDIGO DE LA RUTA</p>
          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="text-[40px] font-extrabold tracking-[0.3em] leading-tight">{codigo ?? '····'}</p>
            <button
              onClick={cambiarCodigo}
              disabled={!codigo}
              className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              Cambiar código
            </button>
          </div>
          <p className="text-[12.5px] mt-1.5" style={{ color: '#C4B8E8' }}>
            Es distinto del código de canjes. Dáselo solo a quien viene por la Ruta, al pagar. La persona lo escribe en la app estando en tu local.
          </p>
          {error && <p className="text-[12.5px] mt-2" style={{ color: '#F2985C' }}>{error}</p>}
        </div>

        {resumen && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="bg-card border border-line rounded-2xl py-4 text-center">
              <p className="text-[26px] font-extrabold leading-none">{resumen.in_route}</p>
              <p className="text-muted text-[11.5px] font-semibold mt-1.5">Personas con tu local en su Ruta</p>
            </div>
            <div className="bg-card border border-line rounded-2xl py-4 text-center">
              <p className="text-[26px] font-extrabold leading-none">{resumen.visits}</p>
              <p className="text-muted text-[11.5px] font-semibold mt-1.5">Visitas confirmadas</p>
            </div>
          </div>
        )}

        {resumen?.is_featured && (
          <div className="rounded-2xl p-4 mb-5 border" style={{ background: '#FFF4D6', borderColor: '#E2B33C', color: '#5C4306' }}>
            <p className="font-bold text-sm">Tu local es el protagonista de la Ruta este mes</p>
            <p className="text-[12.5px] mt-1">Aparece destacado con marco dorado en el mapa de la Ruta para todas las personas.</p>
          </div>
        )}

        {resumen?.prize_title && (
          <div className="bg-card border border-line rounded-2xl p-4 mb-5">
            <p className="text-muted text-[11px] font-bold tracking-[0.08em]">PREMIO DEL MES</p>
            <p className="font-bold text-[15px] mt-1">{resumen.prize_title}</p>
            {resumen.prize_detail && <p className="text-muted text-[12.5px] mt-1">{resumen.prize_detail}</p>}
          </div>
        )}

        <div className="bg-card border border-line rounded-2xl p-5 mb-5">
          <p className="font-semibold text-sm mb-2">Cómo funciona</p>
          <ol className="text-muted text-[12.5px] leading-relaxed list-decimal pl-4 space-y-1">
            <li>Cada mes las personas arman su Ruta con locales y la recorren.</li>
            <li>Cuando alguien llega a tu local, tú le das el código de la Ruta al pagar.</li>
            <li>La persona lo escribe en la app, y aparece abajo como visita por confirmar.</li>
            <li>Confirmas si compró. Es venta normal: no das descuento ni Puntos.</li>
          </ol>
        </div>
      </div>

      {business && <RutaVisitas businessId={business.id} />}
    </DashboardShell>
  );
}
