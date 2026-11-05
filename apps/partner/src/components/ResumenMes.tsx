'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Resumen = {
  month: string;
  canjes: number; canjes_prev: number;
  ruta: number; ruta_prev: number; en_rutas?: number;
  personas: number; personas_prev: number;
  nuevos: number; volvieron: number;
  compraron_extra: number;
  calificaciones: number; historias: number;
  favoritos: number; favoritos_mes: number;
  habituales: number; fans: number;
  mejor_dia: number | null; mejor_hora: number | null;
};

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// "+3 vs. octubre" / "-1 vs. octubre" / "igual que octubre".
function Cambio({ now, prev, mes }: { now: number; prev: number; mes: string }) {
  const d = now - prev;
  if (prev === 0 && now === 0) return null;
  const color = d > 0 ? '#1F7A66' : d < 0 ? '#B4542F' : '#8E82AE';
  return <span className="text-[11px] font-semibold" style={{ color }}>{d === 0 ? `igual que ${mes}` : `${d > 0 ? '+' : ''}${d} vs. ${mes}`}</span>;
}

// Resumen del mes (0090): cuánta gente te trajo Camina, cuántos son nuevos y cuántos volvieron.
export function ResumenMes({ businessId }: { businessId: string }) {
  const [r, setR] = useState<Resumen | null>(null);
  useEffect(() => {
    supabase.rpc('business_month_summary', { p_business: businessId }).then(({ data, error }) => setR(error ? null : ((data as Resumen) ?? null)));
  }, [businessId]);
  if (!r) return null;
  const mes = new Date(r.month + 'T12:00:00Z').toLocaleDateString('es-BO', { month: 'long', timeZone: 'UTC' });
  const prevMes = new Date(new Date(r.month + 'T12:00:00Z').setUTCMonth(new Date(r.month + 'T12:00:00Z').getUTCMonth() - 1)).toLocaleDateString('es-BO', { month: 'long', timeZone: 'UTC' });
  const total = r.canjes + r.ruta;
  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(140deg, #2A1A55 0%, #1A1033 100%)', color: '#fff' }}>
      <p className="text-[11px] font-bold tracking-[0.12em]" style={{ color: '#7FEDC4' }}>TU RESUMEN DE {mes.toUpperCase()}</p>
      <p className="text-[22px] font-extrabold leading-tight mt-1">
        {r.personas === 0 ? 'Este mes todavía no vino nadie por Camina' : `Camina te trajo ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}`}
      </p>
      {r.personas > 0 && (
        <p className="text-[13px] mt-1" style={{ color: '#C4B8E8' }}>
          {r.nuevos} {r.nuevos === 1 ? 'nueva' : 'nuevas'} · {r.volvieron} {r.volvieron === 1 ? 'volvió' : 'volvieron'} · <Cambio now={r.personas} prev={r.personas_prev} mes={prevMes} />
        </p>
      )}

      {(r.en_rutas ?? 0) > 0 && (
        <p className="text-[13px] mt-2 rounded-xl px-3 py-2" style={{ background: 'rgba(127,237,196,0.12)', color: '#7FEDC4' }}>
          Este mes tu local le tocó a <strong>{r.en_rutas} {r.en_rutas === 1 ? 'persona' : 'personas'}</strong> en su Ruta del mes: pueden venir en cualquier momento hasta fin de mes.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          ['Canjes', r.canjes, r.canjes_prev],
          ['Visitas de la Ruta', r.ruta, r.ruta_prev],
        ].map(([t, n, p]) => (
          <div key={t as string} className="rounded-xl py-3 px-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[22px] font-extrabold leading-none" style={{ color: '#7FEDC4' }}>{n}</p>
            <p className="text-[11.5px] font-semibold mt-1" style={{ color: '#C4B8E8' }}>{t}</p>
            <Cambio now={n as number} prev={p as number} mes={prevMes} />
          </div>
        ))}
        {[
          ['Compraron algo más', r.compraron_extra],
          ['Calificaciones', r.calificaciones],
          ['Historias en Instagram', r.historias],
          ['Te guardaron en favoritos', r.favoritos_mes],
        ].map(([t, n]) => (
          <div key={t as string} className="rounded-xl py-3 px-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[22px] font-extrabold leading-none">{n}</p>
            <p className="text-[11.5px] font-semibold mt-1" style={{ color: '#C4B8E8' }}>{t}</p>
          </div>
        ))}
      </div>

      {total > 0 && r.mejor_dia && (
        <p className="text-[12.5px] mt-3.5" style={{ color: '#C4B8E8' }}>
          Tu mejor día fue el <strong className="text-white">{DIAS[r.mejor_dia]}</strong>
          {r.mejor_hora != null && <> y la hora con más movimiento, las <strong className="text-white">{String(r.mejor_hora).padStart(2, '0')}:00</strong></>}.
          {' '}Tienes {r.habituales} {r.habituales === 1 ? 'cliente Habitual' : 'clientes Habituales'} y {r.fans} {r.fans === 1 ? 'Fan' : 'Fans'}.
        </p>
      )}
      <p className="text-[11.5px] mt-3" style={{ color: '#8E82AE' }}>
        Las visitas de la Ruta son personas que Camina mandó a tu local y compraron, sin que tengas que dar un descuento.
      </p>
    </div>
  );
}
