import { View, StyleSheet, Platform, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from 'nativewind';
import { useGlassStore } from '@/store/useGlassStore';
import { useBackgroundStore } from '@/store/useBackgroundStore';
import { paletteFor } from '@/components/ui/backgrounds';
import { cardFill, blurWeb, glassOn } from '@/components/ui/glassMath';
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

// En iOS 26 las tarjetas usan el vidrio líquido del sistema; en iOS anterior, desenfoque real;
// en web, backdrop-filter; en Android (sin desenfoque) queda solo el relleno translúcido.
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

// Tarjeta de "vidrio": relleno translúcido con degradé, borde brillante arriba y sombra suave.
export function Glass({
  className,
  style,
  children,
  ...props
}: ViewProps & { className?: string; style?: StyleProp<ViewStyle> }) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const amount = useGlassStore((s) => s.amount);
  const on = glassOn(amount);
  const topOnly = className?.match(/rounded-t-\[(\d+)px\]/);
  const radius = topOnly ? 0 : radiusFrom(className);
  const shape: ViewStyle = topOnly
    ? { borderTopLeftRadius: Number(topOnly[1]), borderTopRightRadius: Number(topOnly[1]) }
    : { borderRadius: radius };
  const innerShape: ViewStyle = topOnly
    ? { borderTopLeftRadius: Number(topOnly[1]) - 1, borderTopRightRadius: Number(topOnly[1]) - 1 }
    : { borderRadius: Math.max(0, radius - 1) };
  const bgId = useBackgroundStore((s) => s.id);
  const fill = cardFill(amount, dark, colors.dark.card, paletteFor(bgId, dark).tint);

  return (
    <View
      className={className}
      style={[
        {
          ...shape,
          borderWidth: 1,
          // En claro el borde va en el lila de las líneas: blanco sobre el fondo casi blanco no se veía (1.09:1), y en Android no hay sombra.
          borderColor: dark ? 'rgba(255,255,255,0.2)' : on ? 'rgba(255,255,255,0.85)' : colors.light.line,
          shadowColor: dark ? '#000' : '#503C8C',
          shadowOpacity: dark ? 0.3 : 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        on && Platform.OS === 'web' && ({ backdropFilter: blurWeb(amount), WebkitBackdropFilter: blurWeb(amount) } as ViewStyle),
        style,
        // En Android la sombra (elevation) se ve a través del vidrio y dibuja rectángulos: nunca se usa.
        Platform.OS === 'android' && { elevation: 0, shadowOpacity: 0 },
      ]}
      {...props}
    >
      {on && LIQUID ? (
        <>
          <GlassView
            glassEffectStyle="regular"
            colorScheme={dark ? 'dark' : 'light'}
            tintColor={dark ? undefined : `rgba(${(paletteFor(bgId, dark).tint ?? [167, 139, 250]).join(',')},${(0.22 * amount).toFixed(3)})`}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, innerShape]}
          />
          {/* Con valores bajos del deslizador se tapa el vidrio con un relleno sólido, hasta que desaparece. */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, innerShape, { backgroundColor: dark ? colors.dark.card : '#fff', opacity: Math.max(0, 1 - amount * 2.2) }]}
          />
        </>
      ) : (
        <>
          {on && Platform.OS === 'ios' && (
            <BlurView intensity={30} tint={dark ? 'dark' : 'light'} pointerEvents="none" style={[StyleSheet.absoluteFill, innerShape, { overflow: 'hidden' }]} />
          )}
          <LinearGradient
            colors={fill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.35, y: 1 }}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, innerShape]}
          />
        </>
      )}
      {on && !topOnly && !LIQUID && (
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
