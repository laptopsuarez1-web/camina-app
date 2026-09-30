'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Reto } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

const KIND_LABEL: Record<Reto['kind'], string> = {
  referrals: 'Invitar amigos',
  steps_streak: 'Días seguidos con X pasos',
  weekly_goals: 'Metas diarias en la semana',
};

const EMPTY: Omit<Reto, 'id'> = {
  title: '',
  description: '',
  kind: 'steps_streak',
  target: 7,
  steps_threshold: 8000,
  reward_points: 10,
  active: true,
  sort: 10,
};

export default function AdminRetosPage() {
  const [retos, setRetos] = useState<Reto[]>([]);
  const [draft, setDraft] = useState<(Omit<Reto, 'id'> & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('retos').select('*').order('sort');
    setRetos((data as Reto[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const row = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      kind: draft.kind,
      target: Number(draft.target),
      steps_threshold: draft.kind === 'steps_streak' ? Number(draft.steps_threshold) : null,
      reward_points: Number(draft.reward_points),
      active: draft.active,
      sort: Number(draft.sort),
    };
    const { error: e } = draft.id
      ? await supabase.from('retos').update(row).eq('id', draft.id)
      : await supabase.from('retos').insert(row);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setDraft(null);
    load();
  }

  async function toggle(r: Reto) {
    await supabase.from('retos').update({ active: !r.active }).eq('id', r.id);
    load();
  }

  const field = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Retos</h1>
      <p className="text-muted text-[13.5px] mb-6 max-w-[620px]">
        Los retos que ve la gente en la app. El avance y los puntos se calculan y se pagan en el servidor: al cumplirlo,
        la persona toca &ldquo;Reclamar&rdquo; y recibe los puntos una sola vez.
      </p>

      <div className="max-w-[720px] flex flex-col gap-2.5 mb-5">
        {retos.map((r) => (
          <div key={r.id} className="bg-card border border-line rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[14px]">
                {r.title} <span className="text-mint-dark">+{r.reward_points}</span>
                {!r.active && <span className="text-muted font-normal text-[12px]"> · apagado</span>}
              </p>
              <p className="text-muted text-[12px]">
                {KIND_LABEL[r.kind]} · meta {r.target}
                {r.steps_threshold ? ` de ${r.steps_threshold.toLocaleString('es-BO')} pasos` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setDraft(r)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white">
                Editar
              </button>
              <button onClick={() => toggle(r)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white">
                {r.active ? 'Apagar' : 'Prender'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!draft && (
        <button onClick={() => setDraft({ ...EMPTY })} className="bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px]">
          + Nuevo reto
        </button>
      )}

      {draft && (
        <div className="bg-card border border-line rounded-2xl p-5 max-w-[560px] flex flex-col gap-3.5">
          <p className="font-bold text-[15px]">{draft.id ? 'Editar reto' : 'Nuevo reto'}</p>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">Título</span>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={60} className={field} />
          </label>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">Descripción</span>
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={160} className={field} />
          </label>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1">Tipo</span>
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Reto['kind'] })} className={field}>
              {(Object.keys(KIND_LABEL) as Reto['kind'][]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold mb-1">
                {draft.kind === 'referrals' ? 'Amigos' : 'Días'}
              </span>
              <input type="number" min={1} value={draft.target} onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })} className={field} />
            </label>
            {draft.kind === 'steps_streak' && (
              <label className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-semibold mb-1">Pasos por día</span>
                <input type="number" min={1000} step={500} value={draft.steps_threshold ?? 8000} onChange={(e) => setDraft({ ...draft, steps_threshold: Number(e.target.value) })} className={field} />
              </label>
            )}
            <label className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold mb-1">Puntos</span>
              <input type="number" min={1} max={100} value={draft.reward_points} onChange={(e) => setDraft({ ...draft, reward_points: Number(e.target.value) })} className={field} />
            </label>
          </div>
          {error && <p className="text-warn text-[12.5px]">{error}</p>}
          <div className="flex gap-2.5">
            <button onClick={() => setDraft(null)} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || draft.title.trim().length < 3 || draft.description.trim().length < 5}
              className="flex-1 rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
              style={{ background: '#241748', color: '#7FEDC4' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
