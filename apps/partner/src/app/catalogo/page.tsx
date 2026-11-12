'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';
import { mensajeError } from '@/lib/errors';

interface Item {
  id: string;
  name: string;
  description: string | null;
  price_bs: number | null;
  image_url: string | null;
  section: string | null;
  active: boolean;
}

const input = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

// Catálogo o menú del local (físico u online): lo que cargues aquí se ve en la ficha de tu local en la app.
export default function CatalogoPage() {
  const { business, role } = useBusinessAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imgKey] = useState(() => `catalogo-${Date.now()}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('business_catalog_items')
      .select('id, name, description, price_bs, image_url, section, active')
      .eq('business_id', business.id)
      .order('position')
      .order('created_at');
    setItems((data as Item[]) ?? []);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!business) return;
    setSaving(true);
    setError(null);
    const precio = price.trim() === '' ? null : Number(price.replace(',', '.'));
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      setSaving(false);
      setError('Escribe el precio solo con números, por ejemplo 25 o 25,50.');
      return;
    }
    const { error: err } = await supabase.from('business_catalog_items').insert({
      business_id: business.id,
      name: name.trim(),
      description: description.trim() || null,
      price_bs: precio,
      section: section.trim() || null,
      image_url: image,
      position: items.length,
    });
    setSaving(false);
    if (err) {
      setError(mensajeError(err));
      return;
    }
    setName('');
    setPrice('');
    setDescription('');
    setImage(null);
    load();
  }

  async function toggle(it: Item) {
    await supabase.from('business_catalog_items').update({ active: !it.active }).eq('id', it.id);
    load();
  }

  async function remove(it: Item) {
    await supabase.from('business_catalog_items').delete().eq('id', it.id);
    load();
  }

  if (role === 'cashier') return <DashboardShell>{null}</DashboardShell>;

  return (
    <DashboardShell>
      <TopBar title="Catálogo o menú" subtitle="Carga tus productos con foto y precio. Se ven en la ficha de tu local en la app, sea físico u online." />
      <div className="max-w-[560px]">
        <div className="bg-card border border-line rounded-2xl p-5 mb-5 flex flex-col gap-3">
          <label>
            <span className="block text-[12.5px] font-semibold mb-1.5">Nombre del producto</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ej: Salteña de pollo" className={input} />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="block text-[12.5px] font-semibold mb-1.5">Precio en Bs (opcional)</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="12" className={input} />
            </label>
            <label className="flex-1">
              <span className="block text-[12.5px] font-semibold mb-1.5">Sección (opcional)</span>
              <input value={section} onChange={(e) => setSection(e.target.value)} maxLength={40} placeholder="Ej: Bebidas" className={input} />
            </label>
          </div>
          <label>
            <span className="block text-[12.5px] font-semibold mb-1.5">Descripción (opcional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} className={input} />
          </label>
          {business && (
            <ImageUpload bucket="business-logos" path={`${business.id}/${imgKey}-${items.length}`} value={image} onUploaded={setImage} label="Foto (opcional)" />
          )}
          {error && <p className="text-warn text-[12.5px]">{error}</p>}
          <button
            onClick={add}
            disabled={saving || name.trim().length === 0}
            className="w-full rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50"
            style={{ background: '#241748', color: '#62F0B6' }}
          >
            {saving ? 'Guardando…' : 'Agregar al catálogo'}
          </button>
        </div>

        {items.length > 0 && (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {items.map((it, i) => (
              <div key={it.id} className={`p-3 flex items-center gap-3 ${i < items.length - 1 ? 'border-b border-line' : ''} ${it.active ? '' : 'opacity-50'}`}>
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white border border-line shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13.5px] truncate">{it.name}</p>
                  <p className="text-[11.5px] text-muted truncate">
                    {[it.section, it.price_bs != null ? `Bs ${it.price_bs}` : null, it.active ? null : 'Oculto'].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => toggle(it)} aria-label={it.active ? 'Ocultar' : 'Mostrar'} className="border border-line rounded-lg p-2 bg-white shrink-0">
                  {it.active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => remove(it)} aria-label="Borrar" className="border border-line rounded-lg p-2 bg-white shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
