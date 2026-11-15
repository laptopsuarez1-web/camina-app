import { useEffect } from 'react';
import { useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue,
} from 'react-native-reanimated';

// Efectos de festejo compartidos por todas las celebraciones. Todo corre en el hilo de la UI (Reanimated)
// y con "reducir movimiento" no se dibuja nada.

// Número "al azar" pero fijo por pieza, para que cada festejo se vea igual y no salte entre renders.
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------
// Confeti: dos cañones desde las esquinas de abajo. Los papelitos suben rápido, frenan con el aire,
// caen despacio balanceándose y dan vueltas como papel de verdad. Parejo a los dos lados de la pantalla.
// ---------------------------------------------------------------------

const CONFETTI_MS = 4200;
const G = 650; // gravedad (px/s²)
const DRAG = 3.2; // freno del aire

type Paper = { side: -1 | 1; vx: number; vy: number; w: number; h: number; round: boolean; color: string; spin: number; flip: number; sway: number; phase: number; lag: number };

function papers(count: number, palette: string[]): Paper[] {
  return Array.from({ length: count }, (_, i) => {
    const side = (i % 2 ? 1 : -1) as -1 | 1;
    const kind = i % 5; // 0-2 papel, 3 cinta fina, 4 punto
    const w = kind === 3 ? 4 : kind === 4 ? 7 : 8 + rnd(i, 1) * 4;
    const h = kind === 3 ? 16 + rnd(i, 2) * 6 : kind === 4 ? 7 : 11 + rnd(i, 3) * 6;
    return {
      side, w, h, round: kind === 4,
      vx: 260 + rnd(i, 4) * 900,
      vy: 1900 + rnd(i, 5) * 1150,
      color: palette[i % palette.length],
      spin: (rnd(i, 6) > 0.5 ? 1 : -1) * (220 + rnd(i, 7) * 420),
      flip: 5 + rnd(i, 8) * 9,
      sway: 8 + rnd(i, 9) * 18,
      phase: rnd(i, 10) * Math.PI * 2,
      lag: rnd(i, 11) * 0.12,
    };
  });
}

