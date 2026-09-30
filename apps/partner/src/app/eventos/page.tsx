'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Promotion } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

const WHATSAPP = '59162714286';
const STATUS: Record<Promotion['status'], { label: string; cls: string }> = {
  pending: { label: 'En revisión', cls: 'text-warn bg-warn-light' },
  approved: { label: 'Publicada', cls: 'text-mint-dark bg-mint/15' },
  rejected: { label: 'No aprobada', cls: 'text-[#a1382f] bg-[#fdecec]' },
  finished: { label: 'Sorteada', cls: 'text-[#5b3a99] bg-[#f1ebfa]' },
};

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function EventosPage() {
  const { business } = useBusinessAuth();
  const [list, setList] = useState<Promotion[]>([]);
  const [winners, setWinners] = useState<Record<string, string[]>>({});
  const [kind, setKind] = useState<'sorteo' | 'evento'>('sorteo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [starts, setStarts] = useState(toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)));
  const [ends, setEnds] = useState(toLocalInput(new Date(Date.now() + 8 * 24 * 3600 * 1000)));
  const [useReq, setUseReq] = useState(true);
  const [reqSteps, setReqSteps] = useState(5000);
  const [reqDays, setReqDays] = useState(7);
  const [winnersCount, setWinnersCount] = useState(3);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const price = business?.account_kind === 'events_only' ? 400 : 200;

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    const rows = (data as Promotion[]) ?? [];
    setList(rows);
    const entries: Record<string, string[]> = {};
    for (const r of rows.filter((x) => x.status === 'finished')) {
      const { data: w } = await supabase.rpc('promotion_winner_names', { p_id: r.id });
      entries[r.id] = ((w as { full_name: string }[]) ?? []).map((x) => x.full_name);
    }
    setWinners(entries);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!business) return;
    setSending(true);
    setMsg(null);
    const { error } = await supabase.rpc('request_promotion', {
      p_business_id: business.id,
      p_kind: kind,
      p_title: title,
      p_description: description,
      p_prize: prize,
      p_starts_at: new Date(starts).toISOString(),
      p_ends_at: new Date(ends).toISOString(),
      p_req_steps: kind === 'sorteo' && useReq ? reqSteps : null,
      p_req_days: kind === 'sorteo' && useReq ? reqDays : null,
      p_winners: winnersCount,
    });
    setSending(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    const text = encodeURIComponent(
      `Hola! Soy ${business.name} y quiero publicar ${kind === 'sorteo' ? 'un sorteo' : 'un evento'} en Camina: "${title}" (Bs ${price}). Te mando el comprobante de la transferencia.`
    );
    setMsg({
      ok: true,
      text: `Recibimos tu solicitud. Para publicarla, hacé la transferencia de Bs ${price} y mandanos el comprobante por WhatsApp.`,
    });
    setTitle('');
    setDescription('');
    setPrize('');
    load();
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank', 'noopener');
  }

  const field = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';
  const maxEnd = new Date(new Date(starts).getTime() + 14 * 24 * 3600 * 1000);
  const tooLong = new Date(ends) > maxEnd || new Date(ends) <= new Date(starts);

  return (
    <DashboardShell>
      <TopBar title="Eventos y sorteos" subtitle="Publicá un evento o un sorteo dentro de la app de Camina." />

      <div className="max-w-[600px]">
        <div className="bg-card border border-line rounded-2xl p-4 mb-5 text-[13px] leading-5">
          <p className="font-bold mb-1">Cómo funciona</p>
          <p className="text-muted">
            Cada publicación dura <strong>hasta 2 semanas</strong> y cuesta <strong>Bs {price}</strong>
            {business?.account_kind === 'events_only'
              ? ' (cuenta solo de eventos y sorteos; para comercios con canjes en Camina el precio es Bs 200)'
              : ' (Bs 400 si solo querés publicidad, sin canjes)'}
            . Vos ponés el premio. Al terminar, Camina sortea al azar entre quienes se anotaron y cumplieron la
            condición, y te pasa los ganadores para que les entregues el premio.
          </p>
        </div>

        <div className="bg-card border border-line rounded-2xl p-5 mb-6 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            {(['sorteo', 'evento'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="rounded-xl py-2.5 font-semibold text-[13.5px] border-2"
                style={{ borderColor: kind === k ? '#1f9d75' : '#e6e3ee', background: kind === k ? '#f0faf6' : '#fff' }}
              >
                {k === 'sorteo' ? 'Sorteo' : 'Evento'}
              </button>
            ))}
          </div>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">Título</span>
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'sorteo' ? 'Ej: Sorteo de 2 cenas' : 'Ej: Noche de música en vivo'} className={field} />
          </label>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">Descripción</span>
            <textarea value={description} maxLength={400} rows={3} onChange={(e) => setDescription(e.target.value)} className={field} />
          </label>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">{kind === 'sorteo' ? 'Premio' : 'Qué incluye (entradas, etc.)'}</span>
            <input value={prize} maxLength={120} onChange={(e) => setPrize(e.target.value)} placeholder="Ej: Cena para 2 personas" className={field} />
          </label>
          <div className="flex gap-3 flex-wrap">
            <label className="flex-1 min-w-[180px]">
              <span className="block text-[12.5px] font-semibold mb-1">Empieza</span>
              <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={field} />
            </label>
            <label className="flex-1 min-w-[180px]">
              <span className="block text-[12.5px] font-semibold mb-1">Termina (máx. 2 semanas)</span>
              <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={field} />
            </label>
          </div>
          {tooLong && <p className="text-warn text-[12.5px]">La vigencia máxima es de 2 semanas y debe terminar después de empezar.</p>}

          {kind === 'sorteo' && (
            <>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={useReq} onChange={(e) => setUseReq(e.target.checked)} className="w-4 h-4" />
                Pedir una meta de pasos para participar
              </label>
              {useReq && (
                <div className="flex gap-3 items-center flex-wrap text-[13px]">
                  Caminar
                  <input type="number" min={1000} step={500} value={reqSteps} onChange={(e) => setReqSteps(Number(e.target.value))} className={`${field} !w-[110px]`} />
                  pasos por día durante
                  <input type="number" min={1} max={14} value={reqDays} onChange={(e) => setReqDays(Number(e.target.value))} className={`${field} !w-[80px]`} />
                  días
                </div>
              )}
              <label className="flex items-center gap-2 text-[13px]">
                Ganadores:
                <input type="number" min={1} max={10} value={winnersCount} onChange={(e) => setWinnersCount(Number(e.target.value))} className={`${field} !w-[80px]`} />
              </label>
            </>
          )}

          {msg && <p className={`text-[12.5px] ${msg.ok ? 'text-mint-dark' : 'text-warn'}`}>{msg.text}</p>}
          <button
            onClick={submit}
            disabled={sending || tooLong || title.trim().length < 3 || description.trim().length < 5}
            className="w-full rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {sending ? 'Enviando…' : `Pedir publicación · Bs ${price}`}
          </button>
        </div>

        {list.length > 0 && (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {list.map((r, i) => (
              <div key={r.id} className={`p-4 ${i < list.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="font-semibold text-[13.5px]">
                    {r.kind === 'sorteo' ? '🎁' : '🎟️'} {r.title}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </div>
                <p className="text-muted text-[12px]">
                  {new Date(r.starts_at).toLocaleDateString('es-BO')} → {new Date(r.ends_at).toLocaleDateString('es-BO')} · Bs {r.price_bs}
                  {r.prize ? ` · ${r.prize}` : ''}
                </p>
                {r.status === 'finished' && winners[r.id] && (
                  <p className="text-[12.5px] mt-1.5">
                    <strong>Ganadores:</strong> {winners[r.id].length ? winners[r.id].join(', ') : 'nadie cumplió la condición'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
