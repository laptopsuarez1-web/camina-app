'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Trophy, MapPinned, PartyPopper, Flag, Radar, Instagram, Users, Gift, Handshake, BellRing, Footprints } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

const NAV = [
  { href: '/admin', label: 'Comercios', icon: ShieldCheck },
  { href: '/admin/retos', label: 'Retos', icon: Trophy },
  { href: '/admin/eventos', label: 'Desafíos y eventos', icon: PartyPopper },
  { href: '/admin/pasos-dobles', label: 'Pasos dobles (x2)', icon: Footprints },
  { href: '/admin/ruta', label: 'Premio de la Ruta', icon: Gift },
  { href: '/admin/historias', label: 'Historias', icon: Instagram },
  { href: '/admin/partners', label: 'Partners', icon: Handshake },
  { href: '/admin/avisame', label: 'Lista Avísame', icon: BellRing },
  { href: '/admin/cuentas', label: 'Cuentas', icon: Users },
  { href: '/admin/reportes', label: 'Reportes', icon: Flag },
  { href: '/admin/alertas', label: 'Alertas', icon: Radar },
  { href: '/admin/lugares', label: 'Ciudades y zonas', icon: MapPinned },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useBusinessAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Historias de Instagram por revisar: el contador avisa en el menú aunque estés en otra sección.
  const [pendingStories, setPendingStories] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const load = () =>
      supabase
        .from('story_shares')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }) => setPendingStories(count ?? 0));
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener('camina:stories-changed', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('camina:stories-changed', load);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/login');
    else if (!isAdmin) router.replace('/inicio');
  }, [loading, session, isAdmin, router]);

  async function handleLogout() {
    // Solo en este navegador: el cierre global (el de siempre de Supabase) también sacaba de la app del teléfono.
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
  }

  if (loading || !session || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  const sidebar = (
    <div className="biz-side">
      <div className="biz-brand">
        <Image src="/camina-logo.png" alt="" width={34} height={34} className="rounded-full" />
        <span className="biz-label">
          <b>CAMINA</b>
          <small>ADMIN</small>
        </span>
      </div>
      <nav className="biz-nav" aria-label="Administrador">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`biz-link${active ? ' is-on' : ''}`} aria-current={active ? 'page' : undefined} title={item.label}>
              <Icon size={17} color={active ? '#62F0B6' : undefined} />
              <span className="biz-label">{item.label}</span>
              {item.href === '/admin/historias' && pendingStories > 0 && (
                <span className="rounded-full bg-warn text-white text-[11px] font-bold px-1.5 min-w-5 text-center">{pendingStories}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="biz-foot">
        <div className="biz-hide-collapsed">
          <ThemeToggle />
        </div>
        <button onClick={handleLogout} className="biz-link w-full text-left" title="Cerrar sesión">
          <LogOut size={17} />
          <span className="biz-label">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveFrame sidebar={sidebar} variant="biz" etiqueta="ADMIN">
      {children}
    </ResponsiveFrame>
  );
}
