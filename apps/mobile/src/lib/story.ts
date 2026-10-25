import { Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import type { StoryShare } from '@/lib/database.types';
import { normalizeHandle } from '@/lib/story-rules';

const HANDLE_KEY = 'camina_instagram_handle';

// Historias de Instagram por un canje (migración 0055). La foto va a un bucket PRIVADO (story-photos/<user_id>/...),
// que solo ven la persona y el equipo de Camina; el equipo aprueba desde el panel y recién ahí se acreditan los Puntos.

export { STORY_WINDOW_DAYS, storyStateFor, normalizeHandle, type StoryState } from '@/lib/story-rules';

export async function loadSavedHandle(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(HANDLE_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveHandle(h: string) {
  try {
    await AsyncStorage.setItem(HANDLE_KEY, h);
  } catch {
    // Solo es una comodidad: si no se guarda, la próxima vez lo vuelve a escribir.
  }
}

// Sacar una foto o elegirla. Devuelve la uri o null si canceló. Lanza un error con texto amable si falta el permiso.
export async function pickStoryPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [9, 16] };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Para sacar la foto, permite el uso de la cámara en los ajustes del teléfono.');
    const res = await ImagePicker.launchCameraAsync(opts);
    return res.canceled ? null : res.assets[0].uri;
  }
  const res = await ImagePicker.launchImageLibraryAsync(opts);
  return res.canceled ? null : res.assets[0].uri;
}

// Abre la hoja de compartir del sistema con la imagen ya armada (ahí aparece Instagram > Historias).
// En la web no hay hoja con archivos en todos los navegadores: se intenta con el Web Share API y si no, se abre Instagram.
export async function shareToInstagram(uri: string) {
  if (Platform.OS === 'web') {
    try {
      const blob = await (await fetch(uri)).blob();
      const file = new File([blob], 'camina-historia.jpg', { type: blob.type || 'image/jpeg' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
        return;
      }
    } catch {
      // Sigue abajo.
    }
    await Linking.openURL('https://www.instagram.com/');
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Tu teléfono no permite compartir la foto desde la app.');
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Súbela a tu historia', UTI: 'public.jpeg' });
}

async function toArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('data:')) return decode(uri.split(',')[1]);
  const blob = await (await fetch(uri)).blob();
  const b64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return decode(b64);
}

// Sube la foto (la versión con el sticker de Camina) y avisa al equipo. Devuelve la fila creada.
export async function submitStory(userId: string, redemptionId: string, uri: string, handle: string): Promise<StoryShare> {
  const clean = normalizeHandle(handle);
  if (!clean) throw new Error('Revisa tu usuario de Instagram: solo letras, números, puntos y guiones bajos.');
  const path = `${userId}/${redemptionId}-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from('story-photos').upload(path, await toArrayBuffer(uri), { contentType: 'image/jpeg' });
  if (upErr) throw upErr;
  const { data, error } = await supabase.rpc('submit_story_share', { p_redemption_id: redemptionId, p_photo_path: path, p_instagram: clean });
  if (error) throw error;
  await saveHandle(clean);
  return data as StoryShare;
}
