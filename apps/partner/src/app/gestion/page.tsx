'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, UserCheck, CalendarCheck, Activity, Wallet, TrendingUp, AlertCircle, CalendarDays, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { Card, CardTitle, Empty, Segmented, Skeleton, Stat } from '@/components/gestion/ui';
import { BarChart, HBars } from '@/components/gestion/Charts';
import { fmtDateTime, money } from '@/lib/gestion';

interface Dash {
  today: string;
  clients_total: number;
  clients_active: number;
  clients_new_month: number;
  visits_today: number;
  sessions_month: number;
  sessions_prev: number;
  income_today: number;
  income_month: number;
  income_prev: number;
  pending_total: number;
  debtors: number;
  credit_total: number;
  series: { day: string; visits: number; income: number }[];
  by_service: { name: string; n: number }[];
  upcoming: { id: string; starts_at: string; client_id: string; client_name: string; service_name: string | null }[];
  pending_packages: { id: string; client_id: string; client_name: string; name: string; remaining: number }[];
}

function pct(a: number, b: number) {
  if (!b) return a > 0 ? 100 : null;
  return ((a - b) / b) * 100;
}

function Panel() {
  const { business, settings, version } = useGestion();
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState(false);
  const [serie, setSerie] = useState<'visits' | 'income'>('visits');

  useEffect(() => {
    supabase.rpc('gestion_dashboard', { p_business: business.id }).then(({ data, error: e }) => {
      if (e) setError(true);
      else setD(data as Dash);
    });
  }, [business.id, version]);

  if (error) return <Card>No se pudo cargar el panel. Revisa tu conexión y vuelve a intentar.</Card>;
  if (!d)
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );

  const cur = settings.currency;
  const sesP = settings.session_plural.toLowerCase();
  const chart = d.series.map((s) => {
    const dt = new Date(s.day + 'T12:00:00');
    return {
      label: `${dt.getDate()}/${dt.getMonth() + 1}`,
      sub: dt.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' }),
      value: serie === 'visits' ? s.visits : Number(s.income),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`${settings.client_plural} registrados`} value={d.clients_total} icon={Users} hint={`+${d.clients_new_month} este mes`} />
        <Stat label={`${settings.client_plural} activos`} value={d.clients_active} icon={UserCheck} hint={d.clients_total ? `${Math.round((d.clients_active / d.clients_total) * 100)}% del total` : undefined} />
        <Stat label="Asistencias de hoy" value={d.visits_today} icon={CalendarCheck} />
        <Stat
          label={`${settings.session_plural} del mes`}
          value={d.sessions_month}
          icon={Activity}
          delta={pct(d.sessions_month, d.sessions_prev)}
          hint="vs. mes anterior"
        />
        <Stat label="Ingresos de hoy" value={money(d.income_today, cur)} icon={Wallet} />
        <Stat label="Ingresos del mes" value={money(d.income_month, cur)} icon={TrendingUp} delta={pct(Number(d.income_month), Number(d.income_prev))} hint="vs. mes anterior" />
        <Stat
          label="Pagos pendientes"
          value={money(d.pending_total, cur)}
          icon={AlertCircle}
          hint={`${d.debtors} ${d.debtors === 1 ? settings.client_singular.toLowerCase() : settings.client_plural.toLowerCase()} con deuda`}
        />
        <Stat label="Saldos a favor" value={money(d.credit_total, cur)} icon={Wallet} hint="pagos anticipados" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 min-w-0">
          <CardTitle
            action={
              <Segmented
                label="Serie"
                value={serie}
                onChange={setSerie}
                options={[
                  { value: 'visits', label: settings.session_plural },
                  { value: 'income', label: 'Ingresos' },
                ]}
              />
            }
          >
            Últimos 30 días
          </CardTitle>
          <BarChart
            data={chart}
            tone={serie === 'visits' ? 'a' : 'b'}
            format={(v) => (serie === 'visits' ? `${v} ${sesP}` : money(v, cur))}
            label={`${serie === 'visits' ? settings.session_plural : 'Ingresos'} por día, últimos 30 días`}
          />
        </Card>
        <Card className="min-w-0">
          <CardTitle>Servicios del mes</CardTitle>
          {d.by_service.length ? (
            <HBars items={d.by_service.map((s) => ({ label: s.name, value: s.n }))} />
          ) : (
            <p className="text-muted text-[13px]">Todavía no hay {sesP} este mes.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card pad={false}>
          <div className="p-4 sm:p-5 pb-2">
            <CardTitle action={<Link href="/gestion/agenda" className="text-[12.5px] font-semibold gx-text-purple">Ver agenda</Link>}>Próximas citas</CardTitle>
          </div>
          {d.upcoming.length === 0 ? (
            <Empty icon={CalendarDays} title="Sin citas próximas" text="Agenda citas para verlas acá." />
          ) : (
            <ul className="m-0 p-0 list-none">
              {d.upcoming.map((a) => (
                <li key={a.id} className="border-t border-line">
                  <Link href={`/gestion/clientes/ficha?id=${a.client_id}`} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-purple-light">
                    <div className="min-w-0">
                      <p className="font-semibold text-[13.5px] truncate">{a.client_name}</p>
                      <p className="text-[12px] text-muted truncate">{a.service_name ?? settings.session_singular}</p>
                    </div>
                    <span className="text-[12.5px] font-semibold tabular-nums shrink-0">{fmtDateTime(a.starts_at, settings.timezone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card pad={false}>
          <div className="p-4 sm:p-5 pb-2">
            <CardTitle>Con {sesP} pendientes en paquetes</CardTitle>
          </div>
          {d.pending_packages.length === 0 ? (
            <Empty icon={Package} title="Ningún paquete con saldo" />
          ) : (
            <ul className="m-0 p-0 list-none">
              {d.pending_packages.map((p) => (
                <li key={p.id} className="border-t border-line">
                  <Link href={`/gestion/clientes/ficha?id=${p.client_id}`} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-purple-light">
                    <div className="min-w-0">
                      <p className="font-semibold text-[13.5px] truncate">{p.client_name}</p>
                      <p className="text-[12px] text-muted truncate">{p.name}</p>
                    </div>
                    <span className="text-[12.5px] font-semibold shrink-0">
                      {p.remaining} {p.remaining === 1 ? settings.session_singular.toLowerCase() : sesP}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function GestionPanelPage() {
  return (
    <GestionShell need={['dashboard.view']} title="Panel de gestión" subtitle="Tu negocio de un vistazo.">
      <Panel />
    </GestionShell>
  );
}
