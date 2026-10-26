import { useEffect } from 'react';
import { Linking, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Coin } from '@/components/ui/Coin';
import { Flame, Heart, Users } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { buzz } from '@/lib/haptics';
import { participantsLabel } from '@/lib/promo';
import {
  Burst, CAMINA_SPARKS, display, Eyebrow, FlyingCoin, GOLD_SPARKS, GroupOrbit, LinkButton, MainButton, Avatar, Reveal, ringPeople, Stage, Stamp,
  useBeat, useCount, usePalette, useTimeline, EASE, type CinePerson,
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
        <Reveal tl={tl} delay={900} pop from={0.2} style={{ position: 'absolute', top: -22 }}>
          <Heart size={30} color={colors.warn} weight="fill" />
        </Reveal>
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
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, glow]}>
          {[230, 180, 130].map((d) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: flame, opacity: 0.1 }} />)}
        </Animated.View>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, flameStyle]}>
          <Flame size={170} color={flame} weight="fill" />
        </Animated.View>
        <View style={{ position: 'absolute', top: 112 }}>
          <Text allowFontScaling={false} style={{ ...display(46), color: '#3a1a00', fontVariant: ['tabular-nums'], textAlign: 'center', lineHeight: 52, minWidth: 100 }}>{days}</Text>
        </View>
        <Burst tl={tl} delay={2000} palette={big ? GOLD_SPARKS : [colors.warn, '#FFD97A', '#FFF1B8']} count={20} radius={130} style={{ left: '50%', top: '50%' }} />
      </View>
      <Reveal tl={tl} delay={2050} pop from={0.6} style={{ marginTop: 12 }}>
        <Text style={{ ...display(30), color: p.text, textAlign: 'center' }}>¡{c.days} días seguidos!</Text>
      </Reveal>
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
