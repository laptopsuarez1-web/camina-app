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
  const pendientes = datos.visits.filter((v) => v.status === 'pending');
  const recientes = datos.visits.filter((v) => v.status === 'confirmed').slice(0, 5);

  return (
    <div className="bg-card border border-line rounded-2xl p-5 mb-5 max-w-[480px]">
      <p className="font-semibold text-sm mb-1">Visitas</p>
      <p className="text-muted text-xs mb-3.5">Clientes que vinieron por la Ruta. Confirma si compraron: es venta normal, sin descuento ni Puntos.</p>
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <div className="bg-auth-bg rounded-xl py-3 text-center">
          <p className="text-mint text-[22px] font-extrabold leading-none">{datos.month_visits}</p>
          <p className="text-auth-muted text-[11px] font-semibold mt-1">Visitas este mes</p>
        </div>
        <div className="bg-auth-bg rounded-xl py-3 text-center">
          <p className="text-mint text-[22px] font-extrabold leading-none">{datos.new_clients}</p>
          <p className="text-auth-muted text-[11px] font-semibold mt-1">Clientes nuevos</p>
        </div>
      </div>
      {pendientes.length > 0 && <p className="text-[12px] font-semibold text-muted mb-1">Por confirmar</p>}
      {pendientes.map((v) => (
        <div key={v.id} className="border-t border-line py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[13.5px]">{v.name}</span>
            <span className="text-muted text-[12px]">{hace(v.created_at)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => decidir(v.id, true)} disabled={busy === v.id}
              className="bg-mint text-mint-dark rounded-[10px] py-2.5 font-semibold text-[13px] inline-flex items-center justify-center gap-1.5">
              <Check size={14} /> Compró
            </button>
            <button onClick={() => decidir(v.id, false)} disabled={busy === v.id}
              className="border border-line rounded-[10px] py-2.5 font-semibold text-[13px] inline-flex items-center justify-center gap-1.5">
              <X size={14} /> No compró
            </button>
          </div>
        </div>
      ))}
      {recientes.map((v) => (
        <div key={v.id} className="border-t border-line py-2.5 flex items-center justify-between">
          <span className="text-[13px]">{v.name}</span>
          <span className="text-[11.5px] font-semibold text-[#2E9E7C] inline-flex items-center gap-1"><Check size={13} /> Visita confirmada</span>
        </div>
      ))}
      {error && <p className="text-warn text-[12.5px] mt-2.5">{error}</p>}
    </div>
  );
}
