'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fileToPhotoBlob } from '@/lib/logo';

// Achica las fotos ya subidas que pesan mucho, sin cambiar sus links: baja el consumo de datos de Supabase.
// Descarga cada foto pesada, la achica y la vuelve a subir en el mismo lugar con caché de 1 año.
const BUCKETS: { name: string; max: number }[] = [
  { name: 'business-logos', max: 1280 },
  { name: 'benefit-images', max: 1000 },
];
const UMBRAL = 250_000; // bytes

type Obj = { bucket: string; max: number; path: string; size: number };

async function listar(bucket: string, max: number, prefix = ''): Promise<Obj[]> {
  const out: Obj[] = [];
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  for (const it of data ?? []) {
    const path = prefix ? `${prefix}/${it.name}` : it.name;
    if (!it.id) out.push(...(await listar(bucket, max, path)));
    else out.push({ bucket, max, path, size: Number((it.metadata as { size?: number } | null)?.size ?? 0) });
  }
  return out;
}

export function OptimizarFotos() {
  const [estado, setEstado] = useState<string | null>(null);
  const [corriendo, setCorriendo] = useState(false);

  async function correr() {
    setCorriendo(true);
    setEstado('Buscando fotos pesadas…');
    let antes = 0;
    let despues = 0;
    let hechas = 0;
    try {
      const todas = (await Promise.all(BUCKETS.map((b) => listar(b.name, b.max)))).flat();
      const pesadas = todas.filter((o) => o.size > UMBRAL && /\.(jpe?g|png|webp)$/i.test(o.path));
      for (let i = 0; i < pesadas.length; i++) {
        const o = pesadas[i];
        setEstado(`Achicando ${i + 1} de ${pesadas.length}…`);
        try {
          const url = supabase.storage.from(o.bucket).getPublicUrl(o.path).data.publicUrl + `?x=${Date.now()}`;
          const blob = await (await fetch(url)).blob();
          const nuevo = await fileToPhotoBlob(new File([blob], 'f', { type: blob.type }), o.max);
          if (nuevo.size >= o.size * 0.8) continue; // casi no mejora: se deja como está
          const { error } = await supabase.storage
            .from(o.bucket)
            .upload(o.path, nuevo, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
          if (error) continue;
          antes += o.size;
          despues += nuevo.size;
          hechas++;
        } catch {
          // una foto que falla no frena a las demás
        }
      }
      setEstado(
        hechas === 0
          ? 'Listo: no había fotos pesadas que achicar.'
          : `Listo: ${hechas} fotos achicadas, de ${(antes / 1048576).toFixed(1)} MB a ${(despues / 1048576).toFixed(1)} MB.`
      );
    } catch {
      setEstado('No se pudo terminar. Prueba de nuevo.');
    }
    setCorriendo(false);
  }

  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 mb-5">
      <p className="font-bold text-[13.5px] text-text">Optimizar fotos</p>
      <p className="text-muted text-[12px]">
        Achica las fotos viejas que pesan mucho (logos, portadas, galerías y premios). Los links no cambian. Ahorra datos de Supabase.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button onClick={correr} disabled={corriendo} className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-bold bg-purple-light text-muted disabled:opacity-50">
          {corriendo ? 'Trabajando…' : 'Optimizar fotos'}
        </button>
        {estado && <span className="text-[12px] text-text">{estado}</span>}
      </div>
    </div>
  );
}
