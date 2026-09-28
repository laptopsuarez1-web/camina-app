'use client';

import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ImageUpload({
  bucket,
  path,
  value,
  onUploaded,
  label,
  shape = 'square',
}: {
  bucket: string;
  path: string;
  value: string | null;
  onUploaded: (url: string) => void;
  label: string;
  shape?: 'square' | 'circle' | 'wide';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const ext = file.name.split('.').pop() || 'jpg';
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`${path}.${ext}`, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (uploadError) {
      setError('No pudimos subir la foto. Intentá de nuevo.');
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${path}.${ext}`);
    // cache-bust: si reemplazás la foto, la URL pública es la misma y el
    // navegador podría seguir mostrando la vieja desde caché.
    onUploaded(`${data.publicUrl}?t=${Date.now()}`);
  }

  const dims =
    shape === 'circle' ? 'w-20 h-20 rounded-full' : shape === 'wide' ? 'w-full h-28 rounded-xl' : 'w-28 h-28 rounded-xl';

  return (
    <div>
      <span className="block text-[12.5px] font-semibold mb-1.5">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${dims} bg-white border border-dashed border-line flex items-center justify-center overflow-hidden relative`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={18} color="#7C6A9C" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px]">
            Subiendo…
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-warn text-[11.5px] mt-1">{error}</p>}
    </div>
  );
}
