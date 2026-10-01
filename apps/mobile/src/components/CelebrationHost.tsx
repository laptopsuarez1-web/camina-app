import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCelebrationStore, type Celebration, type ToastIcon } from '@/store/useCelebrationStore';
import { Check, Flame, Gift, Users, Trophy } from '@/components/icons';
import { colors } from '@/theme/tokens';

const GOLD = '#E2B33C';
const SPARKS = ['#4FC3A8', '#E2B33C', '#B7A6F0', '#F2985C'];
const GOLD_SPARKS = ['#E2B33C', '#FFD97A', '#FFF1B8'];
const coin = require('@/../assets/camina-coin.png');

// Chispas chicas que salen de un punto y se apagan (nada de confeti cayendo por toda la pantalla).
function Sparks({ x, y, radius, palette, delay = 0, count = 12 }: { x: number | string; y: number; radius: number; palette: string[]; delay?: number; count?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1100, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x as number, top: y, width: 0, height: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.3;
        const r = radius * (0.75 + ((i * 37) % 10) / 25);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: palette[i % palette.length],
              opacity: t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * r] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * r] }) },
                { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

function PointsPill({ points, big }: { points: number; big?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    t.addListener(({ value }) => setShown(Math.round(points * value)));
    Animated.timing(t, { toValue: 1, duration: 900, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(points));
    return () => t.removeAllListeners();
  }, [t, points]);
  const pop = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 1.08, 1] });
  return (
    <Animated.View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', borderRadius: 18, paddingVertical: big ? 8 : 6, paddingHorizontal: big ? 20 : 16,
        backgroundColor: big ? 'rgba(226,179,60,0.16)' : '#FFF3D1', borderWidth: big ? 1 : 0, borderColor: 'rgba(226,179,60,0.5)', transform: [{ scale: pop }],
      }}
    >
      <Image source={coin} style={{ width: big ? 26 : 20, height: big ? 26 : 20, borderRadius: 13 }} />
      <Text style={{ fontWeight: '900', fontSize: big ? 26 : 20, color: big ? '#FFD97A' : '#9A6A08', fontVariant: ['tabular-nums'] }}>+{shown}</Text>
    </Animated.View>
  );
}

const TOAST_ICON: Record<ToastIcon, (p: { size: number; color: string }) => React.ReactElement> = {
  flame: (p) => <Flame {...p} />, gift: (p) => <Gift {...p} />, check: (p) => <Check {...p} />, users: (p) => <Users {...p} />,
};

function Toast({ c, onDone }: { c: Extract<Celebration, { kind: 'toast' }>; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    Animated.spring(y, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }).start();
    const id = setTimeout(() => {
      Animated.timing(y, { toValue: -140, duration: 260, useNativeDriver: true }).start(onDone);
    }, 3400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, top: insets.top + 8, transform: [{ translateY: y }] }}>
      <Pressable onPress={onDone}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: '#fff',
            borderWidth: 1, borderColor: '#E9E4F5', elevation: 8, shadowColor: '#2b2350', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.icon === 'flame' ? '#FFE6D4' : '#E3F5F0', alignItems: 'center', justifyContent: 'center' }}>
            {TOAST_ICON[c.icon]({ size: 20, color: c.icon === 'flame' ? '#F2985C' : colors.aqua })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: colors.light.text }}>{c.title}</Text>
            {c.body ? <Text style={{ fontSize: 12, color: colors.light.muted, marginTop: 1 }}>{c.body}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Sheet({ c, onDone }: { c: Extract<Celebration, { kind: 'sheet' }>; onDone: () => void }) {
  const y = useRef(new Animated.Value(320)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      Animated.sequence([Animated.delay(250), Animated.spring(check, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true })]),
    ]).start();
  }, [y, fade, check]);
  function close() {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(y, { toValue: 320, duration: 200, useNativeDriver: true }),
    ]).start(onDone);
  }
  return (
    <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(43,35,80,0.32)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <Animated.View
        style={{
          transform: [{ translateY: y }], backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'center',
          paddingTop: 24, paddingBottom: 30, paddingHorizontal: 24,
        }}
      >
        <Animated.View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#E3F5F0', alignItems: 'center', justifyContent: 'center', transform: [{ scale: check }] }}>
          <Check size={30} color={colors.aqua} />
        </Animated.View>
        {c.sparks !== false && <Sparks x="50%" y={52} radius={78} palette={SPARKS} delay={250} />}
        <Text style={{ fontWeight: '800', fontSize: 19, color: colors.light.text, marginTop: 12, textAlign: 'center' }}>{c.title}</Text>
        {c.body ? <Text style={{ fontSize: 13.5, color: colors.light.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>{c.body}</Text> : null}
        {c.points ? <View style={{ marginTop: 14 }}><PointsPill points={c.points} /></View> : null}
        <Pressable onPress={close} style={{ alignSelf: 'stretch', marginTop: 18, backgroundColor: colors.aqua, borderRadius: 16, paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{c.cta ?? 'Listo'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Win({ c, onDone }: { c: Extract<Celebration, { kind: 'win' }>; onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.sequence([Animated.delay(200), Animated.spring(pop, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true })]),
    ]).start();
  }, [fade, pop]);
  return (
    <Animated.View style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <LinearGradient colors={['#2A1F4D', '#15112A']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Animated.View
          style={{
            width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 2, borderColor: GOLD,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }],
          }}
        >
          <Trophy size={52} color="#FFD97A" />
        </Animated.View>
        <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', alignItems: 'center' }} pointerEvents="none">
          <Sparks x="50%" y={-52} radius={120} palette={GOLD_SPARKS} delay={350} count={16} />
        </View>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 26, textAlign: 'center' }}>{c.title}</Text>
        {c.body ? <Text style={{ color: '#B9B0D4', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{c.body}</Text> : null}
        <Text style={{ color: '#B9B0D4', fontSize: 13, marginTop: 24 }}>Te llevaste</Text>
        <View style={{ marginTop: 8 }}><PointsPill points={c.points} big /></View>
        <Pressable onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 34, backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#3a2a00', fontWeight: '900', fontSize: 15 }}>¡Genial!</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

// Muestra una celebración a la vez (las demás esperan en cola).
export function CelebrationHost() {
  const current = useCelebrationStore((s) => s.queue[0]);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
      {current.kind === 'toast' && <Toast key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'sheet' && <Sheet key={current.id} c={current} onDone={dismiss} />}
      {current.kind === 'win' && <Win key={current.id} c={current} onDone={dismiss} />}
    </View>
  );
}
