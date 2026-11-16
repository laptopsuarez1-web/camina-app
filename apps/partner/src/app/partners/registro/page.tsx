'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { partnersWa } from '@/lib/partners';
import PasswordInput from '@/components/PasswordInput';

const CAMPO = 'bg-[#FBF9FE] !text-[#291C47] placeholder:!text-[#7C6A9C] rounded-xl p-3.5';

// Registro de partner en una sola pantalla: nombre, WhatsApp, zona, correo y clave. Entra directo al panel.
export default function PartnersRegistroPage() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaExiste, setYaExiste] = useState(false);
  const router = useRouter();

  const valido = nombre.trim().length >= 2 && telefono.replace(/\D/g, '').length >= 7 && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setLoading(true);
    setError(null);
    setYaExiste(false);
    const { data: alta, error: altaError } = await supabase.functions.invoke('panel-email', {
      body: { action: 'signup', email: email.trim(), password },
    });
    if (altaError) {
      setLoading(false);
      setError('No pudimos crear la cuenta. Revisa el correo y que la contraseña tenga al menos 8 caracteres.');
      return;
    }
    if ((alta as { exists?: boolean } | null)?.exists) {
      setLoading(false);
      setYaExiste(true);
      return;
    }
    const { error: entradaError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (entradaError) {
      setLoading(false);
      setError(mensajeError(entradaError));
      return;
    }
    const { error: partnerError } = await supabase.rpc('register_partner', { p_name: nombre, p_phone: telefono, p_zone: zona });
    if (partnerError) {
      // Se guardan los datos en la cuenta y el panel termina el alta solo.
      await supabase.auth.updateUser({ data: { pending_partner: { name: nombre.trim(), phone: telefono.trim(), zone: zona.trim() } } });
    }
    setLoading(false);
    router.replace('/partners/panel');
  }

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 py-10">
      <Image src="/camina-logo.png" alt="Camina" width={72} height={72} className="rounded-full mb-4" />
      <p className="text-white font-bold text-[22px] mb-1.5">Quiero ser partner</p>
      <p className="text-auth-muted text-[13px] mb-6 text-center max-w-[300px]">Son 5 datos y entras directo a tu panel. Es gratis.</p>
      <form onSubmit={crear} className="w-full max-w-[320px] flex flex-col gap-2.5">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" required aria-label="Tu nombre" autoComplete="name" className={CAMPO} />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu WhatsApp (ej. 71234567)" inputMode="tel" required aria-label="Tu WhatsApp" autoComplete="tel" className={CAMPO} />
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Tu zona (opcional)" aria-label="Tu zona" className={CAMPO} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Tu correo" required aria-label="Tu correo" autoComplete="email" className={CAMPO} />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Elige una contraseña (mínimo 8)" autoComplete="new-password" required className={CAMPO} />
        {yaExiste && (
          <p className="text-warn text-[12.5px]">
            Ese correo ya tiene cuenta en Camina. <Link href="/partners/login" className="underline font-semibold">Inicia sesión</Link> con tu contraseña y completa tu perfil de partner.
          </p>
        )}
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <button type="submit" disabled={loading || !valido} className="bg-mint text-mint-dark rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50">
          {loading ? 'Creando tu cuenta…' : 'Crear mi cuenta de partner'}
        </button>
        <p className="text-auth-muted text-[11.5px] text-center">
          Eres partner independiente: tú eliges tus horarios. Al registrarte aceptas las reglas del programa que verás en tu panel.
        </p>
        <Link href="/partners/login" className="text-auth-muted text-[12.5px] text-center">¿Ya tienes cuenta? Entrar</Link>
        <a href={partnersWa('Hola! Quiero ser partner de Camina y tengo una consulta.')} target="_blank" rel="noopener noreferrer" className="mt-1 text-mint text-[13px] font-semibold text-center border border-mint/40 rounded-xl py-2.5">
          ¿Dudas? Escríbenos por WhatsApp
        </a>
      </form>
    </div>
  );
}
