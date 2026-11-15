'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { partnersWa } from '@/lib/partners';
import PasswordInput from '@/components/PasswordInput';

export default function PartnersLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    router.replace('/partners/panel');
  }

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4" />
      <p className="text-white font-bold text-[22px] mb-1.5">Camina Partners</p>
      <p className="text-auth-muted text-[13px] mb-7 text-center max-w-[280px]">Entra para reportar locales, ver tu estado y tus cobros.</p>
      <form onSubmit={entrar} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Tu correo" required aria-label="Tu correo" autoComplete="email" className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required className="bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5" />
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button type="submit" disabled={loading} className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm disabled:opacity-60">
          {loading ? 'Entrando…' : 'Entrar'}
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
