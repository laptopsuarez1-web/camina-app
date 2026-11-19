'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarCheck, Ban, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { AnularModal } from '@/components/gestion/Modales';
import { Badge, Button, Card, CardTitle, Empty, Skeleton, Stat } from '@/components/gestion/ui';
import { VISIT_LABEL, addDays, dayStartIso, fmtTime, fullName, localDay, money, type Appointment, type Visit } from '@/lib/gestion';

type Row = Visit & { client: { first_name: string; last_name: string } | null; payments: { amount: number; voided_at: string | null }[] };
type Ap = Appointment & { client: { first_name: string; last_name: string } | null };

function Asistencia() {
  const { business, settings, can, openQuick, version, bump } = useGestion();
  const tz = settings.timezone;
  const [day, setDay] = useState(() => localDay(new Date(), tz));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [appts, setAppts] = useState<Ap[]>([]);
  const [anular, setAnular] = useState<Row | null>(null);
  const today = localDay(new Date(), tz);

  useEffect(() => {
    setRows(null);
    const from = dayStartIso(day, tz);
    const to = dayStartIso(addDays(day, 1), tz);
    supabase
      .from('gestion_visits')
      .select('*, client:gestion_clients(first_name, last_name), payments:gestion_payments(amount, voided_at)')
      .eq('business_id', business.id)
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
    if (can('agenda.view'))
      supabase
        .from('gestion_appointments')
        .select('*, client:gestion_clients(first_name, last_name)')
        .eq('business_id', business.id)
        .eq('status', 'programada')
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
        .then(({ data }) => setAppts((data as Ap[]) ?? []));
  }, [business.id, day, tz, version, can]);

  const stats = useMemo(() => {
    const live = (rows ?? []).filter((r) => !r.voided_at);
    return {
      asistio: live.filter((r) => r.status === 'asistio').length,
      falto: live.filter((r) => r.status !== 'asistio').length,
      valor: live.reduce((s, r) => s + Number(r.charge), 0),
      cobrado: live.reduce((s, r) => s + r.payments.filter((p) => !p.voided_at).reduce((a, p) => a + Number(p.amount), 0), 0),
    };
  }, [rows]);

  const label = new Date(day + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" icon={ChevronLeft} aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))} />
        <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="bg-white border border-line rounded-[10px] h-9 px-2 text-[13px]" aria-label="Día" />
        <Button size="sm" icon={ChevronRight} aria-label="Día siguiente" disabled={day >= today} onClick={() => setDay(addDays(day, 1))} />
        {day !== today && (
          <Button size="sm" variant="ghost" onClick={() => setDay(today)}>
            Hoy
          </Button>
        )}
        <span className="text-[14px] font-semibold inline-block first-letter:uppercase ml-1">{label}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Asistieron" value={stats.asistio} />
        <Stat label="Faltas o cancelaciones" value={stats.falto} />
        <Stat label="Valor de servicios" value={money(stats.valor, settings.currency)} />
        <Stat label="Cobrado en el registro" value={money(stats.cobrado, settings.currency)} />
      </div>

      {appts.length > 0 && (
        <Card pad={false}>
          <div className="p-4 sm:p-5 pb-2">
            <CardTitle>Citas por marcar</CardTitle>
          </div>
          <ul className="m-0 p-0 list-none">
            {appts.map((a) => (
              <li key={a.id} className="border-t border-line px-4 sm:px-5 py-3 flex items-center gap-3">
                <span className="text-[13px] font-semibold tabular-nums w-12 shrink-0">{fmtTime(a.starts_at, tz)}</span>
                <Link href={`/gestion/clientes/ficha?id=${a.client_id}`} className="font-semibold text-[13.5px] flex-1 min-w-0 truncate">
                  {fullName(a.client)}
                </Link>
                {can('visits.create') && (
                  <Button size="sm" icon={Check} onClick={() => openQuick(a.client_id, a.id)}>
                    Marcar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card pad={false}>
        <div className="p-4 sm:p-5 pb-2">
          <CardTitle>Registros del día</CardTitle>
        </div>
        {!rows ? (
          <div className="p-4">
            <Skeleton className="h-14" />
          </div>
        ) : rows.length === 0 ? (
          <Empty
            icon={CalendarCheck}
            title="Sin registros este día"
            text="Usa Registro rápido para anotar una asistencia en segundos."
            action={
              can('visits.create') && day === today ? (
                <Button variant="primary" onClick={() => openQuick()}>
                  Registrar ahora
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="m-0 p-0 list-none">
            {rows.map((r) => {
              const paid = r.payments.filter((p) => !p.voided_at).reduce((a, p) => a + Number(p.amount), 0);
              return (
                <li key={r.id} className={`border-t border-line px-4 sm:px-5 py-3 flex items-center gap-3 ${r.voided_at ? 'opacity-55' : ''}`}>
                  <span className="text-[13px] font-semibold tabular-nums w-12 shrink-0">{fmtTime(r.occurred_at, tz)}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/gestion/clientes/ficha?id=${r.client_id}`} className={`font-semibold text-[13.5px] ${r.voided_at ? 'line-through' : ''}`}>
                      {fullName(r.client)}
                    </Link>
                    <p className="text-[12px] text-muted truncate">
                      {[r.service_name, r.package_id ? 'paquete' : null, r.created_by_email ? `por ${r.created_by_email}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={r.voided_at ? 'danger' : r.status === 'asistio' ? 'ok' : 'warn'}>{r.voided_at ? 'Anulado' : VISIT_LABEL[r.status]}</Badge>
                    <p className="text-[12px] text-muted mt-0.5 tabular-nums">
                      {paid > 0 ? `${money(paid, settings.currency)} de ${money(r.charge, settings.currency)}` : Number(r.charge) > 0 ? `Pendiente ${money(r.charge, settings.currency)}` : ''}
                    </p>
                  </div>
                  {can('visits.void') && !r.voided_at && (
                    <button type="button" onClick={() => setAnular(r)} aria-label="Anular" className="w-9 h-9 rounded-full hover:bg-purple-light flex items-center justify-center text-muted shrink-0">
                      <Ban size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AnularModal
        open={!!anular}
        what={settings.session_singular.toLowerCase()}
        onClose={() => setAnular(null)}
        onConfirm={async (reason) => {
          const { error } = await supabase.rpc('gestion_void_visit', { p_visit: anular!.id, p_reason: reason });
          if (error) return mensajeError(error);
          bump();
          return null;
        }}
      />
    </div>
  );
}

export default function AsistenciaPage() {
  return (
    <GestionShell need={['visits.create', 'clients.history']} title="Asistencia" subtitle="Lo que pasó cada día, con quién lo registró.">
      <Asistencia />
    </GestionShell>
  );
}
