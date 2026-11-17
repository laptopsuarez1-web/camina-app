import { useEffect } from 'react';
import { Image, Platform } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const FESTEJA = require('@/../assets/baifo/festeja.webp');
const RATIO = 287 / 420;
const H = 76;
const ROOM = H + 16; // lugar extra que se abre arriba mientras recarga
const DUR = 900; // igual que el Baifo de "¡Canje confirmado!" (BaifoMascot festeja)

// "Tirar para actualizar" en iPhone: el Baifo vive justo ARRIBA del contenido de la pantalla, parado sobre su borde.
// Al estirar hacia abajo aparece en el hueco que se abre, y mientras recarga sube y baja despacio (como en "¡Canje confirmado!").
// Va como primer hijo del ScrollView: se mueve con el contenido, así que nunca queda fuera de lugar ni tapa nada.
// Al recargar abre un espacio arriba (ROOM) para que se vea entero bajo la barra de estado; al terminar se cierra.
// Una sola pose (festeja), a color. Reanimated en el hilo de la UI; con "reducir movimiento" no salta.
// En Android la pantalla no se estira (ahí queda el circulito nativo), así que no se dibuja.
export function PullBaifo({ refreshing }: { refreshing: boolean }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  const room = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      // Abre lugar arriba para que el Baifo quede entero, bajo la barra de estado, mientras recarga.
      room.value = withTiming(ROOM, { duration: 280, easing: Easing.out(Easing.cubic) });
      // Mismo movimiento que en "¡Canje confirmado!": sube y baja despacio, 6 puntos.
      if (!reduced) p.value = withRepeat(withSequence(withTiming(1, { duration: DUR, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: DUR, easing: Easing.inOut(Easing.ease) })), -1);
      return;
    }
    room.value = withTiming(0, { duration: 260, easing: Easing.inOut(Easing.cubic) });
    cancelAnimation(p);
    p.value = withTiming(0, { duration: 200 });
  }, [refreshing, reduced, p, room]);

  const space = useAnimatedStyle(() => ({ height: room.value }));
  const place = useAnimatedStyle(() => ({ top: room.value - H - 2, transform: [{ translateY: -6 * p.value }] }));

  if (Platform.OS !== 'ios') return null;
  return (
    <>
      <Animated.View style={space} />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ position: 'absolute', left: 0, right: 0, height: H, alignItems: 'center' }, place]}
      >
        <Image source={FESTEJA} resizeMode="contain" style={{ height: H, width: H * RATIO }} />
      </Animated.View>
    </>
  );
}
