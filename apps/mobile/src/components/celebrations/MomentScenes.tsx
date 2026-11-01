import { useEffect } from 'react';
import { Linking, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/store/useAuthStore';
import { Coin } from '@/components/ui/Coin';
import { Glass } from '@/components/ui/Glass';
import { Flame, Trophy, Users } from '@/components/icons';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { CrownMark } from '@/components/CrownMark';
import { colors } from '@/theme/tokens';
import { buzz } from '@/lib/haptics';
import { participantsLabel } from '@/lib/promo';
import {
  type Timeline, Burst, CAMINA_SPARKS, display, Eyebrow, FlyingCoin, GOLD, GOLD_SPARKS, GroupOrbit, LinkButton, MainButton, Avatar, Reveal, ringPeople, Stage, Stamp,
  useBeat, useCount, usePalette, useTimeline, DrawRing, EASE, type CinePerson,
} from '@/components/challenge/ChallengeCinematics';

// Escenas de momentos grandes (no son desafíos): comprar entrada con Puntos, anotarse a un evento, unirse a un grupo o crearlo,
// hacerse amigos y las rachas de 30 y 100 días. Usan el mismo kit que los desafíos: línea de tiempo, saltar con un toque,
// "reducir movimiento" sin vuelos ni chispas y háptico en cada golpe.

export type TicketBoughtCinematic = { kind: 'ticket-bought'; title: string; business?: string; when: string; place?: string; points: number; balanceBefore: number };
export type EventJoinedCinematic = { kind: 'event-joined'; title: string; day: number; month: string; when: string; place?: string; placeUrl?: string | null; participants: number };
export type GroupJoinedCinematic = { kind: 'group-joined'; name: string; me: CinePerson; others: CinePerson[]; total: number; goalText?: string };
export type GroupCreatedCinematic = { kind: 'group-created'; name: string; me: CinePerson; code: string; onInvite?: () => void };
export type FriendMadeCinematic = { kind: 'friend-made'; me: CinePerson; friend: CinePerson; onCreateGroup?: () => void; onRanking?: () => void };
export type StreakCinematic = { kind: 'streak-milestone'; days: number };
export type StreakWeekCinematic = { kind: 'streak-week'; weeks: number; points: number };
export type GroupGoalCinematic = { kind: 'group-goal'; name: string; total: number; target: number; people: (CinePerson & { steps: number })[]; onShare?: () => void };
export type RankingResultCinematic = { kind: 'ranking-result'; position: number; steps: number; weekLabel: string; me: CinePerson; onRanking?: () => void };

const INK = '#2a1650';
const INK_SOFT = '#6b5a8a';
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

// Papel del boleto: claro en los dos modos, con letras oscuras.
function usePaper() {
  const p = usePalette();
  return { paper: p.dark ? '#F6F2FF' : '#FFFFFF', line: p.dark ? 'rgba(255,255,255,0.0)' : 'rgba(91,49,163,0.16)' };
}

function Letters({ tl, text, delay, size, color }: { tl: Parameters<typeof Reveal>[0]['tl']; text: string; delay: number; size: number; color: string }) {
  const letters = Array.from(text);
  const small = letters.length > 16;
  return (
    <View accessible accessibilityLabel={text} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {letters.map((ch, i) => (
        <Reveal key={i} tl={tl} delay={delay + Math.min(i, 14) * 60} pop from={0.6}>
          <Text style={{ ...display(small ? size - 6 : size), color, lineHeight: (small ? size - 6 : size) * 1.2 }}>{ch === ' ' ? ' ' : ch}</Text>
        </Reveal>
      ))}
    </View>
  );
}

// Perforación del boleto: línea punteada con dos muescas a los lados.
function Perforation({ bg }: { bg: string }) {
  return (
    <View style={{ height: 18, alignSelf: 'stretch', justifyContent: 'center', marginVertical: 4 }}>
      <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(107,90,138,0.4)' }} />
      <View style={{ position: 'absolute', left: -26, width: 18, height: 18, borderRadius: 9, backgroundColor: bg }} />
      <View style={{ position: 'absolute', right: -26, width: 18, height: 18, borderRadius: 9, backgroundColor: bg }} />
    </View>
  );
}

// =====================================================================
// 1) Entrada comprada con Puntos
// =====================================================================

const TICKET_H = 214;

export function TicketBoughtScene({ c, onDone }: { c: TicketBoughtCinematic; onDone: () => void }) {
  const p = usePalette();
  const { paper, line } = usePaper();
  const tl = useTimeline(3400);
  const balance = useCount(tl, c.balanceBefore, Math.max(0, c.balanceBefore - c.points), 650, 800);
  const out = useBeat(tl, 1500, { duration: 1000 });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: -TICKET_H * (1 - out.value) }] }));
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    [0, 1, 2, 3, 4].forEach((i) => tl.at(700 + i * 130 + 520, buzz.selection));
    [0, 1, 2].forEach((i) => tl.at(1600 + i * 280, buzz.light));
    tl.at(2650, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`Tienes tu entrada para ${c.title}. Se descontaron ${c.points} Puntos.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{c.business ? `${c.title} · ${c.business}` : c.title}</Eyebrow></Reveal>
      <Reveal tl={tl} delay={350} pop from={0.8} style={{ marginTop: 14 }}>
        <View accessible accessibilityLabel={`Saldo ${balance} Puntos`} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassLine }}>
          <Coin size={20} />
          <Text style={{ fontWeight: '800', fontSize: 17, color: p.text, fontVariant: ['tabular-nums'] }}>{balance}</Text>
          {/* Las monedas salen del saldo y caen a la ranura. */}
          <View style={{ position: 'absolute', left: 24, top: 18 }}>
            {[0, 1, 2, 3, 4].map((i) => <FlyingCoin key={i} tl={tl} delay={700 + i * 130} dx={(i - 2) * 6} dy={-86} size={20} />)}
          </View>
        </View>
      </Reveal>
      <View style={{ alignSelf: 'stretch', marginTop: 70 }}>
        <Reveal tl={tl} delay={900} dy={0}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: p.dark ? '#0b0614' : 'rgba(91,49,163,0.35)', marginHorizontal: -4 }} />
        </Reveal>
        <View style={{ height: TICKET_H, overflow: 'hidden', marginTop: -4, marginHorizontal: 8 }}>
          <Animated.View style={[{ backgroundColor: paper, borderRadius: 18, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, borderWidth: 1, borderColor: line, height: TICKET_H - 6 }, slide]}>
            <Text style={{ ...display(13), color: INK_SOFT, letterSpacing: 2 }}>ENTRADA</Text>
            <Text numberOfLines={2} style={{ ...display(24), color: INK, marginTop: 6, lineHeight: 29 }}>{c.title}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: INK, marginTop: 8 }}>{c.when}</Text>
            {c.place ? <Text numberOfLines={1} style={{ fontSize: 13, color: INK_SOFT, marginTop: 2 }}>{c.place}</Text> : null}
            <View style={{ flex: 1 }} />
            <Perforation bg={p.dark ? '#1c1030' : '#F1EBFA'} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Coin size={16} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{c.points} Puntos</Text>
            </View>
          </Animated.View>
        </View>
        <Stamp tl={tl} delay={2500} rotate={-8} style={{ position: 'absolute', right: 24, top: 10 + TICKET_H - 70 }}>
          <View style={{ borderWidth: 3, borderColor: colors.aquaDeep, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(127,237,196,0.28)' }}>
            <Text style={{ ...display(18), color: colors.aquaDeep, letterSpacing: 1.5 }}>PAGADA</Text>
          </View>
        </Stamp>
        <Burst tl={tl} delay={2650} palette={CAMINA_SPARKS} count={16} radius={100} style={{ right: 80, top: 10 + TICKET_H - 52 }} />
      </View>
      <Reveal tl={tl} delay={2650} pop from={0.6} style={{ marginTop: 22 }}>
        <Text style={{ ...display(28), color: p.text, textAlign: 'center' }}>¡Tienes tu entrada!</Text>
      </Reveal>
      <Reveal tl={tl} delay={2850} dy={20} style={{ alignSelf: 'stretch', marginTop: 22 }}>
        <MainButton label="Listo" onPress={onDone} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 2) Anotarse a un evento: la tarjeta se da vuelta y queda el boleto
// =====================================================================

const CARD_H = 176;

export function EventJoinedScene({ c, onDone }: { c: EventJoinedCinematic; onDone: () => void }) {
  const p = usePalette();
  const { paper, line } = usePaper();
  const tl = useTimeline(3000);
  const k = useBeat(tl, 800, { duration: 950 });
  const front = useAnimatedStyle(() => {
    const deg = k.value * 180;
    return { opacity: deg < 90 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${deg}deg` }] };
  });
  const back = useAnimatedStyle(() => {
    const deg = k.value * 180;
    return { opacity: deg >= 90 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${deg - 180}deg` }] };
  });
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.medium();
    tl.at(1250, buzz.light);
    tl.at(2000, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openMap = () => {
    if (c.placeUrl && /^https?:\/\//i.test(c.placeUrl)) Linking.openURL(c.placeUrl).catch(() => {});
  };
  return (
    <Stage tl={tl} announce={`Ya estás anotado en ${c.title}. ${c.day} de ${c.month}, ${c.when}.${c.place ? ` ${c.place}.` : ''}`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>Ya estás anotado</Eyebrow></Reveal>
      <Reveal tl={tl} delay={300} pop from={0.8} style={{ alignSelf: 'stretch', marginTop: 18 }}>
        <View style={{ height: CARD_H }}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, overflow: 'hidden' }, front]}>
            <LinearGradient colors={[colors.purple, '#3b2a78', '#2b7f74']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 20, justifyContent: 'flex-end' }}>
              <Text numberOfLines={3} style={{ ...display(28), color: '#fff', lineHeight: 33 }}>{c.title}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{c.day} {c.month} · {c.when}</Text>
            </LinearGradient>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, backgroundColor: paper, borderWidth: 1, borderColor: line, padding: 18 }, back]}>
            <Text numberOfLines={2} style={{ ...display(20), color: INK, lineHeight: 25, paddingRight: 70 }}>{c.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <View style={{ width: 64, height: 72, borderRadius: 16, backgroundColor: 'rgba(91,49,163,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.purple, letterSpacing: 1.2, textTransform: 'uppercase' }}>{c.month}</Text>
                <Text style={{ ...display(34), color: INK, lineHeight: 40 }}>{c.day}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>{c.when}</Text>
                {c.place ? <Text numberOfLines={2} style={{ fontSize: 13.5, color: INK_SOFT }}>{c.place}</Text> : null}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.aquaDeep }}>{participantsLabel(c.participants)}</Text>
              </View>
            </View>
            <Stamp tl={tl} delay={1850} rotate={8} style={{ position: 'absolute', right: 14, top: 14 }}>
              <View style={{ borderWidth: 2.5, borderColor: colors.aquaDeep, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(127,237,196,0.28)' }}>
                <Text style={{ ...display(15), color: colors.aquaDeep, letterSpacing: 1 }}>¡VOY!</Text>
              </View>
            </Stamp>
          </Animated.View>
          <Burst tl={tl} delay={1950} palette={CAMINA_SPARKS} count={16} radius={110} style={{ left: '50%', top: '50%' }} />
        </View>
      </Reveal>
      <Reveal tl={tl} delay={2200} dy={20} style={{ alignSelf: 'stretch', marginTop: 28 }}>
        {c.placeUrl ? (
          <>
            <MainButton label="Cómo llegar" onPress={openMap} />
            <LinkButton label="Listo" onPress={onDone} color={p.muted} />
          </>
        ) : (
          <MainButton label="Listo" onPress={onDone} />
        )}
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 3) Unirse a un grupo
// =====================================================================

export function GroupJoinedScene({ c, onDone }: { c: GroupJoinedCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3300);
  const { shown, extra } = ringPeople(c.others);
  const total = useCount(tl, Math.max(1, c.total - 1), c.total, 1550, 450);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.medium();
    tl.at(1450, buzz.light);
    tl.at(1950, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`Ya eres parte de ${c.name}. ${c.total} caminantes.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{c.name}</Eyebrow></Reveal>
      <View style={{ marginTop: 22 }}>
        <GroupOrbit
          tl={tl}
          people={shown}
          extra={extra}
          me={c.me}
          meDelay={900}
          center={
            <View accessible accessibilityLabel={`${c.total} caminantes`} style={{ alignItems: 'center' }}>
              <Text style={{ ...display(54), color: p.text, fontVariant: ['tabular-nums'], lineHeight: 60 }}>{total}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: p.muted }}>{c.total === 1 ? 'caminante' : 'caminantes'}</Text>
            </View>
          }
        />
      </View>
      <Reveal tl={tl} delay={2000} pop from={0.6} style={{ marginTop: 26 }}>
        <Text style={{ ...display(28), color: p.text, textAlign: 'center' }}>¡Ya eres parte del grupo!</Text>
      </Reveal>
      <Reveal tl={tl} delay={2200}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 290 }}>{c.goalText ?? 'Caminar juntos suma más.'}</Text>
      </Reveal>
      <Reveal tl={tl} delay={2450} dy={20} style={{ alignSelf: 'stretch', marginTop: 28 }}>
        <MainButton label="Ver el grupo" onPress={onDone} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 4) Crear un grupo
