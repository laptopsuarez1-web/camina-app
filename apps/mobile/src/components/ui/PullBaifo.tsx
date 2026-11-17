import { useEffect } from 'react';
import { Image, Platform, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { pullDistance } from '@/store/useRefreshStore';

const FESTEJA = require('@/../assets/baifo/festeja.webp');
const RATIO = 287 / 420;
const BAIFO_H = 60;
const JUMP = 12;
// iPhone ya deja ~60 pt libres arriba mientras recarga; solo se suma un poquito para que el salto no se corte.
const ROOM = 24;
const SKY_H = 200; // cielo con nubes (también cubre lo que se estira de más)
const SHOW_AT = 70; // puntos de estirar para que el Baifo quede entero

// "Tirar para actualizar" en iPhone. Vive justo ARRIBA del contenido (primer hijo del ScrollView) y se mueve con él:
// - al estirar, el Baifo aparece y crece de a poco siguiendo el dedo (nada de golpes);
// - mientras recarga salta tranquilo (~1 por segundo) y pasan nubes lentas de fondo;
// - al terminar todo se cierra suave y queda tapado por el contenido.
// Sin vibración. Con "reducir movimiento" no salta ni se mueven las nubes.
// En Android la pantalla no se estira (ahí queda el circulito nativo), así que no se dibuja.
export function PullBaifo({ refreshing }: { refreshing: boolean }) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const room = useSharedValue(0);
  const on = useSharedValue(0);
  const jump = useSharedValue(0);
  const sky = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      room.value = withTiming(ROOM, { duration: 450, easing: Easing.inOut(Easing.quad) });
      on.value = withTiming(1, { duration: 250 });
      if (!reduced) {
        // Empieza a saltar recién cuando ya se acomodó; sube 0,36 s, baja 0,36 s y descansa un instante.
        jump.value = withDelay(300, withRepeat(withSequence(
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 240 }),
        ), -1));
        sky.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
      }
      return;
    }
    room.value = withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) });
    on.value = withTiming(0, { duration: 350 });
    cancelAnimation(jump);
    jump.value = withTiming(0, { duration: 200 });
    cancelAnimation(sky);
  }, [refreshing, reduced, room, on, jump, sky]);

  const space = useAnimatedStyle(() => ({ height: room.value }));
  const stage = useAnimatedStyle(() => ({ top: room.value - SKY_H }));
  const baifo = useAnimatedStyle(() => {
    const p = Math.max(Math.min(1, Math.max(0, (pullDistance.value - 10) / (SHOW_AT - 10))), on.value);
    return {
      opacity: p,
      transform: [{ translateY: -JUMP * jump.value + (1 - p) * 10 }, { scale: 0.7 + 0.3 * p }],
    };
  });
  const cloudsFar = useAnimatedStyle(() => ({ transform: [{ translateX: -sky.value * width }] }));
  const cloudsNear = useAnimatedStyle(() => ({ transform: [{ translateX: -((sky.value * 2) % 1) * width }] }));

  if (Platform.OS !== 'ios') return null;
  return (
    <>
      <Animated.View style={space} />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ position: 'absolute', left: 0, width, height: SKY_H, overflow: 'hidden' }, stage]}
      >
        {/* Nubes: dos tiras repetidas que se deslizan lento (la de adelante un poco más rápido). */}
        <Animated.View style={[{ position: 'absolute', top: 40, left: 0, width: width * 2, height: SKY_H, flexDirection: 'row' }, cloudsFar]}>
          <Clouds width={width} height={SKY_H} seed={0} opacity={0.45} />
          <Clouds width={width} height={SKY_H} seed={0} opacity={0.45} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 70, left: 0, width: width * 2, height: SKY_H, flexDirection: 'row' }, cloudsNear]}>
          <Clouds width={width} height={SKY_H} seed={1} opacity={0.6} />
          <Clouds width={width} height={SKY_H} seed={1} opacity={0.6} />
        </Animated.View>

        <Animated.View style={[{ position: 'absolute', bottom: 4, left: 0, width, alignItems: 'center' }, baifo]}>
          <Image source={FESTEJA} resizeMode="contain" style={{ height: BAIFO_H, width: BAIFO_H * RATIO }} />
        </Animated.View>
      </Animated.View>
    </>
  );
}

// Nubes simples con el morado de las líneas de la app (#3A2C52), sin dibujos externos.
function Clouds({ width, height, seed, opacity }: { width: number; height: number; seed: number; opacity: number }) {
  const spots = seed === 0
    ? [[0.08, 0.1, 96], [0.62, 0.02, 84], [0.4, 0.3, 60]]
    : [[0.3, 0.18, 70], [0.82, 0.32, 58], [0.02, 0.38, 64]];
  return (
    <Svg width={width} height={height} style={{ opacity }}>
      {spots.map(([x, y, w], i) => (
        <G key={i} x={x * width} y={y * height} scale={w / 100}>
          <Ellipse cx={30} cy={30} rx={22} ry={13} fill="#3A2C52" />
          <Ellipse cx={52} cy={22} rx={20} ry={18} fill="#3A2C52" />
          <Ellipse cx={72} cy={31} rx={20} ry={12} fill="#3A2C52" />
          <Rect x={12} y={30} width={78} height={14} rx={7} fill="#3A2C52" />
        </G>
      ))}
    </Svg>
  );
}
