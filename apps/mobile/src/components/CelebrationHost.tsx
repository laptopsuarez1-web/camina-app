import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, findNodeHandle, Image, Keyboard, Platform, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCelebrationStore, type Celebration, type ToastIcon } from '@/store/useCelebrationStore';
import { Check, Flame, Gift, Users, Trophy } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { buzz } from '@/lib/haptics';
import { ChallengeEndedScene, ChallengeJoinedScene } from '@/components/challenge/ChallengeCinematics';
import { EventJoinedScene, FriendMadeScene, GroupCreatedScene, GroupGoalScene, GroupJoinedScene, RankingResultScene, StreakScene, StreakWeekScene, TicketBoughtScene } from '@/components/celebrations/MomentScenes';

const GOLD = '#E2B33C';
const SPARKS = [colors.aqua, '#E2B33C', '#B7A6F0', colors.warn];
const GOLD_SPARKS = ['#E2B33C', '#FFD97A', '#FFF1B8'];
const coin = require('@/../assets/camina-coin.png');

// Títulos en Montserrat Black (la letra del nombre CAMINA) si ya cargó.
function wordmark(size: number) {
  if (!brandFontsReady()) return { fontWeight: '900' as const, fontSize: size };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const), fontSize: size };
}

// Destello: brillo, dos ondas y partículas de varias formas (puntos, rayitas, confeti) que salen, giran y caen un poco.
function Sparks({ x, y, radius, palette, delay = 0, count = 12 }: { x: number | string; y: number; radius: number; palette: string[]; delay?: number; count?: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1300, delay, easing: Easing.linear, useNativeDriver: true }).start();
  }, [t, delay]);
  const n = Math.round(count * 1.75);
  const ring = (r: number, color: string, lag: number) => (
    <Animated.View
      style={{
        position: 'absolute', width: r * 2, height: r * 2, left: -r, top: -r, borderRadius: r, borderWidth: 2.5, borderColor: color,
        opacity: t.interpolate({ inputRange: [0, lag, lag + 0.05, 1], outputRange: [0, 0, 0.8, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, lag, 1], outputRange: [0.15, 0.15, 1.15] }) }],
      }}
    />
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x as number, top: y, width: 0, height: 0 }}>
      <Animated.View
        style={{
          position: 'absolute', width: radius * 1.2, height: radius * 1.2, left: -radius * 0.6, top: -radius * 0.6, borderRadius: radius, backgroundColor: palette[0],
          opacity: t.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 0.55, 0, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2] }) }],
        }}
      />
      {ring(radius * 0.9, palette[0], 0)}
      {ring(radius * 1.2, palette[1 % palette.length], 0.12)}
      {Array.from({ length: n }, (_, i) => {
        const r0 = ((i * 7919) % 100) / 100;
        const a = (i / n) * Math.PI * 2 + r0 * 0.5;
        const r = radius * (0.7 + r0 * 0.75);
        const shape = i % 3;
        const size = 4 + (i % 4) * 1.6;
        const dims = shape === 1 ? { width: size * 2.6, height: Math.max(2, size * 0.42), borderRadius: 2 } : shape === 2 ? { width: size, height: size * 0.62, borderRadius: 1.5 } : { width: size, height: size, borderRadius: size / 2 };
        const fall = 30 + r0 * 50;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: -dims.width / 2, top: -dims.height / 2, ...dims, backgroundColor: palette[i % palette.length],
              opacity: t.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.cos(a) * r * 0.78, Math.cos(a) * r] }) },
                { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(a) * r * 0.78 + fall * 0.25, Math.sin(a) * r + fall] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${(a * 180) / Math.PI}deg`, `${(a * 180) / Math.PI + (i % 2 ? 1 : -1) * (180 + r0 * 360)}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// Halo que late detrás del ícono principal.
function Halo({ size, color }: { size: number; color: string }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
      }}
    />
  );
}

// Rayos de luz que giran lento detrás del ícono. Cada rayo es una barra que cruza el centro, así quedan siempre centrados.
function Rays({ size, color }: { size: number; color: string }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      {Array.from({ length: 6 }, (_, i) => (
        <LinearGradient
          key={i}
          colors={['rgba(0,0,0,0)', color, 'rgba(0,0,0,0)']}
          style={{ position: 'absolute', width: 10, height: size, left: size / 2 - 5, top: 0, opacity: 0.16, borderRadius: 5, transform: [{ rotate: `${i * 30}deg` }] }}
        />
      ))}
    </Animated.View>
  );
}

