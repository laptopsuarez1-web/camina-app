'use client';

import { useState } from 'react';
import { supabase, type Business } from '@/lib/supabase';
import CategoryPicker from '@/components/CategoryPicker';
import { CATEGORIAS } from '@/lib/categories';

// Admin: agregar otro local a la cuenta de un comercio (misma cuenta, mismo dueño). Sin pedir el plan: lo decide el admin.
export function AdminNuevoLocal({ base, onClose, onCreated }: { base: Business; onClose: () => void; onCreated: (b: Business) => void }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full border border-line rounded-xl px-3 py-2.5 text-[14px] bg-card';

  async function crear() {
    if (!base.owner_user_id || nombre.trim().length < 2) return;
    setGuardando(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: base.owner_user_id,
        name: nombre.trim(),
        category: categoria,
        address: direccion.trim() || null,
        is_virtual: false,
        plan: 'primer_paso',
        city: base.city ?? 'Tarija',
        account_kind: 'commerce',
        plan_onboarded: true,
      })
      .select('*')
      .single();
    setGuardando(false);
    if (err || !data) {
      setError('No se pudo crear el local. Intenta de nuevo.');
      return;
    }
    onCreated(data as Business);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-5 w-full max-w-[420px] shadow-xl flex flex-col gap-3">
        <h3 className="text-[16px] font-bold">Agregar local a {base.name}</h3>
        <p className="text-[12.5px] text-muted">Se crea con la misma cuenta del dueño. Después puedes completar fotos, horario y ubicación.</p>
        <label className="block">
          <span className="block text-[12.5px] font-semibold mb-1.5">Nombre del local</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
        </label>
        <div>
          <span className="block text-[12.5px] font-semibold mb-1.5">Tipo de comercio</span>
          <CategoryPicker value={categoria} onChange={setCategoria} className="bg-card" />
        </div>
        <label className="block">
          <span className="block text-[12.5px] font-semibold mb-1.5">Dirección</span>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={input} />
        </label>
        {error && <p className="text-warn text-[12.5px]">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line py-2.5 text-[14px] font-semibold">
            Cancelar
          </button>
          <button type="button" onClick={crear} disabled={guardando || nombre.trim().length < 2} className="flex-1 rounded-xl bg-[#1F7A66] text-white py-2.5 text-[14px] font-semibold disabled:opacity-50">
            {guardando ? 'Creando…' : 'Crear local'}
          </button>
        </div>
      </div>
    </div>
  );
}
