'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/inicio');
  }

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4.5" />
      <p className="text-white font-bold text-[22px] mb-1.5">Panel de comercios</p>
      <p className="text-auth-muted text-[13px] mb-7 text-center max-w-[280px]">
        Gestioná tu beneficio, tus canjes y tu plan en Camina.
      </p>
      <form onSubmit={handleLogin} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email del comercio"
          required
          className="bg-white/95 text-text rounded-xl p-3.5"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Contraseña"
          required
          className="bg-white/95 text-text rounded-xl p-3.5"
        />
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm"
        >
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
        <Link href="/registro" className="text-auth-muted text-[12.5px] text-center mt-1.5">
          ¿Todavía no tenés cuenta? Sumar mi comercio
        </Link>
      </form>
    </div>
  );
}
