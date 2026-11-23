import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Linking, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { useAuthStore } from '@/store/useAuthStore';
import { Coin } from '@/components/ui/Coin';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { colors } from '@/theme/tokens';
import { Plus } from '@/components/icons';
import { BigRank, Fade, Heading, RankList, Stats, ThinBar, ThinRing, type RankEntry } from '@/components/celebrations/Calm';
import { buzz } from '@/lib/haptics';
import { participantsLabel } from '@/lib/promo';
import {
  type Timeline, Burst, CAMINA_SPARKS, display, Eyebrow, FlyingCoin, GOLD_SPARKS, LinkButton, MainButton, Avatar, Reveal, Stage, Stamp,
  useBeat, useCount, usePalette, useTimeline, EASE, type CinePerson,
} from '@/components/challenge/ChallengeCinematics';

// Escenas de momentos grandes (no son desafíos): comprar entrada con Puntos, anotarse a un evento, unirse a un grupo o crearlo,
// hacerse amigos y las rachas de 30 y 100 días. Usan el mismo kit que los desafíos: línea de tiempo, saltar con un toque,
// "reducir movimiento" sin vuelos ni chispas y háptico en cada golpe.

export type TicketBoughtCinematic = { kind: 'ticket-bought'; title: string; business?: string; when: string; place?: string; points: number; balanceBefore: number };
export type EventJoinedCinematic = { kind: 'event-joined'; title: string; day: number; month: string; when: string; place?: string; placeUrl?: string | null; participants: number };
export type GroupJoinedCinematic = { kind: 'group-joined'; name: string; me: CinePerson; others: CinePerson[]; total: number; goalText?: string };
export type GroupCreatedCinematic = { kind: 'group-created'; name: string; me: CinePerson; code: string; target?: number | null; onInvite?: () => void };
export type FriendMadeCinematic = { kind: 'friend-made'; me: CinePerson; friend: CinePerson; onCreateGroup?: () => void; onRanking?: () => void };
export type StreakCinematic = { kind: 'streak-milestone'; days: number };
export type StreakWeekCinematic = { kind: 'streak-week'; weeks: number; points: number };
export type GroupGoalCinematic = { kind: 'group-goal'; name: string; total: number; target: number; people: (CinePerson & { steps: number })[]; onShare?: () => void };
export type PodiumPerson = CinePerson & { steps: number };
// podium: los 3 primeros de la semana (índice 0 = 1.º). Si falta, los otros escalones quedan vacíos.
export type RankingResultCinematic = { kind: 'ranking-result'; position: number; steps: number; weekLabel: string; me: CinePerson; podium?: PodiumPerson[]; onRanking?: () => void };
// Cierre de la semana de un grupo: podio del grupo con fotos, tu puesto y los pasos de todos.
export type GroupWeekCinematic = { kind: 'group-week'; name: string; weekLabel: string; podium: PodiumPerson[]; meId: string; myRank: number; mySteps: number; members: number; total: number; onOpen?: () => void; onShare?: () => void };

const INK = '#2a1650';
const INK_SOFT = '#6b5a8a';
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

