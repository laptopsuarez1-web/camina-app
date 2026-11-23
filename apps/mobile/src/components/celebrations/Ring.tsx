import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, type EasingFunction, type EasingFunctionFactory, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import type { Timeline } from '@/components/challenge/ChallengeCinematics';

// Kit de los festejos: fondo negro o blanco liso (según el teléfono), el verde de Camina como único color, y una media luna
// (un solo arco) para los momentos de ranking. Lenguaje de movimiento sobrio: sin rebotes, entradas que desaceleran.

// ---------- tema ----------
export type RingTheme = {
  dark: boolean; bg: string; text: string; muted: string; faint: string; line: string; card: string;
  mint: string; arc: string; track: string; edge: string; seat: string; rowMe: string;
};
const DARK: RingTheme = {
  dark: true, bg: '#000000', text: '#FFFFFF', muted: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.36)',
  line: 'rgba(255,255,255,0.09)', card: 'rgba(255,255,255,0.05)', mint: '#62F0B6', arc: '#62F0B6',
  track: 'rgba(255,255,255,0.1)', edge: '#000000', seat: '#141416', rowMe: 'rgba(98,240,182,0.1)',
};
const LIGHT: RingTheme = {
  dark: false, bg: '#FFFFFF', text: '#0B0B0D', muted: 'rgba(11,11,13,0.58)', faint: 'rgba(11,11,13,0.34)',
  line: 'rgba(11,11,13,0.08)', card: 'rgba(11,11,13,0.03)', mint: '#0E9F6E', arc: '#2FD99A',
  track: 'rgba(11,11,13,0.07)', edge: '#FFFFFF', seat: '#F4F4F5', rowMe: 'rgba(47,217,154,0.12)',
};
export function useRingTheme(): RingTheme {
  return useColorScheme().colorScheme === 'dark' ? DARK : LIGHT;
}

// Curva firma: salida fuerte para todo lo que entra.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Valor de 0 a 1 atado a la línea de tiempo (saltar lo deja en 1; reducir movimiento nace en 1).
export function useTween(tl: Timeline, delay: number, duration: number, easing: EasingFunction | EasingFunctionFactory = EASE_OUT) {
  const sv = useSharedValue(tl.reduced ? 1 : 0);
  useEffect(() => {
    tl.register(sv);
    if (tl.reduced) return;
    sv.value = withDelay(delay, withTiming(1, { duration, easing }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sv;
}

// Entrada estándar: se corre unos píxeles, se aclara y crece apenas.
export function Enter({ tl, delay, dy = 10, dx = 0, scale = 0.96, duration = 520, style, children }: { tl: Timeline; delay: number; dy?: number; dx?: number; scale?: number; duration?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useTween(tl, delay, duration);
  const a = useAnimatedStyle(() => ({
    opacity: k.value,
    transform: [{ translateX: (1 - k.value) * dx }, { translateY: (1 - k.value) * dy }, { scale: scale + (1 - scale) * k.value }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Fondo de los festejos: negro o blanco, liso.
export function NightBackdrop() {
  const t = useRingTheme();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.bg }} />;
}

// =====================================================================
// Media luna: un solo arco (la mitad de arriba de un círculo) que se dibuja de izquierda a derecha.
// =====================================================================

// Curva del trazo: arranca rápido y frena al llegar.
export const EASE_ARC = Easing.out(Easing.cubic);
// En qué fracción del tiempo el trazo llega a la fracción `t` del arco (inversa de la curva de arriba).
export const arcTime = (t: number) => 1 - Math.cbrt(1 - Math.min(1, Math.max(0, t)));

export type DomeGeo = { width: number; r: number; cx: number; cy: number; height: number };
export const domeGeo = (width: number, pad = 34): DomeGeo => {
  const r = width / 2 - pad;
  return { width, r, cx: width / 2, cy: r + pad, height: r + pad + 8 };
};
// Punto del arco: t = 0 a la izquierda, 0,5 arriba, 1 a la derecha. `inset` lo corre hacia adentro.
export const domePoint = (g: DomeGeo, t: number, inset = 0) => {
  const a = Math.PI * t;
  const r = g.r - inset;
  return { x: g.cx - r * Math.cos(a), y: g.cy - r * Math.sin(a), deg: (a * 180) / Math.PI };
};

export function Dome({ tl, delay, width, progress = 1, duration = 720, stroke = 8, children }: { tl: Timeline; delay: number; width: number; progress?: number; duration?: number; stroke?: number; children?: ReactNode }) {
  const th = useRingTheme();
  const g = domeGeo(width);
  const len = Math.PI * g.r;
  const to = Math.max(0.002, Math.min(1, progress));
  const k = useTween(tl, delay, duration, EASE_ARC);
  const d = `M${g.cx - g.r} ${g.cy} A${g.r} ${g.r} 0 0 1 ${g.cx + g.r} ${g.cy}`;
  const line = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - to * k.value) }));
  const head = useAnimatedProps(() => {
    const a = Math.PI * to * k.value;
    return { cx: g.cx - g.r * Math.cos(a), cy: g.cy - g.r * Math.sin(a), opacity: k.value > 0.01 ? 1 : 0 };
  });
  return (
    <View style={{ width: g.width, height: g.height }}>
      <Svg width={g.width} height={g.height} style={{ position: 'absolute' }}>
        <Path d={d} stroke={th.track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <AnimatedPath d={d} stroke={th.arc} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={line} />
        <AnimatedCircle r={stroke * 0.32} fill="#FFFFFF" animatedProps={head} />
      </Svg>
      {children}
    </View>
  );
}
