'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Trophy, MapPinned, PartyPopper } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

const NAV = [
  { href: '/admin', label: 'Comercios', icon: ShieldCheck },
  { href: '/admin/retos', label: 'Retos', icon: Trophy },
  { href: '/admin/eventos', label: 'Eventos y sorteos', icon: PartyPopper },
  { href: '/admin/lugares', label: 'Ciudades y barrios', icon: MapPinned },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useBusinessAuth();
  const router = useRouter();
  const pathname = usePathname();

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
