'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Gift, Receipt, Store, Stamp, CreditCard, LogOut, BarChart3, BellRing, BookOpen, LifeBuoy, PartyPopper, UsersRound, Lock, ChevronDown, UserCog } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { faltantesParaPublicar, listaEnCastellano, sugerenciaBeneficio } from '@/lib/readiness';
import { avisarPorCorreo } from '@/lib/email';
import { PLAN_NOMBRE, fechaCorta, vencimientoPlan } from '@/lib/plans';
import type { BusinessPlan } from '@/lib/supabase';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  // Planes que incluyen la sección; en los demás se ve con un candado.
  planes?: BusinessPlan[];
};

// Menú corto: lo de todos los días arriba, el resto en "Más".
const NAV_PRINCIPAL: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/canjes', label: 'Canjes', icon: Receipt },
  { href: '/beneficio', label: 'Mis beneficios', icon: Gift },
  { href: '/tarjeta', label: 'Tarjeta de fidelidad', icon: Stamp, planes: ['paso_firme', 'paso_adelante'] },
  { href: '/perfil', label: 'Perfil del local', icon: Store },
];

const NAV_MAS: NavItem[] = [
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3, planes: ['paso_firme', 'paso_adelante'] },
  { href: '/avisos', label: 'Avisos cercanos', icon: BellRing, planes: ['paso_adelante'] },
  { href: '/eventos', label: 'Desafíos y eventos', icon: PartyPopper },
  { href: '/equipo', label: 'Mi equipo', icon: UsersRound },
  { href: '/plan', label: 'Plan', icon: CreditCard },
  { href: '/guia', label: 'Guía y reglas', icon: BookOpen },
  { href: '/cuenta', label: 'Mi cuenta', icon: UserCog },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session, business, isAdmin, role, loading, refreshBusiness } = useBusinessAuth();
  const [resending, setResending] = useState(false);
  const [beneficiosActivos, setBeneficiosActivos] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const enMas = NAV_MAS.some((i) => i.href === pathname);
  const [masAbierto, setMasAbierto] = useState(enMas);

  // Para el cartel de "te falta…" mientras el local no está publicado.
  useEffect(() => {
    if (!business || business.approved || role !== 'owner') return;
    supabase
      .from('benefits')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('active', true)
      .then(({ count }) => setBeneficiosActivos(count ?? 0));
  }, [business, role, pathname]);

  useEffect(() => {
    if (loading) return;
    // Los cajeros solo ven la pantalla de canjes.
    if (session && business && role === 'cashier' && pathname !== '/canjes') {
      router.replace('/canjes');
      return;
    }
    if (!session) {
      router.replace('/login');
    } else if (!business && isAdmin) {
      router.replace('/admin');
    } else if (
      business &&
      role === 'owner' &&
      business.approved &&
      business.account_kind !== 'events_only' &&
      business.plan_onboarded === false
    ) {
      // Comercio recién aprobado: antes de seguir elige su plan (gratis o de pago), una sola vez.
      // Mientras está en revisión usa el plan gratis y no se le pide pagar nada.
      router.replace('/elegir-plan');
    }
  }, [loading, session, business, isAdmin, role, pathname, router]);

  async function handleLogout() {
    // Solo en este navegador: el cierre global (el de siempre de Supabase) también sacaba de la app del teléfono.
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted px-6 text-center text-sm">
        {isAdmin ? 'Redirigiendo al panel de administrador…' : 'No encontramos un comercio asociado a esta cuenta. Contacta a soporte de Camina.'}
      </div>
    );
  }

  const vence = vencimientoPlan(business);
  const faltan = faltantesParaPublicar(business);

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-2.5 mb-7.5">
        <Image src="/camina-logo.png" alt="Camina" width={34} height={34} className="rounded-full" />
        <div>
          <p className="text-white font-bold text-[15px] leading-tight tracking-wide">CAMINA</p>
          <p className="text-auth-muted text-[10.5px] mt-0.5">Panel de comercios</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {(role === 'cashier'
          ? NAV_PRINCIPAL.filter((i) => i.href === '/canjes')
          : business.account_kind === 'events_only'
            ? [NAV_MAS[2], NAV_PRINCIPAL[3]]
            : NAV_PRINCIPAL
        ).map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} plan={business.plan} />
        ))}
        {role === 'owner' && (
          <>
            <button
              type="button"
              onClick={() => setMasAbierto(!masAbierto)}
              aria-expanded={masAbierto}
              className="flex items-center justify-between px-3 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9385B5]"
            >
              Más
              <ChevronDown size={14} className={masAbierto ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {masAbierto &&
              NAV_MAS.filter((i) => business.account_kind !== 'events_only' || ['/equipo', '/guia', '/cuenta'].includes(i.href)).map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} plan={business.plan} />
              ))}
          </>
        )}
      </nav>

      <div className="mt-auto pt-5">
        {role === 'owner' && (
          <Link href="/plan" className="block bg-auth-bg-soft rounded-xl p-3 mb-2.5">
            <p className="text-auth-muted text-[10.5px] mb-1">Plan actual</p>
            <p className="text-mint text-[13px] font-semibold">{PLAN_NOMBRE[business.plan]}</p>
            {vence && (
              <p className="text-auth-muted text-[10.5px] mt-0.5">
                {vence.fecha ? `${vence.gratis ? 'Gratis hasta el' : 'Próximo pago:'} ${fechaCorta(vence.fecha)}` : 'Gratis: empieza cuando salga la app'}
              </p>
            )}
          </Link>
        )}
        <a
          href={`https://wa.me/59162714286?text=${encodeURIComponent('Hola! Soy de ' + (business.name ?? 'un comercio') + ' y necesito ayuda con el panel de Camina.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-3 md:py-2.5 w-full text-left text-mint text-[13px] md:text-[12.5px] font-semibold"
        >
          <LifeBuoy size={15} />
          Soporte por WhatsApp
        </a>
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

  return (
    <ResponsiveFrame sidebar={sidebar}>
      {!business.approved && role === 'owner' && business.rejected_at && (
        <div className="rounded-xl px-4 py-3 mb-6 text-[13px]" style={{ background: '#FDEEE2', color: '#8A3A2E' }}>
          <p className="font-bold mb-1">Revisamos tu comercio y todavía no lo podemos publicar.</p>
          <p className="mb-2.5">
            <strong>Motivo:</strong> {business.rejection_reason}
          </p>
          <p className="mb-2.5">
            Corrígelo desde <Link href="/perfil" className="underline font-semibold">Perfil</Link> y después toca el botón
            para que lo volvamos a revisar.
          </p>
          <button
            disabled={resending}
            onClick={async () => {
              setResending(true);
              await reenviarARevision(business.id);
              if (session) await refreshBusiness(session.user.id, session.user.email);
              setResending(false);
            }}
            className="rounded-[8px] px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {resending ? 'Enviando…' : 'Ya lo corregí, volver a enviar'}
          </button>
        </div>
      )}
      {!business.approved && role === 'owner' && !business.rejected_at && (
        <div className="bg-warn-light rounded-xl px-4 py-3 mb-6 text-[13px]" style={{ color: '#8A5A2E' }}>
          <p className="font-bold mb-1">Tu comercio todavía no está publicado.</p>
          {faltan.length > 0 ? (
            <>
              <p className="mb-2">
                Camina puede aprobarlo igual, pero te recomendamos cargar{' '}
                <strong>{listaEnCastellano(faltan.map((f) => f.texto))}</strong>.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {faltan.map((f) => (
                  <Link
                    key={f.id}
                    href={f.href}
                    className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold underline-offset-2 hover:underline"
                  >
                    Cargar {f.texto}
                  </Link>
                ))}
              </div>
            </>
          ) : beneficiosActivos == null ? null : (
            <>
              <p>Ya tienes todo lo necesario. El equipo de Camina lo está revisando y te avisamos por correo apenas esté publicado.</p>
              {sugerenciaBeneficio(business, beneficiosActivos) && (
                <p className="mt-1.5">
                  Cuando cargues tu primer{' '}
                  <Link href="/beneficio" className="font-semibold underline">
                    beneficio
                  </Link>
                  , tu local va a aparecer también en Canjes y en el mapa.
                </p>
              )}
            </>
          )}
        </div>
      )}
      {children}
    </ResponsiveFrame>
  );
}

// El dueño corrigió lo que le pedimos: vuelve a la lista de pendientes y se avisa al admin por correo.
export async function reenviarARevision(businessId: string) {
  const { error } = await supabase.from('businesses').update({ rejected_at: null, rejection_reason: null }).eq('id', businessId);
  if (!error) void avisarPorCorreo('resubmitted', businessId);
  return error;
}

function NavLink({ item, active, plan }: { item: NavItem; active: boolean; plan: BusinessPlan }) {
  const Icon = item.icon;
  const bloqueado = item.planes && !item.planes.includes(plan);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-[10px] text-[14px] md:text-[13.5px] ${
        active ? 'bg-mint/10 text-white font-semibold' : 'text-[#B3A6D6]'
      }`}
    >
      <Icon size={16} color={active ? '#7FEDC4' : '#9385B5'} />
      <span className="flex-1">{item.label}</span>
      {bloqueado && <Lock size={12} color="#9385B5" aria-label="No incluido en tu plan" />}
    </Link>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { business } = useBusinessAuth();
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6 md:mb-7">
      <div>
        <h1 className="text-[22px] font-bold text-text m-0">{title}</h1>
        {subtitle && <p className="text-muted text-[13.5px] mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5 bg-card border border-line rounded-full pl-1.5 pr-3.5 py-1.5 self-start max-w-full">
        <div className="w-[30px] h-[30px] rounded-full bg-aqua-light flex items-center justify-center">
          <Store size={14} color="#4FC3A8" />
        </div>
        <span className="text-[13px] font-semibold text-text truncate">{business?.name}</span>
      </div>
    </div>
  );
}
