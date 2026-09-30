'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Promotion } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

type Row = Promotion & { business: { name: string; account_kind?: string } | null; entries: number };

export default function AdminEventosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [winners, setWinners] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('promotions')
      .select('*, business:businesses(name, account_kind)')
      .order('created_at', { ascending: false });
    const base = (data as unknown as Omit<Row, 'entries'>[]) ?? [];
    const withCount: Row[] = [];
    for (const r of base) {
      const { count } = await supabase.from('promotion_entries').select('user_id', { count: 'exact', head: true }).eq('promotion_id', r.id);
      withCount.push({ ...r, entries: count ?? 0 });
    }
    setRows(withCount);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setMsg(null);
    const { error } = await supabase.rpc('decide_promotion', { p_id: id, p_approve: approve });
    if (error) setMsg(error.message);
    load();
  }

  async function draw(id: string) {
    setMsg(null);
    const { data, error } = await supabase.rpc('draw_promotion', { p_id: id });
    if (error) {
      setMsg(error.message);
      return;
    }
    setWinners((w) => ({ ...w, [id]: ((data as { full_name: string }[]) ?? []).map((x) => x.full_name) }));
    load();
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Eventos y sorteos</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[620px]">
        Aprobá las publicaciones cuando confirmes el pago (Bs 200 comercios, Bs 400 solo publicidad). Cuando termina la
        vigencia, sorteá: se eligen al azar entre quienes se anotaron y cumplieron la condición.
      </p>
      {msg && <p className="text-warn text-[12.5px] mb-3">{msg}</p>}
      <div className="max-w-[760px] flex flex-col gap-2.5">
        {rows.length === 0 && <p className="text-muted text-[13px]">Todavía no hay publicaciones.</p>}
        {rows.map((r) => {
          const ended = new Date(r.ends_at) < new Date();
          return (
            <div key={r.id} className="bg-card border border-line rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-[14px]">
                    {r.kind === 'sorteo' ? '🎁' : '🎟️'} {r.title}
                  </p>
                  <p className="text-muted text-[12px]">
                    {r.business?.name} · {r.business?.account_kind === 'events_only' ? 'solo publicidad' : 'comercio'} · Bs {r.price_bs} · {r.status}
                  </p>
                  <p className="text-muted text-[12px]">
                    {new Date(r.starts_at).toLocaleDateString('es-BO')} → {new Date(r.ends_at).toLocaleDateString('es-BO')} · {r.entries} anotados
                    {r.req_steps ? ` · ${r.req_steps.toLocaleString('es-BO')} pasos x ${r.req_days} días` : ''} · {r.winners_count} ganadores
                  </p>
                  {r.prize && <p className="text-[12.5px] mt-1">Premio: {r.prize}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => decide(r.id, true)} className="bg-mint text-mint-dark rounded-lg px-3.5 py-1.5 text-[12px] font-bold">
                        Aprobar
                      </button>
                      <button onClick={() => decide(r.id, false)} className="border border-line bg-white rounded-lg px-3.5 py-1.5 text-[12px] font-semibold">
                        Rechazar
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && ended && (
                    <button onClick={() => draw(r.id)} className="rounded-lg px-3.5 py-1.5 text-[12px] font-bold" style={{ background: '#241748', color: '#7FEDC4' }}>
                      Sortear
                    </button>
                  )}
                  {r.status === 'approved' && !ended && <span className="text-muted text-[12px]">Vigente</span>}
                </div>
              </div>
              {winners[r.id] && (
                <p className="text-[13px] mt-2">
                  <strong>Ganadores:</strong> {winners[r.id].length ? winners[r.id].join(', ') : 'nadie cumplió la condición'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