// Papel del boleto: claro en los dos modos, con letras oscuras.
function usePaper() {
  const p = usePalette();
  return { paper: p.dark ? '#F6F2FF' : '#FFFFFF', line: p.dark ? 'rgba(255,255,255,0.0)' : 'rgba(91,49,163,0.16)' };
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
          <View style={{ borderWidth: 3, borderColor: colors.aquaDeep, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(98,240,182,0.28)' }}>
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
              <View style={{ borderWidth: 2.5, borderColor: colors.aquaDeep, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(98,240,182,0.28)' }}>
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
// 3) Unirse a un grupo (estilo limpio: sin rebotes ni destellos)
// =====================================================================

// Caras del grupo encimadas que aparecen una tras otra; la tuya llega última, con el aro verde.
function FaceRow({ tl, me, others, delay, edge }: { tl: Timeline; me: CinePerson; others: CinePerson[]; delay: number; edge: string }) {
  const p = usePalette();
  const shown = others.slice(0, others.length > 5 ? 4 : 5);
  const extra = others.length - shown.length;
  const S = 56;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {shown.map((q, i) => (
        <Fade key={q.id} tl={tl} delay={delay + i * 80} dy={0} style={{ marginLeft: i ? -14 : 0, borderRadius: S / 2, borderWidth: 3, borderColor: edge }}>
          <Avatar p={q} size={S} />
        </Fade>
      ))}
      {extra > 0 ? (
        <Fade tl={tl} delay={delay + shown.length * 80} dy={0} style={{ marginLeft: -14, width: S + 6, height: S + 6, borderRadius: (S + 6) / 2, borderWidth: 3, borderColor: edge, backgroundColor: p.glass, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: p.text, fontWeight: '800', fontSize: 15 }}>+{extra}</Text>
        </Fade>
      ) : null}
      <Fade tl={tl} delay={delay + (shown.length + 1) * 80 + 120} dy={0} style={{ marginLeft: shown.length ? -14 : 0, borderRadius: (S + 12) / 2, borderWidth: 3, borderColor: edge }}>
        <Avatar p={me} size={S + 6} ring={colors.mint} />
      </Fade>
    </View>
  );
}

export function GroupJoinedScene({ c, onDone }: { c: GroupJoinedCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(1800);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : 900, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const edge = p.dark ? '#1A1328' : '#F4EFFF';
  return (
    <Stage tl={tl} announce={`Ya eres parte de ${c.name}. ${c.total} caminantes.`}>
      <Fade tl={tl} delay={80}><Eyebrow color={p.muted}>Te uniste a</Eyebrow></Fade>
      <Fade tl={tl} delay={160} style={{ marginTop: 8 }}>
        <Text numberOfLines={2} style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: p.text, textAlign: 'center' }}>{c.name}</Text>
      </Fade>
      <View style={{ marginTop: 28 }}>
        <FaceRow tl={tl} me={c.me} others={c.others} delay={320} edge={edge} />
      </View>
      <Fade tl={tl} delay={900} style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: p.accent, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {c.total} {c.total === 1 ? 'caminante' : 'caminantes'}
        </Text>
      </Fade>
      <View style={{ marginTop: 30, alignSelf: 'stretch' }}>
        <Heading tl={tl} delay={1000} title="Ya eres parte del grupo" sub={c.goalText ?? 'Caminar juntos suma más.'} />
      </View>
      <Fade tl={tl} delay={1150} style={{ alignSelf: 'stretch', marginTop: 32 }}>
        <MainButton label="Ver el grupo" onPress={onDone} />
      </Fade>
    </Stage>
  );
}

// =====================================================================
// 4) Crear un grupo
// =====================================================================

// Grupo creado: tu foto con lugares vacíos para invitar, la meta de la semana (empieza a contar hoy) y el código.
// Tocar el código lo copia.
export function GroupCreatedScene({ c, onDone }: { c: GroupCreatedCinematic; onDone: () => void }) {
  const p = usePalette();
  const [copied, setCopied] = useState(false);
  const tl = useTimeline(1900);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : 700, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const invite = () => { onDone(); c.onInvite?.(); };
  const slot = (key: number, delay: number) => (
    <Fade key={key} tl={tl} delay={delay} dy={0}>
      <Press accessibilityRole="button" accessibilityLabel="Invitar a alguien" onPress={invite}
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.muted, alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={18} color={p.muted} />
      </Press>
    </Fade>
  );
  return (
    <Stage tl={tl} announce={`Grupo ${c.name} creado. Código ${Array.from(c.code).join(' ')}.`}>
      <Fade tl={tl} delay={80}><Eyebrow color={p.muted}>Nuevo grupo</Eyebrow></Fade>
      <Fade tl={tl} delay={160} style={{ marginTop: 8 }}>
        <Text numberOfLines={2} style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: p.text, textAlign: 'center' }}>{c.name}</Text>
      </Fade>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 }}>
        {slot(0, 520)}
        {slot(1, 460)}
        <Fade tl={tl} delay={320} dy={0}><Avatar p={c.me} size={68} ring={colors.mint} /></Fade>
        {slot(2, 460)}
        {slot(3, 520)}
      </View>
      {c.target ? (
        <Fade tl={tl} delay={700} style={{ alignSelf: 'stretch', marginTop: 26 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <Text style={{ color: p.muted, fontWeight: '600', fontSize: 13 }}>Meta de la semana</Text>
            <Text style={{ color: p.text, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] }}>{c.target.toLocaleString('es-BO')} pasos</Text>
          </View>
          <ThinBar tl={tl} delay={700} to={0} />
          <Text style={{ color: p.muted, fontSize: 12, marginTop: 7 }}>Entre todos · empieza a contar hoy</Text>
        </Fade>
      ) : null}
      <View style={{ marginTop: 26, alignSelf: 'stretch' }}>
        <Heading tl={tl} delay={800} title="Grupo creado" sub="Invita a tus amigos: caminar juntos suma más." />
      </View>
      <Fade tl={tl} delay={950} style={{ marginTop: 16 }}>
        <Press accessibilityRole="button" accessibilityLabel={`Código ${Array.from(c.code).join(' ')}. Toca para copiarlo`}
          onPress={async () => { await Clipboard.setStringAsync(c.code); buzz.success(); setCopied(true); }}
          style={{ paddingHorizontal: 22, paddingVertical: 10, borderRadius: 16, backgroundColor: p.glass, borderWidth: 1, borderColor: copied ? colors.mint : p.glassLine, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: p.text, letterSpacing: 6, fontVariant: ['tabular-nums'] }}>{c.code}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: copied ? p.accent : p.muted, marginTop: 2 }}>{copied ? 'Código copiado' : 'Toca para copiar'}</Text>
        </Press>
      </Fade>
      <Fade tl={tl} delay={1050} style={{ alignSelf: 'stretch', marginTop: 24 }}>
        <MainButton label="Invitar amigos" onPress={invite} />
        <LinkButton label="Ir al grupo" onPress={onDone} color={p.accent} />
      </Fade>
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
  const flame = big ? '#FFB92E' : colors.mint;
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
        <Burst tl={tl} delay={2000} palette={big ? GOLD_SPARKS : [colors.mint, '#FFD97A', '#B7A6F0']} count={20} radius={130} style={{ left: '50%', top: '50%' }} />
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
        <MainButton gold={big} label="Compartir mi racha" onPress={share} />
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
      <View style={{ marginTop: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Reveal tl={tl} delay={300} pop from={0.4}>
          <IllArt kind="flame" size={104} />
        </Reveal>
        <Burst tl={tl} delay={2000} palette={[colors.mint, '#FFD97A', '#B7A6F0']} count={18} radius={120} style={{ left: '50%', top: '50%' }} />
      </View>
      <View accessible accessibilityLabel="7 de 7 días" style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch', marginTop: 26 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Reveal key={i} tl={tl} delay={500 + i * 190} pop from={0.3} style={{ flex: 1 }}>
            <View style={{ height: 44, borderRadius: 12, backgroundColor: 'rgba(98,240,182,0.16)', borderWidth: 1.5, borderColor: 'rgba(98,240,182,0.55)', alignItems: 'center', justifyContent: 'center' }}>
              {i === 6 ? <Text style={{ fontWeight: '900', fontSize: 14, color: colors.mint }}>+{c.points}</Text> : <IllArt kind="flame" size={24} />}
            </View>
          </Reveal>
        ))}
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
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={p.accent} />
      </Reveal>
    </Stage>
  );
}

