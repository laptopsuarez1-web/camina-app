'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Wallet, Ban, Plus, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { AnularModal, CobroModal } from '@/components/gestion/Modales';
import { HBars } from '@/components/gestion/Charts';
import { Badge, Button, Card, CardTitle, Empty, SearchBox, Segmented, Skeleton, Stat, inputCls } from '@/components/gestion/ui';
import { exportXlsx } from '@/lib/export';
import { addDays, dayStartIso, fmtDateTime, fullName, localDay, money, type Client, type Payment } from '@/lib/gestion';

type Row = Payment & { client: { first_name: string; last_name: string } | null };

function Pagos() {
  const { business, settings, can, version, bump } = useGestion();
  const tz = settings.timezone;
  const today = localDay(new Date(), tz);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [method, setMethod] = useState('');
  const [q, setQ] = useState('');
  const [cobro, setCobro] = useState<{ open: boolean; clientId?: string }>({ open: false });
  const [anular, setAnular] = useState<Row | null>(null);
  const [verAnulados, setVerAnulados] = useState(false);
  const fullView = can('payments.view') || can('finance.view') || can('reports.view');

  useEffect(() => {
    setRows(null);
    supabase
      .from('gestion_payments')
      .select('*, client:gestion_clients(first_name, last_name)')
      .eq('business_id', business.id)
      .gte('paid_at', dayStartIso(from, tz))
      .lt('paid_at', dayStartIso(addDays(to, 1), tz))
      .order('paid_at', { ascending: false })
      .limit(5000)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [business.id, from, to, tz, version]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (verAnulados || !r.voided_at) &&
        (!method || r.method === method) &&
        (!n || fullName(r.client).toLowerCase().includes(n) || String(r.receipt_number) === n.replace(/^n?º?\s*/, ''))
    );
  }, [rows, q, method, verAnulados]);

  const live = (rows ?? []).filter((r) => !r.voided_at);
  const total = live.reduce((s, r) => s + Number(r.amount), 0);
  const byMethod = settings.payment_methods
    .map((m) => ({ label: m, value: live.filter((r) => r.method === m).reduce((s, r) => s + Number(r.amount), 0) }))
    .filter((x) => x.value > 0);

  function setRange(k: 'hoy' | 'semana' | 'mes') {
    if (k === 'hoy') {
      setFrom(today);
      setTo(today);
    } else if (k === 'semana') {
      setFrom(addDays(today, -6));
      setTo(today);
    } else {
      setFrom(today.slice(0, 8) + '01');
      setTo(today);
    }
  }

  async function exportar() {
    await exportXlsx(`pagos-${from}-a-${to}`, [
      {
        name: 'Pagos',
        head: ['Comprobante', 'Fecha', settings.client_singular, 'Método', `Importe (${settings.currency})`, 'Concepto', 'Registró', 'Anulado', 'Motivo anulación'],
        rows: shown.map((r) => [
          r.receipt_number,
          new Date(r.paid_at).toLocaleString('es-BO', { timeZone: tz }),
          fullName(r.client),
          r.method,
          Number(r.amount),
          r.concept,
          r.created_by_email,
          r.voided_at ? 'Sí' : '',
          r.void_reason,
        ]),
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card pad={false}>
        <div className="p-3 sm:p-4 flex flex-wrap gap-2 items-center">
          <Segmented
            label="Rango"
            value={from === today && to === today ? 'hoy' : from === addDays(today, -6) && to === today ? 'semana' : from === today.slice(0, 8) + '01' && to === today ? 'mes' : ('otro' as string)}
            onChange={(v) => v !== 'otro' && setRange(v as 'hoy')}
            options={[
              { value: 'hoy', label: 'Hoy' },
              { value: 'semana', label: '7 días' },
              { value: 'mes', label: 'Este mes' },
            ]}
          />
          <input type="date" aria-label="Desde" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${inputCls} w-auto h-9`} />
          <input type="date" aria-label="Hasta" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${inputCls} w-auto h-9`} />
          <div className="ml-auto flex gap-2">
            {can('reports.export') && (
              <Button size="sm" icon={FileSpreadsheet} onClick={exportar} disabled={!shown.length}>
                Excel
              </Button>
            )}
            {can('payments.create') && (
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setCobro({ open: true })}>
                Nuevo cobro
              </Button>
            )}
          </div>
        </div>
      </Card>

      {!fullView && (
        <p className="text-[12.5px] text-muted">Tu rol ve los cobros de las últimas 36 horas.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <Stat label="Total cobrado" value={money(total, settings.currency)} icon={Wallet} />
          <Stat label="Cobros" value={live.length} hint={rows && rows.length > live.length ? `${rows.length - live.length} anulados` : undefined} />
        </div>
        <Card className="lg:col-span-2">
          <CardTitle>Por método de pago</CardTitle>
          {byMethod.length ? <HBars items={byMethod} format={(v) => money(v, settings.currency)} /> : <p className="text-[13px] text-muted">Sin cobros en el rango.</p>}
        </Card>
      </div>

      <Card pad={false}>
        <div className="p-3 sm:p-4 flex flex-wrap gap-2 items-center border-b border-line">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre o Nº de comprobante" />
          <select aria-label="Método" value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">Todos los métodos</option>
            {settings.payment_methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input type="checkbox" checked={verAnulados} onChange={(e) => setVerAnulados(e.target.checked)} className="w-4 h-4" />
            Ver anulados
          </label>
        </div>
        {!rows ? (
          <div className="p-4">
            <Skeleton className="h-14" />
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={Wallet} title="Sin cobros" text="No hay cobros con estos filtros." />
        ) : (
          <ul className="m-0 p-0 list-none">
            {shown.map((r) => (
              <li key={r.id} className={`border-t border-line first:border-t-0 px-4 sm:px-5 py-3 flex items-center gap-3 ${r.voided_at ? 'opacity-55' : ''}`}>
                <span className="text-[12px] text-muted tabular-nums w-14 shrink-0">Nº {r.receipt_number}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/gestion/clientes/ficha?id=${r.client_id}`} className="font-semibold text-[13.5px] truncate block">
                    {fullName(r.client)}
                  </Link>
                  <p className="text-[12px] text-muted truncate">
                    {fmtDateTime(r.paid_at, tz)} · {r.method}
                    {r.concept ? ` · ${r.concept}` : ''}
                    {r.created_by_email ? ` · ${r.created_by_email}` : ''}
                  </p>
                  {r.voided_at && <Badge tone="danger">Anulado: {r.void_reason}</Badge>}
                </div>
                <span className={`font-bold tabular-nums text-[14px] shrink-0 ${r.voided_at ? 'line-through' : ''}`}>{money(r.amount, settings.currency)}</span>
                <div className="flex gap-1 shrink-0">
                  {can('receipts.issue') && (
                    <Link href={`/gestion/comprobante?id=${r.id}`} className="h-9 px-3 rounded-[10px] border border-line text-[12px] font-semibold inline-flex items-center">
                      Comprobante
                    </Link>
                  )}
                  {can('payments.void') && !r.voided_at && (
                    <button type="button" onClick={() => setAnular(r)} aria-label={`Anular pago Nº ${r.receipt_number}`} className="w-9 h-9 rounded-full hover:bg-purple-light flex items-center justify-center text-muted">
                      <Ban size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {can('finance.view') && <Deudas onCobrar={(id) => setCobro({ open: true, clientId: id })} />}

      <CobroModal open={cobro.open} clientId={cobro.clientId} onClose={() => setCobro({ open: false })} onSaved={bump} />
      <AnularModal
        open={!!anular}
        what={`pago Nº ${anular?.receipt_number ?? ''}`}
        onClose={() => setAnular(null)}
        onConfirm={async (reason) => {
          const { error } = await supabase.rpc('gestion_void_payment', { p_payment: anular!.id, p_reason: reason });
          if (error) return mensajeError(error);
          bump();
          return null;
        }}
      />
    </div>
  );
}

function Deudas({ onCobrar }: { onCobrar: (clientId: string) => void }) {
  const { business, settings, can, version } = useGestion();
  const [list, setList] = useState<{ client: Client; balance: number }[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('gestion_balances', { p_business: business.id });
      const debts = ((data as { client_id: string; balance: number }[]) ?? []).filter((b) => Number(b.balance) > 0);
      if (!debts.length) return setList([]);
      const ids = debts.map((d) => d.client_id);
      const clients: Client[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data: cs } = await supabase.from('gestion_clients').select('id, first_name, last_name, phone').in('id', ids.slice(i, i + 200));
        clients.push(...((cs as Client[]) ?? []));
      }
      const byId = new Map(clients.map((c) => [c.id, c]));
      setList(
        debts
          .filter((d) => byId.has(d.client_id))
          .map((d) => ({ client: byId.get(d.client_id)!, balance: Number(d.balance) }))
          .sort((a, b) => b.balance - a.balance)
      );
    })();
  }, [business.id, version]);

  const total = (list ?? []).reduce((s, d) => s + d.balance, 0);
  return (
    <Card pad={false}>
      <div className="p-4 sm:p-5 pb-2">
        <CardTitle action={<span className="text-[13px] font-bold gx-text-danger tabular-nums">{money(total, settings.currency)}</span>}>Saldos pendientes</CardTitle>
      </div>
      {!list ? (
        <div className="p-4">
          <Skeleton className="h-12" />
        </div>
      ) : list.length === 0 ? (
        <Empty icon={AlertCircle} title="Nadie debe nada" text="Todos están al día." />
      ) : (
        <ul className="m-0 p-0 list-none">
          {list.slice(0, 100).map((d) => (
            <li key={d.client.id} className="border-t border-line px-4 sm:px-5 py-2.5 flex items-center gap-3">
              <Link href={`/gestion/clientes/ficha?id=${d.client.id}`} className="font-semibold text-[13.5px] flex-1 min-w-0 truncate">
                {fullName(d.client)}
              </Link>
              <span className="font-bold tabular-nums gx-text-danger">{money(d.balance, settings.currency)}</span>
              {can('payments.create') && (
                <Button size="sm" onClick={() => onCobrar(d.client.id)}>
                  Cobrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function CajaPage() {
  return (
    <GestionShell need={['payments.create', 'payments.view', 'finance.view']} title="Caja y pagos" subtitle="Cobros, comprobantes y saldos pendientes.">
      <Pagos />
    </GestionShell>
  );
}
