import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

// Las fotos del celular pesan varios MB y se muestran en círculos de 30-100 px. Se achican a 640 px (JPEG 0,8, ~60-100 KB)
// antes de subir, así abren rápido en cualquier pantalla. Si no se puede achicar, se sube tal cual.
const MAX_SIDE = 640;
async function shrinkToBase64(uri: string, base64?: string | null): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const first = await ctx.renderAsync();
    // Solo se achica si es más grande; el lado mayor queda en MAX_SIDE.
    if (first.width > MAX_SIDE || first.height > MAX_SIDE) {
      ctx.resize(first.width >= first.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (out.base64) return out.base64;
  } catch {
    // sigue con la foto original
  }
  return toBase64(uri, base64);
}

// Lee la foto como base64: usa el que ya dio el selector de imágenes y, si no hay, la lee del archivo.
export async function toBase64(uri: string, base64?: string | null): Promise<string> {
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
  const data = await shrinkToBase64(uri, base64);
  if (!data) throw new Error('No pudimos leer la foto. Elige otra.');
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  // ?v= evita que la app siga mostrando la foto anterior en caché
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

// Foto del grupo: bucket "group-photos", carpeta = id del grupo (solo quien creó el grupo puede escribir).
export async function uploadGroupPhoto(groupId: string, uri: string, base64?: string | null): Promise<string> {
  const data = await shrinkToBase64(uri, base64);
  if (!data) throw new Error('No pudimos leer la foto. Elige otra.');
  const path = `${groupId}/foto.jpg`;
  const { error } = await supabase.storage.from('group-photos').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return `${supabase.storage.from('group-photos').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
