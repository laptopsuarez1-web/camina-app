import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import type { Timeline } from '@/components/challenge/ChallengeCinematics';

// El anillo de Camina como pieza de motion: el mismo anillo doble de la app (uno ancho verde claro y otro fino verde
// brillante con un punto blanco en la punta), con brillo. Es la firma de todos los festejos.
// Lenguaje de movimiento ("Premium"): sin rebotes; un solo curva para casi todo; entradas que desaceleran.

// ---------- tema: negro (modo oscuro) o blanco (modo claro); el verde del anillo es siempre la firma ----------
export type RingTheme = {
  dark: boolean; bg: [string, string, string]; text: string; muted: string; faint: string; line: string; card: string;
  mint: string; outer: string; inner: string; track: string; trackIn: string; glowOuter: number; glowInner: number; light: number;
  edge: string; seat: string; avatar: [string, string]; avatarInk: string; rowMe: string;
};
const DARK: RingTheme = {
  dark: true, bg: ['#101013', '#070708', '#000000'], text: '#FFFFFF', muted: 'rgba(255,255,255,0.6)', faint: 'rgba(255,255,255,0.36)',
  line: 'rgba(255,255,255,0.08)', card: 'rgba(255,255,255,0.04)', mint: '#62F0B6', outer: '#86ECC6', inner: '#2FF0A0',
  track: 'rgba(255,255,255,0.07)', trackIn: 'rgba(255,255,255,0.055)', glowOuter: 0.13, glowInner: 0.3, light: 0.16,
  edge: '#060607', seat: '#0d0d10', avatar: ['#3b3b44', '#1d1d23'], avatarInk: '#FFFFFF', rowMe: 'rgba(98,240,182,0.08)',
};
const LIGHT: RingTheme = {
  dark: false, bg: ['#FFFFFF', '#F8F8F6', '#EFEFEC'], text: '#0B0B0D', muted: 'rgba(11,11,13,0.56)', faint: 'rgba(11,11,13,0.34)',
  line: 'rgba(11,11,13,0.08)', card: 'rgba(11,11,13,0.025)', mint: '#12976A', outer: '#9DEFD0', inner: '#17C487',
  track: 'rgba(11,11,13,0.06)', trackIn: 'rgba(11,11,13,0.05)', glowOuter: 0.2, glowInner: 0.22, light: 0.14,
  edge: '#FAFAF9', seat: '#FFFFFF', avatar: ['#ECECF0', '#DCDCE3'], avatarInk: '#0B0B0D', rowMe: 'rgba(23,196,135,0.09)',
};
export function useRingTheme(): RingTheme {
  return useColorScheme().colorScheme === 'dark' ? DARK : LIGHT;
}
// Compatibilidad: valores fijos del tema oscuro.
export const NIGHT = DARK;

