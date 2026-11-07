import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Share, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { Press } from '@/components/ui/Press';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Coin } from '@/components/ui/Coin';
import { Trophy } from '@/components/icons';
import { CrownMark } from '@/components/CrownMark';
import { colors } from '@/theme/tokens';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';
import { buzz } from '@/lib/haptics';

// Cinemáticas de los desafíos de grupo: crear (boleto con sello EN MARCHA), sumarse (tu foto entra al aro y tus Puntos al bote)
// y terminar (podio; con corona y monedas si ganaste, más calmo si no). Todo corre en el hilo de UI con Reanimated.
// Tocar el fondo salta al final. Con "reducir movimiento" no hay vuelos ni chispas: la escena final aparece con un fundido.

export const GOLD = '#E2B33C';
export const GOLD_SPARKS = ['#E2B33C', '#FFD97A', '#FFF1B8'];
export const CAMINA_SPARKS = [colors.aqua, GOLD, '#B7A6F0', colors.warn];
export const EASE = Easing.out(Easing.cubic);
export const SPRING = { damping: 11, stiffness: 160, mass: 0.8 };
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type CinePerson = { id: string; name: string; photoUrl?: string | null };

// ---------- línea de tiempo de una escena ----------

export type Timeline = {
  reduced: boolean;
  register: (sv: SharedValue<number>) => void;
  onSkip: (fn: () => void) => void;
  at: (ms: number, fn: () => void) => void;
  skip: () => void;
  playing: boolean;
};

