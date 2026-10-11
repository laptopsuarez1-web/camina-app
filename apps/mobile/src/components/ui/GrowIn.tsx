import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// Hace crecer una barra desde abajo (escala vertical de 0 a 1), con una demora de 45 ms por barra, solo la primera vez en la sesión.
// Corre en el hilo de UI. Con "reducir movimiento" aparece ya completa.
const seen = new Set<string>();

export function GrowIn({ id, index, count, children }: { id: string; index: number; count: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [play] = useState(() => !seen.has(id) && !reduced);
  const k = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (!play) return;
    k.value = withDelay(index * 45, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // La animación se marca como vista cuando arranca la última barra.
    if (index === count - 1) seen.add(id);
  }, [k, index, count, id, play]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: k.value }], transformOrigin: 'bottom' }));
  return <Animated.View style={[{ width: '100%' }, style]}>{children}</Animated.View>;
}
