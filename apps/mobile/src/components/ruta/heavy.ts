import { Platform } from 'react-native';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Títulos de la Ruta en Montserrat Black (la misma letra del nombre CAMINA). Si la fuente no cargó, negrita del sistema.
// En web la familia se registra con peso 900, así que ahí el peso tiene que ir en 900.
export function heavy() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}
