'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';
import { ImageUpload } from '@/components/ImageUpload';
import { mensajeError } from '@/lib/errors';

// Lugares de Pasos dobles (x2): shoppings, malls, parques... Dentro de la zona y entre las fechas, cada 1.000 pasos
// dan 1 Punto extra en la app, hasta el tope por persona. Los Puntos extra van aparte del tope diario (migración 0133).
const MapPicker = dynamic(() => import('@/components/MapPicker').then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-[22px] border border-line bg-white" />,
});

type Place = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  starts_at: string;
  ends_at: string;
  max_points: number;
  steps_per_point: number;
  active: boolean;
};
type Stats = Record<string, { people: number; points: number }>;

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const empty = () => ({
  id: null as string | null,
  name: '',
  address: '',
  logo_url: null as string | null,
  cover_url: null as string | null,
  point: null as { lat: number; lng: number } | null,
  radius_m: 150,
  starts: toLocalInput(new Date()),
  ends: toLocalInput(new Date(Date.now() + 30 * 24 * 3600 * 1000)),
  max_points: 20,
});

export default function AdminPasosDoblesPage() {
  const [rows, setRows] = useState<Place[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [f, setF] = useState(empty);
  const [fileId, setFileId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from('boost_places').select('*').order('starts_at', { ascending: false }),
      supabase.rpc('admin_boost_stats'),
    ]);
    setRows((data as Place[]) ?? []);
    const m: Stats = {};
    for (const r of (s as { place_id: string; people: number; points: number }[]) ?? []) m[r.place_id] = { people: r.people, points: r.points };
    setStats(m);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la base (mismo patrón que las otras páginas del admin)
    load();
  }, [load]);

  const bad =
    f.name.trim().length < 2 ? 'Pon el nombre del lugar.'
    : !f.point ? 'Marca el lugar en el mapa.'
    : new Date(f.ends) <= new Date(f.starts) ? 'Debe terminar después de empezar.'
    : f.radius_m < 30 || f.radius_m > 1000 ? 'La zona va de 30 a 1.000 metros.'
    : f.max_points < 1 || f.max_points > 200 ? 'El tope va de 1 a 200 Puntos.'
    : null;

  async function save() {
    if (bad || !f.point) return;
    setSaving(true);
    setMsg(null);
    const row = {
      name: f.name.trim(),
      address: f.address.trim() || null,
      logo_url: f.logo_url,
      cover_url: f.cover_url,
      lat: f.point.lat,
      lng: f.point.lng,
      radius_m: f.radius_m,
      starts_at: new Date(f.starts).toISOString(),
      ends_at: new Date(f.ends).toISOString(),
      max_points: f.max_points,
    };
    const { error } = f.id ? await supabase.from('boost_places').update(row).eq('id', f.id) : await supabase.from('boost_places').insert(row);
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: mensajeError(error) });
      return;
    }
    setMsg({ ok: true, text: f.id ? 'Cambios guardados.' : 'Lugar creado: ya sale en el mapa de la app.' });
    setF(empty());
    setFileId(Math.random().toString(36).slice(2, 10));
    load();
  }

  function edit(r: Place) {
    setMsg(null);
    setF({
      id: r.id, name: r.name, address: r.address ?? '', logo_url: r.logo_url, cover_url: r.cover_url,
      point: { lat: r.lat, lng: r.lng }, radius_m: r.radius_m,
      starts: toLocalInput(new Date(r.starts_at)), ends: toLocalInput(new Date(r.ends_at)), max_points: r.max_points,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggle(r: Place) {
    const { error } = await supabase.from('boost_places').update({ active: !r.active }).eq('id', r.id);
    if (error) setMsg({ ok: false, text: mensajeError(error) });
    load();
  }

  const field = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';
  const label = 'block text-[12px] font-semibold text-text mb-1';
  const fmt = (iso: string) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Pasos dobles (x2)</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[640px]">
        Lugares donde los pasos valen doble: salen en el mapa de la app con la etiqueta x2 y su zona. Dentro de la zona y entre las
        fechas, cada 1.000 pasos dan 1 Punto extra, hasta el tope por persona. Van aparte de los Puntos diarios.
      </p>

      <div className="max-w-[640px] bg-card border border-line rounded-xl p-4 flex flex-col gap-3 mb-6">
        <p className="font-semibold text-[14px]">{f.id ? 'Editar lugar' : 'Nuevo lugar'}</p>
        <label className="block">
          <span className={label}>Nombre</span>
          <input value={f.name} maxLength={60} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="Ej: Shopping Norte" className={field} />
        </label>
        <label className="block">
          <span className={label}>Dirección (opcional)</span>
          <input value={f.address} maxLength={160} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} placeholder="Ej: Av. Las Américas 123" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <ImageUpload bucket="business-logos" path={`x2/${fileId}-logo`} value={f.logo_url} onUploaded={(url) => setF((x) => ({ ...x, logo_url: url }))} label="Logo" shape="square" />
          <ImageUpload bucket="business-logos" path={`x2/${fileId}-portada`} value={f.cover_url} onUploaded={(url) => setF((x) => ({ ...x, cover_url: url }))} label="Portada (opcional)" shape="cover" />
        </div>
        <div>
          <span className={label}>Dónde queda (centro de la zona)</span>
          <MapPicker value={f.point} onChange={(p) => setF((x) => ({ ...x, point: p }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Tamaño de la zona (metros)</span>
            <input type="number" min={30} max={1000} value={f.radius_m} onChange={(e) => setF((x) => ({ ...x, radius_m: Number(e.target.value) }))} className={field} />
          </label>
          <label className="block">
            <span className={label}>Tope de Puntos extra por persona</span>
            <input type="number" min={1} max={200} value={f.max_points} onChange={(e) => setF((x) => ({ ...x, max_points: Number(e.target.value) }))} className={field} />
          </label>
          <label className="block">
            <span className={label}>Desde</span>
            <input type="datetime-local" value={f.starts} onChange={(e) => setF((x) => ({ ...x, starts: e.target.value }))} className={field} />
          </label>
          <label className="block">
            <span className={label}>Hasta</span>
            <input type="datetime-local" value={f.ends} onChange={(e) => setF((x) => ({ ...x, ends: e.target.value }))} className={field} />
          </label>
        </div>
        <p className="text-muted text-[12px]">La zona es un círculo alrededor del punto. Para un shopping mediano, 150 m suele alcanzar.</p>
        {bad && <p className="text-warn text-[12.5px]">{bad}</p>}
        {msg && <p className={`text-[12.5px] ${msg.ok ? 'text-mint-dark' : 'text-warn'}`}>{msg.text}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={!!bad || saving} className="rounded-lg px-4 py-2 text-[13px] font-bold disabled:opacity-50" style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}>
            {saving ? 'Guardando…' : f.id ? 'Guardar cambios' : 'Crear lugar'}
          </button>
          {f.id && (
            <button onClick={() => setF(empty())} className="border border-line bg-white rounded-lg px-4 py-2 text-[13px] font-semibold">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[640px] flex flex-col gap-2.5">
        {rows.length === 0 && <p className="text-muted text-[13px]">Todavía no hay lugares x2.</p>}
        {rows.map((r) => {
          const ended = new Date(r.ends_at).getTime() < now;
          const state = !r.active ? 'Pausado' : ended ? 'Terminado' : new Date(r.starts_at).getTime() > now ? 'Programado' : 'En el mapa';
          const st = stats[r.id];
          return (
            <div key={r.id} className="bg-card border border-line rounded-xl p-4 flex items-start gap-3">
              {r.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover border-2" style={{ borderColor: '#62F0B6' }} />
              ) : (
                <div className="h-12 w-12 rounded-lg flex items-center justify-center font-bold text-[12px]" style={{ background: '#62F0B6', color: '#12281F' }}>x2</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[14px]">{r.name} · <span className="text-muted font-normal">{state}</span></p>
                <p className="text-muted text-[12px]">{fmt(r.starts_at)} → {fmt(r.ends_at)} · zona {r.radius_m} m · tope {r.max_points} Puntos</p>
                <p className="text-muted text-[12px]">{st ? `${st.people} ${st.people === 1 ? 'persona' : 'personas'} · ${st.points} Puntos extra dados` : 'Nadie lo usó todavía'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => edit(r)} className="border border-line bg-white rounded-lg px-3 py-1.5 text-[12px] font-semibold">Editar</button>
                <button onClick={() => toggle(r)} className="border border-line bg-white rounded-lg px-3 py-1.5 text-[12px] font-semibold">{r.active ? 'Pausar' : 'Activar'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
