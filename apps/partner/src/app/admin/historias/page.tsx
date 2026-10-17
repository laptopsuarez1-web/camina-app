'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

// Historias de Instagram por un canje (migración 0055). La persona avisa desde la app que subió la historia
// etiquetando a @caminaapp; acá el equipo la busca en Instagram y la aprueba (acredita 5 Puntos) o la rechaza.

type Status = 'pending' | 'approved' | 'rejected';

interface StoryRow {
  id: string;
  status: Status;
  created_at: string;
  decided_at: string | null;
  photo_path: string;
  instagram_handle: string;
  user_id: string;
  user_name: string | null;
  business_name: string | null;
  benefit_name: string | null;
  redemption_confirmed_at: string | null;
}

const TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Por revisar' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
];

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

export default function AdminHistoriasPage() {
  const [tab, setTab] = useState<Status>('pending');
  const [rows, setRows] = useState<StoryRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_story_shares', { p_status: tab });
    if (error) setMsg(error.message);
    const list = (data as StoryRow[]) ?? [];
    setRows(list);
    setLoaded(true);
    // Las fotos están en un bucket privado: se piden enlaces firmados por 1 hora.
    if (list.length) {
      const { data: signed } = await supabase.storage.from('story-photos').createSignedUrls(list.map((r) => r.photo_path), 3600);
      const map: Record<string, string> = {};
      for (const s of signed ?? []) if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      setPhotos(map);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setMsg(null);
    setBusy(id);
    const { error } = await supabase.rpc('admin_decide_story_share', { p_id: id, p_approve: approve });
    setBusy(null);
    if (error) setMsg(error.message);
    window.dispatchEvent(new Event('camina:stories-changed'));
    load();
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Historias de Instagram</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[640px]">
        Personas que avisan que subieron una historia con lo que canjearon. Buscá la mención de <strong>@caminaapp</strong> en
        Instagram (o abrí su perfil) y aprobala: le acreditamos 5 Puntos y le llega un aviso. Las historias duran 24 horas:
        revisá esta lista todos los días.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold border ${
              tab === t.key ? 'bg-[#5B31A3] border-[#5B31A3] text-white' : 'bg-card border-line text-muted'
            }`}
          >
            {t.label}
            {t.key === 'pending' && tab === 'pending' && loaded ? ` · ${rows.length}` : ''}
          </button>
        ))}
      </div>

      {msg && <p className="text-warn text-[12.5px] mb-3">{msg}</p>}
      {loaded && rows.length === 0 && (
        <p className="text-muted text-[13px]">{tab === 'pending' ? 'No hay historias por revisar. 🎉' : 'Todavía no hay historias acá.'}</p>
      )}

      <div className="grid gap-4 max-w-[1000px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {rows.map((r) => (
          <div key={r.id} className="bg-card border border-line rounded-2xl overflow-hidden flex flex-col">
            <div className="relative bg-black" style={{ height: 330 }}>
              {photos[r.photo_path] ? (
                <a href={photos[r.photo_path]} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado de un bucket privado, no pasa por next/image */}
                  <img src={photos[r.photo_path]} alt={`Historia de @${r.instagram_handle}`} className="w-full h-full object-cover" />
                </a>
              ) : null}
              <span className="absolute top-2.5 left-2.5 bg-white/95 rounded-full text-[11px] font-bold px-2.5 py-0.5 text-[#9A4A13]">
                {ago(r.created_at)}
              </span>
            </div>
            <div className="p-3.5 flex flex-col gap-1">
              <p className="text-[13.5px] font-bold">
                {r.user_name ?? 'Persona'} ·{' '}
                <a
                  href={`https://www.instagram.com/${encodeURIComponent(r.instagram_handle)}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple"
                >
                  @{r.instagram_handle}
                </a>
              </p>
              <p className="text-muted text-[12px] leading-snug mb-2">
                {r.benefit_name ?? 'Canje'} en <strong>{r.business_name ?? 'un comercio'}</strong>
                {r.redemption_confirmed_at && (
                  <>
                    <br />
                    Canje confirmado el {new Date(r.redemption_confirmed_at).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
                  </>
                )}
              </p>
              {r.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r.id, true)}
                    className="flex-1 bg-mint text-mint-dark rounded-lg px-3 py-2 text-[12.5px] font-extrabold disabled:opacity-60"
                  >
                    Aprobar y dar 5 Puntos
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r.id, false)}
                    className="border border-line bg-white rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              ) : (
                <p className={`text-[12px] font-bold ${r.status === 'approved' ? 'text-[#1A6555]' : 'text-[#9A4A13]'}`}>
                  {r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  {r.decided_at ? ` · ${ago(r.decided_at)}` : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
