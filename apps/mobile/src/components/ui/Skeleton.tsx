import { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Glass } from '@/components/ui/Glass';

// Esqueleto de carga: bloques con la forma de lo que viene, que laten de opacidad (0,55 a 1 en 1,2 s), sin degradé por bloque.
// Corre en el hilo de UI (Reanimated). Con "reducir movimiento" quedan quietos.
export function Skeleton({ width = '100%', height, radius = 8, style, onDark }: {
  width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle>;
  // Sobre superficies siempre oscuras (tarjeta del gráfico de Actividad).
  onDark?: boolean;
}) {
  const dark = useColorScheme().colorScheme === 'dark' || !!onDark;
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 0.8 : 0.55);
  useEffect(() => {
    if (reduced) { o.value = 0.8; return; }
    o.value = withRepeat(withSequence(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), withTiming(0.55, { duration: 600, easing: Easing.inOut(Easing.ease) })), -1);
  }, [o, reduced]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(91,49,163,0.12)' }, anim, style]} />;
}

// Contenedor accesible: un solo aviso de "Cargando" en vez de leer cada bloque.
export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Cargando" style={style}>
      {children}
    </View>
  );
}

// Fila de lista de vidrio: ficha, dos líneas y una pastilla a la derecha (Movimientos, Grupos).
export function SkeletonRow({ chip = true }: { chip?: boolean }) {
  return (
    <Glass className="flex-row items-center rounded-2xl" style={{ gap: 12, padding: 12 }}>
      <Skeleton width={38} height={38} radius={12} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="55%" height={12} />
        <Skeleton width="80%" height={14} />
      </View>
      {chip ? <Skeleton width={56} height={26} radius={13} /> : null}
    </Glass>
  );
}

// Tarjeta de comercio (Canjes).
export function SkeletonBusinessCard() {
  return (
    <Glass className="rounded-3xl" style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width={56} height={56} radius={16} />
        <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="30%" height={12} />
          <Skeleton width="75%" height={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={150} height={32} radius={16} />
        <Skeleton width={110} height={32} radius={16} />
      </View>
    </Glass>
  );
}