// Curvas: salida fuerte para lo que entra; ease-in-out para lo que se dibuja en pantalla (el anillo).
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_DRAW = Easing.bezier(0.65, 0, 0.35, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Valor de 0 a 1 con la curva que se pida, atado a la línea de tiempo (saltar lo deja en 1; reducir movimiento nace en 1).
export function useTween(tl: Timeline, delay: number, duration: number, easing = EASE_OUT) {
  const sv = useSharedValue(tl.reduced ? 1 : 0);
  useEffect(() => {
    tl.register(sv);
    if (tl.reduced) return;
    sv.value = withDelay(delay, withTiming(1, { duration, easing }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sv;
}

// Entrada: sube 10 px, se aclara y pasa de 0,96 a 1 de tamaño. La entrada estándar de todo festejo.
export function Enter({ tl, delay, dy = 10, scale = 0.96, duration = 620, style, children }: { tl: Timeline; delay: number; dy?: number; scale?: number; duration?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useTween(tl, delay, duration);
  const a = useAnimatedStyle(() => ({
    opacity: k.value,
    transform: [{ translateY: (1 - k.value) * dy }, { scale: scale + (1 - scale) * k.value }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Fondo de los festejos: negro o blanco liso con una luz verde muy suave que respira detrás del protagonista.
export function NightBackdrop({ glowTop = 0.34 }: { glowTop?: number }) {
  const t = useRingTheme();
  const b = useSharedValue(0);
  useEffect(() => {
    b.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(b);
  }, [b]);
  const a = useAnimatedStyle(() => ({ opacity: 0.6 + 0.4 * b.value, transform: [{ scale: 1 + 0.06 * b.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient colors={t.bg} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
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

// ---------- el anillo ----------
type RingProps = {
  tl: Timeline;
  delay: number;
  size: number;
  progress: number; // 0 a 1: hasta dónde se dibuja
  duration?: number;
  width?: number; // grosor del anillo ancho
  dim?: boolean; // anillo secundario (podio): más apagado
  onClose?: { at: number }; // si llega a 1, destello de cierre a los `at` ms
  children?: ReactNode;
};

export function CaminaRing({ tl, delay, size, progress, duration = 1400, width, dim, onClose, children }: RingProps) {
  const th = useRingTheme();
  const gO = th.glowOuter;
  const gI = th.glowInner;
  const w = width ?? Math.max(6, size * 0.052);
  const rOut = (size - w * 2.6) / 2;
  const wIn = Math.max(2.5, w * 0.4);
  const rIn = rOut - w * 1.35;
  const cOut = 2 * Math.PI * rOut;
  const cIn = 2 * Math.PI * rIn;
  const k = useTween(tl, delay, duration, EASE_DRAW);
  const kIn = useTween(tl, delay + 120, duration, EASE_DRAW);
  const to = Math.max(0.002, Math.min(1, progress));
  const outer = useAnimatedProps(() => ({ strokeDashoffset: cOut * (1 - to * k.value) }));
  const glow = useAnimatedProps(() => ({ strokeDashoffset: cOut * (1 - to * k.value), strokeOpacity: (dim ? gO * 0.4 : gO) * k.value }));
  const inner = useAnimatedProps(() => ({ strokeDashoffset: cIn * (1 - to * kIn.value) }));
  const innerGlow = useAnimatedProps(() => ({ strokeDashoffset: cIn * (1 - to * kIn.value), strokeOpacity: (dim ? gI * 0.4 : gI) * kIn.value }));
  // Punto blanco en la punta del anillo fino.
  const head = useAnimatedProps(() => {
    const a = -Math.PI / 2 + 2 * Math.PI * to * kIn.value;
    return { cx: size / 2 + rIn * Math.cos(a), cy: size / 2 + rIn * Math.sin(a), opacity: kIn.value > 0.02 && to * kIn.value < 0.995 ? 1 : 0 };
  });
  const headHalo = useAnimatedProps(() => {
    const a = -Math.PI / 2 + 2 * Math.PI * to * kIn.value;
    return { cx: size / 2 + rIn * Math.cos(a), cy: size / 2 + rIn * Math.sin(a), opacity: kIn.value > 0.02 && to * kIn.value < 0.995 ? 0.35 : 0 };
  });
  const o = dim ? 0.6 : 1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {onClose && to >= 1 ? <CloseFlash tl={tl} at={onClose.at} size={size} /> : null}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={rOut} stroke={th.track} strokeWidth={w} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={rIn} stroke={th.trackIn} strokeWidth={wIn} fill="none" />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rOut} stroke={th.outer} strokeWidth={w * 2} fill="none" strokeLinecap="round" strokeDasharray={`${cOut} ${cOut}`} animatedProps={glow} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rOut} stroke={th.outer} strokeOpacity={o} strokeWidth={w} fill="none" strokeLinecap="round" strokeDasharray={`${cOut} ${cOut}`} animatedProps={outer} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rIn} stroke={th.inner} strokeWidth={wIn * 3} fill="none" strokeLinecap="round" strokeDasharray={`${cIn} ${cIn}`} animatedProps={innerGlow} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rIn} stroke={th.inner} strokeOpacity={o} strokeWidth={wIn} fill="none" strokeLinecap="round" strokeDasharray={`${cIn} ${cIn}`} animatedProps={inner} />
        </G>
        <AnimatedCircle r={wIn * 1.7} fill="#FFFFFF" animatedProps={headHalo} />
        <AnimatedCircle r={wIn * 0.95} fill="#FFFFFF" animatedProps={head} />
      </Svg>
      {children}
    </View>
  );
}

// Cierre del anillo: una onda fina que se abre y se apaga, y una luz que sube y baja una vez. Sin chispas.
function CloseFlash({ tl, at, size }: { tl: Timeline; at: number; size: number }) {
  const r = useSharedValue(0);
  const g = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    r.value = withDelay(at, withTiming(1, { duration: 1100, easing: EASE_OUT }));
    g.value = withDelay(at, withSequence(withTiming(1, { duration: 260, easing: EASE_OUT }), withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.sin) })));
    tl.onSkip(() => { cancelAnimation(r); cancelAnimation(g); r.value = 1; g.value = 0.35; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wave = useAnimatedStyle(() => ({ opacity: r.value > 0 && r.value < 1 ? 0.55 * (1 - r.value) : 0, transform: [{ scale: 0.96 + 0.3 * r.value }] }));
  const light = useAnimatedStyle(() => ({ opacity: g.value }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size * 1.5, height: size * 1.5 }, light]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="cierre" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0.45" stopColor="#62F0B6" stopOpacity="0" />
              <Stop offset="0.62" stopColor="#62F0B6" stopOpacity="0.28" />
              <Stop offset="1" stopColor="#62F0B6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#cierre)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#62F0B6' }, wave]} />
    </>
  );
}

// Punto de un anillo (para colocar caras sobre la circunferencia): ángulo 0 = arriba, en sentido horario.
export const onRing = (size: number, r: number, t: number) => {
  const a = -Math.PI / 2 + 2 * Math.PI * t;
  return { x: size / 2 + r * Math.cos(a), y: size / 2 + r * Math.sin(a) };
};

// Radio del anillo ancho, para quien necesita ubicar cosas sobre él.
export const ringRadius = (size: number, width?: number) => {
  const w = width ?? Math.max(6, size * 0.052);
  return (size - w * 2.6) / 2;
};

export type { SharedValue };
