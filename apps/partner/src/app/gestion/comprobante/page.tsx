'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, FileDown, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { GestionShell } from '@/components/gestion/GestionShell';
import { Button, Card, Notice, Skeleton } from '@/components/gestion/ui';
import { exportPdf } from '@/lib/export';
import { fmtDateTime, money, type Payment } from '@/lib/gestion';

interface Receipt {
  payment: Payment;
  client: { name: string; phone: string | null; email: string | null } | null;
  business: { name: string; address: string | null; phone: string | null; currency: string; footer: string | null; client_singular: string; timezone: string };
  balance_after: number;
}

function Comprobante() {
  const [r, setR] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return setError('Falta el comprobante.');
    supabase.rpc('gestion_receipt', { p_payment: id }).then(({ data, error: e }) => {
      if (e) setError(mensajeError(e));
      else setR(data as Receipt);
    });
  }, []);

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!r) return <Skeleton className="h-80 max-w-[520px]" />;

  const p = r.payment;
  const b = r.business;
  const clientName = r.client?.name ?? '—';
  const cur = b.currency;
  const bal = Number(r.balance_after);
  const saldo = bal > 0 ? `Saldo pendiente: ${money(bal, cur)}` : bal < 0 ? `Saldo a favor: ${money(-bal, cur)}` : 'Cuenta al día';

  async function pdf() {
    await exportPdf({
      fileName: `comprobante-${p.receipt_number}`,
      business: b.name,
      title: `Comprobante Nº ${p.receipt_number}`,
      subtitle: fmtDateTime(p.paid_at, b.timezone) + (p.voided_at ? ' · ANULADO' : ''),
      sections: [
        {
          pairs: [
            [b.client_singular, clientName],
            ['Importe', money(p.amount, cur)],
            ['Método de pago', p.method],
            ['Concepto', p.concept ?? '—'],
            ['Atendido por', p.created_by_email ?? '—'],
            ['Estado de cuenta', saldo],
            ...(p.voided_at ? ([['Anulado', p.void_reason ?? '']] as [string, string][]) : []),
          ],
        },
        ...(b.footer ? [{ pairs: [['', b.footer]] as [string, string][] }] : []),
      ],
    });
  }

  const wa = r.client?.phone
    ? `https://wa.me/${r.client.phone.replace(/\D/g, '').replace(/^(?!591)(\d{8})$/, '591$1')}?text=${encodeURIComponent(
        `${b.name}\nComprobante Nº ${p.receipt_number}\n${fmtDateTime(p.paid_at, b.timezone)}\nImporte: ${money(p.amount, cur)} (${p.method})\n${saldo}`
      )}`
    : null;

  return (
    <div className="max-w-[520px]">
      <div className="flex flex-wrap gap-2 mb-4 gx-no-print">
        <Button size="sm" icon={ArrowLeft} onClick={() => history.back()}>
          Volver
        </Button>
        <Button size="sm" icon={Printer} onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button size="sm" icon={FileDown} onClick={pdf}>
          Descargar PDF
        </Button>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-line bg-card text-[12.5px] font-semibold">
            <MessageCircle size={14} /> Enviar por WhatsApp
          </a>
        )}
      </div>
      <Card className="!p-6 sm:!p-8 print:border-0">
        <div className="flex justify-between gap-4 mb-6">
          <div>
            <p className="font-extrabold text-[17px]">{b.name}</p>
            {b.address && <p className="text-[12px] text-muted">{b.address}</p>}
            {b.phone && <p className="text-[12px] text-muted">{b.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Comprobante</p>
            <p className="text-[20px] font-extrabold tabular-nums">Nº {p.receipt_number}</p>
          </div>
        </div>
        {p.voided_at && (
          <div className="mb-4">
            <Notice tone="danger">ANULADO — {p.void_reason}</Notice>
          </div>
        )}
        <dl className="m-0 text-[13.5px] flex flex-col">
          {[
            ['Fecha', fmtDateTime(p.paid_at, b.timezone)],
            [b.client_singular, r.client?.name ?? '—'],
            ['Método de pago', p.method],
            ['Concepto', p.concept ?? '—'],
            ['Atendido por', p.created_by_email ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 border-b border-line">
              <dt className="text-muted">{k}</dt>
              <dd className="m-0 font-semibold text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-between items-baseline mt-5">
          <span className="text-muted text-[13px]">Importe recibido</span>
          <span className="text-[26px] font-extrabold tabular-nums">{money(p.amount, cur)}</span>
        </div>
        <p className="text-[12.5px] text-muted text-right">{saldo}</p>
        {b.footer && <p className="text-[12px] text-muted mt-6 text-center whitespace-pre-wrap">{b.footer}</p>}
      </Card>
    </div>
  );
}

export default function ComprobantePage() {
  return (
    <GestionShell need={['receipts.issue', 'payments.view']} title="Comprobante">
      <Comprobante />
    </GestionShell>
  );
}
