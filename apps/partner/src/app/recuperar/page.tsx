'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    });
    setLoading(false);
    // Por seguridad no decimos si el email existe o no — siempre mostramos el
    // mismo mensaje, así nadie puede usar esto para adivinar qué cuentas existen.
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4.5" />
      <p className="text-white font-bold text-[22px] mb-1.5">Recuperar contraseña</p>

      {sent ? (
        <p className="text-auth-muted text-[13px] text-center max-w-[300px] mb-7">
          Si {email.trim()} tiene una cuenta en Camina, te mandamos un link para elegir una contraseña nueva.
          Revisá tu correo (y la carpeta de spam).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-[320px] flex flex-col gap-2.5">
          <p className="text-auth-muted text-[13px] text-center mb-2">
            Escribí el email con el que te registraste y te mandamos un link para poner una contraseña nueva.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Tu email"
            required
            className="bg-white/95 text-text rounded-xl p-3.5"
          />
          {error && <p className="text-warn text-[12.5px]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm"
          >
            {loading ? 'Enviando…' : 'Mandar link'}
          </button>
        </form>
      )}

      <Link href="/login" className="text-auth-muted text-[12.5px] text-center mt-4">
        ‹ Volver a iniciar sesión
      </Link>
    </div>
  );
}
