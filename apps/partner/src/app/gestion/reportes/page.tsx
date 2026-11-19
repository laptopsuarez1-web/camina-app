'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { ClientPicker } from '@/components/gestion/ClientPicker';
import { BarChart, HBars } from '@/components/gestion/Charts';
import { Button, Card, CardTitle, Field, Notice, Segmented, Skeleton, Stat, inputCls } from '@/components/gestion/ui';
import { exportPdf, exportXlsx, type Cell } from '@/lib/export';
import { addDays, dayStartIso, fullName, localDay, money, VISIT_LABEL, type Client, type Payment, type Visit } from '@/lib/gestion';

type Group = 'day' | 'week' | 'month';

interface Report {
  series: { period: string; visits: number; absences: number; charges: number; income: number }[];
  by_service: { name: string; sessions: number; charges: number }[];
  by_method: { method: string; n: number; total: number }[];
  totals: { visits: number; clients: number; charges: number; income: number; discounts: number };
}

type V = Visit & { client: { first_name: string; last_name: string } | null };
type P = Payment & { client: { first_name: string; last_name: string } | null };

function periodLabel(p: string, g: Group) {
  const d = new Date(p + 'T12:00:00');
  if (g === 'month') return d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
  if (g === 'week') return `${d.getDate()}/${d.getMonth() + 1}`;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function periodLong(p: string, g: Group) {
  const d = new Date(p + 'T12:00:00');
  if (g === 'month') return d.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
  if (g === 'week') return `Semana del ${d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}`;
  return d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'long' });
}

