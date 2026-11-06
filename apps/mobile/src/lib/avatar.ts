import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

// Las fotos del celular pesan varios MB y se muestran en círculos de 30-100 px. Se achican a 640 px (JPEG 0,8, ~60-100 KB)
// antes de subir, así abren rápido en cualquier pantalla. Si no se puede achicar, se sube tal cual.
const MAX_SIDE = 640;
export async function shrinkToBase64(uri: string, base64?: string | null, MAX = MAX_SIDE): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const first = await ctx.renderAsync();
    // Solo se achica si es más grande; el lado mayor queda en MAX_SIDE.
    if (first.width > MAX || first.height > MAX) {
      ctx.resize(first.width >= first.height ? { width: MAX } : { height: MAX });
    }
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (out.base64) return out.base64;
  } catch {
    // sigue con la foto original
  }
  return toBase64(uri, base64);
}

// Deja la foto recién subida ya guardada en el teléfono antes de mostrarla: así, al volver al perfil, aparece al instante
// (sin esto se veían las iniciales hasta que bajaba de nuevo). Espera como mucho 4 segundos.
async function warm(url: string) {
  await Promise.race([Image.prefetch(url, 'memory-disk').catch(() => false), new Promise((r) => setTimeout(r, 4000))]);
  return url;
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
  const { error } = await supabase.storage.from('avatars').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  // ?v= evita que la app siga mostrando la foto anterior en caché
  return warm(`${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`);
}

// Foto del grupo: bucket "group-photos", carpeta = id del grupo (solo quien creó el grupo puede escribir).
export async function uploadGroupPhoto(groupId: string, uri: string, base64?: string | null): Promise<string> {
  const data = await shrinkToBase64(uri, base64);
  if (!data) throw new Error('No pudimos leer la foto. Elige otra.');
  const path = `${groupId}/foto.jpg`;
  const { error } = await supabase.storage.from('group-photos').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  return warm(`${supabase.storage.from('group-photos').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`);
}

// Foto de fondo del perfil (0083): bucket público "profile-banners", más grande que el avatar (1280 px) porque va a lo ancho.
export async function uploadBanner(userId: string, uri: string, base64?: string | null): Promise<string> {
  const data = await shrinkToBase64(uri, base64, 1280);
  if (!data) throw new Error('No pudimos leer la foto. Elige otra.');
  const path = `${userId}/banner.jpg`;
  const { error } = await supabase.storage.from('profile-banners').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  return warm(`${supabase.storage.from('profile-banners').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`);
}

// Fotos viejas: antes del 1 de noviembre las fotos se subían en tamaño completo (varios MB) y por eso tardaban en
// abrir en todas las pantallas. Al entrar, si mi foto o mi banner pesan de más, se achican y se vuelven a subir una vez.
// Solo toca las fotos de la propia persona; si algo falla, se deja como está y se intenta en otra sesión.
const HEAL_KEY = 'camina.photoHeal.';
async function contentLength(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const n = Number(r.headers.get('content-length'));
    return r.ok && n > 0 ? n : null;
  } catch {
    return null;
  }
}
async function shrinkRemote(url: string, max: number): Promise<string | null> {
  try {
    const ctx = ImageManipulator.manipulate(url);
    const first = await ctx.renderAsync();
    if (first.width > max || first.height > max) ctx.resize(first.width >= first.height ? { width: max } : { height: max });
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    return out.base64 ?? null;
  } catch {
    return null;
  }
}
export async function healOldPhotos(profile: { id: string; photo_url?: string | null; profile_banner_url?: string | null }): Promise<Record<string, string> | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const jobs = [
    { col: 'photo_url', url: profile.photo_url, bucket: 'avatars', path: `${profile.id}/avatar.jpg`, limit: 220_000, max: MAX_SIDE },
    { col: 'profile_banner_url', url: profile.profile_banner_url, bucket: 'profile-banners', path: `${profile.id}/banner.jpg`, limit: 450_000, max: 1280 },
  ] as const;
  const patch: Record<string, string> = {};
  for (const j of jobs) {
    if (!j.url || !j.url.includes(`/object/public/${j.bucket}/`)) continue;
    // La marca es por archivo (bucket + ruta), NO por link: el link cambia en cada subida (?v=), y con la marca por link
    // la foto recién achicada se volvía a bajar, achicar y subir en CADA arranque (6/11: el banner se resubía una y otra
    // vez justo cuando se abría Perfil o Ranking, y la app se cerraba). Se marca ANTES de empezar: si algo falla o la app
    // se cierra a mitad, no se reintenta en bucle.
    const key = `${HEAL_KEY}${j.bucket}/${j.path}`;
    try {
      if (await AsyncStorage.getItem(key)) continue;
      await AsyncStorage.setItem(key, '1');
    } catch {
      continue;
    }
    const size = await contentLength(j.url);
    if (size == null || size <= j.limit) continue;
    const data = await shrinkRemote(j.url, j.max);
    // Solo se sube si de verdad quedó más liviana (base64 pesa ~4/3 del archivo).
    if (!data || (data.length * 3) / 4 >= size) continue;
    const { error } = await supabase.storage.from(j.bucket).upload(j.path, decode(data), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
    if (error) continue;
    patch[j.col] = `${supabase.storage.from(j.bucket).getPublicUrl(j.path).data.publicUrl}?v=${Date.now()}`;
  }
  if (!Object.keys(patch).length) return null;
  const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);
  return error ? null : patch;
}
