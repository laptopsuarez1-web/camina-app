'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

interface Row {
  id: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  created_at: string;
  confirmed_at: string | null;
  extra_consumption: boolean | null;
  benefit: { name: string } | null;
}

const PERIODOS = [7, 30, 90] as const;
type Periodo = (typeof PERIODOS)[number];

function Bars({ items, height = 90 }: { items: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  // Con muchas barras no entran todas las etiquetas en el celular: se muestra una sí y una no.
  const step = items.length > 10 ? 2 : 1;
  return (
    <div className="flex items-end gap-1 w-full overflow-hidden" style={{ height: height + 22 }}>
      {items.map((i, idx) => (
        <div key={i.label} className="flex-1 basis-0 min-w-0 flex flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted leading-none">{i.value > 0 ? i.value : ''}</span>
          <div
            className="w-full rounded-t-[6px] biz-bar"
            style={{ height: Math.max(3, (i.value / max) * height), background: i.value > 0 ? 'var(--biz-mint)' : 'var(--c-line)' }}
          />
          <span className="text-[9.5px] text-muted leading-none whitespace-nowrap h-[10px]">{idx % step === 0 ? i.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function EstadisticasPage() {
  const { business } = useBusinessAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const locked = business?.plan === 'primer_paso';

  useEffect(() => {
    if (!business || locked) {
      setLoading(false);
      return;
    }
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    supabase
      .from('redemptions')
      .select('id, status, created_at, confirmed_at, extra_consumption, benefit:benefits(name)')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('created_at', since)
      .then(({ data }) => {
        setRows((data as unknown as Row[]) ?? []);
        setLoading(false);
      });
  }, [business, locked]);

  // Hoy, fijado una vez al abrir la página: los gráficos cuentan los últimos días hacia atrás desde aquí.
  const [ahora] = useState(() => Date.now());
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const stats = useMemo(() => {
    const desde = ahora - periodo * 24 * 3600 * 1000;
    const enPeriodo = rows.filter((r) => new Date(r.confirmed_at ?? r.created_at).getTime() >= desde);
    const total = enPeriodo.length;
    const answered = enPeriodo.filter((r) => r.extra_consumption !== null);
    const bought = answered.filter((r) => r.extra_consumption).length;
    const byDay = new Map<string, number>();
    const byHour = new Array(24).fill(0) as number[];
    const byBenefit = new Map<string, number>();
    for (const r of enPeriodo) {
      const d = new Date(r.confirmed_at ?? r.created_at);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      byHour[d.getHours()] += 1;
      const name = r.benefit?.name ?? 'Premio';
      byBenefit.set(name, (byBenefit.get(name) ?? 0) + 1);
    }
    // 7 y 30 días: una barra por día. 90 días: una barra por semana.
    const dia = (k: number) => new Date(ahora - k * 24 * 3600 * 1000);
    const days =
      periodo === 90
        ? Array.from({ length: 13 }, (_, w) => {
            let value = 0;
            for (let k = 0; k < 7; k++) value += byDay.get(dia((12 - w) * 7 + k).toISOString().slice(0, 10)) ?? 0;
            const ini = dia((12 - w) * 7 + 6);
            return { label: `${ini.getDate()}/${ini.getMonth() + 1}`, value };
          })
        : Array.from({ length: periodo }, (_, i) => {
            const d = dia(periodo - 1 - i);
            return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: byDay.get(d.toISOString().slice(0, 10)) ?? 0 };
          });
    const ranking = [...byBenefit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    // Horario comercial (8 a 22 h); si hubo canjes fuera de ese horario, se muestran las 24 horas.
    const fuera = byHour.some((v, h) => v > 0 && (h < 8 || h > 22));
    const hours = byHour.map((value, h) => ({ label: `${h}h`, value })).filter((_, h) => fuera || (h >= 8 && h <= 22));
    const top = [...byBenefit.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      pct: answered.length > 0 ? Math.round((bought / answered.length) * 100) : null,
      answered: answered.length,
      days,
      hours,
      top,
      ranking,
    };
  }, [rows, ahora, periodo]);

  return (
    <DashboardShell>
      <TopBar title="Estadísticas" subtitle="Cómo te va con Camina. Solo cuentan los canjes confirmados." />

      {locked ? (
        <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
          <p className="font-bold text-[15px] mb-1.5">Las estadísticas son del plan Paso Firme</p>
          <p className="text-muted text-[13px] leading-5 mb-4">
            Con Paso Firme ves cuántos canjes tuviste por día, a qué hora te visitan más, cuál es tu premio favorito
            y cuántos clientes compraron algo más.
          </p>
          <Link href="/plan" className="inline-block bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px]">
            Ver planes
          </Link>
        </div>
      ) : loading ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : (
        <div className="max-w-[980px]">
          <div className="biz-seg mb-5" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p} type="button" aria-pressed={periodo === p} className={periodo === p ? 'is-on' : ''} onClick={() => setPeriodo(p)}>
                Últimos {p} días
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
            <div className="bg-card border border-line rounded-2xl p-4">
              <p className="text-muted text-[12px]">Canjes confirmados</p>
              <p className="text-[28px] font-extrabold">{stats.total}</p>
            </div>
            <div className="bg-card border border-line rounded-2xl p-4">
              <p className="text-muted text-[12px]">Compraron algo más</p>
              <p className="text-[28px] font-extrabold">{stats.pct === null ? '—' : `${stats.pct}%`}</p>
              <p className="text-muted text-[11px]">{stats.answered} respuestas</p>
            </div>
            <div className="bg-card border border-line rounded-2xl p-4">
              <p className="text-muted text-[12px]">Premio más canjeado</p>
              <p className="text-[15px] font-bold mt-1.5 leading-5">{stats.top ? `${stats.top[0]} (${stats.top[1]})` : '—'}</p>
            </div>
          </div>

          <div className="bg-card border border-line rounded-2xl p-5 mb-5 overflow-hidden">
            <p className="font-bold text-[14px] mb-3">{periodo === 90 ? 'Canjes por semana (últimos 90 días)' : `Canjes por día (últimos ${periodo} días)`}</p>
            {stats.total === 0 ? <Vacio /> : <Bars items={stats.days} height={120} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card border border-line rounded-2xl p-5 overflow-hidden">
              <p className="font-bold text-[14px] mb-3">Horas con más visitas</p>
              {stats.total === 0 ? <Vacio /> : <Bars items={stats.hours} />}
            </div>
            <div className="bg-card border border-line rounded-2xl p-5">
              <p className="font-bold text-[14px] mb-3">Premios más canjeados</p>
              {stats.ranking.length === 0 ? (
                <Vacio />
              ) : (
                <ul className="flex flex-col gap-3">
                  {stats.ranking.map(([nombre, n]) => (
                    <li key={nombre}>
                      <div className="flex justify-between gap-3 text-[13px] mb-1">
                        <span className="font-semibold truncate">{nombre}</span>
                        <span className="text-muted whitespace-nowrap">{n} {n === 1 ? 'canje' : 'canjes'}</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg overflow-hidden">
                        <div className="h-full rounded-full biz-bar" style={{ width: `${(n / stats.ranking[0][1]) * 100}%`, background: 'var(--biz-mint)' }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// Sin canjes confirmados en el período: se dice claro, sin gráficos vacíos.
function Vacio() {
  return <p className="text-muted text-[13px] py-6 text-center">Todavía no hay canjes confirmados en este período.</p>;
}
