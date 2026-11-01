import { Platform } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library/legacy';

// Convierte una tarjeta (vista de 360 px de ancho) en una PNG de 1080 px y abre la hoja de compartir del sistema
// (ahí aparecen Instagram, WhatsApp, Guardar imagen...). La imagen se arma en el teléfono y no se sube a ningún lado.
export const SHARE_PX_WIDTH = 1080;

export async function shareCard(ref: RefObject<View | null>, size: { width: number; height: number }, filename: string, title = 'Comparte tu progreso') {
  if (!ref.current) throw new Error('La tarjeta todavía no está lista. Prueba de nuevo.');
  const scale = SHARE_PX_WIDTH / size.width;
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
    result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
  });

  if (Platform.OS === 'web') {
    // En el navegador: hoja de compartir con archivo si existe; si no, se baja la imagen.
    const blob = await (await fetch(uri)).blob();
    const file = new File([blob], `${filename}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file] });
      return;
    }
    const a = document.createElement('a');
    a.href = uri;
    a.download = `${filename}.png`;
    a.click();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Tu teléfono no permite compartir imágenes desde la app.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
}

// Copia la tarjeta (con su fondo transparente, si lo tiene) para pegarla como sticker en la historia de Instagram.
export async function copyCardImage(ref: RefObject<View | null>, size: { width: number; height: number }) {
  if (!ref.current) throw new Error('La tarjeta todavía no está lista. Prueba de nuevo.');
  const scale = SHARE_PX_WIDTH / size.width;
  const b64 = await captureRef(ref, { format: 'png', quality: 1, width: Math.round(size.width * scale), height: Math.round(size.height * scale), result: 'base64' });
  await Clipboard.setImageAsync(b64);
}

// Guarda la tarjeta (PNG de 1080 px) en la galería del teléfono. Pide solo permiso de escritura (no lee tus fotos).
// En el navegador la baja como archivo. Devuelve false si la persona no dio el permiso.
export async function saveCardToGallery(ref: RefObject<View | null>, size: { width: number; height: number }, filename: string): Promise<boolean> {
  if (!ref.current) throw new Error('La tarjeta todavía no está lista. Prueba de nuevo.');
  const scale = SHARE_PX_WIDTH / size.width;
  const opts = { format: 'png' as const, quality: 1, width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
  if (Platform.OS === 'web') {
    const uri = await captureRef(ref, { ...opts, result: 'data-uri' });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `${filename}.png`;
    a.click();
    return true;
  }
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  const uri = await captureRef(ref, { ...opts, result: 'tmpfile' });
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
