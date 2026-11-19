'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Lock } from 'lucide-react';
import { GESTION_NAV } from './GestionNav';
import { supabase, type Business } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell } from '@/components/DashboardShell';
import { useGestionAccess, type GestionAccess, type GestionSettings, type Permission, type Service } from '@/lib/gestion';
import { Button, Skeleton } from './ui';
import { RegistroRapido } from './RegistroRapido';

interface Ctx {
  business: Business;
  access: GestionAccess;
  settings: GestionSettings;
  can: (p: Permission) => boolean;
  services: Service[];
  reloadServices: () => void;
  // Abre el registro rápido (opcionalmente con un cliente ya elegido).
  openQuick: (clientId?: string, appointmentId?: string) => void;
  // Sube cada vez que se guarda algo desde el registro rápido: las pantallas recargan.
  version: number;
  bump: () => void;
}

const GestionContext = createContext<Ctx | null>(null);

export function useGestion() {
  const c = useContext(GestionContext);
  if (!c) throw new Error('useGestion fuera de GestionShell');
  return c;
}

export function GestionShell({
  need,
  title,
  subtitle,
  actions,
  children,
}: {
  need?: Permission[];
  title: string | ((s: GestionSettings) => string);
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { business } = useBusinessAuth();
  const { access, can, loading } = useGestionAccess(business?.id);
  const [services, setServices] = useState<Service[]>([]);
  const [quick, setQuick] = useState<{ open: boolean; clientId?: string; appointmentId?: string }>({ open: false });
  const [version, setVersion] = useState(0);

  const reloadServices = useCallback(() => {
    if (!business) return;
    supabase
      .from('gestion_services')
      .select('id, name, price, duration_min, sessions_included, active')
      .eq('business_id', business.id)
      .order('name')
      .then(({ data }) => setServices((data as Service[]) ?? []));
  }, [business]);

  useEffect(() => {
    if (access?.member) reloadServices();
  }, [access?.member, reloadServices]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const openQuick = useCallback((clientId?: string, appointmentId?: string) => setQuick({ open: true, clientId, appointmentId }), []);

  const ctx = useMemo<Ctx | null>(
    () =>
      business && access?.member && access.settings
        ? { business, access, settings: access.settings, can, services, reloadServices, openQuick, version, bump }
        : null,
    [business, access, can, services, reloadServices, openQuick, version, bump]
  );

  const allowed = !need || need.some(can);
  const pathname = usePathname();
  const router = useRouter();
  // Quien entra a /gestion sin permiso para el panel va a la primera sección que sí tiene.
  useEffect(() => {
    if (!ctx || allowed || pathname !== '/gestion') return;
    const first = GESTION_NAV.find((i) => i.any.some(can));
    if (first) router.replace(first.href);
  }, [ctx, allowed, pathname, router, can]);

  return (
    <DashboardShell>
      {loading || !access ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))}
          </div>
        </div>
      ) : !ctx ? (
        <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
          <Lock size={20} className="text-muted mb-2" />
          <p className="font-bold text-[15px] mb-1">No tienes acceso a Gestión</p>
          <p className="text-muted text-[13px]">Pídele al propietario del negocio que te asigne un rol desde Equipo y permisos.</p>
        </div>
      ) : (
        <GestionContext.Provider value={ctx}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 gx-no-print">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-text m-0 tracking-tight">{typeof title === 'function' ? title(ctx.settings) : title}</h1>
              {subtitle && <p className="text-muted text-[13.5px] mt-1">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {actions}
              {can('visits.create') && (
                <Button variant="primary" icon={Zap} onClick={() => openQuick()}>
                  Registro rápido
                </Button>
              )}
            </div>
          </div>
          {allowed ? (
            <div className="gx-enter">{children}</div>
          ) : (
            <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
              <Lock size={20} className="text-muted mb-2" />
              <p className="font-bold text-[15px] mb-1">Esta sección no está en tu rol</p>
              <p className="text-muted text-[13px]">Tu rol es «{access.role_name}». El propietario puede darte acceso desde Equipo y permisos.</p>
            </div>
          )}
          <RegistroRapido
            open={quick.open}
            clientId={quick.clientId}
            appointmentId={quick.appointmentId}
            onClose={() => setQuick({ open: false })}
            onSaved={bump}
          />
        </GestionContext.Provider>
      )}
    </DashboardShell>
  );
}
