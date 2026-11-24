'use client';

import { TimeSelect } from '@/components/TimeSelect';
import { DAY_NAMES, emptyWeek, summarizeWeek, type DayHours, type WeekHours } from '@/lib/hours';

function firstOpen(w: WeekHours) {
  for (let i = 0; i < 7; i++) if (w[String(i)]) return i;
  return 0;
}

// Horario por día (con horario partido). Lo usan el panel del comercio y el Admin.
export function HorarioEditor({ semana, setSemana }: { semana: WeekHours; setSemana: React.Dispatch<React.SetStateAction<WeekHours>> }) {
  return (
    <div className="bg-white border border-line rounded-[10px] p-3 flex flex-col gap-2">
      {DAY_NAMES.map((name, i) => {
        const d = semana[String(i)];
        const set = (cambio: { from?: string; to?: string; from2?: string; to2?: string }) =>
          setSemana((w) => ({ ...w, [String(i)]: { ...(w[String(i)] as NonNullable<DayHours>), ...cambio } }));
        const sel = 'border border-line rounded-[8px] px-2 py-1.5';
        return (
          <div key={name} className="flex flex-col gap-1.5 py-1.5 border-b border-line last:border-b-0">
            <div className="flex items-center gap-2 text-[13px]">
              <label className="flex items-center gap-2 w-[112px] shrink-0">
                <input
                  type="checkbox"
                  checked={!!d}
                  onChange={(e) =>
                    setSemana((w) => ({ ...w, [String(i)]: e.target.checked ? { from: '09:00', to: '19:00' } : null }))
                  }
                />
                <span className={d ? 'font-semibold' : 'text-muted'}>{name}</span>
              </label>
              {d ? (
                <>
                  <TimeSelect value={d.from} onChange={(v) => set({ from: v })} className={sel} />
                  <span className="text-muted">a</span>
                  <TimeSelect value={d.to} onChange={(v) => set({ to: v })} className={sel} />
                </>
              ) : (
                <span className="text-muted text-[12.5px]">Cerrado</span>
              )}
            </div>
            {d && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] pl-[120px]">
                {d.from2 && d.to2 ? (
                  <>
                    <TimeSelect value={d.from2} onChange={(v) => set({ from2: v })} className={sel} />
                    <span className="text-muted">a</span>
                    <TimeSelect value={d.to2} onChange={(v) => set({ to2: v })} className={sel} />
                    <button
                      type="button"
                      className="text-[12px] text-muted underline whitespace-nowrap"
                      onClick={() => setSemana((w) => ({ ...w, [String(i)]: { from: d.from, to: d.to } }))}
                    >
                      Quitar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-[12px] text-purple font-semibold"
                    onClick={() => set({ from2: '14:00', to2: '19:00' })}
                  >
                    + Agregar segundo horario
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 pt-1 text-[12px]">
        <button
          type="button"
          className="text-purple font-semibold"
          onClick={() => {
            const base: DayHours = semana[String(firstOpen(semana))] ?? { from: '09:00', to: '19:00' };
            setSemana(() => {
              const w: WeekHours = emptyWeek();
              for (let i = 0; i < 5; i++) w[String(i)] = { ...base };
              return w;
            });
          }}
        >
          Lunes a viernes igual
        </button>
        <button
          type="button"
          className="text-purple font-semibold"
          onClick={() => {
            const base: DayHours = semana[String(firstOpen(semana))] ?? { from: '09:00', to: '19:00' };
            setSemana(() => {
              const w: WeekHours = emptyWeek();
              for (let i = 0; i < 7; i++) w[String(i)] = { ...base };
              return w;
            });
          }}
        >
          Todos los días igual
        </button>
      </div>
      <p className="text-[11.5px] text-muted leading-4">
        Los clientes ven estos días y horarios al tocar tu local en la app. Resumen:{' '}
        <b>{summarizeWeek(semana) || 'todavía sin horario'}</b>
      </p>
    </div>
  );
}
