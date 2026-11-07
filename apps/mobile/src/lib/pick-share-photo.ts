import { pickPhoto } from '@/lib/pick-photo';

// Elige una foto de la galería para ponerla de fondo de una lámina transparente (9:16). Devuelve null si la persona cancela.
// La foto no sale del teléfono: solo se usa para armar la imagen que la persona comparte.
export async function pickSharePhoto(): Promise<string | null> {
  const r = await pickPhoto({ aspect: 9 / 16, max: 1920 });
  return r?.uri ?? null;
}