// =====================================================================
// 8) Meta del grupo cumplida: el aro se completa mientras suben los pasos
// =====================================================================

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(2600);
  const steps = useCount(tl, 0, c.total, 300, 1200);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 4);
  const rest = sorted.length - top.length;
  const meId = useAuthStore((st) => st.session?.user.id);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : 1500, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Fade tl={tl} delay={80}><Eyebrow color={p.muted}>{`Meta del grupo · ${c.name}`}</Eyebrow></Fade>
      <Fade tl={tl} delay={160} dy={0} style={{ marginTop: 22 }}>
        <ThinRing tl={tl} delay={300} size={196} to={1} stroke={5} duration={1200}>
          <View accessible accessibilityLabel={`${steps} de ${c.target} pasos`} style={{ alignItems: 'center' }}>
            <Text allowFontScaling={false} style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1, color: p.text, fontVariant: ['tabular-nums'] }}>{steps.toLocaleString('es-BO')}</Text>
            <Text style={{ fontSize: 12.5, color: p.muted, marginTop: 2 }}>de {c.target.toLocaleString('es-BO')} pasos</Text>
          </View>
        </ThinRing>
      </Fade>
      <View style={{ marginTop: 26, alignSelf: 'stretch' }}>
        <Heading tl={tl} delay={1500} title="Lo lograron juntos" sub="El grupo cumplió la meta de la semana." />
      </View>
      <Fade tl={tl} delay={1650} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <RankList tl={tl} delay={1650} rows={top.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === meId }))} />
        {rest > 0 ? <Text style={{ fontSize: 12, color: p.muted, textAlign: 'center', marginTop: 8 }}>y {rest} {rest === 1 ? 'persona más' : 'personas más'}</Text> : null}
      </Fade>
      <Fade tl={tl} delay={1900} style={{ alignSelf: 'stretch', marginTop: 24 }}>
        {c.onShare ? <MainButton label="Compartir con el grupo" onPress={() => { c.onShare?.(); onDone(); }} /> : <MainButton label="Listo" onPress={onDone} />}
        {c.onShare ? <LinkButton label="Seguir" onPress={onDone} color={p.accent} /> : null}
      </Fade>
    </Stage>
  );
}