// =====================================================================

export function GroupCreatedScene({ c, onDone }: { c: GroupCreatedCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3400);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(1450, buzz.medium);
    tl.at(2050, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`Grupo ${c.name} creado. Código ${Array.from(c.code).join(' ')}.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>Nuevo grupo</Eyebrow></Reveal>
      <View style={{ marginTop: 8 }}>
        <Letters tl={tl} text={c.name} delay={350} size={30} color={p.text} />
      </View>
      <View style={{ marginTop: 34 }}>
        <GroupOrbit
          tl={tl}
          delay={900}
          people={[]}
          me={c.me}
          emptySlots={5}
          closeRing={false}
          meDelay={1300}
          center={
            <View style={{ alignItems: 'center' }}>
              <Users size={30} color={p.accent} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: p.muted, marginTop: 4 }}>Tu grupo</Text>
            </View>
          }
        />
      </View>
      <Reveal tl={tl} delay={2050} pop from={0.6} style={{ marginTop: 20 }}>
        <Text style={{ ...display(26), color: p.text, textAlign: 'center' }}>¡Grupo creado!</Text>
      </Reveal>
      <Reveal tl={tl} delay={2250}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 4, lineHeight: 20, maxWidth: 280 }}>Invita a tus amigos: caminar juntos suma más.</Text>
      </Reveal>
      <Reveal tl={tl} delay={2400} pop from={0.8} style={{ marginTop: 12 }}>
        <View accessible accessibilityLabel={`Código ${Array.from(c.code).join(' ')}`} style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassLine }}>
          <Text style={{ ...display(18), color: p.text, letterSpacing: 5 }}>{c.code}</Text>
        </View>
        <Burst tl={tl} delay={2450} palette={CAMINA_SPARKS} count={14} radius={90} style={{ left: '50%', top: '50%' }} />
      </Reveal>
      <Reveal tl={tl} delay={2650} dy={20} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <MainButton label="Invitar amigos" onPress={() => { onDone(); c.onInvite?.(); }} />
        <LinkButton label="Ir al grupo" onPress={onDone} color={p.accent} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 5) Amistad aceptada
// =====================================================================

function Pulse({ tl, delay, size }: { tl: Parameters<typeof Reveal>[0]['tl']; delay: number; size: number }) {
  const k = useSharedValue(0);
  useEffect(() => {
    if (tl.reduced) return;
    k.value = withDelay(delay, withTiming(1, { duration: 900, easing: EASE }));
    tl.onSkip(() => { k.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: k.value <= 0 || k.value >= 1 ? 0 : 0.7 * (1 - k.value), transform: [{ scale: 0.6 + 1.5 * k.value }] }));
  if (tl.reduced) return null;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: colors.mint }, a]} />;
}

export function FriendMadeScene({ c, onDone }: { c: FriendMadeCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(2800);
  const a = useBeat(tl, 350, { spring: true });
  const b = useBeat(tl, 350, { spring: true });
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -170 * (1 - a.value) }, { scale: 0.7 + 0.3 * a.value }], opacity: Math.min(1, a.value * 3) }));
  const bStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 170 * (1 - b.value) }, { scale: 0.7 + 0.3 * b.value }], opacity: Math.min(1, b.value * 3) }));
  const name = first(c.friend.name);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(780, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const SIZE = 92;
  return (
    <Stage tl={tl} announce={`Ahora ${name} y tú son amigos.`}>
      <View style={{ width: SIZE * 2 - 20, height: SIZE + 10, alignItems: 'center', justifyContent: 'center' }}>
        <Pulse tl={tl} delay={800} size={SIZE * 2} />
        <Animated.View style={[{ position: 'absolute', left: 0 }, aStyle]}>
          <View style={{ borderRadius: SIZE / 2, borderWidth: 4, borderColor: p.dark ? '#1c1030' : '#fff' }}><Avatar p={c.me} size={SIZE - 8} /></View>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', right: 0 }, bStyle]}>
          <View style={{ borderRadius: SIZE / 2, borderWidth: 4, borderColor: p.dark ? '#1c1030' : '#fff' }}><Avatar p={c.friend} size={SIZE - 8} /></View>
        </Animated.View>
        <Burst tl={tl} delay={800} palette={CAMINA_SPARKS} count={16} radius={110} style={{ left: '50%', top: '50%' }} />
      </View>
      <Reveal tl={tl} delay={1000} pop from={0.6} style={{ marginTop: 30 }}>
        <Text style={{ ...display(30), color: p.text, textAlign: 'center' }}>¡Ahora son amigos!</Text>
      </Reveal>
      <Reveal tl={tl} delay={1200}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 280 }}>{name} y tú ya pueden compararse en el ranking o armar un grupo.</Text>
      </Reveal>
      <Reveal tl={tl} delay={1450} dy={20} style={{ alignSelf: 'stretch', marginTop: 34 }}>
        {c.onCreateGroup ? <MainButton label={`Crear grupo con ${name}`} onPress={() => { onDone(); c.onCreateGroup?.(); }} /> : <MainButton label="Listo" onPress={onDone} />}
        {c.onRanking ? <LinkButton label="Ver ranking de amigos" onPress={() => { onDone(); c.onRanking?.(); }} color={p.accent} /> : null}
        {c.onCreateGroup || c.onRanking ? <LinkButton label="Cerrar" onPress={onDone} color={p.muted} /> : null}
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 6) Racha de 30 y 100 días
// =====================================================================

export function StreakScene({ c, onDone }: { c: StreakCinematic; onDone: () => void }) {
  const p = usePalette();
  const big = c.days >= 100;
  const tl = useTimeline(3200);
  const days = useCount(tl, 1, c.days, 500, 1500);
  const grow = useBeat(tl, 300, { duration: 1700 });
  const flame = big ? '#FFB92E' : colors.warn;
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.35 + 0.65 * grow.value }, { translateY: (1 - grow.value) * 20 }] }));
  const glow = useAnimatedStyle(() => ({ opacity: grow.value, transform: [{ scale: 0.6 + 0.4 * grow.value }] }));
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    [0, 1, 2, 3, 4, 5].forEach((i) => tl.at(500 + i * 280, buzz.selection));
    tl.at(2100, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => { Share.share({ message: `Llevo ${c.days} días seguidos cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} announce={`${c.days} días seguidos de racha.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>Racha</Eyebrow></Reveal>
      <View style={{ width: 200, height: 170, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, glow]}>
          {[210, 165, 120].map((d) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: flame, opacity: 0.1 }} />)}
        </Animated.View>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, flameStyle]}>
          <IllArt kind="flame" size={150} />
        </Animated.View>
        <Burst tl={tl} delay={2000} palette={big ? GOLD_SPARKS : [colors.warn, '#FFD97A', '#FFF1B8']} count={20} radius={120} style={{ left: '50%', top: '50%' }} />
      </View>
      {/* El número va debajo de la llama, bien grande, para que no se pierda contra el dibujo. */}
      <View accessible accessibilityLabel={`${c.days} días seguidos`} style={{ alignItems: 'center', marginTop: 6 }}>
        <Text allowFontScaling={false} style={{ ...display(76), color: flame, fontVariant: ['tabular-nums'], textAlign: 'center', lineHeight: 84, minWidth: 160 }}>{days}</Text>
        <Reveal tl={tl} delay={2050} pop from={0.6}>
          <Text style={{ ...display(24), color: p.text, textAlign: 'center' }}>días seguidos</Text>
        </Reveal>
      </View>
      <Reveal tl={tl} delay={2250}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 280 }}>
          {big ? 'Cien días cumpliendo tu meta. Eres imparable.' : 'Un mes entero cumpliendo tu meta.'}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={2450} dy={20} style={{ alignSelf: 'stretch', marginTop: 30 }}>
        <MainButton bg={flame} label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={p.accent} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 7) Racha semanal completa: las 7 casillas se llenan y llegan los Puntos
// =====================================================================

export function StreakWeekScene({ c, onDone }: { c: StreakWeekCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3600);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    [0, 1, 2, 3, 4, 5, 6].forEach((i) => tl.at(500 + i * 190, buzz.selection));
    tl.at(2000, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => { Share.share({ message: `Completé ${c.weeks === 1 ? 'una semana' : `${c.weeks} semanas`} seguidas cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} announce={`Semana completa. Ganaste ${c.points} Puntos de racha.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>Racha semanal</Eyebrow></Reveal>
      <Reveal tl={tl} delay={300} pop from={0.4} style={{ marginTop: 18 }}>
        <IllArt kind="flame" size={104} />
      </Reveal>
      <View accessible accessibilityLabel="7 de 7 días" style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch', marginTop: 26 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Reveal key={i} tl={tl} delay={500 + i * 190} pop from={0.3} style={{ flex: 1 }}>
            <View style={{ height: 44, borderRadius: 12, backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center' }}>
              {i === 6 ? <Text style={{ fontWeight: '900', fontSize: 14, color: '#fff' }}>+{c.points}</Text> : <Flame size={18} color="#fff" weight="fill" />}
            </View>
          </Reveal>
        ))}
      </View>
      <View style={{ height: 0, alignSelf: 'stretch', alignItems: 'flex-end' }}>
        <Burst tl={tl} delay={2000} palette={[colors.warn, '#FFD97A', '#FFF1B8', colors.aqua]} count={18} radius={110} style={{ right: 26, top: -30 }} />
      </View>
      <Reveal tl={tl} delay={2000} pop from={0.6} style={{ marginTop: 34 }}>
        <Text style={{ ...display(30), color: p.text, textAlign: 'center' }}>¡Semana completa!</Text>
      </Reveal>
      <Reveal tl={tl} delay={2250} pop from={0.7} style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.5)' }}>
          <Coin size={24} />
          <Text style={{ fontWeight: '900', fontSize: 24, color: '#FFD97A', fontVariant: ['tabular-nums'] }}>+{c.points} Puntos</Text>
        </View>
      </Reveal>
      <Reveal tl={tl} delay={2450}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 12, lineHeight: 20, maxWidth: 280 }}>
          {c.weeks > 1 ? `Ya son ${c.weeks} semanas seguidas cumpliendo tu meta.` : '7 días seguidos cumpliendo tu meta.'}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={2650} dy={20} style={{ alignSelf: 'stretch', marginTop: 28 }}>
        <MainButton bg={colors.warn} label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={p.accent} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 8) Meta del grupo cumplida: la barra se llena y salta el trofeo
// =====================================================================

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3600);
  const fill = useBeat(tl, 600, { duration: 1300 });
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const steps = useCount(tl, 0, c.total, 600, 1300);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 4);
  const rest = sorted.length - top.length;
  const maxSteps = Math.max(1, top[0]?.steps ?? 1);
  const meId = useAuthStore((st) => st.session?.user.id);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    [0, 1, 2, 3, 4].forEach((i) => tl.at(650 + i * 260, buzz.selection));
    tl.at(1950, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{`Meta del grupo · ${c.name}`}</Eyebrow></Reveal>
      <Reveal tl={tl} delay={1950} pop from={0.3} style={{ marginTop: 12 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(226,179,60,0.16)', borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={48} color="#FFD97A" weight="fill" />
        </View>
      </Reveal>
      <View style={{ position: 'absolute', top: '36%', left: '50%' }} pointerEvents="none">
        <Burst tl={tl} delay={1950} palette={GOLD_SPARKS} count={20} radius={130} />
      </View>
      <View accessible accessibilityLabel={`${steps} de ${c.target} pasos`} style={{ alignSelf: 'stretch', marginTop: 22 }}>
        <Text allowFontScaling={false} style={{ ...display(40), color: p.text, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{steps.toLocaleString('es-BO')}</Text>
        <Text style={{ fontSize: 13, color: p.muted, textAlign: 'center', marginTop: 2 }}>de {c.target.toLocaleString('es-BO')} pasos</Text>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: p.glass, overflow: 'hidden', marginTop: 14, borderWidth: 1, borderColor: p.glassLine }}>
          <Animated.View style={[{ height: '100%', borderRadius: 7, backgroundColor: colors.aqua }, bar]} />
        </View>
      </View>
      <Reveal tl={tl} delay={2050} pop from={0.6} style={{ marginTop: 24 }}>
        <Text style={{ ...display(28), color: p.text, textAlign: 'center' }}>¡Lo lograron juntos!</Text>
      </Reveal>
      <Glass className="rounded-3xl" style={{ alignSelf: 'stretch', marginTop: 16, gap: 8, padding: 12 }}>
        {top.map((q, i) => (
          <Reveal key={q.id} tl={tl} delay={2200 + i * 110} dy={10}>
            <View accessible accessibilityLabel={`${q.name}: ${q.steps} pasos`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar p={q} size={30} />
              <Text numberOfLines={1} style={{ width: 70, fontSize: 12.5, fontWeight: '700', color: p.text }}>{q.id === meId ? 'Tú' : q.name.split(' ')[0]}</Text>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: p.track, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(6, (q.steps / maxSteps) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: i === 0 ? GOLD : colors.aqua }} />
              </View>
              <Text style={{ width: 56, textAlign: 'right', fontSize: 12, color: p.muted, fontVariant: ['tabular-nums'] }}>{q.steps.toLocaleString('es-BO')}</Text>
            </View>
          </Reveal>
        ))}
        {rest > 0 ? <Reveal tl={tl} delay={2200 + top.length * 110}><Text style={{ fontSize: 12, color: p.muted, textAlign: 'center' }}>y {rest} {rest === 1 ? 'persona más' : 'personas más'}</Text></Reveal> : null}
      </Glass>
      <Reveal tl={tl} delay={2450} dy={20} style={{ alignSelf: 'stretch', marginTop: 26 }}>
        {c.onShare ? <MainButton label="Compartir con el grupo" onPress={() => { c.onShare?.(); onDone(); }} /> : <MainButton label="Genial" onPress={onDone} />}
        {c.onShare ? <LinkButton label="Seguir" onPress={onDone} color={p.accent} /> : null}
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 9) Resultado del ranking semanal global
//    1.º a 3.º: podio con tu foto en tu escalón. 4.º a 100.º: aro de cercanía a la cima con tu foto adentro.
// =====================================================================

function tierOf(position: number) {
  if (position === 1) return { key: 'oro', title: '¡Ganaste el ranking!', sub: 'Nadie en Camina caminó más que tú esta semana.', badge: '1.º' };
  if (position <= 3) return { key: 'podio', title: '¡Subiste al podio!', sub: `Fuiste ${position === 2 ? 'la segunda' : 'la tercera'} persona que más caminó en toda Camina.`, badge: `${position}.º` };
  if (position <= 10) return { key: 'top10', title: '¡Estás en el Top 10!', sub: 'Quedaste entre las 10 personas que más caminaron esta semana.', badge: 'Top 10' };
  return { key: 'top100', title: '¡Estás en el Top 100!', sub: 'Quedaste entre las 100 personas que más caminaron esta semana.', badge: 'Top 100' };
}

const RANK_H = [124, 88, 60];

function MyStep({ tl, delay, rank, me, mine }: { tl: Timeline; delay: number; rank: number; me: CinePerson; mine: boolean }) {
  const p = usePalette();
  const grow = useBeat(tl, delay, { duration: 560 });
  const g = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - Math.min(1, grow.value)) * RANK_H[rank - 1] }] }));
  const winner = rank === 1;
  const fill = mine ? (winner ? p.podWin : p.podMine) : null;
  return (
    <View style={{ width: 96, alignItems: 'center' }}>
      <View style={{ height: 78, justifyContent: 'flex-end', alignItems: 'center' }}>
        {mine ? (
          <Reveal tl={tl} delay={delay + 380} dy={-40} style={{ alignItems: 'center' }}>
            {winner ? <Reveal tl={tl} delay={delay + 900} dy={-50} style={{ position: 'absolute', top: -36 }}><CrownMark size={44} /></Reveal> : null}
            <Avatar p={me} size={54} ring={winner ? GOLD : colors.aqua} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: p.text, marginTop: 3 }}>Tú</Text>
          </Reveal>
        ) : null}
      </View>
      <View style={{ width: '100%', height: RANK_H[rank - 1], overflow: 'hidden', borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: 6 }}>
        <Animated.View style={[{ flex: 1 }, g]}>
          {fill ? (
            <LinearGradient colors={fill} style={{ flex: 1, alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ ...display(24), color: winner ? p.gold : p.accent }}>{rank}</Text>
            </LinearGradient>
          ) : (
            <View style={{ flex: 1, backgroundColor: p.pod, alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ ...display(24), color: p.muted }}>{rank}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function StatChip({ tl, delay, value, label }: { tl: Timeline; delay: number; value: string; label: string }) {
  const p = usePalette();
  return (
    <Reveal tl={tl} delay={delay} dy={14} style={{ flex: 1 }}>
      <Glass accessible accessibilityLabel={`${label}: ${value}`} className="rounded-2xl" style={{ paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' }}>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, fontWeight: '900', color: p.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
        <Text style={{ fontSize: 11, color: p.muted, marginTop: 1 }}>{label}</Text>
      </Glass>
    </Reveal>
  );
}

export function RankingResultScene({ c, onDone }: { c: RankingResultCinematic; onDone: () => void }) {
  const p = usePalette();
  const t = tierOf(c.position);
  const podium = c.position <= 3;
  const limit = c.position <= 10 ? 10 : 100;
  const tone = t.key === 'top10' ? colors.aqua : t.key === 'top100' ? colors.purple : GOLD;
  const tl = useTimeline(podium ? 4100 : 3600);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    if (podium) {
      tl.at(700, buzz.medium);
      tl.at(1500, buzz.medium);
      tl.at(2100, buzz.success);
    } else {
      [0, 1, 2, 3, 4, 5].forEach((i) => tl.at(500 + i * 150, buzz.selection));
      tl.at(1500, buzz.success);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => {
    Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${c.steps.toLocaleString('es-BO')} pasos. ¿Me alcanzas?` }).catch(() => {});
  };
  const steps = [2, 1, 3];
  return (
    <Stage tl={tl} announce={`${t.title} Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Reveal tl={tl} delay={200}><Eyebrow color={p.muted}>{`Ranking semanal global · ${c.weekLabel}`}</Eyebrow></Reveal>

      {podium ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {steps.map((r, i) => <MyStep key={r} tl={tl} delay={[900, 500, 300][i === 0 ? 1 : i === 1 ? 0 : 2] + (c.position === 1 ? 600 : 0)} rank={r} me={c.me} mine={r === c.position} />)}
          {c.position === 1 ? <Burst tl={tl} delay={2100} palette={GOLD_SPARKS} count={22} radius={120} style={{ left: '50%', top: 10 }} /> : <Burst tl={tl} delay={2100} palette={[colors.aqua, GOLD, '#B7A6F0']} count={14} radius={90} style={{ left: '50%', top: 20 }} />}
        </View>
      ) : (
        <View style={{ marginTop: 22 }}>
          <DrawRing tl={tl} delay={400} size={196} stroke={10} track={p.track} color={tone} to={Math.max(0.04, 1 - (c.position - 1) / limit)} duration={1100}>
            <Reveal tl={tl} delay={500} pop from={0.5}><Avatar p={c.me} size={128} ring={p.dark ? '#1c1030' : '#fff'} /></Reveal>
          </DrawRing>
          <Reveal tl={tl} delay={1400} pop from={0.4} style={{ position: 'absolute', alignSelf: 'center', bottom: -16 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: tone }}>
              <Text allowFontScaling={false} style={{ ...display(17), color: t.key === 'top100' ? '#fff' : '#1b1030' }}>{c.position}.º</Text>
            </View>
          </Reveal>
          <Burst tl={tl} delay={1500} palette={t.key === 'top10' ? [colors.aqua, colors.mint, GOLD] : ['#B7A6F0', colors.aqua, GOLD]} count={16} radius={118} style={{ left: '50%', top: '50%' }} />
        </View>
      )}

      <Reveal tl={tl} delay={podium ? 2200 : 1550} pop from={0.6} style={{ marginTop: podium ? 18 : 34 }}>
        <Text style={{ ...display(27), color: p.text, textAlign: 'center' }}>{t.title}</Text>
      </Reveal>
      <Reveal tl={tl} delay={podium ? 2350 : 1700}>
        <Text style={{ fontSize: 13.5, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 290 }}>{t.sub}</Text>
      </Reveal>

      <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 16 }}>
        <StatChip tl={tl} delay={podium ? 2450 : 1800} value={`${c.position}.º`} label="Puesto" />
        <StatChip tl={tl} delay={podium ? 2550 : 1900} value={c.steps.toLocaleString('es-BO')} label="Pasos" />
        <StatChip tl={tl} delay={podium ? 2650 : 2000} value={Math.round(c.steps / 7).toLocaleString('es-BO')} label="Por día" />
      </View>

      <Reveal tl={tl} delay={podium ? 2900 : 2200} dy={20} style={{ alignSelf: 'stretch', marginTop: 18 }}>
        <MainButton gold={podium} label="Compartir" onPress={share} />
        <LinkButton label="Ver el ranking" onPress={() => { onDone(); c.onRanking?.(); }} color={p.accent} />
      </Reveal>
    </Stage>
  );
}
