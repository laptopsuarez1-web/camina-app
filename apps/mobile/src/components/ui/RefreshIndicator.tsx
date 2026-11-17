import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pullDistance, useRefreshStore } from '@/store/useRefreshStore';

const COLOR = require('@/../assets/baifo/festeja.webp');
const GRIS = require('@/../assets/baifo/festeja-gris.webp');
const RATIO = 287 / 420;
const BAIFO_H = 72;
const BAIFO_W = BAIFO_H * RATIO;
const HOP = 5; // salto suave
const LOOP = 1100; // ms por salto (tranquilo)
const FULL_AT = 110; // a cuántos puntos de estirar queda todo a color (más o menos donde iPhone dispara la recarga)

// "Tirar para actualizar" en iPhone: al estirar la pantalla hacia abajo aparece el Baifo en el hueco de arriba,
// en blanco y negro, y el color va apareciendo suave mientras más se estira. Cuando arranca la recarga
// queda a color y salta de alegría hasta que termina; después la pantalla sube y lo tapa.
// Una sola pose (festeja). Todo en Reanimated (hilo de la UI), sin módulos nativos. Con "reducir movimiento" no salta.
// En Android la pantalla no se estira (el gesto nativo dibuja su propio círculo), así que ahí no se dibuja.
export function RefreshIndicator() {
  const refreshing = useRefreshStore((s) => s.refreshing);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const full = useSharedValue(0);
  const p = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      full.value = withTiming(1, { duration: 180 });
      p.value = 0;
      if (!reduced) p.value = withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1, false);
      return;
    }
    // Termina el salto en curso de forma suave y lo deja quieto (no gasta nada mientras no se recarga).
    cancelAnimation(p);
    p.value = withTiming(0, { duration: 160 });
    const id = setTimeout(() => { full.value = withTiming(0, { duration: 250 }); }, 500);
    return () => clearTimeout(id);
  }, [refreshing]); // eslint-disable-line react-hooks/exhaustive-deps

  // En iPhone el Baifo ocupa el hueco oscuro y el margen de arriba de la pantalla, justo sobre el encabezado.
  const top = Math.max(insets.top - 4, 4);
  // El recorte deja ver al Baifo solo en el hueco que se abre arriba: nunca tapa el contenido.
  const clip = useAnimatedStyle(() => ({ height: Math.max(0, pullDistance.value + insets.top + 12) }));
  // El color aparece de a poco sobre todo el Baifo (fundido suave), sin cortes.
  const color = useAnimatedStyle(() => {
    const x = Math.min(1, Math.max(0, (pullDistance.value - 30) / (FULL_AT - 30)));
    const eased = x * x * (3 - 2 * x); // entra y termina suave
    return { opacity: Math.max(eased, full.value) };
  });
  const hop = useAnimatedStyle(() => {
    // 80% del ciclo en el aire (curva suave), 20% aterrizando con un pequeño aplastón.
    const air = p.value < 0.8 ? Math.sin((p.value / 0.8) * Math.PI) : 0;
    const land = p.value >= 0.8 ? Math.sin(((p.value - 0.8) / 0.2) * Math.PI) : 0;
    return { transform: [{ translateY: -air * HOP }, { scaleY: 1 - land * 0.03 }, { scaleX: 1 + land * 0.02 }] };
  });

  if (Platform.OS === 'android') return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', alignItems: 'center', zIndex: 50 }, clip]}
    >
      <Animated.View style={[{ position: 'absolute', top: top + HOP, width: BAIFO_W, height: BAIFO_H, transformOrigin: 'bottom' }, hop]}>
        <Animated.Image source={GRIS} resizeMode="contain" style={{ position: 'absolute', bottom: 0, width: BAIFO_W, height: BAIFO_H }} />
        <Animated.Image source={COLOR} resizeMode="contain" style={[{ position: 'absolute', bottom: 0, width: BAIFO_W, height: BAIFO_H }, color]} />
      </Animated.View>
    </Animated.View>
  );
}
