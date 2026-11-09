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

  async function handleFile(original: File) {
    setUploading(true);
    setError(null);
    // Las fotos del celular pesan varios MB y en la app se ven chicas: se achican antes de subir para que carguen rápido.
    const file = await shrink(original, shape === 'circle' ? 600 : shape === 'wide' ? 1600 : 1200);
    // Algunos celulares (Samsung) entregan la foto sin tipo o como HEIC: el servidor solo acepta JPG, PNG y WebP.
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    const contentType = ok.includes(file.type) ? file.type : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    if (file.size > 5 * 1024 * 1024) {
      setUploading(false);
      setError('La foto pesa más de 5 MB. Elige otra o achícala.');
      return;
    }
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`${path}.${ext}`, file, { upsert: true, contentType, cacheControl: '31536000' });
    setUploading(false);
    if (uploadError) {
      setError(`No pudimos subir la foto (${uploadError.message}). Intenta de nuevo.`);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${path}.${ext}`);
    // cache-bust: si reemplazas la foto, la URL pública es la misma y el
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

// Achica la foto en el navegador: el lado mayor queda en `max` px. PNG sigue en PNG (puede tener transparencia, como un
// logo); lo demás va a JPEG 0,85. Si algo falla o la foto ya es chica, se sube la original.
async function shrink(file: File, max: number): Promise<File> {
  try {
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 400_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const png = file.type === 'image/png';
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, png ? 'image/png' : 'image/jpeg', 0.85));
    const permitido = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!blob || (permitido && blob.size >= file.size)) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg');
    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  }
}
