'use client';

import { useEffect, useState } from 'react';
import { supabase, type Business } from '@/lib/supabase';

// En qué sucursales vale un premio (0134). Sin reglas = vale en todas (como siempre).
// Solo aparece si el comercio tiene sucursales cargadas; si la base todavía no las tiene, no se muestra nada.

export const PRINCIPAL = 'main';

export type LugarPremio = { key: string; label: string };
export type ReglasPremio = { soloAlgunas: boolean; elegidas: Record<string, { on: boolean; cupos: string }> };

// Lugares del comercio (principal + sucursales) y las reglas que ya tiene el premio.
export function useSucursalesPremio(business: Business, benefitId: string | null) {
  const [lugares, setLugares] = useState<LugarPremio[] | null>(null);
  const [reglas, setReglas] = useState<ReglasPremio>({ soloAlgunas: false, elegidas: {} });
  useEffect(() => {
    let vivo = true;
    (async () => {
      const br = await supabase.from('business_branches').select('id, name').eq('business_id', business.id).order('created_at');
      if (!vivo || br.error || !br.data?.length) return;
      const ls: LugarPremio[] = [
        { key: PRINCIPAL, label: business.branch_label?.trim() || 'Principal' },
        ...(br.data as { id: string; name: string }[]).map((b) => ({ key: b.id, label: b.name })),
      ];
      const elegidas: ReglasPremio['elegidas'] = {};
      for (const l of ls) elegidas[l.key] = { on: true, cupos: '' };
      let soloAlgunas = false;
      if (benefitId) {
        const rs = await supabase.from('benefit_branches').select('branch_id, daily_quota').eq('benefit_id', benefitId);
        if (!vivo) return;
        const filas = (rs.data ?? []) as { branch_id: string | null; daily_quota: number | null }[];
        if (filas.length > 0) {
          soloAlgunas = true;
          for (const l of ls) elegidas[l.key] = { on: false, cupos: '' };
          for (const f of filas) {
            const k = f.branch_id ?? PRINCIPAL;
            if (elegidas[k]) elegidas[k] = { on: true, cupos: f.daily_quota != null ? String(f.daily_quota) : '' };
          }
        }
      }
      setLugares(ls);
      setReglas({ soloAlgunas, elegidas });
    })();
    return () => {
      vivo = false;
    };
  }, [business.id, business.branch_label, benefitId]);
  return { lugares, reglas, setReglas };
}

export function reglasValidas(lugares: LugarPremio[] | null, r: ReglasPremio): string | null {
  if (!lugares || !r.soloAlgunas) return null;
  const on = lugares.filter((l) => r.elegidas[l.key]?.on);
  if (on.length === 0) return 'Elige al menos una sucursal donde vale el premio.';
  for (const l of on) {
    const c = r.elegidas[l.key].cupos;
    if (c && !(Number(c) >= 1 && Number(c) <= 10000)) return `Los cupos de ${l.label} van de 1 a 10.000 por día (o déjalo vacío).`;
  }
  return null;
}

// Lo que se manda a set_benefit_branches: [] = en todas.
export function reglasParaGuardar(lugares: LugarPremio[], r: ReglasPremio) {
  if (!r.soloAlgunas) return [];
  return lugares
    .filter((l) => r.elegidas[l.key]?.on)
    .map((l) => ({ branch_id: l.key === PRINCIPAL ? null : l.key, daily_quota: Number(r.elegidas[l.key].cupos) >= 1 ? Number(r.elegidas[l.key].cupos) : null }));
}

export function resumenSucursales(lugares: LugarPremio[] | null, r: ReglasPremio): string | null {
  if (!lugares) return null;
  if (!r.soloAlgunas) return `En todas (${lugares.length})`;
  return lugares
    .filter((l) => r.elegidas[l.key]?.on)
    .map((l) => (Number(r.elegidas[l.key].cupos) >= 1 ? `${l.label} (${r.elegidas[l.key].cupos} por día)` : l.label))
    .join(', ');
}

export function SucursalesPremio({ businessName, lugares, reglas, setReglas }: { businessName: string; lugares: LugarPremio[]; reglas: ReglasPremio; setReglas: (r: ReglasPremio) => void }) {
  const boton = (activo: boolean) =>
    activo ? { background: '#2E9E7C', borderColor: '#2E9E7C', color: '#fff' } : { background: 'var(--c-card)', borderColor: 'var(--c-line)', color: 'var(--c-muted)' };
  return (
    <div className="mt-4">
      <span className="block text-[12.5px] font-semibold mb-1.5">¿En qué sucursales vale?</span>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" aria-pressed={!reglas.soloAlgunas} onClick={() => setReglas({ ...reglas, soloAlgunas: false })} className="py-2 rounded-[10px] border text-[12px] font-semibold" style={boton(!reglas.soloAlgunas)}>
          En todas
        </button>
        <button type="button" aria-pressed={reglas.soloAlgunas} onClick={() => setReglas({ ...reglas, soloAlgunas: true })} className="py-2 rounded-[10px] border text-[12px] font-semibold" style={boton(reglas.soloAlgunas)}>
          Elegir sucursales
        </button>
      </div>
      {!reglas.soloAlgunas ? (
        <p className="text-[11.5px] text-muted mt-1.5 leading-4">Vale igual en tus {lugares.length} sucursales, con los cupones de arriba.</p>
      ) : (
        <div className="mt-2.5 bg-white border border-line rounded-[10px] divide-y divide-[var(--c-line)]">
          {lugares.map((l) => {
            const e = reglas.elegidas[l.key] ?? { on: false, cupos: '' };
            const set = (cambio: Partial<typeof e>) => setReglas({ ...reglas, elegidas: { ...reglas.elegidas, [l.key]: { ...e, ...cambio } } });
            return (
              <div key={l.key} className="flex items-center gap-3 px-3 py-2.5">
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input type="checkbox" checked={e.on} onChange={(ev) => set({ on: ev.target.checked })} />
                  <span className="text-[13px] font-semibold truncate">{businessName} {l.label}</span>
                </label>
                {e.on && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <input
                      value={e.cupos}
                      onChange={(ev) => set({ cupos: ev.target.value.replace(/\D/g, '').slice(0, 5) })}
                      placeholder="Sin tope"
                      inputMode="numeric"
                      aria-label={`Cupones por día en ${l.label}`}
                      className="w-[84px] bg-white border border-line rounded-[8px] px-2 py-1.5 text-[13px] text-center"
                    />
                    <span className="text-[11.5px] text-muted">por día</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {reglas.soloAlgunas && (
        <p className="text-[11.5px] text-muted mt-1.5 leading-4">
          Los cupones por día de cada sucursal son aparte. Vacío = sin tope propio en esa sucursal (igual vale el tope total de arriba).
        </p>
      )}
    </div>
  );
}
