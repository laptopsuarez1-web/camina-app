'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Benefit } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { mensajeError } from '@/lib/errors';

interface Waiting {
  name: string;
  benefit_name: string;
  expires_at: string;
}

interface Overview {
  plan_ok: boolean;
  goal: number;
  days: number;
  benefit_id?: string | null;
  benefit_name?: string;
  waiting?: Waiting[];
  delivered_month?: number;
  delivered_total?: number;
}

const dia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/La_Paz' }) : '—';

export default function TarjetaPage() {
  const { business, role } = useBusinessAuth();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const locked = !!business && business.plan === 'primer_paso';
  const esDueno = role === 'owner';

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!business || locked) return;
    let vivo = true;
    Promise.all([
      supabase.from('benefits').select('*').eq('business_id', business.id).eq('active', true).order('cost_points'),
      supabase.rpc('business_loyalty_overview', { p_business_id: business.id }),
    ]).then(([{ data: bens }, { data: ov }]) => {
      if (!vivo) return;
      setBenefits((bens as Benefit[]) ?? []);
      const o = ov as Overview | null;
      setOverview(o);
      setElegido(o?.benefit_id ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [business, locked, recarga]);

  async function guardar() {
    if (!business) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc('set_loyalty_benefit', { p_business_id: business.id, p_benefit_id: elegido });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: mensajeError(error) });
      return;
    }
    setMsg({ ok: true, text: elegido ? 'Listo: tus clientes ya ven la tarjeta en tu ficha.' : 'Apagaste la tarjeta de fidelidad.' });
    setRecarga((n) => n + 1);
  }

  const goal = overview?.goal ?? 5;

  return (
    <DashboardShell>
      <TopBar title="Tarjeta de fidelidad" subtitle={`Camina tiene una tarjeta de fidelidad general: cada canje confirmado, en cualquier comercio, suma un sello. Con ${goal} sellos la persona elige un premio gratis entre los comercios que participan. Tú eliges el tuyo y aparece entre sus opciones.`} />

      {locked ? (
        <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
          <p className="font-bold text-[15px] mb-1.5">La tarjeta de fidelidad es de Paso Firme y Paso Adelante</p>
          <p className="text-muted text-[13px] leading-5 mb-4">
            Con Paso Firme (Bs 100/mes) o Paso Adelante (Bs 300/mes) tu premio aparece entre las opciones de quienes completan su tarjeta de {goal} canjes
            en cualquier comercio. Más visibilidad y más gente que llega a tu local.
          </p>
          <Link href="/plan" className="inline-block bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px]">
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="max-w-[860px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 mb-5">
            <div className="bg-card border border-line rounded-2xl p-5">
              <p className="font-bold text-[16px] mb-1">¿Qué premio regalas a quienes completan su tarjeta?</p>
              <p className="text-muted text-[12.5px] mb-3.5 leading-[18px]">
                Elige uno de tus premios activos: es el que verán todos los clientes de Camina al completar su tarjeta. El premio lo pones tú, como siempre; Camina no le descuenta Puntos al cliente en ese canje.
                Si lo cambias, quienes ya lo eligieron conservan el anterior hasta que venza su tarjeta.
              </p>
              {benefits.length === 0 ? (
                <p className="text-[13px] text-muted">
                  Primero crea un premio en <Link href="/beneficio" className="underline font-semibold">Mis beneficios</Link>.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {benefits.map((b) => (
                    <label
                      key={b.id}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer ${elegido === b.id ? 'border-[#1F7A66] bg-aqua-light' : 'border-line'}`}
                    >
                      <input type="radio" name="premio" checked={elegido === b.id} onChange={() => setElegido(b.id)} disabled={!esDueno} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[14px] truncate">{b.name}</span>
                        <span className="block text-muted text-[12px]">
                          {b.type === 'descuento' ? b.discount_detail ?? 'Descuento' : 'Gratis'} · hoy cuesta {b.cost_points} Puntos
                        </span>
                      </span>
                    </label>
                  ))}
                  {esDueno && (
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={guardar} disabled={saving} className="bg-auth-bg text-mint rounded-[10px] px-5 py-2.5 font-semibold text-[13.5px]">
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                      {elegido && (
                        <button onClick={() => setElegido(null)} className="text-muted text-[12.5px] underline">
                          No ofrecer tarjeta
                        </button>
                      )}
                    </div>
                  )}
                  {msg && <p className={`text-[12.5px] mt-1 ${msg.ok ? 'text-[#1A6555]' : 'text-warn'}`}>{msg.text}</p>}
                  <p className="text-muted text-[12px] mt-2">
                    Sellos para completar: <b>{goal}</b> · Días para canjear el premio: <b>{overview?.days ?? 30}</b> desde que se completa la tarjeta. La persona lo canjea en tu local con tu código del local.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 content-start">
              {[
                ['Esperan su premio', overview?.waiting?.length ?? 0],
                ['Premios entregados este mes', overview?.delivered_month ?? 0],
                ['Premios entregados en total', overview?.delivered_total ?? 0],
              ].map(([label, n]) => (
                <div key={label as string} className="bg-card border border-line rounded-2xl p-4">
                  <p className="text-muted text-[12px] leading-4">{label}</p>
                  <p className="text-[30px] font-extrabold">{n as number}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-line rounded-2xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <p className="font-bold text-[16px]">Clientes que eligieron tu premio</p>
              <p className="text-muted text-[12px]">Solo nombre de pila: no mostramos teléfonos ni correos.</p>
            </div>
            {overview?.waiting && overview.waiting.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="text-muted text-[11.5px] text-left">
                      <th className="py-2 pr-3 font-semibold">Cliente</th>
                      <th className="py-2 pr-3 font-semibold">Premio</th>
                      <th className="py-2 font-semibold">Puede canjearlo hasta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.waiting.map((c, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-2.5 pr-3 font-semibold">{c.name}</td>
                        <td className="py-2.5 pr-3">{c.benefit_name}</td>
                        <td className="py-2.5">{dia(c.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-[13px] py-3">Todavía nadie eligió tu premio. Cuando alguien lo elija con su tarjeta completa, aparece aquí con la fecha límite para canjearlo.</p>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
