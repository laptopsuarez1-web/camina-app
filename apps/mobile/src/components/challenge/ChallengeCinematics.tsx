import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Image, Platform, Share, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Coin } from '@/components/ui/Coin';
import { Crown, Trophy } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';
import { buzz } from '@/lib/haptics';

// Cinemáticas de los desafíos de grupo: crear (boleto con sello EN MARCHA), sumarse (tu foto entra al aro y tus Puntos al bote)
// y terminar (podio; con corona y monedas si ganaste, más calmo si no). Todo corre en el hilo de UI con Reanimated.
// Tocar el fondo salta al final. Con "reducir movimiento" no hay vuelos ni chispas: la escena final aparece con un fundido.

const GOLD = '#E2B33C';
const GOLD_SPARKS = ['#E2B33C', '#FFD97A', '#FFF1B8'];
const CAMINA_SPARKS = [colors.aqua, GOLD, '#B7A6F0', colors.warn];
const EASE = Easing.out(Easing.cubic);
const SPRING = { damping: 11, stiffness: 160, mass: 0.8 };
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type CinePerson = { id: string; name: string; photoUrl?: string | null };

// ---------- línea de tiempo de una escena ----------

type Timeline = {
  reduced: boolean;
  register: (sv: SharedValue<number>) => void;
  onSkip: (fn: () => void) => void;
  at: (ms: number, fn: () => void) => void;
  skip: () => void;
  playing: boolean;
};

