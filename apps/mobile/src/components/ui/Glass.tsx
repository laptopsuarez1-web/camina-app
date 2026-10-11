import { View, StyleSheet, Platform, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from 'nativewind';
import { useGlassStore } from '@/store/useGlassStore';
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

// Borde de luz direccional: [arriba, izquierda, derecha, abajo].
const EDGE_LIGHT: ViewStyle = {
  borderTopColor: 'rgba(255,255,255,0.95)', borderLeftColor: 'rgba(255,255,255,0.8)',
  borderRightColor: 'rgba(150,125,215,0.16)', borderBottomColor: 'rgba(110,80,190,0.17)',
};
const EDGE_DARK: ViewStyle = {
  borderTopColor: 'rgba(255,255,255,0.36)', borderLeftColor: 'rgba(255,255,255,0.22)',
  borderRightColor: 'rgba(255,255,255,0.12)', borderBottomColor: 'rgba(255,255,255,0.05)',
};

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
  const fill = cardFill(amount, dark, colors.dark.card, paletteFor(dark).tint);
  const ownBorder = !!(StyleSheet.flatten(style) as ViewStyle | undefined)?.borderColor;

  return (
    <View
      className={className}
      style={[
        {
          ...shape,
          borderWidth: 1,
          // Con vidrio, el borde tiene luz con dirección (la luz viene de arriba a la izquierda): casi blanco de ese lado y lila apenas visible del otro.
          // Sin vidrio (Sólido) en claro el borde va en el lila de las líneas: blanco sobre el fondo casi blanco no se veía (1.09:1), y en Android no hay sombra.
          // Si la tarjeta trae su propio borderColor (p. ej. el dorado de paso_adelante), ese gana: los colores por lado le ganarían a borderColor.
          ...(ownBorder ? null : on ? (dark ? EDGE_DARK : EDGE_LIGHT) : { borderColor: dark ? 'rgba(255,255,255,0.2)' : colors.light.line }),
          shadowColor: dark ? '#000' : colors.purpleDeep,
          shadowOpacity: dark ? 0.3 : 0.13,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        on && Platform.OS === 'web' && ({ backdropFilter: blurWeb(amount), WebkitBackdropFilter: blurWeb(amount), boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.25), 0 10px 28px rgba(0,0,0,0.30)' : '0 1px 2px rgba(41,28,71,0.08), 0 10px 28px rgba(91,49,163,0.13)' } as ViewStyle),
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
            tintColor={dark ? undefined : `rgba(${(paletteFor(dark).tint ?? [167, 139, 250]).join(',')},${(0.22 * amount).toFixed(3)})`}
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
        // Brillo especular suave desde la esquina superior izquierda: se apaga hacia el centro. Va debajo del contenido.
        <LinearGradient
          colors={dark ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 0.5 }}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, innerShape]}
        />
      )}
      {children}
    </View>
  );
}
