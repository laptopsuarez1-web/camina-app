import { useEffect } from 'react';
import { Image, Platform, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { PULL_FULL_AT, pullDistance } from '@/store/useRefreshStore';
import { colors } from '@/theme/tokens';
import { WORDMARK_FAMILY, brandFontsReady } from '@/theme/fonts';

const FESTEJA = require('@/../assets/baifo/festeja.webp');
const RATIO = 287 / 420;
const BAIFO_H = 68;
const WORD_H = 46; // alto de la franja de la palabra CAMINA
const ROOM = WORD_H + BAIFO_H + 18; // lugar que se abre arriba mientras recarga: todo queda bajo la barra de estado
const SKY_H = ROOM + 70; // alto del cielo con nubes (también cubre lo que se estira de más)
const JUMP = 14;

// "Tirar para actualizar" en iPhone. Vive justo ARRIBA del contenido (primer hijo del ScrollView) y se mueve con él:
// - al estirar, la palabra CAMINA se pinta de menta de izquierda a derecha (y vibra suave al llenarse, ver PULL_SCROLL);
// - mientras recarga se abre lugar, el Baifo salta sobre CAMINA y pasan nubes lentas de fondo;
// - al terminar se cierra el lugar y todo queda tapado por el contenido.
// Reanimated en el hilo de la UI, sin módulos nativos. Con "reducir movimiento" no salta ni se mueven las nubes.
// En Android la pantalla no se estira (ahí queda el circulito nativo), así que no se dibuja.
export function PullBaifo({ refreshing }: { refreshing: boolean }) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const room = useSharedValue(0);
  const full = useSharedValue(0);
  const jump = useSharedValue(0);
  const sky = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      room.value = withTiming(ROOM, { duration: 300, easing: Easing.out(Easing.cubic) });
      full.value = 1;
      if (!reduced) {
        // Salto de velocidad media: sube 0,36 s, baja 0,36 s y descansa un instante en el piso.
        jump.value = withRepeat(withSequence(
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 240 }),
        ), -1);
        sky.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
      }
      return;
    }
    room.value = withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) });
    cancelAnimation(jump);
    jump.value = withTiming(0, { duration: 160 });
    cancelAnimation(sky);
    const id = setTimeout(() => { full.value = 0; }, 400);
    return () => clearTimeout(id);
  }, [refreshing, reduced, room, full, jump, sky]);

  const space = useAnimatedStyle(() => ({ height: room.value }));
  // Todo el conjunto se apoya en el borde de arriba del contenido (que baja con `room`).
  const stage = useAnimatedStyle(() => ({ top: room.value - SKY_H }));
  const fill = useAnimatedStyle(() => {
    const x = Math.min(1, Math.max(0, (pullDistance.value - 20) / (PULL_FULL_AT - 20)));
    return { width: Math.max(x, full.value) * width };
  });
  const baifo = useAnimatedStyle(() => ({ transform: [{ translateY: -JUMP * jump.value }] }));
  const cloudsFar = useAnimatedStyle(() => ({ transform: [{ translateX: -sky.value * width }] }));
  const cloudsNear = useAnimatedStyle(() => ({ transform: [{ translateX: -((sky.value * 2) % 1) * width }] }));

  if (Platform.OS !== 'ios') return null;
  const word = (color: string) => (
    <Text
      allowFontScaling={false}
      style={{
        width, textAlign: 'center', color, fontSize: 36, lineHeight: 42, letterSpacing: 2,
        ...(brandFontsReady() ? { fontFamily: WORDMARK_FAMILY, fontWeight: 'normal' as const } : { fontWeight: '900' as const }),
      }}
    >
      CAMINA
    </Text>
  );
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
        <Animated.View style={[{ position: 'absolute', top: 8, left: 0, width: width * 2, height: SKY_H, flexDirection: 'row' }, cloudsFar]}>
          <Clouds width={width} height={SKY_H} seed={0} opacity={0.45} />
          <Clouds width={width} height={SKY_H} seed={0} opacity={0.45} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 30, left: 0, width: width * 2, height: SKY_H, flexDirection: 'row' }, cloudsNear]}>
          <Clouds width={width} height={SKY_H} seed={1} opacity={0.6} />
          <Clouds width={width} height={SKY_H} seed={1} opacity={0.6} />
        </Animated.View>

        <Animated.View style={[{ position: 'absolute', bottom: WORD_H + 2, left: 0, width, alignItems: 'center' }, baifo]}>
          <Image source={FESTEJA} resizeMode="contain" style={{ height: BAIFO_H, width: BAIFO_H * RATIO }} />
        </Animated.View>

        {/* CAMINA apagado y, encima, la versión menta recortada de izquierda a derecha. */}
        <View style={{ position: 'absolute', bottom: 4, left: 0, width, height: 42 }}>
          {word('rgba(240,235,250,0.13)')}
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, height: 42, overflow: 'hidden' }, fill]}>
            {word(colors.mint)}
          </Animated.View>
        </View>
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
