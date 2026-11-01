import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// El Baifo (cabrita de Camina) en 3D. Aparece en estados vacíos, de error, en el canje y en la entrada de "Tu mes en Camina".
// Sentado respira despacio, confundido se balancea, festeja salta, camina va con un trote suave y asoma sube y baja un poco.
// Con "reducir movimiento" queda quieto.
const IMG = {
  sentado: { src: require('@/../assets/baifo/sentado.webp'), ratio: 300 / 360 },
  confundido: { src: require('@/../assets/baifo/confundido.webp'), ratio: 305 / 420 },
  festeja: { src: require('@/../assets/baifo/festeja.webp'), ratio: 287 / 420 },
  camina: { src: require('@/../assets/baifo/camina.webp'), ratio: 284 / 420 },
  asoma: { src: require('@/../assets/baifo/asoma.webp'), ratio: 366 / 300 },
} as const;
export type BaifoPose = keyof typeof IMG;

const DURACION: Record<BaifoPose, number> = { sentado: 1600, confundido: 1200, festeja: 450, camina: 380, asoma: 1400 };

export function BaifoMascot({ pose, height = 124 }: { pose: BaifoPose; height?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) { t.value = 0; return; }
    const dur = DURACION[pose];
    t.value = withRepeat(withSequence(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: dur, easing: Easing.inOut(Easing.ease) })), -1);
  }, [t, reduced, pose]);
  const anim = useAnimatedStyle(() => {
    if (pose === 'sentado') return { transform: [{ scaleX: 1 + 0.02 * t.value }, { scaleY: 1 + 0.035 * t.value }] };
    if (pose === 'confundido') return { transform: [{ rotate: `${-2 + 4 * t.value}deg` }] };
    if (pose === 'festeja') return { transform: [{ translateY: -10 * t.value }] };
    if (pose === 'camina') return { transform: [{ translateY: -6 * t.value }, { rotate: `${-1.5 + 3 * t.value}deg` }] };
    return { transform: [{ translateY: 5 * t.value }] };
  });
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.Image source={IMG[pose].src} resizeMode="contain" style={[{ height, aspectRatio: IMG[pose].ratio, transformOrigin: 'bottom' }, anim]} />
    </View>
  );
}
