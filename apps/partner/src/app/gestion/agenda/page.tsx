'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Check, X, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { CitaModal } from '@/components/gestion/Modales';
import { Badge, Button, Card, Notice, Skeleton } from '@/components/gestion/ui';
import { APPT_LABEL, addDays, dayStartIso, fmtTime, fullName, localDay, type Appointment } from '@/lib/gestion';

type Ap = Appointment & { client: { first_name: string; last_name: string } | null; service: { name: string } | null };

function weekStart(day: string) {
  const d = new Date(day + 'T12:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(day, -dow);
}

function Agenda() {
  const { business, settings, can, openQuick, version, bump } = useGestion();
  const tz = settings.timezone;
  const today = localDay(new Date(), tz);
  const [start, setStart] = useState(() => weekStart(today));
  const [items, setItems] = useState<Ap[] | null>(null);
  const [edit, setEdit] = useState<{ open: boolean; cita?: Ap | null; defaultStart?: string }>({ open: false });
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    setItems(null);
    supabase
      .from('gestion_appointments')
      .select('*, client:gestion_clients(first_name, last_name), service:gestion_services(name)')
      .eq('business_id', business.id)
      .gte('starts_at', dayStartIso(start, tz))
      .lt('starts_at', dayStartIso(addDays(start, 7), tz))
      .order('starts_at')
      .then(({ data }) => setItems((data as Ap[]) ?? []));
  }, [business.id, start, tz, version]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const byDay = useMemo(() => {
    const m = new Map<string, Ap[]>();
    for (const a of items ?? []) {
      if (!showDone && a.status !== 'programada') continue;
      const k = localDay(new Date(a.starts_at), tz);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, [items, tz, showDone]);

  async function setStatus(a: Ap, status: Appointment['status']) {
    setError(null);
    const { error: e } = await supabase.rpc('gestion_save_appointment', { p_business: business.id, p: { id: a.id, status } });
    if (e) setError(mensajeError(e));
    else bump();
  }

  const rango = `${new Date(start + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} – ${new Date(addDays(start, 6) + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={ChevronLeft} aria-label="Semana anterior" onClick={() => setStart(addDays(start, -7))} />
        <Button size="sm" icon={ChevronRight} aria-label="Semana siguiente" onClick={() => setStart(addDays(start, 7))} />
        <Button size="sm" variant="ghost" onClick={() => setStart(weekStart(today))}>
          Esta semana
        </Button>
        <span className="text-[14px] font-semibold ml-1">{rango}</span>
        <label className="flex items-center gap-2 text-[12.5px] ml-auto cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="w-4 h-4" />
          Mostrar atendidas y canceladas
        </label>
        {can('agenda.edit') && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setEdit({ open: true })}>
            Nueva cita
          </Button>
        )}
      </div>
      {error && <Notice tone="danger">{error}</Notice>}

      {!items ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            const isToday = d === today;
            return (
              <Card key={d} pad={false} className={isToday ? 'ring-2 ring-purple/30' : ''}>
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <p className={`text-[13px] font-bold first-letter:uppercase ${isToday ? 'gx-text-purple' : ''}`}>
                    {new Date(d + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric' })}
                  </p>
                  {can('agenda.edit') && (
                    <button
                      type="button"
                      aria-label="Agendar este día"
                      onClick={() => setEdit({ open: true, defaultStart: `${d}T09:00` })}
                      className="w-8 h-8 rounded-full hover:bg-purple-light flex items-center justify-center text-muted"
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </div>
                {list.length === 0 ? (
                  <p className="px-4 pb-4 text-[12.5px] text-muted">Libre</p>
                ) : (
                  <ul className="m-0 p-0 list-none pb-1">
                    {list.map((a) => (
                      <li key={a.id} className="border-t border-line px-4 py-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[12.5px] font-bold tabular-nums">{fmtTime(a.starts_at, tz)}</span>
                          <Link href={`/gestion/clientes/ficha?id=${a.client_id}`} className="text-[13px] font-semibold truncate flex-1">
                            {fullName(a.client)}
                          </Link>
                        </div>
                        <p className="text-[11.5px] text-muted truncate">
                          {a.service?.name ?? settings.session_singular} · {a.duration_min} min
                        </p>
                        {a.status !== 'programada' ? (
                          <Badge tone={a.status === 'atendida' ? 'ok' : 'neutral'}>{APPT_LABEL[a.status]}</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {can('visits.create') && (
                              <Button size="sm" icon={Check} onClick={() => openQuick(a.client_id, a.id)} className="h-8">
                                Asistió
                              </Button>
                            )}
                            {can('agenda.edit') && (
                              <>
                                <Button size="sm" variant="ghost" icon={Pencil} aria-label="Editar" className="h-8 px-2" onClick={() => setEdit({ open: true, cita: a })} />
                                <Button size="sm" variant="ghost" icon={X} aria-label="Cancelar cita" className="h-8 px-2" onClick={() => setStatus(a, 'cancelada')} />
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CitaModal open={edit.open} cita={edit.cita} defaultStart={edit.defaultStart} onClose={() => setEdit({ open: false })} onSaved={bump} />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <GestionShell need={['agenda.view']} title="Agenda" subtitle="Citas de la semana. Marca la asistencia desde aquí.">
      <Agenda />
    </GestionShell>
  );
}