// =====================================================================
// 9) Resultado del ranking semanal global
//    Tu foto dentro de un aro que marca qué tan cerca quedaste de la cima, tu puesto grande y, si están, los 3 primeros.
// =====================================================================

function tierOf(position: number) {
  if (position === 1) return { title: 'Ganaste el ranking', sub: 'Nadie en Camina caminó más que tú esta semana.' };
  if (position <= 3) return { title: 'Subiste al podio', sub: `Fuiste ${position === 2 ? 'la segunda' : 'la tercera'} persona que más caminó en todo Camina.` };
  if (position <= 10) return { title: 'Estás en el Top 10', sub: 'Quedaste entre las 10 personas que más caminaron esta semana.' };
  return { title: 'Estás en el Top 100', sub: 'Quedaste entre las 100 personas que más caminaron esta semana.' };
}

export function RankingResultScene({ c, onDone }: { c: RankingResultCinematic; onDone: () => void }) {
  const p = usePalette();
  const t = tierOf(c.position);
  const limit = c.position <= 3 ? 3 : c.position <= 10 ? 10 : 100;
  const tl = useTimeline(2400);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : 1200, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => {
    Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${c.steps.toLocaleString('es-BO')} pasos. ¿Me alcanzas?` }).catch(() => {});
  };
  const top: RankEntry[] = (c.podium ?? []).slice(0, 3).map((q, i) => ({ rank: i + 1, person: q.id === c.me.id ? c.me : q, steps: q.steps, me: q.id === c.me.id }));
  if (c.position > 3) top.push({ rank: c.position, person: c.me, steps: c.steps, me: true });
  return (
    <Stage tl={tl} announce={`${t.title}. Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Fade tl={tl} delay={80}><Eyebrow color={p.muted}>{`Ranking semanal · ${c.weekLabel}`}</Eyebrow></Fade>
      <Fade tl={tl} delay={160} dy={0} style={{ marginTop: 22 }}>
        <ThinRing tl={tl} delay={250} size={148} to={Math.max(0.04, 1 - (c.position - 1) / limit)}>
          <Avatar p={c.me} size={118} />
        </ThinRing>
      </Fade>
      <Fade tl={tl} delay={1000} style={{ marginTop: 14 }}>
        <BigRank rank={c.position} label="de todo Camina" />
      </Fade>
      <View style={{ marginTop: 6, alignSelf: 'stretch' }}>
        <Heading tl={tl} delay={1150} title={t.title} sub={t.sub} />
      </View>
      {top.length > 1 ? (
        <Fade tl={tl} delay={1300} style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <RankList tl={tl} delay={1300} rows={top} />
        </Fade>
      ) : (
        <Stats tl={tl} delay={1300} items={[{ value: `${c.position}.º`, label: 'Puesto' }, { value: c.steps.toLocaleString('es-BO'), label: 'Pasos' }, { value: Math.round(c.steps / 7).toLocaleString('es-BO'), label: 'Por día' }]} />
      )}
      <Fade tl={tl} delay={1500} style={{ alignSelf: 'stretch', marginTop: 22 }}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label="Ver el ranking" onPress={() => { onDone(); c.onRanking?.(); }} color={p.accent} />
        <LinkButton label="Ir a inicio" onPress={() => { onDone(); router.replace('/(tabs)'); }} color={p.muted} />
      </Fade>
    </Stage>
  );
}