function PaperPiece({ k, p, W, H }: { k: SharedValue<number>; p: Paper; W: number; H: number }) {
  const scale = H / 850;
  const a = useAnimatedStyle(() => {
    const total = CONFETTI_MS / 1000;
    const t = Math.max(0, k.value * total - p.lag);
    if (t <= 0) return { opacity: 0 };
    const e = 1 - Math.exp(-DRAG * t);
    const x0 = p.side < 0 ? -12 : W + 12;
    const x = x0 - p.side * (p.vx / DRAG) * e * Math.min(1.25, W / 390) + Math.sin(t * 3.1 + p.phase) * p.sway * Math.min(1, t * 1.5);
    const up = ((p.vy + G / DRAG) / DRAG) * e - (G / DRAG) * t;
    const y = H * 0.96 - up * scale;
    const left = total - p.lag - t;
    return {
      opacity: left < 0.7 ? Math.max(0, left / 0.7) : 1,
      transform: [
        { translateX: x - p.w / 2 },
        { translateY: y - p.h / 2 },
        { rotate: `${p.spin * t}deg` },
        { scaleY: p.round ? 1 : Math.cos(t * p.flip + p.phase) },
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, borderRadius: p.round ? p.w / 2 : 2, backgroundColor: p.color, opacity: 0 }, a]} />;
}

// `k` va de 0 a 1 en CONFETTI_MS (lo maneja quien lo usa) o, sin `k`, arranca solo a los `delay` ms.
export function ConfettiCannons({ palette, delay = 0, count = 64, k: ext, onSkip }: { palette: string[]; delay?: number; count?: number; k?: SharedValue<number>; onSkip?: (fn: () => void) => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const own = useSharedValue(0);
  const k = ext ?? own;
  useEffect(() => {
    if (reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: CONFETTI_MS, easing: Easing.linear }));
    onSkip?.(() => { cancelAnimation(k); k.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (reduced) return null;
  const list = papers(count, palette);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, zIndex: 50 }}>
      {list.map((p, i) => <PaperPiece key={i} k={k} p={p} W={W} H={H} />)}
    </View>
  );
}

// ---------------------------------------------------------------------
// Destello: una luz suave que se abre, rayitas que salen del centro y se achican,
// puntitos que se dispersan y cuatro brillos en cruz. Siempre centrado en el punto donde se pone.
// ---------------------------------------------------------------------

function Ray({ k, angle, radius, color, len }: { k: SharedValue<number>; angle: number; radius: number; color: string; len: number }) {
  const a = useAnimatedStyle(() => {
    const t = Math.min(1, k.value / 0.55);
    const out = 1 - Math.pow(1 - t, 3);
    return {
      opacity: t <= 0 || t >= 1 ? 0 : t < 0.15 ? t / 0.15 : 1,
      transform: [{ rotate: `${angle}rad` }, { translateX: radius * (0.42 + 0.58 * out) }, { scaleX: Math.max(0.01, 1 - out) }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -len / 2, top: -1.75, width: len, height: 3.5, borderRadius: 2, backgroundColor: color, opacity: 0 }, a]} />;
}

function Dot({ k, angle, dist, size, color, fall }: { k: SharedValue<number>; angle: number; dist: number; size: number; color: string; fall: number }) {
  const a = useAnimatedStyle(() => {
    const t = k.value;
    const out = 1 - Math.pow(1 - Math.min(1, t * 1.3), 3);
    return {
      opacity: t <= 0.02 || t >= 1 ? 0 : t > 0.6 ? (1 - t) / 0.4 : 1,
      transform: [
        { translateX: Math.cos(angle) * dist * out },
        { translateY: Math.sin(angle) * dist * out + fall * t * t },
        { scale: 1 - t * 0.5 },
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0 }, a]} />;
}

function Twinkle({ k, x, y, size, color, at }: { k: SharedValue<number>; x: number; y: number; size: number; color: string; at: number }) {
  const a = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (k.value - at) / 0.45));
    const s = Math.sin(t * Math.PI);
    return { opacity: t <= 0 || t >= 1 ? 0 : 1, transform: [{ translateX: x }, { translateY: y }, { rotate: `${t * 90}deg` }, { scale: s }] };
  });
  const arm = { position: 'absolute' as const, backgroundColor: color, borderRadius: size };
  return (
    <Animated.View style={[{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, opacity: 0 }, a]}>
      <View style={{ ...arm, left: size / 2 - 1.25, top: 0, width: 2.5, height: size }} />
      <View style={{ ...arm, top: size / 2 - 1.25, left: 0, height: 2.5, width: size }} />
      <View style={{ position: 'absolute', left: size / 2 - 2.5, top: size / 2 - 2.5, width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
    </Animated.View>
  );
}

// Dibuja el destello según `k` (0 a 1). Se usa con BurstFx (arranca solo) o con el Burst de las escenas.
export function BurstCore({ k, palette, radius = 100, count = 12 }: { k: SharedValue<number>; palette: string[]; radius?: number; count?: number }) {
  const glow = useAnimatedStyle(() => {
    const t = k.value;
    return { opacity: t <= 0 || t >= 0.6 ? 0 : t < 0.1 ? (t / 0.1) * 0.32 : 0.32 * (1 - (t - 0.1) / 0.5), transform: [{ scale: 0.35 + t * 1.3 }] };
  });
  const rays = 10;
  const dots = Math.max(8, count);
  return (
    <>
      <Animated.View style={[{ position: 'absolute', width: radius * 1.3, height: radius * 1.3, left: -radius * 0.65, top: -radius * 0.65, borderRadius: radius, backgroundColor: palette[0], opacity: 0 }, glow]} />
      {Array.from({ length: rays }, (_, i) => (
        <Ray key={`r${i}`} k={k} angle={(i / rays) * Math.PI * 2 - Math.PI / 2} radius={radius} len={radius * 0.32} color={palette[i % palette.length]} />
      ))}
      {Array.from({ length: dots }, (_, i) => (
        <Dot key={`d${i}`} k={k} angle={(i / dots) * Math.PI * 2 + rnd(i, 20) * 0.6} dist={radius * (0.75 + rnd(i, 21) * 0.55)} size={3 + rnd(i, 22) * 4} color={palette[(i + 1) % palette.length]} fall={18 + rnd(i, 23) * 26} />
      ))}
      <Twinkle k={k} x={-radius * 0.78} y={-radius * 0.5} size={16} color={palette[0]} at={0.12} />
      <Twinkle k={k} x={radius * 0.82} y={-radius * 0.32} size={12} color={palette[1 % palette.length]} at={0.2} />
      <Twinkle k={k} x={radius * 0.6} y={radius * 0.7} size={14} color={palette[0]} at={0.28} />
      <Twinkle k={k} x={-radius * 0.55} y={radius * 0.62} size={10} color={palette[2 % palette.length]} at={0.34} />
    </>
  );
}

export const BURST_MS = 1300;

// Destello que arranca solo a los `delay` ms (para las hojas y avisos que no usan la línea de tiempo de escenas).
export function BurstFx({ delay = 0, palette, radius = 100, count = 12, style }: { delay?: number; palette: string[]; radius?: number; count?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: BURST_MS, easing: Easing.linear }));
    return () => cancelAnimation(k);
  }, [delay, k, reduced]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 0, height: 0 }, style]}>
      <BurstCore k={k} palette={palette} radius={radius} count={count} />
    </View>
  );
}