export function useTimeline(totalMs: number): Timeline {
  const reduced = useReducedMotion();
  const values = useRef<SharedValue<number>[]>([]);
  const finishers = useRef<(() => void)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [playing, setPlaying] = useState(!reduced);
  useEffect(() => {
    const id = setTimeout(() => setPlaying(false), reduced ? 0 : totalMs);
    const list = timers.current;
    return () => {
      clearTimeout(id);
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    reduced,
    playing,
    register: (sv) => { values.current.push(sv); },
    onSkip: (fn) => { finishers.current.push(fn); },
    at: (ms, fn) => { timers.current.push(setTimeout(fn, reduced ? 0 : ms)); },
    skip: () => {
      values.current.forEach((sv) => { cancelAnimation(sv); sv.value = 1; });
      timers.current.forEach(clearTimeout);
      timers.current = [];
      finishers.current.forEach((fn) => fn());
      setPlaying(false);
    },
  };
}

// Un "golpe" de la escena: valor de 0 a 1 que arranca a los `delay` ms. Con reducir movimiento ya nace en 1.
export function useBeat(tl: Timeline, delay: number, opts: { duration?: number; spring?: boolean } = {}) {
  const sv = useSharedValue(tl.reduced ? 1 : 0);
  useEffect(() => {
    tl.register(sv);
    if (tl.reduced) return;
    sv.value = withDelay(delay, opts.spring ? withSpring(1, SPRING) : withTiming(1, { duration: opts.duration ?? 420, easing: EASE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sv;
}

// Contador que sube de `from` a `to` (en JS: solo se redibuja ese texto).
export function useCount(tl: Timeline, from: number, to: number, delay: number, duration = 700) {
  const [n, setN] = useState(tl.reduced ? to : from);
  const raf = useRef(0);
  useEffect(() => {
    tl.onSkip(() => { cancelAnimationFrame(raf.current); setN(to); });
    if (tl.reduced) return;
    tl.at(delay, () => {
      const t0 = Date.now();
      const tick = () => {
        const k = Math.min(1, (Date.now() - t0) / duration);
        setN(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return n;
}

// Aparece subiendo un poco (o con resorte desde chico si `pop`).
export function Reveal({ tl, delay, pop, dy = 12, from = 0.5, style, children }: { tl: Timeline; delay: number; pop?: boolean; dy?: number; from?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useBeat(tl, delay, { spring: pop, duration: 420 });
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 1.6),
    transform: pop ? [{ scale: from + (1 - from) * k.value }] : [{ translateY: (1 - k.value) * dy }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Sello que cae fuerte desde grande (reglas del desafío, EN MARCHA).
export function Stamp({ tl, delay, rotate = 0, style, children }: { tl: Timeline; delay: number; rotate?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useBeat(tl, delay, { duration: 260 });
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 3),
    transform: [{ rotate: `${rotate}deg` }, { scale: 1 + (1 - k.value) * (1 - k.value) * 1.6 }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Una partícula del destello: puede ser punto, rayita o confeti cuadrado. Sale disparada, cae un poco por gravedad,
// gira y se apaga. Todo en el hilo de la UI (Reanimated).
function SparkDot({ k, angle, radius, color, shape, size, spin, fall }: {
  k: SharedValue<number>; angle: number; radius: number; color: string; shape: 0 | 1 | 2; size: number; spin: number; fall: number;
}) {
  const a = useAnimatedStyle(() => {
    const t = k.value;
    const out = 1 - Math.pow(1 - t, 2.2);
    return {
      opacity: t <= 0 || t >= 1 ? 0 : t < 0.08 ? t * 12 : t > 0.7 ? (1 - t) / 0.3 : 1,
      transform: [
        { translateX: Math.cos(angle) * radius * out },
        { translateY: Math.sin(angle) * radius * out + fall * t * t },
        { rotate: `${spin * t + (angle * 180) / Math.PI}deg` },
        { scale: shape === 1 ? 1 : 0.5 + 0.7 * (1 - Math.abs(0.4 - t)) },
      ],
    };
  });
  const dims = shape === 1 ? { width: size * 2.6, height: Math.max(2, size * 0.42), borderRadius: 2 } : shape === 2 ? { width: size, height: size * 0.62, borderRadius: 1.5 } : { width: size, height: size, borderRadius: size / 2 };
  return <Animated.View style={[{ position: 'absolute', backgroundColor: color, left: -dims.width / 2, top: -dims.height / 2 }, dims, a]} />;
}

// Onda que se abre desde el centro del destello.
function Shock({ k, radius, color, lag }: { k: SharedValue<number>; radius: number; color: string; lag: number }) {
  const a = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (k.value - lag) / (1 - lag)));
    return { opacity: t <= 0 || t >= 1 ? 0 : (1 - t) * 0.8, transform: [{ scale: 0.15 + t * 1.0 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: radius * 2, height: radius * 2, left: -radius, top: -radius, borderRadius: radius, borderWidth: 2.5, borderColor: color }, a]} />;
}

// Destello: brillo central, dos ondas y partículas de varias formas que salen, giran y caen. Con reducir movimiento no se dibuja.
export function Burst({ tl, delay, palette, count = 12, radius = 80, style }: { tl: Timeline; delay: number; palette: string[]; count?: number; radius?: number; style?: ViewStyle }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.linear }));
    tl.onSkip(() => { cancelAnimation(k); k.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const glow = useAnimatedStyle(() => {
    const t = k.value;
    return { opacity: t <= 0 || t >= 0.5 ? 0 : t < 0.1 ? t * 3 : (0.5 - t) * 0.75, transform: [{ scale: 0.4 + t * 1.4 }] };
  });
  if (tl.reduced) return null;
  const n = Math.round(count * 1.75);
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 0, height: 0 }, style]}>
      <Animated.View style={[{ position: 'absolute', width: radius * 1.2, height: radius * 1.2, left: -radius * 0.6, top: -radius * 0.6, borderRadius: radius, backgroundColor: palette[0], opacity: 0 }, glow]} />
      <Shock k={k} radius={radius * 0.6} color={palette[0]} lag={0} />
      <Shock k={k} radius={radius * 0.85} color={palette[1 % palette.length]} lag={0.12} />
      {Array.from({ length: n }, (_, i) => {
        const r = ((i * 7919) % 100) / 100;
        return (
          <SparkDot key={i} k={k}
            angle={(i / n) * Math.PI * 2 + r * 0.5}
            radius={radius * (0.7 + r * 0.75)}
            color={palette[i % palette.length]}
            shape={(i % 3) as 0 | 1 | 2}
            size={4 + (i % 4) * 1.6}
            spin={(i % 2 ? 1 : -1) * (180 + r * 360)}
            fall={30 + r * 50}
          />
        );
      })}
    </View>
  );
}

// Moneda que viaja en arco desde (dx, dy) relativo a su lugar final, y se apaga al llegar.
export function FlyingCoin({ tl, delay, dx, dy, size = 22, onLand }: { tl: Timeline; delay: number; dx: number; dy: number; size?: number; onLand?: () => void }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }));
    tl.onSkip(() => { cancelAnimation(k); k.value = 1; });
    if (onLand) tl.at(delay + 520, onLand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => {
    const t = k.value;
    const lift = -50 * Math.sin(Math.PI * t);
    return {
      opacity: t <= 0 || t >= 1 ? 0 : t < 0.12 ? t * 8 : t > 0.9 ? (1 - t) * 10 : 1,
      transform: [{ translateX: dx * (1 - t) }, { translateY: dy * (1 - t) + lift }, { scale: 0.7 + 0.4 * Math.sin(Math.PI * t) }],
    };
  });
  if (tl.reduced) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -size / 2, top: -size / 2 }, a]}>
      <Coin size={size} />
    </Animated.View>
  );
}

// Aro que se dibuja de `from` a `to` (fracciones de 0 a 1).
export function DrawRing({ tl, delay, size, stroke, from = 0, to = 1, duration = 800, color = colors.aqua, track, children }: {
  tl: Timeline; delay: number; size: number; stroke: number; from?: number; to?: number; duration?: number; color?: string; track: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = useBeat(tl, delay, { duration });
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - (from + (to - from) * k.value)) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}

// Color de las iniciales cuando no hay foto: fijo por persona, para que dos "M" no se confundan.
const INITIAL_BG = [colors.purple, colors.aquaIcon, colors.warn, colors.purpleDeep, colors.aquaDeep];
const initialColor = (id: string) => INITIAL_BG[Array.from(id).reduce((a, ch) => a + ch.charCodeAt(0), 0) % INITIAL_BG.length];

export function Avatar({ p, size, ring }: { p: CinePerson; size: number; ring?: string }) {
  const border = ring ? { borderWidth: 3, borderColor: ring } : {};
  return (
    <AvatarImage
      uri={p.photoUrl}
      style={{ width: size, height: size, borderRadius: size / 2, ...border }}
      fallback={
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: initialColor(p.id), alignItems: 'center', justifyContent: 'center', ...border }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{p.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      }
    />
  );
}

export function usePalette() {
  const dark = useColorScheme().colorScheme === 'dark';
  return {
    dark,
    bg: (dark ? ['#3a2668', '#1c1030', '#120a1e'] : ['#FFFFFF', '#F1EBFA', '#E2D3F7']) as [string, string, string],
    text: dark ? colors.dark.text : colors.light.text,
    muted: dark ? colors.dark.muted : colors.light.muted,
    accent: dark ? colors.mint : colors.aquaInk,
    gold: dark ? '#FFD97A' : colors.goldInk,
    track: dark ? 'rgba(255,255,255,0.1)' : 'rgba(91,49,163,0.12)',
    glass: dark ? 'rgba(42,31,64,0.72)' : 'rgba(255,255,255,0.74)',
    glassLine: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)',
    chip: dark ? colors.dark.purpleLight : colors.light.purpleLight,
    pod: dark ? '#2E2247' : '#E9DEFA',
    podWin: (dark ? ['#5a4413', '#3a2c0c'] : ['#FFE7A3', '#F5D27A']) as [string, string],
    podMine: (dark ? ['rgba(127,237,196,0.55)', 'rgba(79,195,168,0.25)'] : ['rgba(127,237,196,0.75)', 'rgba(79,195,168,0.35)']) as [string, string],
    stamp: dark ? colors.mint : colors.aquaDeep,
  };
}

export const display = (size: number) =>
  brandFontsReady() ? { fontFamily: WORDMARK_FAMILY, fontWeight: 'normal' as const, fontSize: size } : { fontWeight: '900' as const, fontSize: size };

// Fondo de la escena: tapa la pantalla, se funde al entrar y un toque salta al final.
export function Stage({ tl, children, announce, align = 'center', confetti }: { tl: Timeline; children: ReactNode; announce: string; align?: 'center' | 'top'; confetti?: { at: number; palette?: string[] } }) {
  const insets = useSafeAreaInsets();
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withTiming(1, { duration: tl.reduced ? 250 : 350 });
    AccessibilityInfo.announceForAccessibility(announce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Animated.View accessibilityViewIsModal style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, a]}>
      <View style={{ flex: 1 }}>
        {/* El mismo fondo de la app (degradé y olas). */}
        <AmbientBackground />
        {confetti ? <Confetti tl={tl} delay={confetti.at} palette={confetti.palette} /> : null}
        <Press
          accessible={false}
          feedback="none"
          onPress={() => tl.playing && tl.skip()}
          style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18, paddingHorizontal: 22, alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start' }}
        >
          {children}
        </Press>
      </View>
    </Animated.View>
  );
}

