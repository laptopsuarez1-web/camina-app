'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import CategoryPicker from '@/components/CategoryPicker';
import { CATEGORIAS } from '@/lib/categories';
import { MAX_LOCALES, guardarLocal, puedeAgregarLocal } from '@/lib/locales';
import { avisarPorCorreo } from '@/lib/email';

const input = 'w-full border border-line rounded-xl px-3 py-2.5 text-[14px] bg-card';

// Agregar otro local con la misma cuenta (plan Paso Adelante, hasta 5). El local nuevo empieza en Primer Paso y pasa por
// aprobación como cualquier local; se completa después desde «Mi local».
export default function NuevoLocalPage() {
  const { business, locales, session } = useBusinessAuth();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permitido = puedeAgregarLocal(locales);
  const listo = nombre.trim().length > 1 && direccion.trim().length > 3;

  async function crear() {
    if (!session || !listo || !permitido) return;
    setGuardando(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: session.user.id,
        name: nombre.trim(),
        category: categoria,
        address: direccion.trim(),
        phone: telefono.trim() || null,
        is_virtual: false,
        plan: 'primer_paso',
        city: business?.city ?? 'Tarija',
        account_kind: 'commerce',
        plan_onboarded: true,
      })
      .select('id')
      .single();
    if (err || !data) {
      setGuardando(false);
      setError('No pudimos crear el local. Intenta de nuevo.');
      return;
    }
    void avisarPorCorreo('new_business', data.id);
    guardarLocal(session.user.id, data.id);
    window.location.href = '/perfil';
  }

  return (
    <DashboardShell>
      <TopBar title="Agregar otro local" subtitle={`Con tu misma cuenta puedes tener hasta ${MAX_LOCALES} locales.`} />
      <div className="max-w-[520px] flex flex-col gap-4">
        {!permitido ? (
          <p className="text-[13.5px] text-muted">
            {locales.length >= MAX_LOCALES
              ? `Ya tienes ${MAX_LOCALES} locales, que es el máximo.`
              : 'Agregar más locales está incluido en el plan Paso Adelante.'}{' '}
            <Link href="/plan" className="underline font-semibold">
              Ver mi plan
            </Link>
          </p>
        ) : (
          <>
            <label className="block">
              <span className="block text-[12.5px] font-semibold mb-1.5">Nombre del local</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Café Tarija, sucursal Centro" className={input} />
            </label>
            <div>
              <span className="block text-[12.5px] font-semibold mb-1.5">Tipo de comercio</span>
              <CategoryPicker value={categoria} onChange={setCategoria} className="bg-card" />
            </div>
            <label className="block">
              <span className="block text-[12.5px] font-semibold mb-1.5">Dirección</span>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Calle Bolívar 123" className={input} />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold mb-1.5">
                Teléfono / WhatsApp <span className="text-muted font-normal">(opcional)</span>
              </span>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={input} />
            </label>
            <p className="text-[12px] text-muted">
              El local nuevo empieza en el plan Primer Paso y lo revisamos antes de publicarlo. Después completas las fotos, el horario y los premios en
              «Mi local».
            </p>
            {error && <p className="text-warn text-[12.5px]">{error}</p>}
            <button
              type="button"
              onClick={crear}
              disabled={!listo || guardando}
              className="rounded-xl bg-[#1F7A66] text-white py-3 text-[14.5px] font-bold disabled:opacity-50"
            >
              {guardando ? 'Creando…' : 'Crear local'}
            </button>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
