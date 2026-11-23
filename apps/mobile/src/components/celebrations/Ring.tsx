import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, type EasingFunction, type EasingFunctionFactory, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from 'react-native-svg';
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
const VIOLET: RingTheme = {
  dark: true, bg: ['#2a0f6b', '#170640', '#0a0222'], text: '#FFFFFF', muted: 'rgba(236,230,255,0.66)', faint: 'rgba(236,230,255,0.4)',
  line: 'rgba(255,255,255,0.09)', card: 'rgba(255,255,255,0.05)', mint: '#62F0B6', outer: '#86ECC6', inner: '#2FF0A0',
  track: 'rgba(255,255,255,0.08)', trackIn: 'rgba(255,255,255,0.06)', glowOuter: 0.16, glowInner: 0.3, light: 0.2,
  edge: '#1b0848', seat: '#22105a', avatar: ['#6a3be0', '#3a1890'], avatarInk: '#FFFFFF', rowMe: 'rgba(98,240,182,0.1)',
};
const DARK = VIOLET;
// Los festejos son un momento de marca: violeta y verde en los dos modos del teléfono.
export function useRingTheme(): RingTheme {
  useColorScheme();
  return VIOLET;
}
// Compatibilidad: valores fijos del tema oscuro.
export const NIGHT = DARK;

// Curvas: salida fuerte para lo que entra; ease-in-out para lo que se dibuja en pantalla (el anillo).
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_DRAW = Easing.bezier(0.65, 0, 0.35, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Valor de 0 a 1 con la curva que se pida, atado a la línea de tiempo (saltar lo deja en 1; reducir movimiento nace en 1).
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

// =====================================================================
// Media luna: un solo arco (la mitad de arriba de un círculo) que se dibuja de izquierda a derecha mientras las huellas de
// Camina caminan sobre él. Es la firma de los festejos: se reconoce CAMINA sin leer el nombre.
// =====================================================================

const FOOT_L = require('@/../assets/pie-izq-mint.png');
const FOOT_R = require('@/../assets/pie-der-mint.png');

// Curva del trazo: arranca rápido y frena al llegar (nada de esperas al principio).
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

function Foot({ tl, at, g, t, left }: { tl: Timeline; at: number; g: DomeGeo; t: number; left: boolean }) {
  const k = useTween(tl, at, 320);
  const p = domePoint(g, t, 24 + (left ? 5 : -5));
  const a = useAnimatedStyle(() => ({ opacity: 0.9 * k.value, transform: [{ rotate: `${p.deg}deg` }, { scale: 0.7 + 0.3 * k.value }] }));
  const W = 11;
  const H = 21;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: p.x - W / 2, top: p.y - H / 2, width: W, height: H }, a]}>
      <Animated.Image source={left ? FOOT_L : FOOT_R} style={{ width: W, height: H, opacity: 0.85 }} resizeMode="contain" />
    </Animated.View>
  );
}

type DomeProps = {
  tl: Timeline; delay: number; width: number; progress?: number; duration?: number;
  steps?: number; // cuántas huellas caminan sobre el arco
  stroke?: number;
  glowAt?: number; // si el arco se completa, luz de cierre a los `glowAt` ms
  children?: ReactNode;
};

export function Dome({ tl, delay, width, progress = 1, duration = 720, steps = 0, stroke = 9, glowAt, children }: DomeProps) {
  const th = useRingTheme();
  const g = domeGeo(width);
  const len = Math.PI * g.r;
  const to = Math.max(0.002, Math.min(1, progress));
  const k = useTween(tl, delay, duration, EASE_ARC);
  const d = `M${g.cx - g.r} ${g.cy} A${g.r} ${g.r} 0 0 1 ${g.cx + g.r} ${g.cy}`;
  const line = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - to * k.value) }));
  const glow = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - to * k.value), strokeOpacity: 0.22 * k.value }));
  const head = useAnimatedProps(() => {
    const a = Math.PI * to * k.value;
    return { cx: g.cx - g.r * Math.cos(a), cy: g.cy - g.r * Math.sin(a), opacity: k.value > 0.01 ? 1 : 0 };
  });
  const halo = useAnimatedProps(() => {
    const a = Math.PI * to * k.value;
    return { cx: g.cx - g.r * Math.cos(a), cy: g.cy - g.r * Math.sin(a), opacity: k.value > 0.01 ? 0.3 : 0 };
  });
  const feet = Array.from({ length: steps }, (_, i) => (i + 0.6) / (steps + 0.2)).filter((t) => t <= to);
  return (
    <View style={{ width: g.width, height: g.height }}>
      {glowAt != null && to >= 1 ? <DomeGlow tl={tl} at={glowAt} g={g} /> : null}
      <Svg width={g.width} height={g.height} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="arco" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={th.outer} stopOpacity="0.55" />
            <Stop offset="0.5" stopColor={th.outer} />
            <Stop offset="1" stopColor={th.inner} />
          </SvgGradient>
        </Defs>
        <Path d={d} stroke={th.track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <AnimatedPath d={d} stroke={th.outer} strokeWidth={stroke * 2.6} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={glow} />
        <AnimatedPath d={d} stroke="url(#arco)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={line} />
        <AnimatedCircle r={stroke * 1.15} fill="#FFFFFF" animatedProps={halo} />
        <AnimatedCircle r={stroke * 0.5} fill="#FFFFFF" animatedProps={head} />
      </Svg>
      {feet.map((t, i) => (
        <Foot key={i} tl={tl} at={delay + duration * arcTime(t / to) * 0.98} g={g} t={t} left={i % 2 === 0} />
      ))}
      {children}
    </View>
  );
}

// Luz de cierre de la media luna: un resplandor verde que sube desde el arco y se asienta.
function DomeGlow({ tl, at, g }: { tl: Timeline; at: number; g: DomeGeo }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) { v.value = 0.5; return; }
    v.value = withDelay(at, withSequence(withTiming(1, { duration: 240, easing: EASE_OUT }), withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) })));
    tl.onSkip(() => { cancelAnimation(v); v.value = 0.5; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.92 + 0.08 * v.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -g.width * 0.15, top: -g.r * 0.3, width: g.width * 1.3, height: g.height * 1.3 }, a]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="domo" cx="50" cy="62" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#62F0B6" stopOpacity="0.26" />
            <Stop offset="0.7" stopColor="#62F0B6" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#62F0B6" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="62" r="50" fill="url(#domo)" />
      </Svg>
    </Animated.View>
  );
}
