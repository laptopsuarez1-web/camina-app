import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { HeadbandHat } from '@/components/season/SantaHat';
import { useChristmas } from '@/hooks/useSeason';

// El Baifo (cabrita de Camina) en 3D. Aparece en estados vacíos, de error, en el canje y en la entrada de "Tu mes en Camina".
// Sentado respira despacio, confundido se balancea, festeja salta, camina flota despacio, sin giros y asoma sube y baja un poco.
// Con "reducir movimiento" queda quieto.
const IMG = {
  sentado: { src: require('@/../assets/baifo/sentado.webp'), ratio: 300 / 360 },
  confundido: { src: require('@/../assets/baifo/confundido.webp'), ratio: 305 / 420 },
  festeja: { src: require('@/../assets/baifo/festeja.webp'), ratio: 287 / 420 },
  camina: { src: require('@/../assets/baifo/camina.webp'), ratio: 284 / 420 },
  asoma: { src: require('@/../assets/baifo/asoma.webp'), ratio: 366 / 300 },
} as const;
export type BaifoPose = keyof typeof IMG;

// Dónde está la vincha en cada imagen (píxeles de la imagen original): ahí se apoya el gorro navideño.
// h = alto de la imagen; drop/shift ajustan para que la banda del gorro tape la vincha entera.
const HEADBAND: Record<BaifoPose, { h: number; l: [number, number]; r: [number, number]; drop: number; shift: number }> = {
  sentado: { h: 360, l: [86, 58], r: [223, 63], drop: 4, shift: -7 },
  confundido: { h: 420, l: [107, 49], r: [215, 41], drop: 4, shift: -7 },
  festeja: { h: 420, l: [78, 70], r: [194, 38], drop: 4, shift: -7 },
  camina: { h: 420, l: [86, 58], r: [226, 52], drop: 4, shift: -7 },
  asoma: { h: 300, l: [82, 105], r: [252, 62], drop: 6, shift: -7 },
};

const DURACION: Record<BaifoPose, number> = { sentado: 1600, confundido: 1200, festeja: 450, camina: 1800, asoma: 1400 };

// En temporada navideña (la decide el servidor) el Baifo lleva gorro; `festive` lo fuerza a mano.
export function BaifoMascot({ pose, height = 124, festive }: { pose: BaifoPose; height?: number; festive?: boolean }) {
  const reduced = useReducedMotion();
  const christmas = useChristmas();
  const withHat = festive ?? christmas;
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
    if (pose === 'camina') return { transform: [{ translateY: -3 * t.value }, { scale: 1 + 0.015 * t.value }] };
    return { transform: [{ translateY: 5 * t.value }] };
  });
  const hb = HEADBAND[pose];
  const k = height / hb.h;
  const width = height * IMG[pose].ratio;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* La animación mueve imagen y gorro juntos. */}
      <Animated.View style={[{ width, height, transformOrigin: 'bottom' }, anim]}>
        <Image source={IMG[pose].src} resizeMode="contain" style={{ width, height }} />
        {withHat ? (
          <HeadbandHat l={[hb.l[0] * k, hb.l[1] * k]} r={[hb.r[0] * k, hb.r[1] * k]} drop={hb.drop * k} shift={hb.shift * k} />
        ) : null}
      </Animated.View>
    </View>
  );
}
