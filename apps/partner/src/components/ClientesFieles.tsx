'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Datos = { visitantes: number; habituales: number; fans: number; top: { name: string; points: number }[]; reviews_month: number; stories_month: number };

// Clientes fieles: suben de nivel en tu local con canjes, reseñas e historias (0083).
export function ClientesFieles({ businessId }: { businessId: string }) {
  const [d, setD] = useState<Datos | null>(null);
  useEffect(() => {
    supabase.rpc('business_fans', { p_business: businessId }).then(({ data }) => setD((data as Datos) ?? null));
  }, [businessId]);
  if (!d || d.visitantes + d.habituales + d.fans === 0) return null;
  return (
    <div className="bg-card border border-line rounded-2xl p-5 mb-5">
      <p className="font-semibold text-sm mb-1">Tus clientes fieles</p>
      <p className="text-muted text-xs mb-3.5">Suben de nivel en tu local con canjes, reseñas e historias. Sus insignias se ven en su perfil.</p>
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        {[['Visitantes', d.visitantes], ['Habituales', d.habituales], ['Fans', d.fans]].map(([t, n]) => (
          <div key={t} className="bg-bg rounded-xl py-3 text-center">
            <p className="text-[22px] font-extrabold leading-none text-auth-bg">{n}</p>
            <p className="text-muted text-[11px] font-semibold mt-1">{t}</p>
          </div>
        ))}
      </div>
      {(d.top ?? []).length > 0 && (
        <>
          <p className="text-[12px] font-semibold text-muted mb-1">Tus Fans</p>
          {(d.top ?? []).map((f, i) => (
            <div key={i} className="border-t border-line py-2 flex justify-between text-[13px]">
              <span className="font-semibold">{f.name}</span>
              <span className="text-muted">{f.points} puntos</span>
            </div>
          ))}
        </>
      )}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-auth-bg rounded-xl py-3 text-center">
          <p className="text-mint text-[20px] font-extrabold leading-none">{d.reviews_month}</p>
          <p className="text-auth-muted text-[11px] font-semibold mt-1">Reseñas este mes</p>
        </div>
        <div className="bg-auth-bg rounded-xl py-3 text-center">
          <p className="text-mint text-[20px] font-extrabold leading-none">{d.stories_month}</p>
          <p className="text-auth-muted text-[11px] font-semibold mt-1">Historias este mes</p>
        </div>
      </div>
      <Link href="/beneficio" className="block text-center text-[12.5px] font-semibold text-purple mt-3.5">Crear un premio solo para tus Fans ›</Link>
    </div>
  );
}
