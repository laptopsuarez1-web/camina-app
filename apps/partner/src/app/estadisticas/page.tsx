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

const DIAS = 14;

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
            className="w-full rounded-t-[6px]"
            style={{ height: Math.max(3, (i.value / max) * height), background: i.value > 0 ? '#4FC3A8' : '#E1D2F5' }}
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
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
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

  const stats = useMemo(() => {
    const total = rows.length;
    const answered = rows.filter((r) => r.extra_consumption !== null);
    const bought = answered.filter((r) => r.extra_consumption).length;
    const byDay = new Map<string, number>();
    const byHour = new Array(24).fill(0) as number[];
    const byBenefit = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.confirmed_at ?? r.created_at);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      byHour[d.getHours()] += 1;
      const name = r.benefit?.name ?? 'Beneficio';
      byBenefit.set(name, (byBenefit.get(name) ?? 0) + 1);
    }
    const days = Array.from({ length: DIAS }, (_, i) => {
      const d = new Date(Date.now() - (DIAS - 1 - i) * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: byDay.get(key) ?? 0 };
    });
    const hours = byHour
      .map((value, h) => ({ label: `${h}h`, value }))
      .filter((h) => h.label && parseInt(h.label, 10) >= 8 && parseInt(h.label, 10) <= 22);
    const top = [...byBenefit.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      pct: answered.length > 0 ? Math.round((bought / answered.length) * 100) : null,
      answered: answered.length,
      days,
      hours,
      top,
    };
  }, [rows]);

  return (
    <DashboardShell>
      <TopBar title="Estadísticas" subtitle="Cómo te va con Camina en los últimos 30 días." />

      {locked ? (
        <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
          <p className="font-bold text-[15px] mb-1.5">Las estadísticas son del plan Paso Firme</p>
          <p className="text-muted text-[13px] leading-5 mb-4">
            Con Paso Firme ves cuántos canjes tuviste por día, a qué hora te visitan más, cuál es tu beneficio favorito
            y cuántos clientes compraron algo más.
          </p>
          <Link href="/plan" className="inline-block bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px]">
            Ver planes
          </Link>
        </div>
      ) : loading ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : (
        <div className="max-w-[820px]">
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
              <p className="text-muted text-[12px]">Beneficio más canjeado</p>
              <p className="text-[15px] font-bold mt-1.5 leading-5">{stats.top ? `${stats.top[0]} (${stats.top[1]})` : '—'}</p>
            </div>
          </div>

          <div className="bg-card border border-line rounded-2xl p-5 mb-5 overflow-hidden">
            <p className="font-bold text-[14px] mb-3">Canjes por día (últimos {DIAS} días)</p>
            <Bars items={stats.days} />
          </div>

          <div className="bg-card border border-line rounded-2xl p-5 overflow-hidden">
            <p className="font-bold text-[14px] mb-3">Horas con más visitas</p>
            <Bars items={stats.hours} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
