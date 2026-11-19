'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Gift, Receipt, Store, Stamp, CreditCard, LogOut, BarChart3, BellRing, BookOpen, LifeBuoy, PartyPopper, UsersRound, Lock, ChevronDown, UserCog, Route, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BienvenidaGuia } from '@/components/BienvenidaGuia';
import '@/components/biz/biz.css';
import { faltantesParaPublicar, faltantesObligatorios, listaEnCastellano, sugerenciaBeneficio } from '@/lib/readiness';
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
  { href: '/perfil', label: 'Mi local', icon: Store },
  { href: '/beneficio', label: 'Mis premios', icon: Gift },
  { href: '/canjes', label: 'Canjes', icon: Receipt },
  { href: '/ruta', label: 'Ruta del mes', icon: Route },
  { href: '/catalogo', label: 'Catálogo o menú', icon: ShoppingBag },
];

const NAV_MAS: NavItem[] = [
  { href: '/tarjeta', label: 'Tarjeta de fidelidad', icon: Stamp, planes: ['paso_firme', 'paso_adelante'] },
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
  // Quien entró directo al registrarse ve un aviso hasta verificar su correo.
  const [sinVerificar, setSinVerificar] = useState(false);
  useEffect(() => {
    if (!session || role !== 'owner') return;
    supabase.rpc('my_email_verified').then(({ data, error }) => setSinVerificar(!error && data === false));
  }, [session, role, pathname]);

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
      business.account_kind !== 'events_only' &&
      business.plan_onboarded === false &&
      // Elige su plan (una sola vez) apenas termina la ficha: descripción, ubicación (logo y portada son opcionales) y al menos un
      // beneficio. No espera a que lo aprobemos. Si ya estaba aprobado de antes, también se le pide.
      (business.approved || (faltantesObligatorios(business).length === 0 && (beneficiosActivos ?? 0) >= 1))
    ) {
      router.replace('/elegir-plan');
    }
  }, [loading, session, business, isAdmin, role, pathname, router, beneficiosActivos]);

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

  const navPrincipal =
    role === 'cashier'
      ? NAV_PRINCIPAL.filter((i) => i.href === '/canjes')
      : business.account_kind === 'events_only'
        ? [NAV_MAS.find((i) => i.href === '/eventos')!, NAV_MAS.find((i) => i.href === '/tarjeta')!]
        : NAV_PRINCIPAL;
  const navMas = NAV_MAS.filter((i) => business.account_kind !== 'events_only' || ['/equipo', '/guia', '/cuenta'].includes(i.href));

  const sidebar = (
    <div className="biz-side">
      <div className="biz-brand">
        <Image src="/camina-logo.png" alt="" width={34} height={34} className="rounded-full" />
        <span className="biz-label">
          <b>CAMINA</b>
          <small>COMERCIOS</small>
        </span>
      </div>

      <Link href={role === 'owner' ? '/perfil' : '/canjes'} className="biz-local" title={business.name ?? undefined}>
        <span className="biz-local-logo">
          {business.logo_url ? <Image src={business.logo_url} alt="" width={34} height={34} unoptimized /> : (business.name ?? 'C').slice(0, 1).toUpperCase()}
        </span>
        <span className="biz-label min-w-0">
          <b>{business.name}</b>
          <span>{role === 'cashier' ? 'Cajero' : business.approved ? 'Publicado en Camina' : 'En revisión'}</span>
        </span>
      </Link>

      <nav className="biz-nav" aria-label="Panel">
        {navPrincipal.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} plan={business.plan} />
        ))}
        {role === 'owner' && (
          <>
            <button type="button" onClick={() => setMasAbierto(!masAbierto)} aria-expanded={masAbierto} className="biz-sec flex items-center justify-between w-full text-left">
              <span className="biz-label">Más herramientas</span>
              <ChevronDown size={14} className={masAbierto ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {masAbierto && navMas.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href} plan={business.plan} />)}
          </>
        )}
      </nav>

      <div className="biz-foot">
        {role === 'owner' && (
          <Link href="/plan" className="biz-plan biz-hide-collapsed">
            <small>Plan actual</small>
            <b>{PLAN_NOMBRE[business.plan]}</b>
            {vence && <span>{vence.fecha ? `${vence.gratis ? 'Gratis hasta el' : 'Próximo pago:'} ${fechaCorta(vence.fecha)}` : 'Gratis: empieza cuando salga la app'}</span>}
          </Link>
        )}
        <div className="biz-hide-collapsed">
          <ThemeToggle />
        </div>
        <a
          href={`https://wa.me/59162714286?text=${encodeURIComponent('Hola! Soy de ' + (business.name ?? 'un comercio') + ' y necesito ayuda con el panel de Camina.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="biz-link"
          style={{ color: 'var(--biz-mint)' }}
          title="Ayuda y soporte por WhatsApp"
        >
          <LifeBuoy size={17} />
          <span className="biz-label">Ayuda y soporte</span>
        </a>
        <button onClick={handleLogout} className="biz-link w-full text-left" title="Cerrar sesión">
          <LogOut size={17} />
          <span className="biz-label">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveFrame sidebar={sidebar} variant="biz">
      {!business.approved && role === 'owner' && business.rejected_at && (
        <div className="rounded-xl px-4 py-3 mb-6 text-[13px]" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>
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
            style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
          >
            {resending ? 'Enviando…' : 'Ya lo corregí, volver a enviar'}
          </button>
        </div>
      )}
      {!business.approved && role === 'owner' && !business.rejected_at && (
        <div className="bg-warn-light rounded-xl px-4 py-3 mb-6 text-[13px]" style={{ color: 'var(--c-warn-text)' }}>
          <p className="font-bold mb-1">Tu comercio todavía no está publicado.</p>
          {faltan.length > 0 ? (
            <>
              <p className="mb-2">
                Camina puede aprobarlo igual, pero todavía falta cargar{' '}
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
                    premio
                  </Link>
                  , tu local va a aparecer también en Canjes y en el mapa.
                </p>
              )}
            </>
          )}
        </div>
      )}
      {sinVerificar && pathname !== '/cuenta' && (
        <Link
          href="/cuenta"
          className="block mb-4 rounded-xl border border-line bg-card px-4 py-3 text-[13px]"
        >
          <b>Verifica tu correo.</b> Te mandamos un código de 6 números: escríbelo en Mi cuenta. <span className="underline">Ir ahora</span>
        </Link>
      )}
      {children}
      {pathname !== '/elegir-plan' && <BienvenidaGuia cajero={role === 'cashier'} />}
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
    <Link href={item.href} className={`biz-link${active ? ' is-on' : ''}`} aria-current={active ? 'page' : undefined} title={item.label}>
      <Icon size={17} color={active ? '#62F0B6' : undefined} />
      <span className="biz-label">{item.label}</span>
      {bloqueado && <Lock size={12} className="biz-label" style={{ flex: 'none', opacity: 0.55 }} aria-label="No incluido en tu plan" />}
    </Link>
  );
}

// Encabezado de cada sección: fecha de hoy, título, bajada y el comercio (lleva a Mi local).
export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { business, role } = useBusinessAuth();
  const [hoy] = useState(() => {
    const t = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  return (
    <div className="biz-top">
      <div className="min-w-0">
        <p className="biz-top-date" suppressHydrationWarning>{hoy || ' '}</p>
        <h1>{title}</h1>
        {subtitle && <p className="biz-top-sub">{subtitle}</p>}
      </div>
      {business && (
        <Link href={role === 'owner' ? '/perfil' : '/canjes'} className="biz-chip" title="Ver mi local">
          <span className="biz-local-logo">
            {business.logo_url ? <Image src={business.logo_url} alt="" width={30} height={30} unoptimized /> : (business.name ?? 'C').slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{business.name}</span>
        </Link>
      )}
    </div>
  );
}
