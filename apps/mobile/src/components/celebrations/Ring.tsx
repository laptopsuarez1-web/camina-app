import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, type EasingFunction, type EasingFunctionFactory, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import type { Timeline } from '@/components/challenge/ChallengeCinematics';

// Kit de los festejos: el fondo de la app, el verde de Camina como firma y el anillo (uno ancho verde claro y otro fino
// verde brillante con un punto blanco en la punta). Movimiento sobrio: sin rebotes, entradas que desaceleran.

// ---------- tema (oscuro o claro, según el teléfono) ----------
export type RingTheme = {
  dark: boolean; text: string; muted: string; faint: string; line: string; card: string;
  mint: string; arc: string; outer: string; inner: string; track: string; trackIn: string; glowOuter: number; glowInner: number; light: number;
  edge: string; seat: string; rowMe: string;
};
const DARK: RingTheme = {
  dark: true, text: '#FFFFFF', muted: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.38)',
  line: 'rgba(255,255,255,0.1)', card: 'rgba(255,255,255,0.05)', mint: '#62F0B6', arc: '#62F0B6', outer: '#86ECC6', inner: '#2FF0A0',
  track: 'rgba(255,255,255,0.07)', trackIn: 'rgba(255,255,255,0.055)', glowOuter: 0.13, glowInner: 0.3, light: 0.14,
  edge: '#1A1822', seat: '#26232F', rowMe: 'rgba(98,240,182,0.1)',
};
const LIGHT: RingTheme = {
  dark: false, text: '#0B0B0D', muted: 'rgba(11,11,13,0.58)', faint: 'rgba(11,11,13,0.36)',
  line: 'rgba(11,11,13,0.09)', card: 'rgba(255,255,255,0.6)', mint: '#0E9F6E', arc: '#2FD99A', outer: '#9DEFD0', inner: '#17C487',
  track: 'rgba(11,11,13,0.06)', trackIn: 'rgba(11,11,13,0.05)', glowOuter: 0.2, glowInner: 0.22, light: 0.12,
  edge: '#F8F6FC', seat: '#FFFFFF', rowMe: 'rgba(47,217,154,0.12)',
};
export function useRingTheme(): RingTheme {
  return useColorScheme().colorScheme === 'dark' ? DARK : LIGHT;
}

// Curvas: salida fuerte para lo que entra; ease-in-out para lo que se dibuja (el anillo).
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_DRAW = Easing.bezier(0.65, 0, 0.35, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

// Fondo de los festejos: el fondo de la app, con una luz verde muy suave que respira detrás del protagonista.
export function NightBackdrop({ glowTop = 0.3 }: { glowTop?: number }) {
  const t = useRingTheme();
  const b = useSharedValue(0);
  useEffect(() => {
    b.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(b);
  }, [b]);
  const a = useAnimatedStyle(() => ({ opacity: 0.6 + 0.4 * b.value, transform: [{ scale: 1 + 0.06 * b.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <AmbientBackground />
      <Animated.View style={[{ position: 'absolute', left: '-25%', right: '-25%', top: `${glowTop * 100 - 28}%`, aspectRatio: 1 }, a]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="luz" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#62F0B6" stopOpacity={t.light} />
              <Stop offset="1" stopColor="#62F0B6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#luz)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// Anillo de una sola línea (sin anillo interior ni brillo): el trazo verde sobre su pista, con el punto blanco en la punta.
export function SoloRing({ tl, delay, size, progress, duration = 1100, width = 10, children }: { tl: Timeline; delay: number; size: number; progress: number; duration?: number; width?: number; children?: ReactNode }) {
  const th = useRingTheme();
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const to = Math.max(0.002, Math.min(1, progress));
  const k = useTween(tl, delay, duration, EASE_DRAW);
  const line = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - to * k.value) }));
  const head = useAnimatedProps(() => {
    const a = -Math.PI / 2 + 2 * Math.PI * to * k.value;
    return { cx: size / 2 + r * Math.cos(a), cy: size / 2 + r * Math.sin(a), opacity: k.value > 0.02 && to * k.value < 0.995 ? 1 : 0 };
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={th.track} strokeWidth={width} fill="none" />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={th.arc} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={line} />
        </G>
        <AnimatedCircle r={width * 0.3} fill="#FFFFFF" animatedProps={head} />
      </Svg>
      {children}
    </View>
  );
}
