import { View, StyleSheet, Platform, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useGlassStore, type GlassLevel } from '@/store/useGlassStore';
import { colors } from '@/theme/tokens';

// Radios de las clases de Tailwind más usadas (los "md/lg/xl" son los del tailwind.config.js de la app).
const RADIUS: Record<string, number> = {
  none: 0, sm: 10, md: 14, lg: 20, xl: 28, '2xl': 16, '3xl': 24, full: 999,
};

function radiusFrom(className?: string): number {
  const m = className?.match(/(?:^|\s)rounded-(?!t-|b-|l-|r-|tl-|tr-|bl-|br-)(\[(\d+)px\]|[a-z0-9]+)/);
  if (!m) return 14;
  if (m[2]) return Number(m[2]);
  return RADIUS[m[1]] ?? 14;
}

// Capas de relleno por nivel: [arriba, abajo] en opacidad de blanco (claro) o de la tarjeta (oscuro).
const LIGHT: Record<GlassLevel, [number, number]> = { 0: [1, 1], 1: [0.82, 0.5], 2: [0.6, 0.28] };
const DARK: Record<GlassLevel, [number, number]> = { 0: [1, 1], 1: [0.16, 0.07], 2: [0.1, 0.035] };

// Tarjeta de "vidrio": relleno translúcido con degradé, borde brillante arriba y sombra suave.
export function Glass({
  className,
  style,
  children,
  ...props
}: ViewProps & { className?: string; style?: StyleProp<ViewStyle> }) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const level = useGlassStore((s) => s.level);
  const topOnly = className?.match(/rounded-t-\[(\d+)px\]/);
  const radius = topOnly ? 0 : radiusFrom(className);
  const shape: ViewStyle = topOnly
    ? { borderTopLeftRadius: Number(topOnly[1]), borderTopRightRadius: Number(topOnly[1]) }
    : { borderRadius: radius };
  const innerShape: ViewStyle = topOnly
    ? { borderTopLeftRadius: Number(topOnly[1]) - 1, borderTopRightRadius: Number(topOnly[1]) - 1 }
    : { borderRadius: Math.max(0, radius - 1) };
  const [a, b] = (dark ? DARK : LIGHT)[level];
  const fill: [string, string] = dark
    ? level === 0
      ? [colors.dark.card, colors.dark.card]
      : [`rgba(255,255,255,${a})`, `rgba(255,255,255,${b})`]
    : [`rgba(255,255,255,${a})`, `rgba(255,255,255,${b})`];

  return (
    <View
      className={className}
      style={[
        {
          ...shape,
          borderWidth: 1,
          // En claro el borde va en el lila de las líneas: blanco sobre el fondo casi blanco no se veía (1.09:1), y en Android no hay sombra.
          borderColor: dark ? 'rgba(255,255,255,0.2)' : colors.light.line,
          shadowColor: dark ? '#000' : '#503C8C',
          shadowOpacity: dark ? 0.3 : 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        style,
        // En Android la sombra (elevation) se ve a través del vidrio y dibuja rectángulos: nunca se usa.
        Platform.OS === 'android' && { elevation: 0, shadowOpacity: 0 },
      ]}
      {...props}
    >
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, innerShape]}
      />
      {level > 0 && !topOnly && (
        // Brillo fino arriba (borde de luz del vidrio)
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, left: Math.min(radius, 16), right: Math.min(radius, 16), height: 1.5,
            backgroundColor: dark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,1)',
          }}
        />
      )}
      {children}
    </View>
  );
}