function Reportes() {
  const { business, settings, can } = useGestion();
  const router = useRouter();
  const tz = settings.timezone;
  const today = localDay(new Date(), tz);
  const cur = settings.currency;
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [group, setGroup] = useState<Group>('day');
  const [rep, setRep] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'visits' | 'income'>('visits');
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Client | null>(null);

  useEffect(() => {
    setRep(null);
    setError(null);
    supabase.rpc('gestion_report', { p_business: business.id, p_from: from, p_to: to, p_group: group }).then(({ data, error: e }) => {
      if (e) setError(mensajeError(e));
      else setRep(data as Report);
    });
  }, [business.id, from, to, group]);

  useEffect(() => {
    if (pick) router.push(`/gestion/clientes/ficha?id=${pick.id}`);
  }, [pick, router]);

  function preset(k: string) {
    if (k === 'mes') {
      setFrom(today.slice(0, 8) + '01');
      setTo(today);
      setGroup('day');
    } else if (k === 'mes_ant') {
      const first = today.slice(0, 8) + '01';
      const lastPrev = addDays(first, -1);
      setFrom(lastPrev.slice(0, 8) + '01');
      setTo(lastPrev);
      setGroup('day');
    } else if (k === '90') {
      setFrom(addDays(today, -89));
      setTo(today);
      setGroup('week');
    } else if (k === 'anio') {
      setFrom(today.slice(0, 4) + '-01-01');
      setTo(today);
      setGroup('month');
    }
  }

  async function detail() {
    const fromIso = dayStartIso(from, tz);
    const toIso = dayStartIso(addDays(to, 1), tz);
    const [v, p, b] = await Promise.all([
      supabase
        .from('gestion_visits')
        .select('*, client:gestion_clients(first_name, last_name)')
        .eq('business_id', business.id)
        .gte('occurred_at', fromIso)
        .lt('occurred_at', toIso)
        .order('occurred_at')
        .limit(20000),
      supabase
        .from('gestion_payments')
        .select('*, client:gestion_clients(first_name, last_name)')
        .eq('business_id', business.id)
        .gte('paid_at', fromIso)
        .lt('paid_at', toIso)
        .order('paid_at')
        .limit(20000),
      can('finance.view') ? supabase.rpc('gestion_balances', { p_business: business.id }) : Promise.resolve({ data: [] }),
    ]);
    const balances = ((b.data as { client_id: string; balance: number; charges: number; paid: number }[]) ?? []).filter((x) => Number(x.balance) !== 0);
    let names = new Map<string, string>();
    if (balances.length) {
      const ids = balances.map((x) => x.client_id);
      const all: Client[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from('gestion_clients').select('id, first_name, last_name').in('id', ids.slice(i, i + 200));
        all.push(...((data as Client[]) ?? []));
      }
      names = new Map(all.map((c) => [c.id, fullName(c)]));
    }
    return { visits: (v.data as V[]) ?? [], payments: (p.data as P[]) ?? [], balances, names };
  }

  async function doExport(kind: 'pdf' | 'xlsx') {
    if (!rep) return;
    setBusy(true);
    try {
      const d = await detail();
      const fmt = (iso: string) => new Date(iso).toLocaleString('es-BO', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' });
      const seriesRows: Cell[][] = rep.series.map((s) => [periodLong(s.period, group), s.visits, s.absences, Number(s.charges), Number(s.income)]);
      const visitRows: Cell[][] = d.visits.map((v) => [fmt(v.occurred_at), fullName(v.client), v.service_name, v.voided_at ? 'Anulado' : VISIT_LABEL[v.status], Number(v.charge), v.created_by_email]);
      const payRows: Cell[][] = d.payments.map((p) => [p.receipt_number, fmt(p.paid_at), fullName(p.client), p.method, Number(p.amount), p.voided_at ? 'Anulado' : '', p.created_by_email]);
      const balRows: Cell[][] = d.balances
        .sort((a, b) => Number(b.balance) - Number(a.balance))
        .map((x) => [d.names.get(x.client_id) ?? '—', Number(x.charges), Number(x.paid), Number(x.balance)]);
      const name = `reporte-${from}-a-${to}`;
      if (kind === 'xlsx') {
        await exportXlsx(name, [
          { name: 'Resumen', head: ['Período', settings.session_plural, 'Faltas', `Cargado (${cur})`, `Ingresos (${cur})`], rows: seriesRows },
          { name: 'Por servicio', head: ['Servicio', settings.session_plural, `Cargado (${cur})`], rows: rep.by_service.map((s) => [s.name, s.sessions, Number(s.charges)]) },
          { name: 'Por método', head: ['Método', 'Cobros', `Total (${cur})`], rows: rep.by_method.map((m) => [m.method, m.n, Number(m.total)]) },
          { name: 'Asistencias', head: ['Fecha', settings.client_singular, 'Servicio', 'Estado', `Valor (${cur})`, 'Registró'], rows: visitRows },
          { name: 'Pagos', head: ['Comprobante', 'Fecha', settings.client_singular, 'Método', `Importe (${cur})`, 'Estado', 'Registró'], rows: payRows },
          ...(can('finance.view') ? [{ name: 'Saldos', head: [settings.client_singular, `Cargado (${cur})`, `Pagado (${cur})`, `Saldo (${cur})`], rows: balRows }] : []),
        ]);
      } else {
        const m = (v: Cell) => money(Number(v), cur);
        await exportPdf({
          fileName: name,
          business: settings.display_name ?? business.name,
          title: 'Reporte de gestión',
          subtitle: `Del ${new Date(from + 'T12:00:00').toLocaleDateString('es-BO')} al ${new Date(to + 'T12:00:00').toLocaleDateString('es-BO')}`,
          sections: [
            {
              heading: 'Totales',
              pairs: [
                [`${settings.session_plural} realizadas`, String(rep.totals.visits)],
                [`${settings.client_plural} atendidos`, String(rep.totals.clients)],
                ['Valor de servicios y paquetes', money(rep.totals.charges, cur)],
                ['Dinero cobrado', money(rep.totals.income, cur)],
                ['Descuentos', money(rep.totals.discounts, cur)],
              ],
            },
            { heading: 'Por período', head: ['Período', settings.session_plural, 'Faltas', 'Cargado', 'Ingresos'], rows: seriesRows.map((r) => [r[0], r[1], r[2], m(r[3]), m(r[4])]), right: [1, 2, 3, 4] },
            { heading: 'Por servicio', head: ['Servicio', settings.session_plural, 'Cargado'], rows: rep.by_service.map((s) => [s.name, s.sessions, m(s.charges)]), right: [1, 2] },
            { heading: 'Por método de pago', head: ['Método', 'Cobros', 'Total'], rows: rep.by_method.map((x) => [x.method, x.n, m(x.total)]), right: [1, 2] },
            ...(can('finance.view') && balRows.length
              ? [{ heading: 'Saldos (a hoy)', head: [settings.client_singular, 'Cargado', 'Pagado', 'Saldo'], rows: balRows.map((r) => [r[0], m(r[1]), m(r[2]), m(r[3])]), right: [1, 2, 3] }]
              : []),
            { heading: 'Pagos', head: ['Nº', 'Fecha', settings.client_singular, 'Método', 'Importe', 'Estado'], rows: payRows.map((r) => [r[0], r[1], r[2], r[3], m(r[4]), r[5]]), right: [4] },
          ],
        });
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="flex flex-wrap gap-2 items-end">
            <Field label="Desde">
              <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${inputCls} w-auto`} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${inputCls} w-auto`} />
            </Field>
            <Field label="Agrupar por">
              <select value={group} onChange={(e) => setGroup(e.target.value as Group)} className={`${inputCls} w-auto`}>
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </Field>
            <select aria-label="Rango rápido" onChange={(e) => e.target.value && preset(e.target.value)} value="" className={`${inputCls} w-auto`}>
              <option value="">Rango rápido…</option>
              <option value="mes">Este mes</option>
              <option value="mes_ant">Mes anterior</option>
              <option value="90">Últimos 90 días</option>
              <option value="anio">Este año</option>
            </select>
          </div>
          {can('reports.export') && (
            <div className="flex gap-2">
              <Button icon={FileDown} disabled={busy || !rep} onClick={() => doExport('pdf')}>
                PDF
              </Button>
              <Button icon={FileSpreadsheet} disabled={busy || !rep} onClick={() => doExport('xlsx')}>
                Excel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      {!rep ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label={`${settings.session_plural} realizadas`} value={rep.totals.visits} />
            <Stat label={`${settings.client_plural} atendidos`} value={rep.totals.clients} />
            <Stat label="Valor de servicios" value={money(rep.totals.charges, cur)} hint="incluye paquetes vendidos" />
            <Stat label="Dinero cobrado" value={money(rep.totals.income, cur)} />
            <Stat label="Descuentos" value={money(rep.totals.discounts, cur)} />
          </div>

          <Card>
            <CardTitle
              action={
                <Segmented
                  label="Métrica"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'visits', label: settings.session_plural },
                    { value: 'income', label: 'Ingresos' },
                  ]}
                />
              }
            >
              {metric === 'visits' ? settings.session_plural : 'Ingresos'} por {group === 'day' ? 'día' : group === 'week' ? 'semana' : 'mes'}
            </CardTitle>
            <BarChart
              data={rep.series.map((s) => ({ label: periodLabel(s.period, group), sub: periodLong(s.period, group), value: metric === 'visits' ? s.visits : Number(s.income) }))}
              tone={metric === 'visits' ? 'a' : 'b'}
              format={(v) => (metric === 'visits' ? String(v) : money(v, cur))}
              label="Evolución en el período"
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Servicios utilizados</CardTitle>
              {rep.by_service.length ? <HBars items={rep.by_service.map((s) => ({ label: s.name, value: s.sessions }))} /> : <p className="text-[13px] text-muted">Sin datos.</p>}
            </Card>
            <Card>
              <CardTitle>Cobros por método</CardTitle>
              {rep.by_method.length ? (
                <HBars items={rep.by_method.map((m) => ({ label: `${m.method} (${m.n})`, value: Number(m.total) }))} format={(v) => money(v, cur)} />
              ) : (
                <p className="text-[13px] text-muted">Sin datos.</p>
              )}
            </Card>
          </div>

          <Card pad={false}>
            <div className="p-4 sm:p-5 pb-1">
              <CardTitle>Detalle por {group === 'day' ? 'día' : group === 'week' ? 'semana' : 'mes'}</CardTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-left text-muted text-[11.5px] uppercase tracking-wide">
                    <th className="font-semibold px-5 py-2">Período</th>
                    <th className="font-semibold px-3 py-2 text-right">{settings.session_plural}</th>
                    <th className="font-semibold px-3 py-2 text-right">Faltas</th>
                    <th className="font-semibold px-3 py-2 text-right">Cargado</th>
                    <th className="font-semibold px-5 py-2 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.series
                    .filter((s) => s.visits || s.absences || Number(s.charges) || Number(s.income))
                    .map((s) => (
                      <tr key={s.period} className="border-t border-line">
                        <td className="px-5 py-2 first-letter:uppercase">{periodLong(s.period, group)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.visits}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.absences}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(s.charges, cur)}</td>
                        <td className="px-5 py-2 text-right tabular-nums font-semibold">{money(s.income, cur)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card>
        <CardTitle>Resumen de un {settings.client_singular.toLowerCase()}</CardTitle>
        <p className="text-[12.5px] text-muted mb-3">Elige a alguien para abrir su resumen completo (historial, pagos, saldo y exportación).</p>
        <ClientPicker value={pick} onChange={setPick} />
      </Card>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <GestionShell need={['reports.view']} title="Reportes" subtitle="Asistencias, ingresos, deudas y servicios por período.">
      <Reportes />
    </GestionShell>
  );
}
