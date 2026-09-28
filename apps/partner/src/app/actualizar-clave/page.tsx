'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ActualizarClavePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // El link del correo trae el token de recuperación en la URL — supabase-js
    // lo detecta solo y arma una sesión temporal (PASSWORD_RECOVERY). Sin esa
    // sesión no se puede llamar updateUser(), por eso esperamos a que esté.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/inicio'), 1500);
  }

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4.5" />
      <p className="text-white font-bold text-[22px] mb-1.5">Elegí una contraseña nueva</p>

      {done ? (
        <p className="text-auth-muted text-[13px] text-center">Listo, te llevamos a tu panel…</p>
      ) : !ready ? (
        <p className="text-auth-muted text-[13px] text-center max-w-[300px]">
          Abrí esta página desde el link que te mandamos por correo — este link solo funciona una vez y por poco
          tiempo.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-[320px] flex flex-col gap-2.5">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Contraseña nueva (mínimo 6 caracteres)"
            required
            className="bg-white/95 text-text rounded-xl p-3.5"
          />
          {error && <p className="text-warn text-[12.5px]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm"
          >
            {loading ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>
      )}
    </div>
  );
}