// Lluvia de confeti a lo ancho de la pantalla (el momento de festejo). Rectángulos y puntos que caen balanceándose y girando.
function ConfettiPiece({ k, x, delay, color, w, h, sway, spin, speed }: { k: SharedValue<number>; x: number; delay: number; color: string; w: number; h: number; sway: number; spin: number; speed: number }) {
  const a = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (k.value - delay) / (1 - delay)));
    return {
      opacity: t <= 0 ? 0 : t > 0.85 ? (1 - t) / 0.15 : 1,
      transform: [
        { translateY: -40 + t * speed },
        { translateX: Math.sin(t * Math.PI * 3 + x) * sway },
        { rotate: `${t * spin}deg` },
        { scaleX: Math.cos(t * Math.PI * 4 + x) },
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', top: 0, left: `${x * 100}%`, width: w, height: h, borderRadius: h < 6 ? 3 : 2, backgroundColor: color }, a]} />;
}
export function Confetti({ tl, delay, palette = CAMINA_SPARKS, count = 22 }: { tl: Timeline; delay: number; palette?: string[]; count?: number }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: 3400, easing: Easing.linear }));
    tl.onSkip(() => { cancelAnimation(k); k.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (tl.reduced) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: '15%', right: '15%', bottom: '35%', overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => {
        const r = ((i * 7919) % 1000) / 1000;
        const dot = i % 4 === 0;
        return (
          <ConfettiPiece key={i} k={k} x={((i * 0.618) % 1)} delay={r * 0.35} color={palette[i % palette.length]}
            w={dot ? 6 : 5 + (i % 3) * 1.5} h={dot ? 6 : 9 + (i % 3) * 2} sway={10 + r * 16} spin={(i % 2 ? 1 : -1) * (180 + r * 240)} speed={380 + r * 220} />
        );
      })}
    </View>
  );
}

