'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { partnersWa } from '@/lib/partners';
import PasswordInput from '@/components/PasswordInput';

const EMAIL_KEY = 'camina_partner_email';

// Vuelve a la pantalla del panel desde donde lo mandaron a ingresar (?volver=/partners/panel/...).
function destino() {
  if (typeof window === 'undefined') return '/partners/panel';
  const v = new URLSearchParams(window.location.search).get('volver');
  return v && v.startsWith('/partners/panel') ? v : '/partners/panel';
}

export default function PartnersLoginPage() {
  const [email, setEmail] = useState('');
  const [listo, setListo] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Si ya tiene la sesión abierta, entra directo al panel. Y se acuerda del último correo usado en este celular.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(destino());
        return;
      }
      try {
        const guardado = localStorage.getItem(EMAIL_KEY);
        if (guardado) setEmail(guardado);
      } catch {}
      setListo(true);
    });
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setLoading(false);
      setError(mensajeError(err));
      return;
    }
    try { localStorage.setItem(EMAIL_KEY, email.trim()); } catch {}
    router.replace(destino());
  }

  if (!listo) return <div className="min-h-screen bg-auth-bg biz biz-auth" />;

  return (
    <div className="min-h-screen bg-auth-bg biz biz-auth flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4" />
      <p className="text-white font-bold text-[22px] mb-1.5">Camina Partners</p>
      <p className="text-auth-muted text-[13px] mb-7 text-center max-w-[290px]">Entra una vez y el panel queda abierto en este celular.</p>
      <form onSubmit={entrar} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="Tu correo" required aria-label="Tu correo" autoComplete="email" className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button type="submit" disabled={loading} className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm disabled:opacity-60">
          {loading ? 'Entrando…' : 'Entrar al panel'}
        </button>
        <Link href="/recuperar" className="text-auth-muted text-[12.5px] text-center mt-1.5">¿Olvidaste tu contraseña?</Link>
        <Link href="/partners/registro" className="text-auth-muted text-[12.5px] text-center">¿Todavía no tienes cuenta? Quiero ser partner</Link>
        <a href={partnersWa('Hola! Tengo una consulta sobre Camina Partners.')} target="_blank" rel="noopener noreferrer" className="mt-2 text-mint text-[13px] font-semibold text-center border border-mint/40 rounded-xl py-2.5">
          ¿Dudas? Escríbenos por WhatsApp
        </a>
      </form>
    </div>
  );
}
