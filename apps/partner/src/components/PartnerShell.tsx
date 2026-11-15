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

const NAV = [
  { href: '/partners/panel', label: 'Inicio', icon: Home },
  { href: '/partners/panel/reportar', label: 'Cargar un local', icon: PlusCircle },
  { href: '/partners/panel/locales', label: 'Mis locales', icon: Store },
  { href: '/partners/panel/guia', label: 'Guía y qué decir', icon: BookOpen },
  { href: '/partners/panel/material', label: 'Material para mostrar', icon: FolderOpen },
  { href: '/partners/panel/cobros', label: 'Mis cobros', icon: Wallet },
];

// Si alguien con cuenta (por ejemplo, de la app o de un comercio) entra al panel de partners sin ficha, la crea acá.
function CompletarPerfil({ onListo }: { onListo: () => void }) {
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
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
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
    </div>
  );
}

export function PartnerShell({ children }: { children: (p: Partner) => React.ReactNode }) {
  const { session, partner, loading, refresh } = usePartnerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/partners/login');
  }, [loading, session, router]);

  async function salir() {
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/partners/login');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }
  if (!partner) return <CompletarPerfil onListo={() => void refresh()} />;

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-2.5 mb-6">
        <Image src="/camina-logo.png" alt="Camina" width={34} height={34} className="rounded-full" />
        <div>
          <p className="text-white font-bold text-[15px] leading-tight tracking-wide">CAMINA</p>
          <p className="text-auth-muted text-[10.5px] mt-0.5">Partners</p>
        </div>
      </div>
      <div className="mx-1 mb-5 rounded-xl bg-auth-bg-soft px-3 py-2.5">
        <p className="text-auth-muted text-[10.5px] uppercase tracking-wider">Tu código</p>
        <p className="text-mint font-bold text-[18px] tracking-wide">{partner.code}</p>
        <p className="text-auth-muted text-[11.5px] truncate">{partner.full_name}</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-[10px] text-[14px] md:text-[13.5px] ${active ? 'bg-mint/10 text-white font-semibold' : 'text-[#B3A6D6]'}`}
            >
              <Icon size={16} color={active ? '#62F0B6' : '#9385B5'} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-5">
        <a
          href={partnersWa(`Hola! Soy ${partner.full_name}, partner ${partner.code}. Necesito ayuda con Camina Partners.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 mb-3 bg-mint text-mint-dark rounded-xl py-2.5 text-[13px] font-semibold"
        >
          <MessageCircle size={16} />
          Escribir a Camina
        </a>
        <ThemeToggle />
        <button onClick={salir} className="flex items-center gap-2.5 px-3 py-3 md:py-2.5 w-full text-left text-[#8C7DB8] text-[13px] md:text-[12.5px]">
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return <ResponsiveFrame sidebar={sidebar}>{children(partner)}</ResponsiveFrame>;
}
