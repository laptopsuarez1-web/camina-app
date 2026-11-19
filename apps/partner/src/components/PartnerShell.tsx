'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Store, PlusCircle, BookOpen, Wallet, LogOut, MessageCircle, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { usePartnerAuth, partnersWa, type Partner } from '@/lib/partners';
import { ResponsiveFrame } from '@/components/ResponsiveFrame';
import { ThemeToggle } from '@/components/ThemeToggle';
import '@/components/biz/biz.css';

const NAV = [
  { href: '/partners/panel', label: 'Inicio', icon: Home },
  { href: '/partners/panel/reportar', label: 'Cargar un local', icon: PlusCircle },
  { href: '/partners/panel/locales', label: 'Mis locales', icon: Store },
  { href: '/partners/panel/guia', label: 'Guía y qué decir', icon: BookOpen },
  { href: '/partners/panel/material', label: 'Material para mostrar', icon: FolderOpen },
  { href: '/partners/panel/cobros', label: 'Mis cobros', icon: Wallet },
];

// Si alguien con cuenta (por ejemplo, de la app o de un comercio) entra al panel de partners sin ficha, la crea acá.
function CompletarPerfil({ onListo, onYaSoy }: { onListo: () => void; onYaSoy: () => void }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('register_partner', { p_name: nombre, p_phone: telefono, p_zone: zona });
    setBusy(false);
    if (err) {
      setError(mensajeError(err));
      return;
    }
    onListo();
  }

  return (
    <div className="min-h-screen bg-auth-bg biz biz-auth flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={72} height={72} className="rounded-full mb-4" />
      <p className="text-white font-bold text-[20px] mb-1">Completa tu perfil de partner</p>
      <p className="text-auth-muted text-[13px] mb-6 text-center max-w-[300px]">Ya tienes cuenta en Camina. Solo faltan estos datos para empezar.</p>
      <form onSubmit={guardar} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" required aria-label="Tu nombre" className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu WhatsApp (ej. 71234567)" inputMode="tel" required aria-label="Tu WhatsApp" className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Tu zona (opcional)" aria-label="Tu zona" className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button type="submit" disabled={busy} className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm disabled:opacity-60">
          {busy ? 'Guardando…' : 'Empezar como partner'}
        </button>
      </form>
      {/* Quien ya es partner pero entró con otra cuenta (de la app o de un comercio): sale y entra con su correo de partner. */}
      <div className="w-full max-w-[320px] mt-6 pt-5 border-t border-white/10 text-center">
        <p className="text-auth-muted text-[13px] mb-2.5">¿Ya eres partner con otro correo?</p>
        <button type="button" onClick={onYaSoy} className="w-full rounded-xl py-3 border border-white/25 text-white font-semibold text-sm">
          Ya soy partner: entrar con mi correo
        </button>
      </div>
    </div>
  );
}

export function PartnerShell({ children }: { children: (p: Partner) => React.ReactNode }) {
  const { session, partner, loading, refresh } = usePartnerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace(`/partners/login?volver=${encodeURIComponent(pathname)}`);
  }, [loading, session, router, pathname]);

  async function salir() {
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/partners/login');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }
  if (!partner) return <CompletarPerfil onListo={() => void refresh()} onYaSoy={() => void salir()} />;

  const sidebar = (
    <div className="biz-side">
      <div className="biz-brand">
        <Image src="/camina-logo.png" alt="" width={34} height={34} className="rounded-full" />
        <span className="biz-label">
          <b>CAMINA</b>
          <small>PARTNERS</small>
        </span>
      </div>
      <div className="biz-local" title={partner.full_name ?? undefined}>
        <span className="biz-local-logo">{(partner.full_name ?? 'P').slice(0, 1).toUpperCase()}</span>
        <span className="biz-label min-w-0">
          <b>{partner.full_name}</b>
          <span>Tu código: {partner.code}</span>
        </span>
      </div>
      <nav className="biz-nav" aria-label="Panel de partners">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`biz-link${active ? ' is-on' : ''}`} aria-current={active ? 'page' : undefined} title={item.label}>
              <Icon size={17} color={active ? '#62F0B6' : undefined} />
              <span className="biz-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="biz-foot">
        <div className="biz-hide-collapsed">
          <ThemeToggle />
        </div>
        <a
          href={partnersWa(`Hola! Soy ${partner.full_name}, partner ${partner.code}. Necesito ayuda con Camina Partners.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="biz-link"
          style={{ color: 'var(--biz-mint)' }}
          title="Escribir a Camina"
        >
          <MessageCircle size={17} />
          <span className="biz-label">Escribir a Camina</span>
        </a>
        <button onClick={salir} className="biz-link w-full text-left" title="Cerrar sesión">
          <LogOut size={17} />
          <span className="biz-label">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveFrame sidebar={sidebar} variant="biz" etiqueta="PARTNERS">
      {children(partner)}
    </ResponsiveFrame>
  );
}
