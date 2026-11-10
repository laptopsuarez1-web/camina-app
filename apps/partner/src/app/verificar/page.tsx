'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Página a la que lleva el link del correo "Verifica tu correo". No pide sesión.
export default function VerificarPage() {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') ?? '';
    supabase.functions
      .invoke('panel-email', { body: { action: 'verify', token } })
      .then(({ error }) => setEstado(error ? 'error' : 'ok'))
      .catch(() => setEstado('error'));
  }, []);

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
      <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4.5" />
      {estado === 'cargando' && <p className="text-white text-[15px]">Verificando tu correo…</p>}
      {estado === 'ok' && (
        <>
          <p className="text-white font-bold text-[22px] mb-2">Correo verificado</p>
          <p className="text-auth-muted text-[13px] mb-6 max-w-[280px]">Listo, ya está confirmado. Puedes seguir usando el panel.</p>
        </>
      )}
      {estado === 'error' && (
        <>
          <p className="text-white font-bold text-[22px] mb-2">El link no sirve</p>
          <p className="text-auth-muted text-[13px] mb-6 max-w-[280px]">
            Puede haber vencido. Entra al panel, abre Mi cuenta y pide otro correo de verificación.
          </p>
        </>
      )}
      {estado !== 'cargando' && (
        <Link href="/inicio" className="bg-mint text-mint-dark rounded-xl py-3 px-6 font-semibold text-sm">
          Ir al panel
        </Link>
      )}
    </div>
  );
}
