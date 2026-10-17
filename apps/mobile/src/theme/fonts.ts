import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';

// Tipografía de marca: Plus Jakarta Sans (SIL OFL, ver assets/fonts/OFL-PlusJakartaSans.txt), una sola familia en iPhone y Android.
// En React Native una fuente propia necesita un nombre de familia por peso: cada peso se mapea a su archivo.
// Si la carga falla o tarda, el texto sigue en la fuente del sistema (BRAND_FONT_ENABLED en false apaga todo).
export const BRAND_FONT_ENABLED = true;

export const FONT_FILES = {
  PlusJakartaSans_400Regular: require('@/../assets/fonts/PlusJakartaSans_400Regular.ttf'),
  PlusJakartaSans_500Medium: require('@/../assets/fonts/PlusJakartaSans_500Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('@/../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  PlusJakartaSans_700Bold: require('@/../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  PlusJakartaSans_800ExtraBold: require('@/../assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
  // Solo para el nombre CAMINA de Inicio (Montserrat Black, SIL OFL, ver assets/fonts/OFL-Montserrat.txt).
  Montserrat_900Black: require('@/../assets/fonts/Montserrat_900Black.ttf'),
} as const;

// Familia del nombre CAMINA: en iPhone y Android es la del archivo; en web (previews) se registra aparte con peso 900.
export const WORDMARK_FAMILY = Platform.OS === 'web' ? 'CaminaWordmark' : 'Montserrat_900Black';

let ready = false;
export function setBrandFontsReady(value: boolean) {
  ready = BRAND_FONT_ENABLED && value;
}
export function brandFontsReady() {
  return ready;
}

// fontWeight de un estilo -> familia. 100-300 caen en Regular y 900 en ExtraBold (la app solo usa 400 a 800).
export function brandFamily(weight: string | number | undefined): keyof typeof FONT_FILES {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (w >= 800) return 'PlusJakartaSans_800ExtraBold';
  if (w >= 700) return 'PlusJakartaSans_700Bold';
  if (w >= 600) return 'PlusJakartaSans_600SemiBold';
  if (w >= 500) return 'PlusJakartaSans_500Medium';
  return 'PlusJakartaSans_400Regular';
}

// En web (solo previews) el peso sale de CSS: una sola familia con un archivo por peso.
export const WEB_FAMILY = 'CaminaSans';
const WEB_WEIGHTS: [number, number][] = [
  [400, FONT_FILES.PlusJakartaSans_400Regular],
  [500, FONT_FILES.PlusJakartaSans_500Medium],
  [600, FONT_FILES.PlusJakartaSans_600SemiBold],
  [700, FONT_FILES.PlusJakartaSans_700Bold],
  [800, FONT_FILES.PlusJakartaSans_800ExtraBold],
];

function useWebFonts(): [boolean, Error | null] {
  const [state, setState] = useState<[boolean, Error | null]>([false, null]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      ...WEB_WEIGHTS.map(([weight, mod]) => new FontFace(WEB_FAMILY, `url(${Asset.fromModule(mod).uri})`, { weight: String(weight) }).load()),
      new FontFace(WORDMARK_FAMILY, `url(${Asset.fromModule(FONT_FILES.Montserrat_900Black).uri})`, { weight: '900' }).load(),
    ])
      .then((faces) => {
        faces.forEach((f) => document.fonts.add(f));
        if (alive) setState([true, null]);
      })
      .catch((e) => alive && setState([false, e instanceof Error ? e : new Error(String(e))]));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

// [cargada, error]: en iPhone y Android las fuentes se registran una por peso con expo-font.
export const useBrandFonts: () => [boolean, Error | null] = Platform.OS === 'web' ? useWebFonts : () => useFonts(FONT_FILES);
