'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fileToPhotoBlob } from '@/lib/logo';

const BUCKET = 'business-logos';
const MAX_FOTOS = 8;

// Más fotos del local: aparecen en la ficha de la app, después de la portada. Se guardan al toque.
export function GalleryUpload({
  businessId,
  photos,
  onChange,
  label = 'Más fotos del local',
  prefix = 'galeria',
  hint,
}: {
  businessId: string;
  photos: string[];
  onChange: (photos: string[]) => void | Promise<void>;
  label?: string;
  prefix?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const nuevas: string[] = [];
    for (const file of Array.from(files).slice(0, MAX_FOTOS - photos.length)) {
      try {
        const blob = await fileToPhotoBlob(file);
        const path = `${businessId}/${prefix}-${Date.now()}-${nuevas.length}.jpg`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        nuevas.push(`${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}`);
      } catch {
        setError('No pudimos subir alguna foto. Probá de nuevo con otra en PNG o JPG.');
      }
    }
    if (nuevas.length > 0) await onChange([...photos, ...nuevas]);
    setUploading(false);
  }

  async function remove(url: string) {
    setError(null);
    await onChange(photos.filter((p) => p !== url));
    // Se intenta borrar el archivo también; si falla no pasa nada.
    const marca = `/${BUCKET}/`;
    const i = url.indexOf(marca);
    if (i >= 0) await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marca.length).split('?')[0])]);
  }

  return (
    <div>
      <span className="block text-[12.5px] font-semibold mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {photos.map((url) => (
          <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Quitar foto"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {photos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-xl border border-dashed border-line bg-white flex flex-col items-center justify-center gap-1 text-[11px] text-muted"
          >
            <ImagePlus size={18} color="#7C6A9C" />
            {uploading ? 'Subiendo…' : 'Agregar'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <p className="text-[11.5px] text-muted mt-1.5 leading-4">
        {hint ?? `Hasta ${MAX_FOTOS} fotos: el local, el ambiente, tus productos. Los clientes las ven tocando la portada en la app.`}
      </p>
      {error && <p className="text-warn text-[11.5px] mt-1">{error}</p>}
    </div>
  );
}
