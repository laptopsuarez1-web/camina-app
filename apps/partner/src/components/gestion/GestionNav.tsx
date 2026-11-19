'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Wallet, FileBarChart, Settings, ShieldCheck, ScrollText } from 'lucide-react';
import { useGestionAccess, type Permission } from '@/lib/gestion';

export const GESTION_NAV: { href: string; label: string; icon: typeof Users; any: Permission[] }[] = [
  { href: '/gestion', label: 'Panel', icon: LayoutDashboard, any: ['dashboard.view'] },
  { href: '/gestion/clientes', label: 'Clientes', icon: Users, any: ['clients.view'] },
  { href: '/gestion/asistencia', label: 'Asistencia', icon: CalendarCheck, any: ['visits.create', 'clients.history'] },
  { href: '/gestion/agenda', label: 'Agenda', icon: CalendarDays, any: ['agenda.view'] },
  { href: '/gestion/caja', label: 'Caja y pagos', icon: Wallet, any: ['payments.create', 'payments.view', 'finance.view'] },
  { href: '/gestion/reportes', label: 'Reportes', icon: FileBarChart, any: ['reports.view'] },
  { href: '/gestion/equipo', label: 'Equipo y permisos', icon: ShieldCheck, any: ['staff.manage'] },
  { href: '/gestion/ajustes', label: 'Configuración', icon: Settings, any: ['settings.manage'] },
  { href: '/gestion/auditoria', label: 'Auditoría', icon: ScrollText, any: ['audit.view'] },
];

// Menú de Gestión dentro de la barra lateral del panel (solo lo que la persona puede usar).
export function GestionNav({ businessId }: { businessId: string }) {
  const { access, can } = useGestionAccess(businessId);
  const pathname = usePathname();
  if (!access?.member) return null;
  const items = GESTION_NAV.filter((i) => i.any.some(can));
  if (items.length === 0) return null;
  const label = access.settings?.client_plural ?? 'Clientes';
  return (
    <>
      <p className="px-3 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C4B8E8]">Gestión</p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === '/gestion' ? pathname === '/gestion' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-[10px] text-[14px] md:text-[13.5px] ${
              active ? 'bg-mint/10 text-white font-semibold' : 'text-[#D9D0F2]'
            }`}
          >
            <Icon size={16} color={active ? '#62F0B6' : '#C4B8E8'} />
            <span className="flex-1">{item.href === '/gestion/clientes' ? label : item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

