'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Wallet,
  Pencil,
  CalendarPlus,
  Package,
  BadgePercent,
  FileDown,
  Phone,
  Mail,
  CalendarCheck,
  Receipt,
  Ban,
  History,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { ClienteForm } from '@/components/gestion/ClienteForm';
import { getClient } from '@/components/gestion/ClientPicker';
import { AjusteModal, AnularModal, CitaModal, CobroModal, PaqueteModal } from '@/components/gestion/Modales';
import { Avatar, Badge, Button, Card, CardTitle, Empty, Notice, Segmented, Skeleton, Stat, textareaCls } from '@/components/gestion/ui';
import { exportPdf, exportXlsx } from '@/lib/export';
import {
  APPT_LABEL,
  STATUS_LABEL,
  VISIT_LABEL,
  fmtDate,
  fmtDateTime,
  fullName,
  initials,
  money,
  type Adjustment,
  type Appointment,
  type Client,
  type ClientSummary,
  type Pack,
  type Payment,
  type Visit,
} from '@/lib/gestion';

type Ev =
  | { kind: 'visit'; at: string; v: Visit }
  | { kind: 'payment'; at: string; p: Payment }
  | { kind: 'adjustment'; at: string; a: Adjustment }
  | { kind: 'package'; at: string; k: Pack }
  | { kind: 'appointment'; at: string; c: Appointment };

type Filter = 'all' | 'visit' | 'payment' | 'other';

interface ClinicalNote {
  id: string;
  body: string;
  created_by_email: string | null;
  created_at: string;
}

function useIdParam() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  return id;
}

