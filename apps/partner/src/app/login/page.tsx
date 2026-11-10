'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import PasswordInput from '@/components/PasswordInput';

const SOPORTE_WHATSAPP = `https://wa.me/59162714286?text=${encodeURIComponent('Hola! Tengo una consulta sobre el panel de comercios de Camina.')}`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    await irAlPanel(data.session?.user.id);
  }

  // No mandamos siempre a /inicio: un admin sin comercio propio va a /admin, y quien entró con Google
  // sin tener comercio ni datos de alta guardados va a /registro a cargar el suyo.
  async function irAlPanel(userId: string | undefined) {
    const { data: adminCheck } = await supabase.rpc('is_admin');
    const { data: ownBusiness } = userId
      ? await supabase.from('businesses').select('id').eq('owner_user_id', userId).maybeSingle()
      : { data: null };
    setLoading(false);
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
