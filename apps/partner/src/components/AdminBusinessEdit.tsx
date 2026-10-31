'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, type Business } from '@/lib/supabase';
import { opcionesCategoria } from '@/lib/categories';

type Campos = {
  name: string; category: string; description: string; address: string; city: string; phone: string;
  instagram: string; facebook: string; tiktok: string; website: string; google_review_url: string;
  hours_text: string; lat: string; lng: string;
};

const TEXTOS: { key: keyof Campos; label: string; long?: boolean }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'description', label: 'Descripción', long: true },
  { key: 'address', label: 'Dirección' },
  { key: 'city', label: 'Ciudad' },
  { key: 'phone', label: 'Teléfono / WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'website', label: 'Sitio web' },
  { key: 'google_review_url', label: 'Link de Google Maps / reseñas' },
  { key: 'hours_text', label: 'Horario (texto)' },
];

// Edición completa de un comercio por el equipo de Camina. El servidor deja pasar el UPDATE solo a admins (RLS is_admin()).
export function AdminBusinessEditModal({ business, onClose, onSaved }: { business: Business; onClose: () => void; onSaved: (b: Business) => void }) {
  const [f, setF] = useState<Campos>({
    name: business.name ?? '', category: business.category ?? '', description: business.description ?? '',
    address: business.address ?? '', city: business.city ?? '', phone: business.phone ?? '',
    instagram: business.instagram ?? '', facebook: business.facebook ?? '', tiktok: business.tiktok ?? '',
    website: business.website ?? '', google_review_url: business.google_review_url ?? '', hours_text: business.hours_text ?? '',
    lat: business.lat != null ? String(business.lat) : '', lng: business.lng != null ? String(business.lng) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Campos, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setError(null);
    if (f.name.trim().length < 2) return setError('El nombre es obligatorio.');
    const lat = f.lat.trim() === '' ? null : Number(f.lat.replace(',', '.'));
    const lng = f.lng.trim() === '' ? null : Number(f.lng.replace(',', '.'));
    if ((lat !== null && (Number.isNaN(lat) || Math.abs(lat) > 90)) || (lng !== null && (Number.isNaN(lng) || Math.abs(lng) > 180))) {
      return setError('Latitud y longitud no son válidas.');
    }
    const vacio = (v: string) => (v.trim() === '' ? null : v.trim());
    setSaving(true);
    const { data, error: err } = await supabase
      .from('businesses')
      .update({
        name: f.name.trim(), category: f.category, description: vacio(f.description), address: vacio(f.address), city: vacio(f.city),
        phone: vacio(f.phone), instagram: vacio(f.instagram), facebook: vacio(f.facebook), tiktok: vacio(f.tiktok),
        website: vacio(f.website), google_review_url: vacio(f.google_review_url), hours_text: vacio(f.hours_text), lat, lng,
      })
      .eq('id', business.id)
      .select('*')
      .single();
    setSaving(false);
    if (err || !data) return setError(err?.message ?? 'No se pudo guardar.');
    onSaved(data as Business);
  }

  const input = 'w-full bg-white border border-line rounded-[10px] px-3 py-2 text-[13px] text-text';
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Editar ${business.name}`}>
      <div className="bg-card rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-text">Editar {business.name}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-muted"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="block text-[12px] font-semibold text-text mb-1">Categoría</span>
            <select value={f.category} onChange={(e) => set('category', e.target.value)} className={input}>
              {opcionesCategoria(business.category).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {TEXTOS.map(({ key, label, long }) => (
            <label key={key} className="block">
              <span className="block text-[12px] font-semibold text-text mb-1">{label}</span>
              {long ? (
                <textarea value={f[key]} onChange={(e) => set(key, e.target.value)} rows={3} className={input} />
              ) : (
                <input value={f[key]} onChange={(e) => set(key, e.target.value)} className={input} />
              )}
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[12px] font-semibold text-text mb-1">Latitud</span>
              <input value={f.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" className={input} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-semibold text-text mb-1">Longitud</span>
              <input value={f.lng} onChange={(e) => set('lng', e.target.value)} inputMode="decimal" className={input} />
            </label>
          </div>
          <p className="text-muted text-[11.5px]">Logo, portada, fotos y premios los edita el comercio desde su panel. Horarios por día, también.</p>
        </div>
        {error && <p className="text-warn text-[12.5px] mt-3">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="rounded-[10px] px-4 py-2 text-[13px] font-bold disabled:opacity-50" style={{ background: '#241748', color: '#7FEDC4' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button onClick={onClose} className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[10px] px-4 py-2 text-[13px] font-bold">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