function Ficha({ id }: { id: string }) {
  const { settings, can, openQuick, version, bump, business, services } = useGestion();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modal, setModal] = useState<null | 'edit' | 'cobro' | 'paquete' | 'ajuste' | 'cita'>(null);
  const [anular, setAnular] = useState<null | { what: string; run: (r: string) => Promise<string | null> }>(null);
  const [exporting, setExporting] = useState(false);
  const cur = settings.currency;
  const tz = settings.timezone;
  const canHistory = can('clients.history');

  const load = useCallback(async () => {
    const c = await getClient(id);
    setClient(c);
    if (!c) return;
    const [sum, vis, pay, adj, pk, ap] = await Promise.all([
      supabase.rpc('gestion_client_summary', { p_client: id }),
      supabase.from('gestion_visits').select('*').eq('client_id', id).order('occurred_at', { ascending: false }).limit(2000),
      supabase.from('gestion_payments').select('*').eq('client_id', id).order('paid_at', { ascending: false }).limit(2000),
      supabase.from('gestion_adjustments').select('*').eq('client_id', id).limit(1000),
      supabase.from('gestion_packages').select('*').eq('client_id', id).limit(500),
      supabase.from('gestion_appointments').select('*').eq('client_id', id).order('starts_at', { ascending: false }).limit(500),
    ]);
    setSummary(sum.error ? null : (sum.data as ClientSummary));
    const ev: Ev[] = [
      ...((vis.data as Visit[]) ?? []).map((v) => ({ kind: 'visit' as const, at: v.occurred_at, v })),
      ...((pay.data as Payment[]) ?? []).map((p) => ({ kind: 'payment' as const, at: p.paid_at, p })),
      ...((adj.data as Adjustment[]) ?? []).map((a) => ({ kind: 'adjustment' as const, at: a.created_at, a })),
      ...((pk.data as Pack[]) ?? []).map((k) => ({ kind: 'package' as const, at: k.purchased_at, k })),
      ...((ap.data as Appointment[]) ?? []).map((c) => ({ kind: 'appointment' as const, at: c.starts_at, c })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    setEvents(ev);
  }, [id]);

  useEffect(() => {
    load();
  }, [load, version]);

  const shown = useMemo(
    () =>
      (events ?? []).filter((e) => {
        if (filter === 'visit' && e.kind !== 'visit') return false;
        if (filter === 'payment' && e.kind !== 'payment') return false;
        if (filter === 'other' && (e.kind === 'visit' || e.kind === 'payment')) return false;
        const d = e.at.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      }),
    [events, filter, from, to]
  );

  // Resumen por mes (sesiones y dinero abonado).
  const monthly = useMemo(() => {
    const m = new Map<string, { sessions: number; paid: number; charges: number }>();
    for (const e of events ?? []) {
      const key = new Date(e.at).toLocaleDateString('en-CA', { timeZone: tz }).slice(0, 7);
      const r = m.get(key) ?? { sessions: 0, paid: 0, charges: 0 };
      if (e.kind === 'visit' && !e.v.voided_at) {
        if (e.v.status === 'asistio') r.sessions++;
        r.charges += Number(e.v.charge);
      }
      if (e.kind === 'payment' && !e.p.voided_at) r.paid += Number(e.p.amount);
      if (e.kind === 'package' && !e.k.voided_at) r.charges += Number(e.k.price);
      m.set(key, r);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [events, tz]);

  if (client === undefined)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  if (client === null) return <Empty title={`No se encontró el ${settings.client_singular.toLowerCase()}`} action={<Link href="/gestion/clientes">Volver</Link>} />;

  const bal = summary ? Number(summary.balance) : 0;

  async function doExport(kind: 'pdf' | 'xlsx') {
    if (!client) return;
    setExporting(true);
    const rows = (events ?? []).map((e) => describe(e));
    try {
      if (kind === 'pdf') {
        await exportPdf({
          fileName: `resumen-${fullName(client)}`,
          business: settings.display_name ?? business.name,
          title: fullName(client),
          subtitle: `${settings.client_singular} desde ${fmtDate(client.registered_at)} · ${STATUS_LABEL[client.status]}`,
          sections: [
            {
              heading: 'Resumen',
              pairs: summary
                ? [
                    [`${settings.session_plural} este mes`, String(summary.sessions_month)],
                    ['Abonado este mes', money(summary.paid_month, cur)],
                    ['Último pago', summary.last_payment ? `${money(summary.last_payment.amount, cur)} (${fmtDate(summary.last_payment.paid_at, tz)})` : '—'],
                    ['Última visita', fmtDate(summary.last_visit, tz)],
                    [`Total histórico de ${settings.session_plural.toLowerCase()}`, String(summary.sessions_total)],
                    ['Total histórico abonado', money(summary.paid_total, cur)],
                    ['Total cargado (valor de servicios)', money(summary.charges_total, cur)],
                    ['Descuentos', money(summary.discounts_total, cur)],
                    ['Saldo', bal > 0 ? `Debe ${money(bal, cur)}` : bal < 0 ? `${money(-bal, cur)} a favor` : 'Al día'],
                  ]
                : [],
            },
            {
              heading: 'Por mes',
              head: ['Mes', settings.session_plural, 'Cargado', 'Abonado'],
              rows: monthly.map(([k, r]) => [k, r.sessions, money(r.charges, cur), money(r.paid, cur)]),
              right: [1, 2, 3],
            },
            {
              heading: 'Historial',
              head: ['Fecha', 'Tipo', 'Detalle', 'Cargo', 'Pago', 'Por'],
              rows: rows.map((r) => [fmtDateTime(r.at, tz), r.type, r.detail, r.charge ? money(r.charge, cur) : '', r.paid ? money(r.paid, cur) : '', r.by ?? '']),
              right: [3, 4],
            },
          ],
        });
      } else {
        await exportXlsx(`historial-${fullName(client)}`, [
          {
            name: 'Historial',
            head: ['Fecha', 'Tipo', 'Detalle', `Cargo (${cur})`, `Pago (${cur})`, 'Anulado', 'Registró'],
            rows: rows.map((r) => [new Date(r.at).toLocaleString('es-BO', { timeZone: tz }), r.type, r.detail, r.charge || null, r.paid || null, r.voided ? 'Sí' : '', r.by ?? '']),
          },
          {
            name: 'Por mes',
            head: ['Mes', settings.session_plural, `Cargado (${cur})`, `Abonado (${cur})`],
            rows: monthly.map(([k, r]) => [k, r.sessions, r.charges, r.paid]),
          },
        ]);
      }
    } finally {
      setExporting(false);
    }
  }

  const voidVisit = (v: Visit) =>
    setAnular({
      what: settings.session_singular.toLowerCase(),
      run: async (r) => {
        const { error } = await supabase.rpc('gestion_void_visit', { p_visit: v.id, p_reason: r });
        if (error) return mensajeError(error);
        bump();
        return null;
      },
    });
  const voidPayment = (p: Payment) =>
    setAnular({
      what: `pago Nº ${p.receipt_number}`,
      run: async (r) => {
        const { error } = await supabase.rpc('gestion_void_payment', { p_payment: p.id, p_reason: r });
        if (error) return mensajeError(error);
        bump();
        return null;
      },
    });
  const voidAdj = (a: Adjustment) =>
    setAnular({
      what: a.kind,
      run: async (r) => {
        const { error } = await supabase.rpc('gestion_void_adjustment', { p_adj: a.id, p_reason: r });
        if (error) return mensajeError(error);
        bump();
        return null;
      },
    });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/gestion/clientes" className="inline-flex items-center gap-1.5 text-[13px] text-muted self-start gx-no-print">
        <ArrowLeft size={15} /> {settings.client_plural}
      </Link>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="scale-125 origin-left">
              <Avatar text={initials(client)} />
            </div>
            <div className="min-w-0 ml-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-bold m-0 truncate">{fullName(client)}</h2>
                <Badge tone={client.status === 'activo' ? 'ok' : client.status === 'suspendido' ? 'danger' : 'neutral'}>{STATUS_LABEL[client.status]}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted mt-1">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1">
                    <Phone size={13} /> {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 truncate">
                    <Mail size={13} /> {client.email}
                  </a>
                )}
                <span>Desde {fmtDate(client.registered_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 gx-no-print">
            {can('visits.create') && client.status !== 'suspendido' && (
              <Button variant="primary" icon={Zap} onClick={() => openQuick(client.id)}>
                Registrar {settings.session_singular.toLowerCase()}
              </Button>
            )}
            {can('payments.create') && (
              <Button icon={Wallet} onClick={() => setModal('cobro')}>
                Cobrar
              </Button>
            )}
            {can('clients.edit') && <Button icon={Pencil} onClick={() => setModal('edit')} aria-label="Editar" />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line gx-no-print">
          {can('agenda.edit') && (
            <Button size="sm" icon={CalendarPlus} onClick={() => setModal('cita')}>
              Agendar cita
            </Button>
          )}
          {can('packages.sell') && (
            <Button size="sm" icon={Package} onClick={() => setModal('paquete')}>
              Vender paquete
            </Button>
          )}
          {can('finance.adjust') && (
            <Button size="sm" icon={BadgePercent} onClick={() => setModal('ajuste')}>
              Descuento o ajuste
            </Button>
          )}
          {can('reports.export') && canHistory && (
            <>
              <Button size="sm" icon={FileDown} disabled={exporting} onClick={() => doExport('pdf')}>
                Resumen PDF
              </Button>
              <Button size="sm" icon={FileSpreadsheet} disabled={exporting} onClick={() => doExport('xlsx')}>
                Excel
              </Button>
            </>
          )}
        </div>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label={`${settings.session_plural} este mes`} value={summary.sessions_month} hint={`${summary.sessions_total} en total`} />
            <Stat label="Abonado este mes" value={money(summary.paid_month, cur)} hint={`${money(summary.paid_total, cur)} en total`} />
            <Stat
              label="Último pago"
              value={summary.last_payment ? money(summary.last_payment.amount, cur) : '—'}
              hint={summary.last_payment ? `${fmtDate(summary.last_payment.paid_at, tz)} · ${summary.last_payment.method}` : undefined}
            />
            <div className={`rounded-2xl p-4 border ${bal > 0 ? 'border-transparent gx-bg-danger' : 'bg-card border-line'}`}>
              <p className="text-[12px] font-medium text-muted">Saldo</p>
              <p className={`text-[24px] sm:text-[26px] font-extrabold tracking-tight mt-1 tabular-nums ${bal > 0 ? 'gx-text-danger' : bal < 0 ? 'gx-text-ok' : ''}`}>
                {bal === 0 ? 'Al día' : money(Math.abs(bal), cur)}
              </p>
              <p className="text-[11.5px] text-muted">{bal > 0 ? 'pendiente de pago' : bal < 0 ? 'a favor (pago anticipado)' : 'sin deuda'}</p>
            </div>
          </div>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
              <div>
                <p className="text-muted text-[12px]">Última visita</p>
                <p className="font-semibold">{fmtDate(summary.last_visit, tz)}</p>
              </div>
              <div>
                <p className="text-muted text-[12px]">Próxima cita</p>
                <p className="font-semibold">{summary.next_appointment ? fmtDateTime(summary.next_appointment.starts_at, tz) : '—'}</p>
              </div>
              <div>
                <p className="text-muted text-[12px]">Valor de servicios</p>
                <p className="font-semibold">{money(summary.charges_total, cur)}</p>
              </div>
              <div>
                <p className="text-muted text-[12px]">Descuentos</p>
                <p className="font-semibold">{money(summary.discounts_total, cur)}</p>
              </div>
              <div>
                <p className="text-muted text-[12px]">Faltas</p>
                <p className="font-semibold">{summary.absences_total}</p>
              </div>
              <div>
                <p className="text-muted text-[12px]">Servicio habitual</p>
                <p className="font-semibold">{services.find((x) => x.id === client.service_id)?.name ?? '—'}</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {summary && summary.packages.length > 0 && (
        <Card>
          <CardTitle>Paquetes</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.packages.map((p) => {
              const used = p.sessions_total - p.remaining;
              return (
                <div key={p.id} className="border border-line rounded-xl p-3">
                  <div className="flex justify-between gap-2 text-[13px]">
                    <span className="font-semibold truncate">{p.name}</span>
                    <span className="tabular-nums">
                      {used}/{p.sessions_total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-purple-light mt-2 overflow-hidden">
                    <div className="h-full gx-chart-a" style={{ width: `${(used / p.sessions_total) * 100}%`, background: 'currentColor' }} />
                  </div>
                  <p className="text-[12px] text-muted mt-1.5">
                    Quedan {p.remaining} · {money(p.price, cur)}
                    {p.expires_on ? ` · vence ${fmtDate(p.expires_on)}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(settings.custom_fields.length > 0 || client.notes) && (
        <Card>
          <CardTitle>Información adicional</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px] m-0">
            {settings.custom_fields.map((cf) => (
              <div key={cf.key} className="flex justify-between gap-3 border-b border-line py-1.5">
                <dt className="text-muted">{cf.label}</dt>
                <dd className="m-0 font-semibold text-right">{client.custom?.[cf.key] ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {client.notes && <p className="text-[13px] mt-3 whitespace-pre-wrap">{client.notes}</p>}
        </Card>
      )}

      {settings.clinical_enabled && <Clinico clientId={client.id} />}

      {canHistory && monthly.length > 0 && (
        <Card pad={false}>
          <div className="p-4 sm:p-5 pb-1">
            <CardTitle>Por mes</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-muted text-[11.5px] uppercase tracking-wide">
                  <th className="font-semibold px-5 py-2">Mes</th>
                  <th className="font-semibold px-3 py-2 text-right">{settings.session_plural}</th>
                  <th className="font-semibold px-3 py-2 text-right">Cargado</th>
                  <th className="font-semibold px-5 py-2 text-right">Abonado</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map(([k, r]) => (
                  <tr key={k} className="border-t border-line">
                    <td className="px-5 py-2 first-letter:uppercase">{new Date(k + '-15').toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.sessions}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.charges, cur)}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-semibold">{money(r.paid, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          <CardTitle>Historial</CardTitle>
          {!canHistory && <Notice>Tu rol ve solo lo registrado en las últimas 36 horas.</Notice>}
          <div className="flex flex-wrap gap-2 items-center">
            <Segmented
              label="Tipo de movimiento"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todo' },
                { value: 'visit', label: settings.session_plural },
                { value: 'payment', label: 'Pagos' },
                { value: 'other', label: 'Otros' },
              ]}
            />
            <label className="text-[12.5px] text-muted flex items-center gap-1.5">
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white border border-line rounded-[10px] h-9 px-2 text-[13px]" />
            </label>
            <label className="text-[12.5px] text-muted flex items-center gap-1.5">
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white border border-line rounded-[10px] h-9 px-2 text-[13px]" />
            </label>
          </div>
        </div>
        {!events ? (
          <div className="p-4">
            <Skeleton className="h-16" />
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={History} title="Sin movimientos" />
        ) : (
          <ol className="m-0 p-0 list-none">
            {shown.map((e) => (
              <Fila
                key={e.kind + (e.kind === 'visit' ? e.v.id : e.kind === 'payment' ? e.p.id : e.kind === 'adjustment' ? e.a.id : e.kind === 'package' ? e.k.id : e.c.id)}
                e={e}
                onVoidVisit={can('visits.void') ? voidVisit : undefined}
                onVoidPayment={can('payments.void') ? voidPayment : undefined}
                onVoidAdj={can('finance.adjust') ? voidAdj : undefined}
                canReceipt={can('receipts.issue')}
              />
            ))}
          </ol>
        )}
      </Card>

      <ClienteForm
        open={modal === 'edit'}
        client={client}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          bump();
        }}
      />
      <CobroModal open={modal === 'cobro'} clientId={client.id} onClose={() => setModal(null)} onSaved={bump} />
      <PaqueteModal open={modal === 'paquete'} clientId={client.id} onClose={() => setModal(null)} onSaved={bump} />
      <AjusteModal open={modal === 'ajuste'} clientId={client.id} onClose={() => setModal(null)} onSaved={bump} />
      <CitaModal open={modal === 'cita'} clientId={client.id} onClose={() => setModal(null)} onSaved={bump} />
      <AnularModal open={!!anular} what={anular?.what ?? ''} onClose={() => setAnular(null)} onConfirm={(r) => anular!.run(r)} />
    </div>
  );

  function describe(e: Ev) {
    switch (e.kind) {
      case 'visit':
        return {
          at: e.at,
          type: `${settings.session_singular} · ${VISIT_LABEL[e.v.status]}`,
          detail: [e.v.service_name, e.v.package_id ? '(paquete)' : '', e.v.notes].filter(Boolean).join(' '),
          charge: e.v.voided_at ? 0 : Number(e.v.charge),
          paid: 0,
          by: e.v.created_by_email,
          voided: !!e.v.voided_at,
        };
      case 'payment':
        return {
          at: e.at,
          type: `Pago Nº ${e.p.receipt_number}`,
          detail: [e.p.method, e.p.concept].filter(Boolean).join(' · '),
          charge: 0,
          paid: e.p.voided_at ? 0 : Number(e.p.amount),
          by: e.p.created_by_email,
          voided: !!e.p.voided_at,
        };
      case 'adjustment':
        return {
          at: e.at,
          type: e.a.kind === 'descuento' ? 'Descuento' : 'Cargo',
          detail: e.a.reason,
          charge: e.a.voided_at || e.a.kind === 'descuento' ? 0 : Number(e.a.amount),
          paid: e.a.voided_at || e.a.kind === 'cargo' ? 0 : Number(e.a.amount),
          by: e.a.created_by_email,
          voided: !!e.a.voided_at,
        };
      case 'package':
        return { at: e.at, type: 'Paquete', detail: `${e.k.name} (${e.k.sessions_total})`, charge: e.k.voided_at ? 0 : Number(e.k.price), paid: 0, by: e.k.created_by_email, voided: !!e.k.voided_at };
      case 'appointment':
        return { at: e.at, type: `Cita · ${APPT_LABEL[e.c.status]}`, detail: e.c.notes ?? '', charge: 0, paid: 0, by: e.c.created_by_email, voided: false };
    }
  }
}

function Fila({
  e,
  onVoidVisit,
  onVoidPayment,
  onVoidAdj,
  canReceipt,
}: {
  e: Ev;
  onVoidVisit?: (v: Visit) => void;
  onVoidPayment?: (p: Payment) => void;
  onVoidAdj?: (a: Adjustment) => void;
  canReceipt: boolean;
}) {
  const { settings } = useGestion();
  const cur = settings.currency;
  const tz = settings.timezone;
  let icon = CalendarCheck;
  let title = '';
  let detail = '';
  let amount: React.ReactNode = null;
  let voided: string | null = null;
  let by: string | null = null;
  let actions: React.ReactNode = null;

  if (e.kind === 'visit') {
    const v = e.v;
    icon = CalendarCheck;
    title = `${settings.session_singular} · ${VISIT_LABEL[v.status]}`;
    detail = [v.service_name, v.package_id ? 'con paquete' : null, v.notes].filter(Boolean).join(' · ');
    amount = Number(v.charge) > 0 ? <span className="text-muted">Valor {money(v.charge, cur)}</span> : null;
    voided = v.voided_at ? v.void_reason : null;
    by = v.created_by_email;
    if (!v.voided_at && onVoidVisit)
      actions = (
        <button type="button" onClick={() => onVoidVisit(v)} className="text-[12px] text-muted hover:underline inline-flex items-center gap-1">
          <Ban size={12} /> Anular
        </button>
      );
  } else if (e.kind === 'payment') {
    const p = e.p;
    icon = Receipt;
    title = `Pago Nº ${p.receipt_number}`;
    detail = [p.method, p.concept, p.notes].filter(Boolean).join(' · ');
    amount = <span className="gx-text-ok font-semibold">+ {money(p.amount, cur)}</span>;
    voided = p.voided_at ? p.void_reason : null;
    by = p.created_by_email;
    actions = (
      <>
        {canReceipt && (
          <Link href={`/gestion/comprobante?id=${p.id}`} className="text-[12px] gx-text-purple font-semibold hover:underline">
            Comprobante
          </Link>
        )}
        {!p.voided_at && onVoidPayment && (
          <button type="button" onClick={() => onVoidPayment(p)} className="text-[12px] text-muted hover:underline inline-flex items-center gap-1">
            <Ban size={12} /> Anular
          </button>
        )}
      </>
    );
  } else if (e.kind === 'adjustment') {
    const a = e.a;
    icon = BadgePercent;
    title = a.kind === 'descuento' ? 'Descuento' : 'Cargo extra';
    detail = a.reason;
    amount = <span className="font-semibold">{a.kind === 'descuento' ? '−' : '+'} {money(a.amount, cur)}</span>;
    voided = a.voided_at ? 'anulado' : null;
    by = a.created_by_email;
    if (!a.voided_at && onVoidAdj)
      actions = (
        <button type="button" onClick={() => onVoidAdj(a)} className="text-[12px] text-muted hover:underline inline-flex items-center gap-1">
          <Ban size={12} /> Anular
        </button>
      );
  } else if (e.kind === 'package') {
    icon = Package;
    title = `Paquete: ${e.k.name}`;
    detail = `${e.k.sessions_total} ${settings.session_plural.toLowerCase()}`;
    amount = <span className="text-muted">Valor {money(e.k.price, cur)}</span>;
    by = e.k.created_by_email;
  } else {
    icon = CalendarPlus;
    title = `Cita · ${APPT_LABEL[e.c.status]}`;
    detail = e.c.notes ?? '';
    by = e.c.created_by_email;
  }
  const Icon = icon;
  return (
    <li className={`border-t border-line px-4 sm:px-5 py-3 flex gap-3 ${voided != null ? 'opacity-60' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-purple-light flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-muted" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className={`font-semibold text-[13.5px] ${voided != null ? 'line-through' : ''}`}>{title}</p>
          <span className="text-[13px] tabular-nums">{amount}</span>
        </div>
        {detail && <p className="text-[12.5px] text-muted break-words">{detail}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11.5px] text-muted">
          <span className="tabular-nums">{fmtDateTime(e.at, tz)}</span>
          {by && <span>por {by}</span>}
          {voided != null && <Badge tone="danger">Anulado{voided && voided !== 'anulado' ? `: ${voided}` : ''}</Badge>}
          {actions}
        </div>
      </div>
    </li>
  );
}

function Clinico({ clientId }: { clientId: string }) {
  const { can } = useGestion();
  const [notes, setNotes] = useState<ClinicalNote[] | null>(null);
  const [shown, setShown] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!can('clinical.view') && !can('clinical.edit')) return null;

  async function load() {
    const { data, error: e } = await supabase.rpc('gestion_clinical_list', { p_client: clientId });
    if (e) setError(mensajeError(e));
    else setNotes((data as ClinicalNote[]) ?? []);
    setShown(true);
  }

  async function add() {
    setSaving(true);
    const { error: e } = await supabase.rpc('gestion_clinical_add', { p_client: clientId, p_body: text });
    setSaving(false);
    if (e) return setError(mensajeError(e));
    setText('');
    if (can('clinical.view')) load();
  }

  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <Lock size={14} /> Notas clínicas
        </span>
      </CardTitle>
      <p className="text-[12px] text-muted mb-3">Separadas de los datos administrativos. Cada vez que se abren queda registrado en la auditoría. Guarda solo lo necesario.</p>
      {can('clinical.view') && !shown && (
        <Button size="sm" onClick={load}>
          Mostrar notas
        </Button>
      )}
      {shown && notes && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2 mb-3">
          {notes.length === 0 && <li className="text-[13px] text-muted">Sin notas.</li>}
          {notes.map((n) => (
            <li key={n.id} className="border border-line rounded-xl p-3">
              <p className="text-[13px] whitespace-pre-wrap">{n.body}</p>
              <p className="text-[11.5px] text-muted mt-1">
                {fmtDateTime(n.created_at)} · {n.created_by_email}
              </p>
            </li>
          ))}
        </ul>
      )}
      {can('clinical.edit') && (
        <div className="flex flex-col gap-2 mt-2">
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={textareaCls} placeholder="Nueva nota clínica" maxLength={5000} />
          <Button size="sm" variant="primary" disabled={saving || !text.trim()} onClick={add} className="self-start">
            Guardar nota
          </Button>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Card>
  );
}

function FichaPage() {
  const id = useIdParam();
  if (!id) return null;
  return <Ficha id={id} />;
}

export default function ClienteFichaPage() {
  return (
    <GestionShell need={['clients.view']} title={(s) => `Ficha del ${s.client_singular.toLowerCase()}`}>
      <FichaPage />
    </GestionShell>
  );
}
