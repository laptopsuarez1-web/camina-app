import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

// Sube la foto elegida al bucket "avatars" y devuelve su URL pública.
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const base64 = await fetch(uri)
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
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  // ?v= evita que la app siga mostrando la foto anterior en caché
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
