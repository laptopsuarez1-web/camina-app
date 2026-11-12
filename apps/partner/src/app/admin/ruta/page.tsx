'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';
import { ImageUpload } from '@/components/ImageUpload';

type Prize = {
  month: string;
  title: string;
  detail: string | null;
  image_url: string | null;
  sponsor_business_id: string | null;
  winners_count: number;
  winners: { name: string; ticket_no: number }[];
  drawn_at: string | null;
};
type Biz = { id: string; name: string };

// Mes en hora de Bolivia (UTC-4), como "2026-11-01".
function monthOf(offset: number) {
  const d = new Date(Date.now() - 4 * 3600e3);
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
  return m.toISOString().slice(0, 10);
}
const monthName = (m: string) => new Date(m + 'T12:00:00Z').toLocaleDateString('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Premio del sorteo de la Ruta del mes: se carga acá y se ve en la app (Ruta y Eventos) y en la web.
export default function AdminRutaPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [tickets, setTickets] = useState<Record<string, number>>({});
  const [biz, setBiz] = useState<Biz[]>([]);
  const [month, setMonth] = useState(monthOf(0));
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState('');
  const [count, setCount] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (fillMonth?: string) => {
    const { data } = await supabase.from('route_prizes').select('*').order('month', { ascending: false });
    const list = (data as Prize[]) ?? [];
    setPrizes(list);
    if (fillMonth) {
      const p = list.find((x) => x.month === fillMonth);
      setTitle(p?.title ?? '');
      setDetail(p?.detail ?? '');
      setImage(p?.image_url ?? null);
      setSponsor(p?.sponsor_business_id ?? '');
      setCount(p?.winners_count ?? 1);
    }
    const t: Record<string, number> = {};
    for (const p of list) {
      const { data: info } = await supabase.rpc('route_prize', { p_month: p.month });
      t[p.month] = (info as { tickets?: number } | null)?.tickets ?? 0;
    }
    setTickets(t);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
    load(monthOf(0));
    supabase.from('businesses').select('id, name').eq('approved', true).order('name').then(({ data }) => setBiz((data as Biz[]) ?? []));
  }, [load]);

  // Al elegir un mes se carga lo que ya hay para editarlo.
  function pick(m: string, list: Prize[] = prizes) {
    const p = list.find((x) => x.month === m);
    setMonth(m);
    setTitle(p?.title ?? '');
    setDetail(p?.detail ?? '');
    setImage(p?.image_url ?? null);
    setSponsor(p?.sponsor_business_id ?? '');
    setCount(p?.winners_count ?? 1);
  }

  const current = prizes.find((x) => x.month === month);

  async function save() {
    setMsg(null);
    if (title.trim().length < 3) return setMsg('Escribe el premio (mínimo 3 letras).');
    setBusy(true);
    const { error } = await supabase.from('route_prizes').upsert({
      month,
      title: title.trim(),
      detail: detail.trim() || null,
      image_url: image,
      sponsor_business_id: sponsor || null,
      winners_count: count,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg('Guardado. Ya se ve en la app y en la web.');
    load();
  }

  async function draw(m: string) {
    if (!confirm(`¿Sortear el premio de ${monthName(m)}? Se hace una sola vez y se avisa a quienes ganen.`)) return;
    setMsg(null);
    const { error } = await supabase.rpc('route_draw', { p_month: m });
    if (error) return setMsg(error.message);
    load();
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Premio de la Ruta del mes</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[620px]">
        Quien completa su Ruta (3 locales) recibe un boleto. Carga aquí el premio de cada mes: se muestra en la app y en la web.
        Cuando termina el mes, toca Sortear: salen al azar entre los boletos y les llega un aviso.
      </p>

      <div className="max-w-[620px] bg-card border border-line rounded-xl p-4 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {[-1, 0, 1].map((o) => {
            const m = monthOf(o);
            return (
              <button key={m} onClick={() => pick(m)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold border ${m === month ? 'bg-mint text-mint-dark border-mint' : 'border-line bg-white'}`}>
                {monthName(m)}
              </button>
            );
          })}
        </div>
        <label className="text-[12.5px] font-semibold">Premio
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Qué se gana"
            className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-[14px] font-normal" />
        </label>
        <label className="text-[12.5px] font-semibold">Detalle (opcional)
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={300} rows={2} placeholder="Cómo se entrega, condiciones"
            className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-[14px] font-normal" />
        </label>
        <div className="flex gap-3 flex-wrap items-end">
          <label className="text-[12.5px] font-semibold">Lo regala (opcional)
            <select value={sponsor} onChange={(e) => setSponsor(e.target.value)} className="mt-1 block border border-line rounded-lg px-3 py-2 text-[14px] font-normal bg-white">
              <option value="">Camina</option>
              {biz.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-[12.5px] font-semibold">Ganadores
            <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="mt-1 block w-20 border border-line rounded-lg px-3 py-2 text-[14px] font-normal" />
          </label>
        </div>
        <ImageUpload bucket="route-prizes" path={`${month}/premio`} value={image} onUploaded={setImage} label="Foto del premio" shape="wide" />
        {msg && <p className="text-[12.5px] text-muted">{msg}</p>}
        <button onClick={save} disabled={busy || !!current?.drawn_at}
          className="self-start bg-mint text-mint-dark rounded-lg px-4 py-2 text-[13px] font-bold disabled:opacity-50">
          {current?.drawn_at ? 'Ya se sorteó' : busy ? 'Guardando…' : 'Guardar premio'}
        </button>
      </div>

      <h2 className="text-[16px] font-bold mt-7 mb-2">Meses</h2>
      <div className="max-w-[620px] flex flex-col gap-2.5">
        {prizes.length === 0 && <p className="text-muted text-[13px]">Todavía no cargaste ningún premio.</p>}
        {prizes.map((p) => {
          const ended = p.month < monthOf(0);
          return (
            <div key={p.month} className="bg-card border border-line rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[14px] capitalize">{monthName(p.month)}</p>
                <p className="text-[13px]">{p.title} · {p.winners_count} {p.winners_count === 1 ? 'ganador' : 'ganadores'}</p>
                <p className="text-muted text-[12px]">{tickets[p.month] ?? 0} boletos</p>
                {p.drawn_at && (
                  <p className="text-[13px] mt-1"><strong>Ganaron:</strong> {p.winners.length ? p.winners.map((w) => `${w.name} (N.º ${w.ticket_no})`).join(', ') : 'nadie tenía boleto'}</p>
                )}
              </div>
              {!p.drawn_at && ended && (
                <button onClick={() => draw(p.month)} className="shrink-0 rounded-lg px-3.5 py-1.5 text-[12px] font-bold" style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}>
                  Sortear
                </button>
              )}
              {!p.drawn_at && !ended && <span className="text-muted text-[12px] shrink-0">Se sortea al terminar el mes</span>}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
