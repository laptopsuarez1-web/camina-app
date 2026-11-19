'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { supabase, type Business } from '@/lib/supabase';

// Inicio: canjes confirmados por día en las últimas 2 semanas. Datos reales del local (la base solo deja leer los propios).
// Las estadísticas son de Paso Firme y Paso Adelante: en Primer Paso se muestra bloqueado, igual que en Estadísticas.
const DIAS = 14;

export function CanjesInicio({ business }: { business: Business }) {
  const bloqueado = business.plan === 'primer_paso';
  const [dias, setDias] = useState<{ label: string; n: number; hoy: boolean }[] | null>(null);

  useEffect(() => {
    if (bloqueado) return;
    const ahora = Date.now();
    const desde = new Date(ahora - (DIAS - 1) * 864e5);
    desde.setHours(0, 0, 0, 0);
    supabase
      .from('redemptions')
      .select('created_at, confirmed_at')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('created_at', desde.toISOString())
      .then(({ data }) => {
        const porDia = new Map<string, number>();
        for (const r of (data as { created_at: string; confirmed_at: string | null }[]) ?? []) {
          const d = new Date(r.confirmed_at ?? r.created_at);
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          porDia.set(k, (porDia.get(k) ?? 0) + 1);
        }
        setDias(
          Array.from({ length: DIAS }, (_, i) => {
            const d = new Date(ahora - (DIAS - 1 - i) * 864e5);
            return { label: `${d.getDate()}/${d.getMonth() + 1}`, n: porDia.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? 0, hoy: i === DIAS - 1 };
          }),
        );
      });
  }, [business.id, bloqueado]);

  if (bloqueado) {
    return (
      <div className="bg-card border border-line rounded-2xl p-5 mb-5 flex items-start gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center shrink-0">
          <Lock size={17} />
        </span>
        <div>
          <p className="font-bold text-[14px]">Tus canjes día a día</p>
          <p className="text-muted text-[13px] leading-5 mt-0.5">El gráfico de canjes y las estadísticas vienen con Paso Firme y Paso Adelante.</p>
          <Link href="/plan" className="inline-block text-[13px] font-semibold text-purple mt-2">Ver planes ›</Link>
        </div>
      </div>
    );
  }

  const total = dias?.reduce((a, d) => a + d.n, 0) ?? 0;
  const max = Math.max(1, ...(dias?.map((d) => d.n) ?? [0]));
  return (
    <div className="bg-card border border-line rounded-2xl p-5 mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="font-bold text-[14px]">Canjes de las últimas 2 semanas</p>
        <Link href="/estadisticas" className="text-[12.5px] font-semibold text-purple whitespace-nowrap">Ver estadísticas ›</Link>
      </div>
      {dias === null ? (
        <div className="h-[130px] rounded-xl bg-bg animate-pulse" />
      ) : total === 0 ? (
        <p className="text-muted text-[13px] py-8 text-center">Todavía no hay canjes confirmados en estas 2 semanas. Cuando alguien canjee en tu local, lo ves aquí.</p>
      ) : (
        <div className="flex items-end gap-1.5" style={{ height: 130 }} role="img" aria-label={`${total} canjes confirmados en las últimas 2 semanas`}>
          {dias.map((d, i) => (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full">
              <span className="text-[10.5px] font-semibold leading-none" style={{ color: 'var(--c-muted)' }}>{d.n > 0 ? d.n : ''}</span>
              <div className="w-full rounded-t-[6px] biz-bar" style={{ height: Math.max(4, (d.n / max) * 96), background: d.n > 0 ? 'var(--biz-mint)' : 'var(--c-line)', animationDelay: `${i * 25}ms` }} />
              <span className={`text-[9.5px] leading-none whitespace-nowrap h-[10px] ${d.hoy ? 'font-bold' : ''}`} style={{ color: d.hoy ? 'var(--c-text)' : 'var(--c-muted)' }}>{d.hoy ? 'Hoy' : i % 2 === 0 ? d.label : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
