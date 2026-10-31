'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import PasswordInput from '@/components/PasswordInput';

// Página para cajeros: crean su cuenta con el correo con el que los invitó el comercio.
export default function UnirmePage() {
  const [email, setEmail] = useState(() =>
    typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('email') ?? '')
  );
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // El link del correo de invitación trae el correo ya escrito (arriba, en el estado inicial).

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(mensajeError(err));
      return;
    }
    if (data.session) {
      window.location.href = '/';
      return;
    }
    setDone(true);
  }

  const input = 'w-full bg-white/95 text-text rounded-xl p-3.5';

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/camina-logo.png" alt="Camina" width={72} height={72} className="rounded-full mb-4" />
      <p className="text-white font-bold text-[22px] mb-1.5">Soy cajero</p>
      {done ? (
        <>
          <p className="text-auth-muted text-[13px] mb-6 max-w-[300px]">
            Te mandamos un correo a {email}. Confírmalo y después{' '}
            <Link href="/login" className="text-mint underline">
              inicia sesión
            </Link>
            : vas a entrar directo a los canjes de tu comercio.
          </p>
        </>
      ) : (
        <>
          <p className="text-auth-muted text-[13px] mb-6 max-w-[300px]">
            Crea tu cuenta con el <strong>mismo correo</strong> con el que te invitó el comercio.
          </p>
          <form onSubmit={submit} className="w-full max-w-[320px] flex flex-col gap-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Tu correo" required className={input} />
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 6)" autoComplete="new-password" minLength={6} required className={input} />
            {error && <p className="text-warn text-[12.5px]">{error}</p>}
            <button type="submit" disabled={loading} className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm">
              {loading ? 'Creando…' : 'Crear mi cuenta'}
            </button>
            <Link href="/login" className="text-auth-muted text-[12.5px]">
              Ya tengo cuenta, iniciar sesión
            </Link>
          </form>
        </>
      )}
    </div>
  );
}
