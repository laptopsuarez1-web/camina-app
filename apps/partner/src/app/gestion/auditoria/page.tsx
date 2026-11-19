'use client';

import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GestionShell, useGestion } from '@/components/gestion/GestionShell';
import { Button, Card, Empty, SearchBox, Skeleton, inputCls } from '@/components/gestion/ui';
import { fmtDateTime } from '@/lib/gestion';

interface Row {
  id: number;
  actor_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

const ACCION: Record<string, string> = {
  'settings.update': 'Cambió la configuración',
  'service.create': 'Creó un servicio',
  'service.update': 'Editó un servicio',
  'role.create': 'Creó un rol',
  'role.update': 'Editó un rol',
  'role.delete': 'Borró un rol',
  'staff.invite': 'Invitó a una persona',
  'staff.role': 'Cambió el rol de una persona',
  'staff.revoke': 'Quitó el acceso a Gestión',
  'staff.remove': 'Quitó a una persona del equipo',
  'client.create': 'Registró un cliente',
  'client.update': 'Editó un cliente',
  'client.status': 'Cambió el estado de un cliente',
  'package.sell': 'Vendió un paquete',
  'payment.create': 'Registró un cobro',
  'payment.void': 'Anuló un cobro',
  'visit.create': 'Registró una asistencia',
  'visit.void': 'Anuló una asistencia',
  'adjustment.create': 'Hizo un descuento o ajuste',
  'adjustment.void': 'Anuló un ajuste',
  'appointment.create': 'Agendó una cita',
  'appointment.update': 'Cambió una cita',
  'clinical.read': 'Leyó notas clínicas',
  'clinical.write': 'Escribió una nota clínica',
  'backup.export': 'Descargó una copia de seguridad',
};

function resumen(r: Row) {
  const d = r.detail ?? {};
  const parts: string[] = [];
  for (const k of ['name', 'email', 'amount', 'method', 'receipt', 'reason', 'kind', 'status', 'to_status']) {
    if (d[k] != null && d[k] !== '') parts.push(`${k === 'receipt' ? 'Nº' : ''}${String(d[k])}`);
  }
  return parts.join(' · ');
}

const PAGE = 100;

function Auditoria() {
  const { business, settings } = useGestion();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [more, setMore] = useState(false);

  async function load(append = false) {
    let query = supabase.from('gestion_audit').select('*').eq('business_id', business.id).order('created_at', { ascending: false }).limit(PAGE);
    if (action) query = query.eq('action', action);
    if (append && rows?.length) query = query.lt('created_at', rows[rows.length - 1].created_at);
    const { data } = await query;
    const list = (data as Row[]) ?? [];
    setRows(append ? [...(rows ?? []), ...list] : list);
    setMore(list.length === PAGE);
  }

  useEffect(() => {
    setRows(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, action]);

  const shown = (rows ?? []).filter((r) => !q || `${r.actor_email} ${resumen(r)}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card pad={false}>
      <div className="p-3 sm:p-4 flex flex-wrap gap-2 border-b border-line">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por persona o detalle" />
        <select aria-label="Acción" value={action} onChange={(e) => setAction(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACCION).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {!rows ? (
        <div className="p-4">
          <Skeleton className="h-14" />
        </div>
      ) : shown.length === 0 ? (
        <Empty icon={ScrollText} title="Sin registros" />
      ) : (
        <ul className="m-0 p-0 list-none">
          {shown.map((r) => (
            <li key={r.id} className="border-t border-line first:border-t-0 px-4 sm:px-5 py-2.5 flex flex-wrap gap-x-4 gap-y-0.5 items-baseline">
              <span className="text-[12px] text-muted tabular-nums w-[120px] shrink-0">{fmtDateTime(r.created_at, settings.timezone)}</span>
              <span className="text-[13px] font-semibold">{ACCION[r.action] ?? r.action}</span>
              <span className="text-[12.5px] text-muted flex-1 min-w-0 truncate">{resumen(r)}</span>
              <span className="text-[12px] text-muted">{r.actor_email ?? 'sistema'}</span>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <div className="p-3 border-t border-line text-center">
          <Button size="sm" onClick={() => load(true)}>
            Cargar más
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function AuditoriaPage() {
  return (
    <GestionShell need={['audit.view']} title="Auditoría" subtitle="Quién hizo cada operación y cuándo. No se puede editar ni borrar.">
      <Auditoria />
    </GestionShell>
  );
}
