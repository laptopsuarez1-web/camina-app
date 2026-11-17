'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import PasswordInput from '@/components/PasswordInput';

const EMAIL_KEY = 'camina_comercio_email';

const SOPORTE_WHATSAPP = `https://wa.me/59162714286?text=${encodeURIComponent('Hola! Tengo una consulta sobre el panel de comercios de Camina.')}`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const router = useRouter();


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(mensajeError(error));
      return;
    }

    try { localStorage.setItem(EMAIL_KEY, email.trim()); } catch {}
    await irAlPanel(data.session?.user.id);
  }

  // Google: Supabase manda a Google y vuelve a /login con la sesión; el efecto de abajo la ve y lleva al panel.
  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      setLoading(false);
      setError(mensajeError(error));
    }
  }

  // No mandamos siempre a /inicio: un admin sin comercio propio va a /admin, y quien entró con Google
  // sin tener comercio ni datos de alta guardados va a /registro a cargar el suyo.
  async function irAlPanel(userId: string | undefined) {
    const { data: adminCheck } = await supabase.rpc('is_admin');
    const { data: ownBusiness } = userId
      ? await supabase.from('businesses').select('id').eq('owner_user_id', userId).maybeSingle()
      : { data: null };
    // Quien es partner (embajador) y no tiene comercio va a su panel de partners.
    const { data: partnerRow } = userId && !ownBusiness && !adminCheck
      ? await supabase.from('partners').select('id').eq('user_id', userId).maybeSingle()
      : { data: null };
    setLoading(false);
    if (partnerRow) {
      router.replace('/partners/panel');
      return;
    }
    if (!ownBusiness && adminCheck) {
      router.replace('/admin');
      return;
    }
    if (!ownBusiness) {
      const { data: userData } = await supabase.auth.getUser();
      const tieneAlta = !!userData.user?.user_metadata?.pending_business || !!localStorage.getItem('camina_pending_business');
      const { data: staffBusinessId } = await supabase.rpc('claim_staff_invite');
      if (staffBusinessId) {
        router.replace('/canjes');
        return;
      }
      router.replace(tieneAlta ? '/inicio' : '/registro');
      return;
    }
    router.replace('/inicio');
  }

  // Si ya tiene la sesión abierta en este celular, entra directo a su panel. Si no, se acuerda del último correo.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void irAlPanel(data.session.user.id);
        return;
      }
      try {
        const guardado = localStorage.getItem(EMAIL_KEY);
        if (guardado) setEmail(guardado);
      } catch {}
      setListo(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!listo) return <div className="min-h-screen bg-auth-bg" />;

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4.5" />
      <p className="text-white font-bold text-[22px] mb-1.5">Panel de comercios</p>
      <p className="text-auth-muted text-[13px] mb-7 text-center max-w-[280px]">
        Gestiona tu beneficio, tus canjes y tu plan en Camina.
      </p>
      <form onSubmit={handleLogin} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          placeholder="Email del comercio"
          required
          className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5"
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5"
        />
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm"
        >
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-auth-muted text-[12px]">o</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="bg-white text-[#291C47] rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
          </svg>
          Entrar con Google
        </button>
        <Link href="/recuperar" className="text-auth-muted text-[12.5px] text-center mt-1.5">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="text-auth-muted text-[12.5px] text-center">
          ¿Todavía no tienes cuenta? Sumar mi comercio
        </Link>
        <Link href="/unirme" className="text-auth-muted text-[12.5px] text-center">
          Soy cajero de un comercio
        </Link>
        <a
          href={SOPORTE_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-mint text-[13px] font-semibold text-center border border-mint/40 rounded-xl py-2.5"
        >
          ¿Dudas? Escríbenos por WhatsApp
        </a>
      </form>
    </div>
  );
}