// Monedas que caen desde arriba cuando hay Puntos.
function CoinRain({ count = 10 }: { count?: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1800, delay: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [t]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const x = ((i * 37) % 100) / 100;
        const d = ((i * 53) % 40) / 100;
        return (
          <Animated.Image
            key={i}
            source={coin}
            style={{
              position: 'absolute', left: `${6 + x * 86}%`, top: -40, width: 22 + (i % 3) * 4, height: 22 + (i % 3) * 4, borderRadius: 14,
              opacity: t.interpolate({ inputRange: [0, d, d + 0.05, 0.92, 1], outputRange: [0, 0, 1, 1, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, d, 1], outputRange: [0, 0, 640 + (i % 4) * 60] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 280}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// Avisa al lector de pantalla y, si se pide, le lleva el foco al título (para las hojas que tapan la pantalla).
function useAnnounce(message: string, focusTitle: boolean) {
  const titleRef = useRef<Text>(null);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    if (!focusTitle) return;
    const id = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return titleRef;
}

const messageOf = (c: { title: string; body?: string; points?: number }) =>
  [c.title, c.body, c.points ? `${c.points} Puntos` : null].filter(Boolean).join('. ');

function PointsPill({ points, big }: { points: number; big?: boolean }) {
  const t = useState(() => new Animated.Value(0))[0];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    t.addListener(({ value }) => setShown(Math.round(points * value)));
    Animated.timing(t, { toValue: 1, duration: 900, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(points));
    return () => t.removeAllListeners();
  }, [t, points]);
  const pop = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 1.08, 1] });
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${points} Puntos`}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', borderRadius: 18, paddingVertical: big ? 8 : 6, paddingHorizontal: big ? 20 : 16,
        backgroundColor: big ? 'rgba(226,179,60,0.16)' : '#FFF3D1', borderWidth: big ? 1 : 0, borderColor: 'rgba(226,179,60,0.5)', transform: [{ scale: pop }],
      }}
    >
      <Image source={coin} style={{ width: big ? 26 : 20, height: big ? 26 : 20, borderRadius: 13 }} />
      <Text style={{ fontWeight: '900', fontSize: big ? 26 : 20, color: big ? '#FFD97A' : colors.goldInk, fontVariant: ['tabular-nums'] }}>+{shown}</Text>
    </Animated.View>
  );
}

const TOAST_ICON: Record<ToastIcon, (p: { size: number; color: string }) => React.ReactElement> = {
  flame: (p) => <Flame {...p} />, gift: (p) => <Gift {...p} />, check: (p) => <Check {...p} />, users: (p) => <Users {...p} />,
};

function Toast({ c, onDone }: { c: Extract<Celebration, { kind: 'toast' }>; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  // Abajo se usa cuando el aviso taparía el título de la pantalla (p. ej. en un grupo).
  const sign = c.at === 'bottom' ? 1 : -1;
  const y = useState(() => new Animated.Value(sign * 120))[0];
  useEffect(() => {
    buzz.light();
    // En iOS se anuncia a mano; en Android y web lo anuncia la live region del aviso.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(messageOf(c));
    Animated.spring(y, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }).start();
    const id = setTimeout(() => {
      Animated.timing(y, { toValue: sign * 140, duration: 260, useNativeDriver: true }).start(onDone);
    }, 3400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, ...(c.at === 'bottom' ? { bottom: insets.bottom + 84 } : { top: insets.top + 8 }), transform: [{ translateY: y }] }}>
      <Press accessibilityRole="alert" accessibilityLiveRegion="polite" onPress={onDone}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: '#fff',
            borderWidth: 1, borderColor: '#E9E4F5', elevation: 8, shadowColor: '#2b2350', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.icon === 'flame' ? '#FFE6D4' : colors.light.aquaLight, alignItems: 'center', justifyContent: 'center' }}>
            {TOAST_ICON[c.icon]({ size: 20, color: c.icon === 'flame' ? colors.warn : colors.aqua })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: colors.light.text }}>{c.title}</Text>
            {c.body ? <Text style={{ fontSize: 12, color: colors.light.muted, marginTop: 1 }}>{c.body}</Text> : null}
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

// Aro que se dibuja alrededor del check.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function DrawnRing({ size, color, delay }: { size: number; color: string; delay: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [t, delay]);
  const r = size / 2 - 4;
  const C = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(98,240,182,0.18)" strokeWidth={5} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={5} strokeLinecap="round" fill="none"
        strokeDasharray={`${C} ${C}`} strokeDashoffset={t.interpolate({ inputRange: [0, 1], outputRange: [C, 0] })} />
    </Svg>
  );
}

function Sheet({ c, onDone }: { c: Extract<Celebration, { kind: 'sheet' }>; onDone: () => void }) {
  const y = useState(() => new Animated.Value(420))[0];
  const fade = useState(() => new Animated.Value(0))[0];
  const check = useState(() => new Animated.Value(0))[0];
  const title = useState(() => new Animated.Value(0))[0];
  const titleRef = useAnnounce(messageOf(c), true);
  useEffect(() => {
    buzz.success();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      Animated.sequence([Animated.delay(650), Animated.spring(check, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(500), Animated.timing(title, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true })]),
    ]).start();
  }, [y, fade, check, title]);
  function close() {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(y, { toValue: 420, duration: 220, useNativeDriver: true }),
    ]).start(onDone);
  }
  const rise = { opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18,10,30,0.55)', opacity: fade }}>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar" style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: y }], borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
        <LinearGradient colors={['#3B2577', '#241748', '#1a1330']} locations={[0, 0.55, 1]} style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 34, paddingHorizontal: 24 }}>
          {/* Luz menta detrás del ícono */}
          <Svg pointerEvents="none" width={320} height={320} style={{ position: 'absolute', top: -80 }}>
            <Defs>
              <RadialGradient id="sheetGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#62F0B6" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#62F0B6" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={160} cy={160} r={160} fill="url(#sheetGlow)" />
          </Svg>
          {c.points ? <CoinRain count={8} /> : null}
          <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
            <View pointerEvents="none" style={{ position: 'absolute', width: 240, height: 240, left: -72, top: -72 }}>
              <Rays size={240} color="#62F0B6" />
            </View>
            <Halo size={96} color="#62F0B6" />
            <DrawnRing size={96} color="#62F0B6" delay={200} />
            <Animated.View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: '#62F0B6', alignItems: 'center', justifyContent: 'center', transform: [{ scale: check }] }}>
              <Check size={34} color="#14093a" />
            </Animated.View>
            {c.sparks !== false && <Sparks x={48} y={48} radius={110} palette={['#62F0B6', '#FFD97A', '#C4B8E8', '#8B4FD1']} delay={700} count={14} />}
          </View>
          <Animated.View style={[{ alignItems: 'center', marginTop: 18 }, rise]}>
            <Text ref={titleRef} accessibilityRole="header" style={{ color: '#fff', ...wordmark(22), textAlign: 'center', letterSpacing: 0.3 }}>{c.title.toUpperCase()}</Text>
            {c.body ? <Text style={{ fontSize: 14, color: '#C4B8E8', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{c.body}</Text> : null}
          </Animated.View>
          {c.points ? <View style={{ marginTop: 16 }}><PointsPill points={c.points} big /></View> : null}
          <Press accessibilityRole="button" onPress={close} style={{ alignSelf: 'stretch', marginTop: 22, backgroundColor: '#62F0B6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>{c.cta ?? '¡Genial!'}</Text>
          </Press>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function Win({ c, onDone }: { c: Extract<Celebration, { kind: 'win' }>; onDone: () => void }) {
  const fade = useState(() => new Animated.Value(0))[0];
  const pop = useState(() => new Animated.Value(0))[0];
  const titleRef = useAnnounce(messageOf(c), true);
  useEffect(() => {
    buzz.success();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.sequence([Animated.delay(200), Animated.spring(pop, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true })]),
    ]).start();
  }, [fade, pop]);
  return (
    <Animated.View accessibilityViewIsModal style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <LinearGradient colors={['#2A1F4D', '#15112A']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <CoinRain count={12} />
        {/* Trofeo, rayos y destello comparten el mismo centro. */}
        <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
          <View pointerEvents="none" style={{ position: 'absolute', width: 300, height: 300, left: -98, top: -98 }}>
            <Rays size={300} color="#FFD97A" />
          </View>
          <Halo size={104} color={GOLD} />
          <Animated.View
            style={{
              width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 2, borderColor: GOLD,
              alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }],
            }}
          >
            <Trophy size={52} color="#FFD97A" />
          </Animated.View>
          <Sparks x={52} y={52} radius={120} palette={GOLD_SPARKS} delay={350} count={16} />
        </View>
        <Text ref={titleRef} accessibilityRole="header" style={{ color: '#fff', ...wordmark(24), marginTop: 30, textAlign: 'center' }}>{c.title}</Text>
        {c.body ? <Text style={{ color: '#B9B0D4', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{c.body}</Text> : null}
        <Text style={{ color: '#B9B0D4', fontSize: 13, marginTop: 24 }}>Te llevaste</Text>
        <View style={{ marginTop: 8 }}><PointsPill points={c.points} big /></View>
        <Press accessibilityRole="button" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 34, backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#3a2a00', fontWeight: '900', fontSize: 15 }}>¡Genial!</Text>
        </Press>
      </LinearGradient>
    </Animated.View>
  );
}

// Muestra una celebración a la vez (las demás esperan en cola).
export function CelebrationHost() {
  const current = useCelebrationStore((s) => s.queue[0]);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  // Un teclado abierto de la pantalla de atrás (ej. el numérico de la meta) taparía la escena.
  useEffect(() => {
    if (current) Keyboard.dismiss();
  }, [current?.id]);
  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
      {current.kind === 'toast' && <Toast key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'sheet' && <Sheet key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'win' && <Win key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'challenge-joined' && <ChallengeJoinedScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'challenge-ended' && <ChallengeEndedScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'ticket-bought' && <TicketBoughtScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'event-joined' && <EventJoinedScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'group-joined' && <GroupJoinedScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'group-created' && <GroupCreatedScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'friend-made' && <FriendMadeScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'streak-milestone' && <StreakScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'streak-week' && <StreakWeekScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'group-goal' && <GroupGoalScene key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'ranking-result' && <RankingResultScene key={current.id} c={current} onDone={dismiss} />}
    </View>
  );
}
