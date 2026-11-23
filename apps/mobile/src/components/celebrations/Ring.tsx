import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { Timeline } from '@/components/challenge/ChallengeCinematics';

// El anillo de Camina como pieza de motion: el mismo anillo doble de la app (uno ancho verde claro y otro fino verde
// brillante con un punto blanco en la punta), con brillo. Es la firma de todos los festejos.
// Lenguaje de movimiento ("Premium"): sin rebotes; un solo curva para casi todo; entradas que desaceleran.

// ---------- constantes de marca ----------
export const NIGHT = {
  bg: ['#1d0d48', '#130634', '#07021a'] as [string, string, string],
  text: '#FFFFFF',
  muted: 'rgba(236,230,255,0.62)',
  faint: 'rgba(236,230,255,0.38)',
  line: 'rgba(255,255,255,0.09)',
  card: 'rgba(255,255,255,0.045)',
  mint: '#62F0B6',
  outer: '#86ECC6',
  inner: '#2FF0A0',
};
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

// Fondo de noche de los festejos: degradé morado y una luz verde que respira lento detrás del protagonista.
export function NightBackdrop({ glowTop = 0.36 }: { glowTop?: number }) {
  const b = useSharedValue(0);
  useEffect(() => {
    b.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(b);
  }, [b]);
  const a = useAnimatedStyle(() => ({ opacity: 0.55 + 0.25 * b.value, transform: [{ scale: 1 + 0.06 * b.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient colors={NIGHT.bg} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View style={[{ position: 'absolute', left: '-30%', right: '-30%', top: `${glowTop * 100 - 30}%`, aspectRatio: 1 }, a]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="luz" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#62F0B6" stopOpacity="0.20" />
              <Stop offset="0.45" stopColor="#5B2BD6" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#5B2BD6" stopOpacity="0" />
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
  const glow = useAnimatedProps(() => ({ strokeDashoffset: cOut * (1 - to * k.value), strokeOpacity: (dim ? 0.05 : 0.13) * k.value }));
  const inner = useAnimatedProps(() => ({ strokeDashoffset: cIn * (1 - to * kIn.value) }));
  const innerGlow = useAnimatedProps(() => ({ strokeDashoffset: cIn * (1 - to * kIn.value), strokeOpacity: (dim ? 0.12 : 0.3) * kIn.value }));
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
        <Circle cx={size / 2} cy={size / 2} r={rOut} stroke="rgba(255,255,255,0.07)" strokeWidth={w} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={rIn} stroke="rgba(255,255,255,0.06)" strokeWidth={wIn} fill="none" />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rOut} stroke={NIGHT.outer} strokeWidth={w * 2} fill="none" strokeLinecap="round" strokeDasharray={`${cOut} ${cOut}`} animatedProps={glow} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rOut} stroke={NIGHT.outer} strokeOpacity={o} strokeWidth={w} fill="none" strokeLinecap="round" strokeDasharray={`${cOut} ${cOut}`} animatedProps={outer} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rIn} stroke={NIGHT.inner} strokeWidth={wIn * 3} fill="none" strokeLinecap="round" strokeDasharray={`${cIn} ${cIn}`} animatedProps={innerGlow} />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={rIn} stroke={NIGHT.inner} strokeOpacity={o} strokeWidth={wIn} fill="none" strokeLinecap="round" strokeDasharray={`${cIn} ${cIn}`} animatedProps={inner} />
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
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: NIGHT.mint }, wave]} />
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
