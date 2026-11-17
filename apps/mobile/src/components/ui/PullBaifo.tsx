import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const FESTEJA = require('@/../assets/baifo/festeja.webp');
const RATIO = 287 / 420;
const H = 64; // casi todo el hueco que deja iPhone mientras recarga (~60 puntos)
const HOP = 4; // salto chico
const LOOP = 900; // ms por salto

// "Tirar para actualizar" en iPhone: el Baifo vive justo ARRIBA del contenido de la pantalla, parado sobre su borde.
// Al estirar hacia abajo aparece en el hueco que se abre, y mientras recarga da saltitos en el mismo lugar.
// Va como primer hijo del ScrollView: se mueve con el contenido, así que nunca queda fuera de lugar ni tapa nada.
// Una sola pose (festeja), a color. Reanimated en el hilo de la UI; con "reducir movimiento" no salta.
// En Android la pantalla no se estira (ahí queda el circulito nativo), así que no se dibuja.
export function PullBaifo({ refreshing }: { refreshing: boolean }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (refreshing && !reduced) {
      p.value = 0;
      p.value = withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1, false);
      return;
    }
    cancelAnimation(p);
    p.value = withTiming(0, { duration: 150 });
  }, [refreshing, reduced, p]);

  const hop = useAnimatedStyle(() => {
    // Sube y baja con una curva suave; al tocar el piso se aplasta apenas.
    const air = Math.sin(p.value * Math.PI);
    return { transform: [{ translateY: -air * HOP }, { scaleY: 1 - (1 - air) * (p.value > 0 ? 0.02 : 0) }] };
  });

  if (Platform.OS !== 'ios') return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: -(H + 2), left: 0, right: 0, height: H, alignItems: 'center' }}
    >
      <Animated.Image source={FESTEJA} resizeMode="contain" style={[{ height: H, width: H * RATIO, transformOrigin: 'bottom' }, hop]} />
    </View>
  );
}
