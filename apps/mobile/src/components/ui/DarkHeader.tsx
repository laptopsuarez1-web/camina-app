import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Cabecera oscura de la app (la misma materia que la de Inicio): degradé ciruela y borde inferior de 36.
// Colores del degradé: los mismos de la cabecera de Inicio.
export const DARK_HEADER_COLORS = ['#3a2668', '#1c1030', '#120a1e'] as const;

export function DarkHeader({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={DARK_HEADER_COLORS}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: 0.8, y: 1 }}
      style={[{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' }, style]}
    >
      {children}
    </LinearGradient>
  );
}
