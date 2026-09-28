'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { savePendingBusiness } from '@/lib/pending-business';

const CATEGORIAS = ['Café', 'Gastronomía', 'Entretenimiento', 'Fitness', 'Belleza', 'Compras', 'Salud', 'Servicios', 'Otro'];

export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const valido = nombre.trim() && direccion.trim() && telefono.trim() && email.trim() && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      // Confirmación de email obligatoria: todavía no hay sesión para poder
      // insertar el negocio (RLS lo exige). Guardamos los datos del alta acá
      // y useBusinessAuth los consume solo cuando el usuario confirme y entre.
      savePendingBusiness({ email: email.trim(), name: nombre.trim(), category: categoria, address: direccion.trim(), phone: telefono.trim() });
      setLoading(false);
      setAwaitingConfirmation(true);
      return;
    }

    const { error: businessError } = await supabase.from('businesses').insert({
      owner_user_id: data.session.user.id,
      name: nombre.trim(),
      category: categoria,
      address: direccion.trim(),
      phone: telefono.trim(),
      plan: 'primer_paso',
    });
    setLoading(false);
    if (businessError) {
      setError(businessError.message);
      return;
    }
    router.replace('/inicio');
  }

  async function resendConfirmation() {
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResending(false);
    setError(resendError ? resendError.message : null);
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="text-white font-bold text-[22px] mb-2">Confirmá tu correo</p>
        <p className="text-auth-muted text-[13px] mb-7 max-w-[300px]">
          Te mandamos un link a {email}. Abrilo para activar la cuenta y después iniciá sesión acá — tu
          comercio se crea solo apenas entrás.
        </p>
        {error && <p className="text-warn text-[12.5px] mb-4">{error}</p>}
        <button
          onClick={resendConfirmation}
          disabled={resending}
          className="bg-mint text-mint-dark rounded-xl py-3 px-6 font-semibold text-sm mb-3"
        >
          {resending ? 'Reenviando…' : 'Reenviar correo'}
        </button>
        <Link href="/login" className="text-auth-muted text-[12.5px]">
          Ya confirmé, ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[420px] px-6 py-10">
        <Link href="/login" className="text-muted text-[13px] mb-4.5 inline-block">
          ‹ Volver
        </Link>
        <p className="text-[21px] font-bold mb-1">Sumá tu comercio</p>
        <p className="text-muted text-[13px] mb-6">
          Empezás gratis con el plan Primer Paso — cambiás cuando quieras.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nombre comercial">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Café Tarija"
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Categoría">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Dirección">
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número, Tarija"
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Teléfono de contacto">
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+591 ..."
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="tucomercio@email.com"
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Contraseña">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>

          {error && <p className="text-warn text-[12.5px]">{error}</p>}

          <button
            type="submit"
            disabled={!valido || loading}
            className="w-full rounded-xl py-3.5 font-semibold text-sm mt-2 disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