function useTimeline(totalMs: number): Timeline {
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
function useBeat(tl: Timeline, delay: number, opts: { duration?: number; spring?: boolean } = {}) {
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
function useCount(tl: Timeline, from: number, to: number, delay: number, duration = 700) {
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
function Reveal({ tl, delay, pop, dy = 12, from = 0.5, style, children }: { tl: Timeline; delay: number; pop?: boolean; dy?: number; from?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useBeat(tl, delay, { spring: pop, duration: 420 });
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 1.6),
    transform: pop ? [{ scale: from + (1 - from) * k.value }] : [{ translateY: (1 - k.value) * dy }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Sello que cae fuerte desde grande (reglas del desafío, EN MARCHA).
function Stamp({ tl, delay, rotate = 0, style, children }: { tl: Timeline; delay: number; rotate?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useBeat(tl, delay, { duration: 260 });
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 3),
    transform: [{ rotate: `${rotate}deg` }, { scale: 1 + (1 - k.value) * (1 - k.value) * 1.6 }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

function SparkDot({ k, angle, radius, color }: { k: SharedValue<number>; angle: number; radius: number; color: string }) {
  const a = useAnimatedStyle(() => {
    const t = k.value;
    return {
      opacity: t <= 0 || t >= 1 ? 0 : t < 0.1 ? t * 10 : t > 0.75 ? (1 - t) * 4 : 1,
      transform: [{ translateX: Math.cos(angle) * radius * t }, { translateY: Math.sin(angle) * radius * t }, { scale: 0.4 + 0.6 * t }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color, left: -3.5, top: -3.5 }, a]} />;
}

// Chispas chicas que salen de un punto y se apagan. Con reducir movimiento no se dibujan.
function Burst({ tl, delay, palette, count = 12, radius = 80, style }: { tl: Timeline; delay: number; palette: string[]; count?: number; radius?: number; style?: ViewStyle }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: 1100, easing: EASE }));
    tl.onSkip(() => { cancelAnimation(k); k.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (tl.reduced) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 0, height: 0 }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <SparkDot key={i} k={k} angle={(i / count) * Math.PI * 2 + 0.3} radius={radius * (0.75 + ((i * 37) % 10) / 25)} color={palette[i % palette.length]} />
      ))}
    </View>
  );
}

// Moneda que viaja en arco desde (dx, dy) relativo a su lugar final, y se apaga al llegar.
function FlyingCoin({ tl, delay, dx, dy, size = 22, onLand }: { tl: Timeline; delay: number; dx: number; dy: number; size?: number; onLand?: () => void }) {
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
function DrawRing({ tl, delay, size, stroke, from = 0, to = 1, duration = 800, color = colors.aqua, track, children }: {
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

function Avatar({ p, size, ring }: { p: CinePerson; size: number; ring?: string }) {
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

function usePalette() {
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

const display = (size: number) =>
  brandFontsReady() ? { fontFamily: WORDMARK_FAMILY, fontWeight: 'normal' as const, fontSize: size } : { fontWeight: '900' as const, fontSize: size };

// Fondo de la escena: tapa la pantalla, se funde al entrar y un toque salta al final.
function Stage({ tl, children, announce, align = 'center' }: { tl: Timeline; children: ReactNode; announce: string; align?: 'center' | 'top' }) {
  const p = usePalette();
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
      <LinearGradient colors={p.bg} locations={[0, 0.55, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
        <Press
          accessible={false}
          feedback="none"
          onPress={() => tl.playing && tl.skip()}
          style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18, paddingHorizontal: 22, alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start' }}
        >
          {children}
        </Press>
      </LinearGradient>
    </Animated.View>
  );
}

function Eyebrow({ children, color }: { children: string; color: string }) {
  return <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: '800', color, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={1}>{children}</Text>;
}

function MainButton({ label, onPress, gold }: { label: string; onPress: () => void; gold?: boolean }) {
  return (
    <Press accessibilityRole="button" haptic="light" onPress={onPress} style={{ alignSelf: 'stretch', backgroundColor: gold ? GOLD : colors.mint, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ color: gold ? '#3a2a00' : colors.mintDark, fontWeight: '800', fontSize: 15 }}>{label}</Text>
    </Press>
  );
}

function LinkButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
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
  name, groupName, chips, stake, dates, onInvite, onGoGroup, onHome,
}: {
  name: string; groupName?: string; chips: string[]; stake: number; dates: string;
  onInvite: () => void; onGoGroup: () => void; onHome: () => void;
}) {
  const p = usePalette();
  const tl = useTimeline(3500);
  const letters = Array.from(name);
  const pot = useCount(tl, 0, stake, 2050, 600);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    chips.forEach((_, i) => tl.at(1640 + i * 170, buzz.selection));
    tl.at(2730, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ticket = useBeat(tl, 250, { spring: true });
  const ticketStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, ticket.value * 1.5),
    transform: [{ translateY: (1 - ticket.value) * 60 }, { scale: 0.86 + 0.14 * ticket.value }, { rotate: `${(1 - ticket.value) * -3}deg` }],
  }));
  return (
    <Stage tl={tl} announce={`${name} está en marcha. ${dates}`}>
      <Reveal tl={tl} delay={250}><Eyebrow color={p.muted}>{groupName ? `Nuevo desafío · ${groupName}` : 'Nuevo desafío'}</Eyebrow></Reveal>
      <Animated.View style={[{ alignSelf: 'stretch', marginTop: 16, borderRadius: 28, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', gap: 12, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassLine }, ticketStyle]}>
        <DrawRing tl={tl} delay={300} size={128} stroke={8} track={p.track}>
          <Reveal tl={tl} delay={700} pop from={0.3}>
            <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={38} color={GOLD} />
            </View>
          </Reveal>
        </DrawRing>
        <View accessible accessibilityLabel={name} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
          {letters.map((ch, i) => (
            <Reveal key={i} tl={tl} delay={1000 + Math.min(i, 12) * 70} pop from={0.6}>
              <Text style={{ ...display(letters.length > 14 ? 26 : 34), color: p.text, lineHeight: letters.length > 14 ? 32 : 40 }}>{ch === ' ' ? ' ' : ch}</Text>
            </Reveal>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {chips.map((c, i) => (
            <Stamp key={c} tl={tl} delay={1400 + i * 170}>
              <View style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: p.chip }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: p.text }}>{c}</Text>
              </View>
            </Stamp>
          ))}
        </View>
        {stake > 0 && (
          <Reveal tl={tl} delay={1750} dy={6}>
            <View accessible accessibilityLabel={`${stake} Puntos en juego por persona`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.5)' }}>
              <View>
                <Coin size={18} />
                {[0, 1, 2].map((i) => <View key={i} style={{ position: 'absolute', left: 9, top: 9 }}><FlyingCoin tl={tl} delay={1900 + i * 120} dx={(i - 1) * 40} dy={-260} /></View>)}
              </View>
              <Text style={{ fontWeight: '800', fontSize: 16, color: p.gold, fontVariant: ['tabular-nums'] }}>{pot}</Text>
              <Text style={{ fontWeight: '700', fontSize: 13, color: p.gold }}>en juego</Text>
            </View>
          </Reveal>
        )}
        <Stamp tl={tl} delay={2500} rotate={9} style={{ position: 'absolute', right: 12, top: 14 }}>
          <View style={{ borderWidth: 2.5, borderColor: p.stamp, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(127,237,196,0.18)' }}>
            <Text style={{ ...display(12), color: p.stamp, letterSpacing: 1 }}>EN MARCHA</Text>
          </View>
        </Stamp>
        <Burst tl={tl} delay={2700} palette={CAMINA_SPARKS} radius={60} style={{ right: 60, top: 26 }} />
        <Burst tl={tl} delay={2780} palette={[colors.aqua, colors.mint, GOLD]} count={14} radius={92} style={{ left: '50%', top: 84 }} />
      </Animated.View>
      <Reveal tl={tl} delay={2900}>
        <Text style={{ fontSize: 13, color: p.muted, textAlign: 'center', marginTop: 14, lineHeight: 19, maxWidth: 280 }}>
          {dates}. Invita a tu grupo: quienes cumplan la meta se reparten los Puntos.
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={3050} dy={20} style={{ alignSelf: 'stretch', marginTop: 28 }}>
        <MainButton label="Invitar al grupo" onPress={onInvite} />
        <LinkButton label="Ir al grupo" onPress={onGoGroup} color={p.accent} />
        <LinkButton label="Volver al inicio" onPress={onHome} color={p.muted} />
      </Reveal>
    </Stage>
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

const RING = 200;
const SLOT = 46;

export function ChallengeJoinedScene({ c, onDone }: { c: JoinedCinematic; onDone: () => void }) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  const tl = useTimeline(3100);
  const shown = c.others.slice(0, 7);
  const n = shown.length + 1;
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

  const r = (RING - 10) / 2 - 4;
  const slotAt = (i: number) => {
    // Tu lugar va a la derecha (ángulo 0); los demás se reparten en el resto del aro.
    const a = (i / n) * Math.PI * 2;
    return { left: RING / 2 + Math.cos(a) * r - SLOT / 2, top: RING / 2 + Math.sin(a) * r - SLOT / 2 };
  };
  const mine = slotAt(0);
  // Tu foto sale desde donde estaba el botón (abajo) y vuela a su lugar.
  const fly = useBeat(tl, 900, { duration: 540 });
  const flyStyle = useAnimatedStyle(() => {
    const t = fly.value;
    return {
      transform: [{ translateX: -120 * (1 - t) }, { translateY: height * 0.32 * (1 - t) - 40 * Math.sin(Math.PI * t) }, { scale: 1 + 0.25 * Math.sin(Math.PI * t) }],
    };
  });
  return (
    <Stage tl={tl} announce={`Estás dentro de ${c.name}. ${c.subtitle}`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{c.name}</Eyebrow></Reveal>
      <Reveal tl={tl} delay={300} pop from={0.7} style={{ marginTop: 22 }}>
        <DrawRing tl={tl} delay={650} size={RING} stroke={8} track={p.track} from={(n - 1) / n * 0.5} to={(n - 1) / n} duration={500}>
          <DrawRingTail tl={tl} delay={1450} size={RING} from={(n - 1) / n} />
          {c.stake <= 0 ? (
            // Sin bote (desafíos de comercios): el logo del local, o el trofeo si no tiene.
            <Reveal tl={tl} delay={600} pop>
              {c.logoUrl ? (
                <Image source={{ uri: c.logoUrl }} style={{ width: 84, height: 84, borderRadius: 20 }} />
              ) : (
                <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={42} color={GOLD} />
                </View>
              )}
            </Reveal>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: p.muted, fontWeight: '700' }}>Bote</Text>
              <View>
                <Text style={{ ...display(34), color: p.gold, fontVariant: ['tabular-nums'], lineHeight: 40 }}>{pot}</Text>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ position: 'absolute', left: '50%', top: 20 }}>
                    <FlyingCoin tl={tl} delay={1500 + i * 130} dx={mine.left + SLOT / 2 - RING / 2} dy={0} size={20} />
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: p.muted, fontWeight: '700' }}>Puntos</Text>
            </View>
          )}
          {shown.map((o, i) => (
            <Reveal key={o.id} tl={tl} delay={700 + i * 60} pop style={{ position: 'absolute', ...slotAt(i + 1) }}>
              <Avatar p={o} size={SLOT} />
            </Reveal>
          ))}
          <Reveal tl={tl} delay={800} pop style={{ position: 'absolute', ...mine }}>
            <View style={{ width: SLOT, height: SLOT, borderRadius: SLOT / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.aqua }} />
          </Reveal>
          <Animated.View style={[{ position: 'absolute', ...mine }, flyStyle]}>
            <Avatar p={c.me} size={SLOT} ring={colors.aqua} />
          </Animated.View>
          <Burst tl={tl} delay={1950} palette={[colors.aqua, GOLD, colors.mint]} radius={80} style={{ left: RING / 2, top: RING / 2 }} />
        </DrawRing>
      </Reveal>
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
function DrawRingTail({ tl, delay, size, from }: { tl: Timeline; delay: number; size: number; from: number }) {
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
          <Reveal tl={tl} delay={won ? 1900 : delay + 400} dy={won ? -60 : -10} style={{ position: 'absolute', top: -28 }}>
            <Crown size={26} color={GOLD} weight="fill" />
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
        <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: p.text, marginTop: 4, maxWidth: 88 }}>{isMe ? 'Tú' : entry.person.name.split(' ')[0]}</Text>
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
    <Stage tl={tl} announce={`${c.name} terminó. ${title}. ${sub}${paid ? `. Ganaste ${c.payout} Puntos` : ''}`} align="top">
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
