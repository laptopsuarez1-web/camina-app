'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Trophy, MapPinned, PartyPopper, Flag, Radar, Instagram } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

const NAV = [
  { href: '/admin', label: 'Comercios', icon: ShieldCheck },
  { href: '/admin/retos', label: 'Retos', icon: Trophy },
  { href: '/admin/eventos', label: 'Desafíos y eventos', icon: PartyPopper },
  { href: '/admin/historias', label: 'Historias', icon: Instagram },
  { href: '/admin/reportes', label: 'Reportes', icon: Flag },
  { href: '/admin/alertas', label: 'Alertas', icon: Radar },
  { href: '/admin/lugares', label: 'Ciudades y barrios', icon: MapPinned },
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
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading || !session || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-2.5 mb-7.5">
        <Image src="/camina-logo.png" alt="Camina" width={34} height={34} className="rounded-full" />
        <div>
          <p className="text-white font-bold text-[15px] leading-tight tracking-wide">CAMINA</p>
          <p className="text-auth-muted text-[10.5px] mt-0.5">Administrador</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-[10px] text-[14px] md:text-[13.5px] ${
                active ? 'bg-mint/10 text-white font-semibold' : 'text-[#B3A6D6]'
              }`}
            >
              <Icon size={16} color={active ? '#7FEDC4' : '#9385B5'} />
              {item.label}
              {item.href === '/admin/historias' && pendingStories > 0 && (
                <span className="ml-auto rounded-full bg-warn text-white text-[11px] font-bold px-1.5 min-w-5 text-center">{pendingStories}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-3 md:py-2.5 w-full text-left text-[#8C7DB8] text-[13px] md:text-[12.5px]"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return <ResponsiveFrame sidebar={sidebar}>{children}</ResponsiveFrame>;
}
