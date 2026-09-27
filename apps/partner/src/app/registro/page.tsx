'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = ['Café', 'Gastronomía', 'Entretenimiento', 'Fitness', 'Belleza'];

export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const valido = nombre.trim() && direccion.trim() && telefono.trim() && email.trim() && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.session) {
      setLoading(false);
      setError(signUpError?.message ?? 'Revisá tu correo para confirmar la cuenta y volvé a entrar.');
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
