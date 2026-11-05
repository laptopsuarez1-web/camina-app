import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Títulos de la Ruta en Montserrat Black (la misma letra del nombre CAMINA). Si la fuente no cargó, negrita del sistema.
export function heavy() {
  return brandFontsReady() ? { fontFamily: WORDMARK_FAMILY, fontWeight: 'normal' as const } : { fontWeight: '900' as const };
}
