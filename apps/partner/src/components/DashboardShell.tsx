'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Gift, Receipt, Store, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

const NAV = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/beneficio', label: 'Mis beneficios', icon: Gift },
  { href: '/canjes', label: 'Canjes', icon: Receipt },
  { href: '/perfil', label: 'Perfil del local', icon: Store },
  { href: '/plan', label: 'Plan', icon: CreditCard },
];

const PLAN_LABEL: Record<string, string> = {
  primer_paso: 'Primer Paso',
  paso_firme: 'Paso Firme',
  paso_adelante: 'Paso Adelante',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session, business, isAdmin, loading } = useBusinessAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
    } else if (!business && isAdmin) {
      router.replace('/admin');
    }
  }, [loading, session, business, isAdmin, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted px-6 text-center text-sm">
        {isAdmin ? 'Redirigiendo al panel de administrador…' : 'No encontramos un comercio asociado a esta cuenta. Contactá a soporte de Camina.'}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="w-[220px] bg-auth-bg min-h-screen shrink-0 flex flex-col p-3.5">
        <div className="flex items-center gap-2.5 px-2.5 mb-7.5">
          <Image src="/camina-logo.png" alt="Camina" width={34} height={34} className="rounded-full" />
          <div>
            <p className="text-white font-bold text-[15px] leading-tight tracking-wide">CAMINA</p>
            <p className="text-auth-muted text-[10.5px] mt-0.5">Panel de comercios</p>
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] ${
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
          <div className="bg-auth-bg-soft rounded-xl p-3 mb-2.5">
            <p className="text-auth-muted text-[10.5px] mb-1">Plan actual</p>
            <p className="text-mint text-[13px] font-semibold">{PLAN_LABEL[business.plan]}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left text-[#8C7DB8] text-[12.5px]"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="flex-1 p-10 max-w-[1100px]">
        {!business.approved && (
          <div className="bg-warn-light rounded-xl px-4 py-3 mb-6 text-[13px]" style={{ color: '#8A5A2E' }}>
            Tu comercio todavía está en revisión — el equipo de Camina lo aprueba antes de que aparezca en la app.
            Mientras tanto podés completar tu perfil y tu beneficio, van a quedar listos para cuando te aprueben.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { business } = useBusinessAuth();
  return (
    <div className="flex justify-between items-start mb-7">
      <div>
        <h1 className="text-[22px] font-bold text-text m-0">{title}</h1>
        {subtitle && <p className="text-muted text-[13.5px] mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5 bg-card border border-line rounded-full pl-1.5 pr-3.5 py-1.5">
        <div className="w-[30px] h-[30px] rounded-full bg-aqua-light flex items-center justify-center">
          <Store size={14} color="#4FC3A8" />
        </div>
        <span className="text-[13px] font-semibold text-text">{business?.name}</span>
      </div>
    </div>
  );
}
