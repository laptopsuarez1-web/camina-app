'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type City, type Zone } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

export default function AdminLugaresPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState('Tarija');
  const [newZone, setNewZone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: c }, { data: z }] = await Promise.all([
      supabase.from('cities').select('*').order('sort'),
      supabase.from('zones').select('*').order('name'),
    ]);
    setCities((c as City[]) ?? []);
    setZones((z as Zone[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCity(c: City) {
    setError(null);
    const { error: e } = await supabase.from('cities').update({ active: !c.active }).eq('name', c.name);
    if (e) setError(e.message);
    load();
  }

  async function addCity() {
    const name = newCity.trim();
    if (name.length < 3) return;
    const { error: e } = await supabase.from('cities').insert({ name, active: false, sort: cities.length + 1 });
    if (e) setError(e.message);
    setNewCity('');
    load();
  }

  async function addZone() {
    const name = newZone.trim();
    if (name.length < 2) return;
    const { error: e } = await supabase.from('zones').insert({ city: selected, name });
    if (e) setError(e.message);
    setNewZone('');
    load();
  }

  async function removeZone(id: string) {
    await supabase.from('zones').delete().eq('id', id);
    load();
  }

  const field = 'bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px] min-w-0 flex-1';
  const cityZones = zones.filter((z) => z.city === selected);

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Ciudades y barrios</h1>
      <p className="text-muted text-[13.5px] mb-6 max-w-[620px]">
        La gente y los comercios eligen ciudad y barrio de estas listas, así siempre quedan bien escritos. Prendé una
        ciudad cuando estés listo para lanzar ahí.
      </p>
      {error && <p className="text-warn text-[12.5px] mb-3">{error}</p>}

      <div className="max-w-[560px] bg-card border border-line rounded-2xl p-4 mb-6">
        <p className="font-bold text-[14px] mb-3">Ciudades</p>
        <div className="flex flex-col gap-1.5 mb-3">
          {cities.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3">
              <button
                onClick={() => setSelected(c.name)}
                className={`text-left text-[13.5px] flex-1 ${selected === c.name ? 'font-bold' : ''}`}
              >
                {c.name}
              </button>
              <button
                onClick={() => toggleCity(c)}
                className="text-[12px] font-semibold rounded-full px-3 py-1"
                style={{ background: c.active ? '#E3F5F0' : '#F1EBFA', color: c.active ? '#2E9E7C' : '#8B4FD1' }}
              >
                {c.active ? 'Activa' : 'Apagada'}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Agregar ciudad" className={field} />
          <button onClick={addCity} className="bg-mint text-mint-dark rounded-[10px] px-4 font-semibold text-[13px]">
            Agregar
          </button>
        </div>
      </div>

      <div className="max-w-[560px] bg-card border border-line rounded-2xl p-4">
        <p className="font-bold text-[14px] mb-3">Barrios de {selected}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {cityZones.map((z) => (
            <span key={z.id} className="inline-flex items-center gap-1.5 bg-bg border border-line rounded-full pl-3 pr-2 py-1 text-[12.5px]">
              {z.name}
              <button onClick={() => removeZone(z.id)} aria-label={`Quitar ${z.name}`} className="text-muted text-[14px] leading-none">
                ×
              </button>
            </span>
          ))}
          {cityZones.length === 0 && <p className="text-muted text-[12.5px]">Todavía no hay barrios para esta ciudad.</p>}
        </div>
        <div className="flex gap-2">
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Agregar barrio" className={field} />
          <button onClick={addZone} className="bg-mint text-mint-dark rounded-[10px] px-4 font-semibold text-[13px]">
            Agregar
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