export function Eyebrow({ children, color }: { children: string; color: string }) {
  return <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: '800', color, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>{children}</Text>;
}

export function MainButton({ label, onPress, gold, bg }: { label: string; onPress: () => void; gold?: boolean; bg?: string }) {
  return (
    <Press accessibilityRole="button" haptic="light" onPress={onPress} style={{ alignSelf: 'stretch', backgroundColor: bg ?? (gold ? GOLD : colors.mint), borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ color: bg ? '#3a1a00' : gold ? '#3a2a00' : colors.mintDark, fontWeight: '800', fontSize: 15 }}>{label}</Text>
    </Press>
  );
}

export function LinkButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Press accessibilityRole="button" onPress={onPress} style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontWeight: '700', fontSize: 14, color }}>{label}</Text>
    </Press>
  );
}

// =====================================================================
// 1) Crear: el boleto del desafío
// =====================================================================

export function ChallengeCreatedScene({
  name, groupName, chips, stake, dates, me, others = [], onInvite, onGoGroup, onHome,
}: {
  name: string; groupName?: string; chips: string[]; stake: number; dates: string;
  // El grupo en el aro (mismo estilo que "Grupo creado" y "Te sumaste"): tu foto sube y cierra el círculo.
  me?: CinePerson | null; others?: CinePerson[];
  onInvite: () => void; onGoGroup: () => void; onHome: () => void;
}) {
  const p = usePalette();
  const tl = useTimeline(3600);
  const letters = Array.from(name);
  const small = letters.length > 14;
  const pot = useCount(tl, 0, stake, 2100, 600);
  const { shown, extra } = ringPeople(others, 7);
  const empty = others.length === 0 ? 4 : 0;
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(1500, buzz.medium);
    chips.forEach((_, i) => tl.at(2350 + i * 150, buzz.selection));
    tl.at(2250, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`${name} está en marcha. ${dates}`} confetti={{ at: 2250 }}>
      <Reveal tl={tl} delay={150}><Eyebrow color={p.muted}>{groupName ? `Nuevo desafío · ${groupName}` : 'Nuevo desafío'}</Eyebrow></Reveal>
      <View accessible accessibilityLabel={name} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
        {letters.map((ch, i) => (
          <Reveal key={i} tl={tl} delay={300 + Math.min(i, 14) * 60} pop from={0.6}>
            <Text style={{ ...display(small ? 24 : 30), color: p.text, lineHeight: small ? 30 : 36 }}>{ch === ' ' ? ' ' : ch}</Text>
          </Reveal>
        ))}
      </View>
      <View style={{ marginTop: 26 }}>
        <GroupOrbit
          tl={tl}
          size={232}
          delay={700}
          people={shown}
          extra={extra}
          me={me ?? null}
          emptySlots={empty}
          meDelay={1100}
          onSlotPress={onInvite}
          center={
            <View style={{ alignItems: 'center' }}>
              <Reveal tl={tl} delay={1000} pop from={0.3}>
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={36} color={GOLD} />
                </View>
              </Reveal>
              {stake > 0 && (
                <Reveal tl={tl} delay={1900} dy={6} style={{ marginTop: 6 }}>
                  <View accessible accessibilityLabel={`${stake} Puntos en juego por persona`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View>
                      <Coin size={16} />
                      {[0, 1, 2].map((i) => <View key={i} style={{ position: 'absolute', left: 8, top: 8 }}><FlyingCoin tl={tl} delay={2000 + i * 120} dx={(i - 1) * 40} dy={-220} /></View>)}
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: p.gold, fontVariant: ['tabular-nums'] }}>{pot}</Text>
                  </View>
                </Reveal>
              )}
            </View>
          }
        />
      </View>
      <Reveal tl={tl} delay={2250} pop from={0.6} style={{ marginTop: 18 }}>
        <Text style={{ ...display(26), color: p.text, textAlign: 'center' }}>¡Desafío en marcha!</Text>
      </Reveal>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {chips.map((c, i) => (
          <Stamp key={c} tl={tl} delay={2350 + i * 150}>
            <View style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: p.chip }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: p.text }}>{c}</Text>
            </View>
          </Stamp>
        ))}
      </View>
      <Reveal tl={tl} delay={2800}>
        <Text style={{ fontSize: 13, color: p.muted, textAlign: 'center', marginTop: 12, lineHeight: 19, maxWidth: 290 }}>
          {dates}.{stake > 0 ? ' El primero en cumplir la meta se lleva la mitad del pozo y el resto se reparte entre los demás que cumplan.' : ' Invita a tu grupo y que gane el que más camine.'}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={3000} dy={20} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <MainButton label="Invitar al grupo" onPress={onInvite} />
        <LinkButton label="Ir al grupo" onPress={onGoGroup} color={p.accent} />
        <LinkButton label="Volver al inicio" onPress={onHome} color={p.muted} />
      </Reveal>
    </Stage>
  );
}


