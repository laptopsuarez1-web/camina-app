import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

// Lee la foto como base64: usa el que ya dio el selector de imágenes y, si no hay, la lee del archivo.
async function toBase64(uri: string, base64?: string | null): Promise<string> {
  if (base64) return base64;
  return fetch(uri)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

// Sube la foto elegida al bucket "avatars" y devuelve su URL pública.
export async function uploadAvatar(userId: string, uri: string, base64?: string | null): Promise<string> {
  const data = await toBase64(uri, base64);
  if (!data) throw new Error('No pudimos leer la foto. Elegí otra.');
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  // ?v= evita que la app siga mostrando la foto anterior en caché
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
