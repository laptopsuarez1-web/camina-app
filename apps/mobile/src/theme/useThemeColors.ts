import { useColorScheme } from 'nativewind';
import { colors } from './tokens';

// Colores ya resueltos según el tema, para íconos, placeholders y textos que no pueden
// usar una clase `dark:`. Evita repetir `dark ? a : b` (y olvidarse de la variante oscura).
export function useThemeColors() {
  const dark = useColorScheme().colorScheme === 'dark';
  return {
    dark,
    ...(dark ? colors.dark : colors.light),
    // Texto de color sobre el vidrio: 4,5:1 o más en claro y en oscuro.
    accentText: dark ? colors.mint : colors.aquaInk,
    purpleText: dark ? colors.purpleSoft : colors.purpleInk,
    warnText: dark ? colors.warnSoft : colors.warnDeep,
    dangerText: dark ? colors.dangerSoft : colors.dangerInk,
    // Corazón de favoritos: el rojo de peligro de la marca, en su variante de cada tema.
    favorite: dark ? colors.dangerSoft : colors.dangerFill,
    // Ícono verde suelto sobre la superficie del tema.
    accentIcon: dark ? colors.mint : colors.aquaIcon,
  };
}