// Posición de un lugar del círculo (centrada en el círculo): el 0 es arriba y siguen en sentido horario.
export function orbitSlot(i: number, n: number, size: number, slot: number) {
  const r = (size - 8) / 2; // sobre la línea del aro (trazo de 8)
  const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
  return { left: size / 2 + Math.cos(a) * r - slot / 2, top: size / 2 + Math.sin(a) * r - slot / 2, dx: Math.cos(a) * r, dy: Math.sin(a) * r };
}

// Saltito de cortesía: cada foto "saluda" cuando el grupo se completa.
function Hop({ tl, delay, children, style }: { tl: Timeline; delay: number; children: ReactNode; style?: ViewStyle }) {
  const k = useBeat(tl, delay, { duration: 420 });
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -9 * Math.sin(Math.PI * Math.min(1, k.value)) }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Aro de puntos finos que gira despacio detrás de las fotos.
function SlowSpin({ tl, size, color }: { tl: Timeline; size: number; color: string }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${k.value * 360}deg` }] }));
  const r = size / 2 - 1;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, a]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={2} strokeDasharray="1 9" strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// El círculo del grupo: halo suave, aro que se dibuja, aro fino que gira, fotos en el borde (hasta 7 + burbuja "+N"),
// lugares vacíos punteados y, si se pasa `me`, tu foto que sube desde abajo y cierra el aro.
export function GroupOrbit({
  tl, size = 244, slot = 48, delay = 300, people, extra = 0, me, emptySlots = 0, meDelay = 1000, center, hopAt, closeRing = true, onSlotPress,
}: {
  tl: Timeline; size?: number; slot?: number; delay?: number; people: CinePerson[]; extra?: number; me?: CinePerson | null; emptySlots?: number;
  meDelay?: number; center: ReactNode; hopAt?: number; closeRing?: boolean;
  // Si se pasa, los lugares vacíos "+" se pueden tocar (por ejemplo, para invitar amigos).
  onSlotPress?: () => void;
}) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  const hasMe = !!me;
  const n = (hasMe ? 1 : 0) + people.length + (extra > 0 ? 1 : 0) + emptySlots;
  const first = hasMe ? 1 : 0;
  const mine = orbitSlot(0, n, size, slot);
  const fly = useBeat(tl, meDelay, { duration: 560 });
  const flyStyle = useAnimatedStyle(() => {
    const t = fly.value;
    return { transform: [{ translateX: -90 * (1 - t) }, { translateY: height * 0.34 * (1 - t) - 46 * Math.sin(Math.PI * t) }, { scale: 1 + 0.28 * Math.sin(Math.PI * t) }] };
  });
  const arc = hasMe && closeRing ? (n - 1) / n : 1;
  const stage = p.dark ? '#1c1030' : '#FFFFFF';
  return (
    <Reveal tl={tl} delay={delay} pop from={0.7}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', width: size + 44, height: size + 44, borderRadius: (size + 44) / 2, backgroundColor: p.dark ? 'rgba(127,237,196,0.06)' : 'rgba(79,195,168,0.10)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', width: size - 20, height: size - 20, borderRadius: (size - 20) / 2, backgroundColor: p.dark ? 'rgba(127,237,196,0.07)' : 'rgba(79,195,168,0.10)' }} />
        <SlowSpin tl={tl} size={size - 46} color={p.dark ? 'rgba(255,255,255,0.28)' : 'rgba(91,49,163,0.3)'} />
        <DrawRing tl={tl} delay={delay + 250} size={size} stroke={8} track={p.track} to={arc} duration={arc < 1 ? 600 : 900}>
          {hasMe && closeRing ? <DrawRingTail tl={tl} delay={meDelay + 520} size={size} from={arc} /> : null}
          {center}
          {people.map((o, i) => (
            <Reveal key={o.id} tl={tl} delay={delay + 450 + i * 70} pop style={{ position: 'absolute', ...orbitSlot(first + i, n, size, slot) }}>
              <Hop tl={tl} delay={(hopAt ?? meDelay + 900) + i * 80}>
                <View style={{ borderRadius: slot / 2, borderWidth: 2.5, borderColor: stage }}><Avatar p={o} size={slot - 5} /></View>
              </Hop>
            </Reveal>
          ))}
          {extra > 0 && (
            <Reveal tl={tl} delay={delay + 450 + people.length * 70} pop style={{ position: 'absolute', ...orbitSlot(first + people.length, n, size, slot) }}>
              <MoreBubble extra={extra} size={slot - 5} bg={colors.purple} color="#fff" />
            </Reveal>
          )}
          {Array.from({ length: emptySlots }, (_, i) => (
            <Reveal key={`e${i}`} tl={tl} delay={delay + 700 + i * 110} pop style={{ position: 'absolute', ...orbitSlot(first + people.length + (extra > 0 ? 1 : 0) + i, n, size, slot) }}>
              <Press accessibilityRole="button" accessibilityLabel="Invitar a un amigo" disabled={!onSlotPress} onPress={onSlotPress} hitSlop={6}
                style={{ width: slot - 5, height: slot - 5, margin: 2.5, borderRadius: slot / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: p.dark ? 'rgba(127,237,196,0.6)' : colors.aquaDeep, backgroundColor: p.dark ? 'rgba(28,16,48,0.85)' : 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                <Text allowFontScaling={false} style={{ fontSize: 20, lineHeight: 22, fontWeight: '800', color: p.dark ? colors.mint : colors.aquaDeep, textAlign: 'center' }}>+</Text>
              </Press>
            </Reveal>
          ))}
          {hasMe && (
            <>
              <Reveal tl={tl} delay={delay + 500} pop style={{ position: 'absolute', left: mine.left, top: mine.top }}>
                <View style={{ width: slot, height: slot, borderRadius: slot / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.aqua }} />
              </Reveal>
              <Animated.View style={[{ position: 'absolute', left: mine.left, top: mine.top }, flyStyle]}>
                <View style={{ borderRadius: slot / 2, borderWidth: 3, borderColor: colors.aqua }}><Avatar p={me!} size={slot - 6} /></View>
              </Animated.View>
            </>
          )}
          {hasMe && <Burst tl={tl} delay={meDelay + 1000} palette={[colors.aqua, GOLD, colors.mint]} radius={size * 0.42} style={{ left: size / 2, top: size / 2 }} />}
        </DrawRing>
      </View>
    </Reveal>
  );
}

// =====================================================================
// 2) Aceptar: entrar al aro
// =====================================================================

export type JoinedCinematic = {
  kind: 'challenge-joined';
  name: string;
  me: CinePerson;
  others: CinePerson[];
  stake: number;
  potBefore: number;
  subtitle: string;
  // Desafíos de comercios: el logo del local va en el centro del aro (en vez del bote).
  logoUrl?: string | null;
};

const RING = 248;
const SLOT = 50;

// Quiénes entran en el aro: hasta 7 fotos; si hay más gente, 6 fotos y una burbuja "+N" con el resto.
export function ringPeople<T>(others: T[], max = 7): { shown: T[]; extra: number } {
  if (others.length <= max) return { shown: others, extra: 0 };
  return { shown: others.slice(0, max - 1), extra: others.length - (max - 1) };
}

export function MoreBubble({ extra, size, bg, color }: { extra: number; size: number; bg: string; color: string }) {
  return (
    <View accessible accessibilityLabel={`y ${extra} más`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ color, fontWeight: '800', fontSize: extra > 99 ? size * 0.26 : size * 0.32, fontVariant: ['tabular-nums'] }}>+{extra}</Text>
    </View>
  );
}

export function ChallengeJoinedScene({ c, onDone }: { c: JoinedCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3100);
  const { shown, extra } = ringPeople(c.others);
  const n = shown.length + 1 + (extra > 0 ? 1 : 0);
  const pot = useCount(tl, c.potBefore, c.potBefore + c.stake, 1700, 520);
  const [reader, setReader] = useState(false);
  const closed = useRef(false);
  const close = () => { if (!closed.current) { closed.current = true; onDone(); } };
  useEffect(() => {
    let alive = true;
    if (Platform.OS !== 'web') AccessibilityInfo.isScreenReaderEnabled().then((v) => { if (alive) setReader(v); }).catch(() => {});
    if (tl.reduced) buzz.success();
    else {
      buzz.medium();
      tl.at(1440, buzz.light);
      tl.at(1950, buzz.success);
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Se cierra sola, salvo con lector de pantalla (ahí espera el botón).
  useEffect(() => {
    if (reader) return;
    const id = setTimeout(close, tl.reduced ? 2200 : 3600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader]);

  const mine = orbitSlot(0, n, RING, SLOT);
  const center = c.stake <= 0 ? (
    // Sin bote (desafíos de comercios): el logo del local, o el trofeo si no tiene.
    <Reveal tl={tl} delay={600} pop>
      {c.logoUrl ? (
        <Image cachePolicy="memory-disk" source={{ uri: c.logoUrl }} style={{ width: 84, height: 84, borderRadius: 20 }} />
      ) : (
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={42} color={GOLD} />
        </View>
      )}
    </Reveal>
  ) : (
    <View accessible accessibilityLabel={`Bote: ${pot} Puntos`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View>
        <Coin size={34} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: 'absolute', left: 17, top: 17 }}>
            <FlyingCoin tl={tl} delay={1500 + i * 130} dx={mine.dx} dy={mine.dy} size={20} />
          </View>
        ))}
      </View>
      <Text allowFontScaling={false} style={{ ...display(44), color: p.gold, fontVariant: ['tabular-nums'], lineHeight: 50 }}>{pot}</Text>
    </View>
  );
  return (
    <Stage tl={tl} announce={`Estás dentro de ${c.name}. ${c.subtitle}`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{c.name}</Eyebrow></Reveal>
      <View style={{ marginTop: 22 }}>
        <GroupOrbit tl={tl} size={RING} slot={SLOT} delay={300} people={shown} extra={extra} me={c.me} meDelay={900} center={center} />
      </View>
      <Reveal tl={tl} delay={1950} pop from={0.6} style={{ marginTop: 26 }}>
        <Text style={{ ...display(30), color: p.text, textAlign: 'center' }}>¡Estás dentro!</Text>
      </Reveal>
      <Reveal tl={tl} delay={2150}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 280 }}>{c.subtitle}</Text>
      </Reveal>
      {reader && (
        <View style={{ alignSelf: 'stretch', marginTop: 28 }}>
          <MainButton label="Listo" onPress={close} />
        </View>
      )}
    </Stage>
  );
}

// El tramo final del aro (tu parte) se dibuja cuando llega tu foto.
export function DrawRingTail({ tl, delay, size, from }: { tl: Timeline; delay: number; size: number; from: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = useBeat(tl, delay, { duration: 520 });
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - (from + (1 - from) * k.value)) }));
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} pointerEvents="none">
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={colors.aqua} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} />
    </Svg>
  );
}

// =====================================================================
// 3) Terminar: el podio
// =====================================================================

export type EndedCinematic = {
  kind: 'challenge-ended';
  name: string;
  groupName?: string;
  meId: string;
  myRank: number;
  participants: number;
  payout: number;
  // Hasta 3, en orden de puesto; `value` ya formateado ("21.430 pasos", "5 días").
  podium: { person: CinePerson; value: string }[];
  // Mi valor con la regla del desafío, para el subtítulo.
  myValue: string;
  goalDays: number;
  days: number;
  // Qué me faltó para el puesto de arriba (solo si no gané).
  gap?: string;
  onRematch?: () => void;
};

const POD_H = [132, 92, 64];

function PodiumColumn({ tl, delay, rank, entry, isMe, won }: { tl: Timeline; delay: number; rank: number; entry: { person: CinePerson; value: string }; isMe: boolean; won: boolean }) {
  const p = usePalette();
  const grow = useBeat(tl, delay, { duration: 520 });
  const g = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - Math.min(1, grow.value)) * POD_H[rank - 1] }], opacity: grow.value > 0 ? 1 : 0 }));
  const winner = rank === 1;
  const fill = winner ? p.podWin : isMe ? p.podMine : null;
  return (
    <View style={{ width: 92, alignItems: 'center' }}>
      <Reveal tl={tl} delay={delay + 260} dy={-30} style={{ alignItems: 'center', marginBottom: 8 }}>
        {winner && (
          <Reveal tl={tl} delay={won ? 1900 : delay + 400} dy={won ? -60 : -10} style={{ position: 'absolute', top: -34 }}>
            <CrownMark size={42} />
          </Reveal>
        )}
        <View>
          <Avatar p={entry.person} size={44} />
          {isMe && (
            <Reveal tl={tl} delay={won ? 2000 : 1300} pop from={1.6} style={{ position: 'absolute', left: -5, top: -5 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: won ? GOLD : colors.aqua }} />
            </Reveal>
          )}
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: p.text, marginTop: 4, maxWidth: 88 }}>{entry.person.name.split(' ')[0]}</Text>
        <Text numberOfLines={1} style={{ fontSize: 10.5, color: p.muted, fontVariant: ['tabular-nums'] }}>{entry.value}</Text>
      </Reveal>
      <View style={{ width: '100%', height: POD_H[rank - 1], overflow: 'hidden', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <Animated.View style={[{ flex: 1 }, g]}>
          {fill ? (
            <LinearGradient colors={fill} style={{ flex: 1, alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ ...display(22), color: winner ? p.gold : p.accent }}>{rank}</Text>
            </LinearGradient>
          ) : (
            <View style={{ flex: 1, backgroundColor: p.pod, alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ ...display(22), color: p.muted }}>{rank}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

export function ChallengeEndedScene({ c, onDone }: { c: EndedCinematic; onDone: () => void }) {
  const p = usePalette();
  const won = c.myRank === 1;
  const paid = c.payout > 0;
  const tl = useTimeline(won ? 4300 : 3300);
  const total = useCount(tl, 0, c.payout, won ? 2850 : 2300, 800);
  useEffect(() => {
    if (tl.reduced) { (won || paid ? buzz.success : buzz.light)(); return; }
    if (won) {
      tl.at(1500, buzz.medium);
      tl.at(2300, buzz.success);
      if (paid) [0, 1, 2, 3, 4].forEach((i) => tl.at(2700 + i * 110 + 520, buzz.selection));
    } else {
      tl.at(1300, paid ? buzz.success : buzz.light);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Orden visual del podio: 2.º, 1.º, 3.º. Sube primero el 3.º y el 1.º al final (con pausa) si ganaste.
  const byRank = c.podium.slice(0, 3);
  const meInPodium = byRank.some((e) => e.person.id === c.meId);
  const order = [1, 0, 2].filter((i) => byRank[i]);
  const riseAt = (i: number) => (won ? [1250, 750, 350][i] : [650, 950, 350][i]);
  const title = won ? `¡Ganaste ${c.name}!` : `Quedaste ${c.myRank}.º`;
  const sub = won
    ? `1.º de ${c.participants} con ${c.myValue}`
    : paid
      ? `Cumpliste la meta y te llevas tu parte del bote.`
      : c.gap ?? '¡La próxima es tuya!';
  const share = () => {
    Share.share({ message: `${won ? 'Gané' : `Quedé ${c.myRank}.º en`} el desafío «${c.name}» en Camina con ${c.myValue}. ¿Te animas al próximo?` }).catch(() => {});
  };

  return (
    <Stage tl={tl} confetti={won ? { at: 2250, palette: [GOLD, '#FFD97A', '#FFF1B8', colors.aqua] } : undefined} announce={`${c.name} terminó. ${title}. ${sub}${paid ? `. Ganaste ${c.payout} Puntos` : ''}`} align="top">
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{c.groupName ? `${c.name} terminó · ${c.groupName}` : `${c.name} terminó`}</Eyebrow></Reveal>
      <Reveal tl={tl} delay={won ? 2350 : 1600} pop={won} from={0.6} style={{ marginTop: 10 }}>
        <Text style={{ ...display(won ? 30 : 28), color: p.text, textAlign: 'center' }} numberOfLines={2}>{title}</Text>
      </Reveal>
      <Reveal tl={tl} delay={won ? 2550 : 1750}>
        <Text style={{ fontSize: 13.5, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 290 }}>{sub}</Text>
      </Reveal>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginTop: 'auto', paddingTop: 30 }}>
        {order.map((i) => (
          <PodiumColumn key={byRank[i].person.id} tl={tl} delay={riseAt(i)} rank={i + 1} entry={byRank[i]} isMe={byRank[i].person.id === c.meId} won={won} />
        ))}
        {won && <Burst tl={tl} delay={2250} palette={GOLD_SPARKS} count={18} radius={110} style={{ left: '50%', top: 20 }} />}
      </View>
      {!meInPodium && (
        <Reveal tl={tl} delay={1300}>
          <Text style={{ fontSize: 12.5, color: p.muted, marginTop: 8 }}>Tú: {c.myRank}.º con {c.myValue}</Text>
        </Reveal>
      )}

      {paid ? (
        <Reveal tl={tl} delay={won ? 2600 : 2100} pop from={0.7} style={{ marginTop: 14 }}>
          <View accessible accessibilityLabel={`${c.payout} Puntos`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.5)' }}>
            <View>
              <Coin size={26} />
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ position: 'absolute', left: 13, top: 13 }}>
                  <FlyingCoin tl={tl} delay={(won ? 2700 : 2200) + i * 110} dx={60 + (i - 2) * 14} dy={-150} />
                </View>
              ))}
            </View>
            <Text style={{ fontWeight: '900', fontSize: 26, color: p.gold, fontVariant: ['tabular-nums'] }}>+{total}</Text>
          </View>
        </Reveal>
      ) : (
        <Reveal tl={tl} delay={1950} dy={14} style={{ alignSelf: 'stretch', marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassLine }}>
            <DrawRing tl={tl} delay={2050} size={56} stroke={5} track={p.track} to={c.days > 0 ? c.goalDays / c.days : 0} duration={700}>
              {/* Centrado exacto en el aro: ancho fijo, sin relleno de fuente (Android) y números de ancho parejo. */}
              <Text allowFontScaling={false} style={{ width: 46, textAlign: 'center', fontSize: 13, lineHeight: 16, includeFontPadding: false, fontWeight: '800', color: p.text, fontVariant: ['tabular-nums'] }}>{c.goalDays}/{c.days}</Text>
            </DrawRing>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: p.text }}>{c.goalDays} de {c.days} días con meta</Text>
              <Text style={{ fontSize: 12, color: p.muted, marginTop: 1 }}>{c.goalDays > 0 ? 'Cada día cuenta para el próximo.' : 'El próximo empieza con el primer paso.'}</Text>
            </View>
          </View>
        </Reveal>
      )}

      <Reveal tl={tl} delay={won ? 3550 : 2650} dy={20} style={{ alignSelf: 'stretch', marginTop: 14 }}>
        {won ? (
          <>
            <MainButton gold label="Compartir" onPress={share} />
            {c.onRematch ? <LinkButton label="Revancha" onPress={() => { onDone(); c.onRematch?.(); }} color={p.accent} /> : null}
            <LinkButton label="Cerrar" onPress={onDone} color={p.muted} />
          </>
        ) : (
          <>
            {c.onRematch ? <MainButton label="Revancha" onPress={() => { onDone(); c.onRematch?.(); }} /> : <MainButton label="Listo" onPress={onDone} />}
            <LinkButton label={c.onRematch ? 'Cerrar' : 'Compartir'} onPress={c.onRematch ? onDone : share} color={p.accent} />
          </>
        )}
      </Reveal>
    </Stage>
  );
}
