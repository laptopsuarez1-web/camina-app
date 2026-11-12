'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';

type Visita = { id: string; status: 'pending' | 'confirmed'; created_at: string; name: string };
type Datos = { month_visits: number; new_clients: number; visits: Visita[] };

function hace(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'Recién';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

// Ruta del mes: clientes que vinieron por la Ruta escriben el código de la Ruta (distinto del de canjes) y el local confirma si compraron.
// Es venta normal: el local no da descuento ni Puntos.
export function RutaVisitas({ businessId }: { businessId: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('route_business_visits', { p_business: businessId });
    if (!e) setDatos(data as Datos);
  }, [businessId]);

  useEffect(() => {
    const first = setTimeout(cargar, 0);
    const t = setInterval(cargar, 20000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [cargar]);

  async function decidir(id: string, compro: boolean) {
    setBusy(id);
    setError(null);
    const { error: e } = await supabase.rpc('route_decide_visit', { p_visit: id, p_bought: compro });
    setBusy(null);
    if (e) setError(mensajeError(e));
    cargar();
  }

  if (!datos) return null;
  const pendientes = (datos.visits ?? []).filter((v) => v.status === 'pending');
  const recientes = (datos.visits ?? []).filter((v) => v.status === 'confirmed').slice(0, 5);

  return (
    <>
      <div className="bg-card border border-line rounded-2xl p-5 mb-5">
        <p className="font-bold text-[16px] mb-1">Visitas por confirmar</p>
        <p className="text-muted text-[14px] mb-3">Aquí aparece quien escribió tu código de la Ruta. Pregunta si compró y toca el botón.</p>
        {pendientes.length === 0 && (
          <p className="text-muted text-[14px] bg-bg rounded-xl px-4 py-3">Por ahora no hay visitas esperando.</p>
        )}
        {pendientes.map((v) => (
          <div key={v.id} className="border-t border-line py-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-bold text-[16px]">{v.name}</span>
              <span className="text-muted text-[13px]">{hace(v.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => decidir(v.id, true)} disabled={busy === v.id}
                className="bg-mint text-mint-dark rounded-xl py-3 font-bold text-[15px] inline-flex items-center justify-center gap-1.5">
                <Check size={16} /> Sí compró
              </button>
              <button onClick={() => decidir(v.id, false)} disabled={busy === v.id}
                className="border border-line rounded-xl py-3 font-bold text-[15px] inline-flex items-center justify-center gap-1.5">
                <X size={16} /> No compró
              </button>
            </div>
          </div>
        ))}
        {error && <p className="text-warn text-[14px] mt-2.5">{error}</p>}
      </div>

      <div className="bg-card border border-line rounded-2xl p-5 mb-5">
        <p className="font-bold text-[16px] mb-3">Este mes</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg rounded-xl py-3.5 text-center">
            <p className="text-[28px] font-extrabold leading-none">{datos.month_visits}</p>
            <p className="text-muted text-[13px] font-semibold mt-1.5">Visitas confirmadas</p>
          </div>
          <div className="bg-bg rounded-xl py-3.5 text-center">
            <p className="text-[28px] font-extrabold leading-none">{datos.new_clients}</p>
            <p className="text-muted text-[13px] font-semibold mt-1.5">Clientes nuevos</p>
          </div>
        </div>
        {recientes.length > 0 && <p className="text-[13px] font-semibold text-muted mt-4 mb-1">Últimas confirmadas</p>}
        {recientes.map((v) => (
          <div key={v.id} className="border-t border-line py-2.5 flex items-center justify-between">
            <span className="text-[15px]">{v.name}</span>
            <span className="text-[13px] font-semibold text-[#2E9E7C] inline-flex items-center gap-1"><Check size={14} /> Confirmada</span>
          </div>
        ))}
      </div>
    </>
  );
}