// =====================================================================
// 10) Cierre de la semana de un grupo (sale en Inicio el lunes, una vez por grupo)
//     Tu puesto en el grupo, los 3 primeros y cuánto caminaron entre todos.
// =====================================================================

export function GroupWeekScene({ c, onDone }: { c: GroupWeekCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(2400);
  const won = c.myRank === 1;
  const onPodium = c.myRank <= 3;
  useEffect(() => {
    tl.at(tl.reduced ? 0 : 1200, won ? buzz.success : buzz.light);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const me = c.podium.find((q) => q.id === c.meId) ?? { id: c.meId, name: 'Tú', steps: c.mySteps };
  const title = won ? 'Ganaste la semana' : onPodium ? 'Quedaste en el podio' : 'Terminó la semana';
  const sub = won
    ? `Fuiste quien más caminó en ${c.name}.`
    : `Quedaste ${c.myRank}.º de ${c.members} en ${c.name}.${c.podium[0] ? ` Ganó ${c.podium[0].name.split(' ')[0]}.` : ''}`;
  const share = () => {
    if (c.onShare) { onDone(); c.onShare(); return; }
    const text = won
      ? `Gané la semana en ${c.name} en Camina con ${c.mySteps.toLocaleString('es-BO')} pasos. ¿Quién me alcanza?`
      : `Quedé ${c.myRank}.º en ${c.name} en Camina con ${c.mySteps.toLocaleString('es-BO')} pasos esta semana. ¿Te animas?`;
    Share.share({ message: text }).catch(() => {});
  };
  const rows: RankEntry[] = c.podium.slice(0, 3).map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === c.meId }));
  if (c.myRank > 3) rows.push({ rank: c.myRank, person: me, steps: c.mySteps, me: true });
  return (
    <Stage tl={tl} announce={`${title}. ${sub} Entre todos caminaron ${c.total} pasos.`}>
      <Fade tl={tl} delay={80}><Eyebrow color={p.muted}>{`${c.name} · semana del ${c.weekLabel}`}</Eyebrow></Fade>
      <Fade tl={tl} delay={160} dy={0} style={{ marginTop: 22 }}>
        <ThinRing tl={tl} delay={250} size={140} to={Math.max(0.04, 1 - (c.myRank - 1) / Math.max(1, c.members))}>
          <Avatar p={me} size={110} />
        </ThinRing>
      </Fade>
      <Fade tl={tl} delay={1000} style={{ marginTop: 14 }}>
        <BigRank rank={c.myRank} label={`de ${c.members}`} />
      </Fade>
      <View style={{ marginTop: 6, alignSelf: 'stretch' }}>
        <Heading tl={tl} delay={1150} title={title} sub={sub} />
      </View>
      <Fade tl={tl} delay={1300} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <RankList tl={tl} delay={1300} rows={rows} />
      </Fade>
      <Fade tl={tl} delay={1500} style={{ alignSelf: 'stretch', marginTop: 10 }}>
        <Text style={{ fontSize: 13, color: p.muted, textAlign: 'center', fontVariant: ['tabular-nums'] }}>Entre todos: {c.total.toLocaleString('es-BO')} pasos</Text>
      </Fade>
      <Fade tl={tl} delay={1600} style={{ alignSelf: 'stretch', marginTop: 22 }}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label={c.onOpen ? 'Ver el grupo' : 'Listo'} onPress={() => { onDone(); c.onOpen?.(); }} color={p.accent} />
        {c.onOpen ? <LinkButton label="Seguir" onPress={onDone} color={p.muted} /> : null}
      </Fade>
    </Stage>
  );
}
