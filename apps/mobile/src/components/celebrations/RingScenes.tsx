import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Share, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Check, Flame, Plus } from '@/components/icons';
import { CrownMark } from '@/components/CrownMark';
import { useAuthStore } from '@/store/useAuthStore';
import { buzz } from '@/lib/haptics';
import { type CinePerson, type Timeline, Avatar, display, LinkButton, MainButton, Stage, useCount, useTimeline } from '@/components/challenge/ChallengeCinematics';
import { CaminaRing, Enter, useRingTheme, useTween } from '@/components/celebrations/Ring';
import { AvatarImage } from '@/components/ui/AvatarImage';
import type {
  GroupCreatedCinematic, GroupGoalCinematic, GroupJoinedCinematic, GroupWeekCinematic, RankingResultCinematic, StreakCinematic, StreakWeekCinematic,
} from '@/components/celebrations/MomentScenes';

// Festejos sobre el fondo de la app, con el verde de Camina como firma.
// Ranking y semana del grupo: el podio de la app (oro, plata y bronce) y abajo el puesto en grande.
// Fuera del podio y meta del grupo: un anillo de una sola línea. Grupos y rachas: piezas simples.
// Una sola vibración por festejo, en el logro.

const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const n = (v: number) => v.toLocaleString('es-BO');

// ---------- texto ----------
function Eyebrow({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text numberOfLines={2} style={{ maxWidth: 320, lineHeight: 18, fontSize: 12, letterSpacing: 2, fontWeight: '700', color: t.mint, textTransform: 'uppercase', textAlign: 'center' }}>{children}</Text>;
}
// Título con la letra del logo (grupos y rachas).
function Title({ children, size = 28 }: { children: ReactNode; size?: number }) {
  const t = useRingTheme();
  return <Text style={{ ...display(size), lineHeight: size * 1.2, color: t.text, textAlign: 'center', maxWidth: 340 }}>{children}</Text>;
}
// Título sobrio (ranking y metas).
function PlainTitle({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: t.text, textAlign: 'center' }}>{children}</Text>;
}
function Sub({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 310 }}>{children}</Text>;
}
function Mint({ children }: { children: ReactNode }) {
  const t = useRingTheme();
  return <Text style={{ color: t.mint }}>{children}</Text>;
}
// El logro en grande, con la letra del logo: entra creciendo apenas.
function Hero({ tl, at, children, label, size = 96 }: { tl: Timeline; at: number; children: string; label?: string; size?: number }) {
  const t = useRingTheme();
  const k = useTween(tl, at, 460);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.88 + 0.12 * k.value }] }));
  return (
    <Animated.View style={[{ alignItems: 'center' }, a]}>
      <Text allowFontScaling={false} style={{ ...display(size), lineHeight: size * 1.04, color: t.text, fontVariant: ['tabular-nums'] }}>{children}</Text>
      {label ? <Text style={{ fontSize: 14, fontWeight: '600', color: t.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>{label}</Text> : null}
    </Animated.View>
  );
}
// El puesto en grande: «2.º de todo Camina».
function Rank({ rank, label }: { rank: number; label: string }) {
  const t = useRingTheme();
  return (
    <View accessible accessibilityLabel={`Puesto ${rank} ${label}`} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <Text allowFontScaling={false} style={{ fontSize: 64, fontWeight: '800', letterSpacing: -2.5, color: t.text, fontVariant: ['tabular-nums'] }}>{rank}.º</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: t.muted }}>{label}</Text>
    </View>
  );
}

// Avatar del anillo y de las listas: la foto o, sin foto, la inicial sobre un gris oscuro (claro en modo claro).
function RingAvatar({ p, size, ring }: { p: CinePerson; size: number; ring?: string }) {
  const t = useRingTheme();
  const border = ring ? { borderWidth: Math.max(2, size * 0.04), borderColor: ring } : {};
  const bg: [string, string] = t.dark ? ['#3b3b44', '#1d1d23'] : ['#ECECF0', '#DCDCE3'];
  return (
    <AvatarImage
      uri={p.photoUrl}
      style={{ width: size, height: size, borderRadius: size / 2, ...border }}
      fallback={
        <LinearGradient colors={bg} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', ...border }}>
          <Text style={{ color: t.dark ? '#FFFFFF' : '#0B0B0D', fontWeight: '700', fontSize: size * 0.38 }}>{p.name[0]?.toUpperCase() ?? '?'}</Text>
        </LinearGradient>
      }
    />
  );
}

// Cara con borde del color del fondo (para que se recorte sobre otra cara).
function Face({ p, size, me }: { p: CinePerson; size: number; me?: boolean }) {
  const t = useRingTheme();
  return (
    <View style={{ borderRadius: (size + 8) / 2, borderWidth: 4, borderColor: t.edge }}>
      <Avatar p={p} size={size} ring={me ? t.mint : undefined} />
    </View>
  );
}

type Row = { rank: number; person: CinePerson; steps: number; me?: boolean };
function List({ tl, delay, rows }: { tl: Timeline; delay: number; rows: Row[] }) {
  const t = useRingTheme();
  return (
    <View style={{ alignSelf: 'stretch', borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <Enter key={`${r.rank}-${r.person.id}`} tl={tl} delay={delay + i * 50} dy={6} scale={1} duration={420}>
          <View accessible accessibilityLabel={`${r.rank}.º ${r.me ? 'Tú' : r.person.name}: ${r.steps} pasos`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.line, backgroundColor: r.me ? t.rowMe : 'transparent' }}>
            <Text style={{ width: 28, fontSize: 13.5, fontWeight: '700', color: t.faint, fontVariant: ['tabular-nums'] }}>{r.rank}.º</Text>
            <RingAvatar p={r.person} size={30} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: r.me ? '800' : '600', color: r.me ? t.mint : t.text }}>{r.me ? 'Tú' : first(r.person.name)}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.muted, fontVariant: ['tabular-nums'] }}>{n(r.steps)}</Text>
          </View>
        </Enter>
      ))}
    </View>
  );
}

function Buttons({ tl, delay, children }: { tl: Timeline; delay: number; children: ReactNode }) {
  return <Enter tl={tl} delay={delay} dy={12} scale={1} duration={440} style={{ alignSelf: 'stretch', marginTop: 26 }}>{children}</Enter>;
}

// Vibración única, en el momento del logro.
function useBuzzAt(tl: Timeline, at: number, kind: () => void = buzz.success) {
  useEffect(() => {
    tl.at(tl.reduced ? 0 : at, kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ---------- podio (el de la app: oro, plata y bronce) ----------
// Los escalones suben del 1.º al 3.º; encima de cada uno, la cara de quien quedó ahí, y la corona sobre el 1.º.
type PodiumPerson = CinePerson & { steps: number };
const STEP_H = [124, 88, 60];
const MEDAL: [string, string][] = [['#FFE7A3', '#E2B33C'], ['#EEF1F6', '#AEB6C4'], ['#F3C9A4', '#C9824E']];
const MEDAL_INK = ['#5a3d00', '#3a4150', '#5a2d0c'];
const STEP_AT: Record<number, number> = { 1: 120, 2: 240, 3: 360 };
const PODIUM_DONE = 360 + 480; // cuando termina de subir el último escalón

function PodiumStep({ tl, rank, person, me }: { tl: Timeline; rank: number; person?: PodiumPerson; me: boolean }) {
  const t = useRingTheme();
  const delay = STEP_AT[rank];
  const grow = useTween(tl, delay, 480);
  const g = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - grow.value) * STEP_H[rank - 1] }] }));
  const winner = rank === 1;
  const size = me ? 54 : 44;
  return (
    <View style={{ width: 100, alignItems: 'center' }}>
      <View style={{ height: 100, justifyContent: 'flex-end', alignItems: 'center' }}>
        {person ? (
          <Enter tl={tl} delay={delay + 200} dy={-24} scale={0.9} duration={460} style={{ alignItems: 'center' }}>
            {winner ? <Enter tl={tl} delay={delay + 420} dy={-16} duration={420} style={{ position: 'absolute', top: me ? -36 : -30 }}><CrownMark size={me ? 40 : 34} /></Enter> : null}
            <Avatar p={person} size={size} ring={MEDAL[rank - 1][1]} />
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: me ? t.mint : t.text, marginTop: 3, maxWidth: 96 }}>{me ? 'Tú' : first(person.name)}</Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: t.muted, fontVariant: ['tabular-nums'] }}>{n(person.steps)}</Text>
          </Enter>
        ) : (
          // Sin dato de esa persona: un lugar vacío, para que el podio no se vea cortado.
          <Enter tl={tl} delay={delay + 200} style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: t.faint }} />
          </Enter>
        )}
      </View>
      <View style={{ width: '100%', height: STEP_H[rank - 1], overflow: 'hidden', borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: 6 }}>
        <Animated.View style={[{ flex: 1 }, g]}>
          {person ? (
            <LinearGradient colors={MEDAL[rank - 1]} style={{ flex: 1, alignItems: 'center', paddingTop: 8, opacity: me ? 1 : 0.6 }}>
              <Text style={{ ...display(24), color: MEDAL_INK[rank - 1] }}>{rank}</Text>
            </LinearGradient>
          ) : (
            <View style={{ flex: 1, backgroundColor: t.seat, alignItems: 'center', paddingTop: 8, opacity: 0.8 }}>
              <Text style={{ ...display(24), color: t.muted }}>{rank}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function Podium({ tl, people, meId }: { tl: Timeline; people: PodiumPerson[]; meId: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
      {[2, 1, 3].map((r) => {
        const person = people[r - 1];
        return <PodiumStep key={r} tl={tl} rank={r} person={person} me={!!person && person.id === meId} />;
      })}
    </View>
  );
}

// =====================================================================
// Resultado del ranking semanal global
// =====================================================================

function tierOf(position: number) {
  if (position === 1) return { title: 'Ganaste el ranking', sub: 'Nadie en Camina caminó más que tú esta semana.' };
  if (position <= 3) return { title: 'Subiste al podio', sub: `Fuiste ${position === 2 ? 'la segunda' : 'la tercera'} persona que más caminó en todo Camina.` };
  if (position <= 10) return { title: 'Estás en el Top 10', sub: 'Quedaste entre las 10 personas que más caminaron esta semana.' };
  return { title: 'Estás en el Top 100', sub: 'Quedaste entre las 100 personas que más caminaron esta semana.' };
}

export function RankingResultScene({ c, onDone }: { c: RankingResultCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tier = tierOf(c.position);
  const podium = (c.podium ?? []).slice(0, 3).map((q) => (q.id === c.me.id ? { ...c.me, steps: q.steps } : q));
  const showPodium = c.position <= 3 && podium.length >= 2;
  const limit = c.position <= 10 ? 10 : 100;
  const RING_AT = 160;
  const RING_MS = 1000;
  const land = showPodium ? PODIUM_DONE : RING_AT + RING_MS;
  const tl = useTimeline(land + 800);
  useBuzzAt(tl, showPodium ? STEP_AT[c.position] + 480 : land);
  const share = () => {
    Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${n(c.steps)} pasos. ¿Me alcanzas?` }).catch(() => {});
  };
  const rows: Row[] = [...podium.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === c.me.id })), { rank: c.position, person: c.me, steps: c.steps, me: true }];
  // Lo de abajo entra apenas termina el podio (o mientras se dibuja el anillo): sin esperas.
  const textAt = showPodium ? PODIUM_DONE - 200 : RING_AT + 300;
  return (
    <Stage tl={tl} night announce={`${tier.title}. Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Enter tl={tl} delay={40}><Eyebrow>{`Ranking semanal · ${c.weekLabel}`}</Eyebrow></Enter>
      <View style={{ marginTop: showPodium ? 30 : 24 }}>
        {showPodium ? (
          <Podium tl={tl} people={podium} meId={c.me.id} />
        ) : (
          // Fuera del podio: tu anillo, lleno según qué tan arriba quedaste.
          <CaminaRing tl={tl} delay={RING_AT} size={184} progress={Math.max(0.04, 1 - (c.position - 1) / limit)} duration={RING_MS}>
            <Enter tl={tl} delay={RING_AT + 120} scale={0.92}><RingAvatar p={c.me} size={98} ring={t.mint} /></Enter>
          </CaminaRing>
        )}
      </View>
      <Enter tl={tl} delay={textAt} style={{ marginTop: 16 }}><Rank rank={c.position} label="de todo Camina" /></Enter>
      <Enter tl={tl} delay={textAt + 80} style={{ alignItems: 'center', marginTop: 2 }}>
        <PlainTitle>{tier.title}</PlainTitle>
        <Sub>{tier.sub}</Sub>
      </Enter>
      {!showPodium && podium.length ? <View style={{ alignSelf: 'stretch', marginTop: 20 }}><List tl={tl} delay={textAt + 180} rows={rows} /></View> : null}
      <Buttons tl={tl} delay={textAt + (showPodium ? 160 : 340)}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label="Ver el ranking" onPress={() => { onDone(); c.onRanking?.(); }} color={t.mint} />
        <LinkButton label="Ir a inicio" onPress={() => { onDone(); router.replace('/(tabs)'); }} color={t.muted} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Cierre de la semana de un grupo
// =====================================================================

export function GroupWeekScene({ c, onDone }: { c: GroupWeekCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const won = c.myRank === 1;
  const onPodium = c.myRank <= 3;
  const tl = useTimeline(PODIUM_DONE + 800);
  useBuzzAt(tl, onPodium ? STEP_AT[c.myRank] + 480 : PODIUM_DONE, won ? buzz.success : buzz.light);
  const title = won ? 'Ganaste la semana' : onPodium ? 'Quedaste en el podio' : 'Terminó la semana';
  const sub = won
    ? `Fuiste quien más caminó en ${c.name}.`
    : `Quedaste ${c.myRank}.º de ${c.members} en ${c.name}.${c.podium[0] ? ` Ganó ${first(c.podium[0].name)}.` : ''}`;
  const share = () => {
    if (c.onShare) { onDone(); c.onShare(); return; }
    const text = won
      ? `Gané la semana en ${c.name} en Camina con ${n(c.mySteps)} pasos. ¿Quién me alcanza?`
      : `Quedé ${c.myRank}.º en ${c.name} en Camina con ${n(c.mySteps)} pasos esta semana. ¿Te animas?`;
    Share.share({ message: text }).catch(() => {});
  };
  const textAt = PODIUM_DONE - 200;
  return (
    <Stage tl={tl} night announce={`${title}. ${sub} Entre todos caminaron ${c.total} pasos.`}>
      <Enter tl={tl} delay={40}><Eyebrow>{`${c.name} · semana del ${c.weekLabel}`}</Eyebrow></Enter>
      <View style={{ marginTop: 30 }}><Podium tl={tl} people={c.podium.slice(0, 3)} meId={c.meId} /></View>
      <Enter tl={tl} delay={textAt} style={{ marginTop: 16 }}><Rank rank={c.myRank} label={`de ${c.members}`} /></Enter>
      <Enter tl={tl} delay={textAt + 80} style={{ alignItems: 'center', marginTop: 2 }}>
        <PlainTitle>{title}</PlainTitle>
        <Sub>{sub}</Sub>
      </Enter>
      <Enter tl={tl} delay={textAt + 140} style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 13.5, color: t.muted, fontVariant: ['tabular-nums'] }}>Entre todos: <Text style={{ color: t.text, fontWeight: '700' }}>{n(c.total)} pasos</Text></Text>
      </Enter>
      <Buttons tl={tl} delay={textAt + 200}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label={c.onOpen ? 'Ver el grupo' : 'Listo'} onPress={() => { onDone(); c.onOpen?.(); }} color={t.mint} />
        {c.onOpen ? <LinkButton label="Seguir" onPress={onDone} color={t.muted} /> : null}
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Meta del grupo cumplida: el anillo se completa mientras suben los pasos
// =====================================================================

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const AT = 160;
  const DRAW = 1100;
  const close = AT + DRAW;
  const tl = useTimeline(close + 800);
  const steps = useCount(tl, Math.round(c.total * 0.4), c.total, AT, DRAW);
  const meId = useAuthStore((st) => st.session?.user.id);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 3);
  const rest = sorted.length - top.length;
  useBuzzAt(tl, close);
  return (
    <Stage tl={tl} night announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Enter tl={tl} delay={40}><Eyebrow>{`Meta del grupo · ${c.name}`}</Eyebrow></Enter>
      <View style={{ marginTop: 24 }}>
        <CaminaRing tl={tl} delay={AT} size={236} progress={1} duration={DRAW} onClose={{ at: close }}>
          <Enter tl={tl} delay={AT} scale={0.94}>
            <View accessible accessibilityLabel={`${steps} de ${c.target} pasos`} style={{ alignItems: 'center' }}>
              <Text allowFontScaling={false} style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.2, color: t.text, fontVariant: ['tabular-nums'] }}>{n(steps)}</Text>
              <Text style={{ fontSize: 13, color: t.muted, marginTop: 1 }}>de {n(c.target)} pasos</Text>
            </View>
          </Enter>
        </CaminaRing>
      </View>
      <Enter tl={tl} delay={close - 300} style={{ alignItems: 'center', marginTop: 20 }}>
        <PlainTitle>Lo lograron juntos</PlainTitle>
        <Sub>El grupo cumplió la meta de la semana.</Sub>
      </Enter>
      <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <List tl={tl} delay={close - 200} rows={top.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === meId }))} />
        {rest > 0 ? <Enter tl={tl} delay={close}><Text style={{ fontSize: 12.5, color: t.faint, textAlign: 'center', marginTop: 8 }}>y {rest} {rest === 1 ? 'persona más' : 'personas más'}</Text></Enter> : null}
      </View>
      <Buttons tl={tl} delay={close - 40}>
        {c.onShare ? <MainButton label="Compartir con el grupo" onPress={() => { c.onShare?.(); onDone(); }} /> : <MainButton label="Listo" onPress={onDone} />}
        {c.onShare ? <LinkButton label="Seguir" onPress={onDone} color={t.mint} /> : null}
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Grupos: una fila de caras superpuestas (foto o avatar) que entran una tras otra, y una frase clara.
// =====================================================================

const STACK = 58;
const OVERLAP = 16;

function FaceRow({ tl, delay, people, me, extra, invite }: { tl: Timeline; delay: number; people: CinePerson[]; me: CinePerson; extra?: number; invite?: () => void }) {
  const t = useRingTheme();
  const items: ReactNode[] = [<Face key="me" p={me} size={STACK} me />, ...people.map((p) => <Face key={p.id} p={p} size={STACK} />)];
  if (extra && extra > 0) {
    items.push(
      <View key="mas" style={{ width: STACK + 8, height: STACK + 8, borderRadius: (STACK + 8) / 2, borderWidth: 4, borderColor: t.edge, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text, fontVariant: ['tabular-nums'] }}>+{extra}</Text>
      </View>,
    );
  }
  if (invite) {
    items.push(
      <Press key="invitar" accessibilityRole="button" accessibilityLabel="Invitar amigos" onPress={invite}
        style={{ width: STACK + 8, height: STACK + 8, borderRadius: (STACK + 8) / 2, borderWidth: 4, borderColor: t.edge, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: STACK - 6, height: STACK - 6, borderRadius: (STACK - 6) / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: t.faint, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={24} color={t.muted} />
        </View>
      </Press>,
    );
  }
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
      {items.map((node, i) => (
        <Enter key={i} tl={tl} delay={delay + i * 55} dx={-18} dy={0} scale={0.9} duration={420} style={{ marginLeft: i ? -OVERLAP : 0, zIndex: items.length - i }}>
          {node}
        </Enter>
      ))}
    </View>
  );
}

export function GroupJoinedScene({ c, onDone }: { c: GroupJoinedCinematic; onDone: () => void }) {
  const shown = c.others.slice(0, 4);
  const extra = Math.max(0, c.total - 1 - shown.length);
  const settle = 60 + (shown.length + (extra ? 2 : 1)) * 55;
  const tl = useTimeline(settle + 700);
  useBuzzAt(tl, settle);
  const others = c.total - 1;
  return (
    <Stage tl={tl} night announce={`Ya eres parte de ${c.name}. ${c.total} caminantes.`}>
      <FaceRow tl={tl} delay={60} people={shown} me={c.me} extra={extra} />
      <Enter tl={tl} delay={settle - 60} style={{ alignItems: 'center', marginTop: 30 }}>
        <Title size={24}>
          {others > 0 ? <>¡Tú y {others} {others === 1 ? 'caminante' : 'caminantes'} más ya están en <Mint>{c.name}</Mint>!</> : <>¡Ya estás en <Mint>{c.name}</Mint>!</>}
        </Title>
        <Sub>{c.goalText ?? 'Caminar juntos suma más.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={settle + 60}>
        <MainButton label="Ver el grupo" onPress={onDone} />
      </Buttons>
    </Stage>
  );
}

export function GroupCreatedScene({ c, onDone }: { c: GroupCreatedCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const [copied, setCopied] = useState(false);
  const tl = useTimeline(900);
  useBuzzAt(tl, 200);
  const invite = () => { onDone(); c.onInvite?.(); };
  return (
    <Stage tl={tl} night announce={`Grupo ${c.name} creado. Código ${Array.from(c.code).join(' ')}.`}>
      <FaceRow tl={tl} delay={60} people={[]} me={c.me} invite={invite} />
      <Enter tl={tl} delay={160} style={{ alignItems: 'center', marginTop: 30 }}>
        <Title size={26}>¡Creaste <Mint>{c.name}</Mint>!</Title>
        <Sub>{c.target ? `Meta: ${n(c.target)} pasos por semana. Invita a tus amigos: caminar juntos suma más.` : 'Invita a tus amigos: caminar juntos suma más.'}</Sub>
      </Enter>
      <Enter tl={tl} delay={240} style={{ marginTop: 20 }}>
        <Press accessibilityRole="button" accessibilityLabel={`Código ${Array.from(c.code).join(' ')}. Toca para copiarlo`}
          onPress={async () => { await Clipboard.setStringAsync(c.code); buzz.success(); setCopied(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: copied ? t.mint : t.line }}>
          <Text style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: '700', color: t.faint, textTransform: 'uppercase' }}>Código</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: 5, fontVariant: ['tabular-nums'] }}>{c.code}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: copied ? t.mint : t.muted }}>{copied ? 'Copiado' : 'Copiar'}</Text>
        </Press>
      </Enter>
      <Buttons tl={tl} delay={300}>
        <MainButton label="Invitar amigos" onPress={invite} />
        <LinkButton label="Ir al grupo" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha de 30 y 100 días: la llama verde y los días en grande.
// =====================================================================

export function StreakScene({ c, onDone }: { c: StreakCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(1300);
  const days = useCount(tl, Math.max(1, c.days - 9), c.days, 120, 520);
  useBuzzAt(tl, 640);
  const share = () => { Share.share({ message: `Llevo ${c.days} días seguidos cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} night announce={`${c.days} días seguidos de racha.`}>
      <Enter tl={tl} delay={0} dy={14} scale={0.8} duration={480}>
        <Flame size={64} color={t.mint} weight="fill" />
      </Enter>
      <View accessible accessibilityLabel={`${c.days} días seguidos`} style={{ marginTop: 6 }}>
        <Hero tl={tl} at={60} size={120} label="días seguidos">{String(days)}</Hero>
      </View>
      <Enter tl={tl} delay={520} style={{ alignItems: 'center', marginTop: 26 }}>
        <Title>{c.days >= 100 ? '¡Cien días seguidos!' : '¡Un mes seguido!'}</Title>
        <Sub>{c.days >= 100 ? 'Cien días cumpliendo tu meta. Eres imparable.' : 'Un mes entero cumpliendo tu meta, día tras día.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={620}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha semanal: los siete días de la semana se completan uno tras otro.
// =====================================================================

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY = 40;
const DAY_AT = 140;
const DAY_GAP = 70;

function Day({ tl, i }: { tl: Timeline; i: number }) {
  const t = useRingTheme();
  const k = useTween(tl, DAY_AT + i * DAY_GAP, 300);
  const fill = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.6 + 0.4 * k.value }] }));
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: DAY, height: DAY, borderRadius: DAY / 2, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: DAY, height: DAY, borderRadius: DAY / 2, backgroundColor: t.arc, alignItems: 'center', justifyContent: 'center' }, fill]}>
          <Check size={20} color="#06231a" weight="bold" />
        </Animated.View>
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.muted }}>{DIAS[i]}</Text>
    </View>
  );
}

export function StreakWeekScene({ c, onDone }: { c: StreakWeekCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const done = DAY_AT + 6 * DAY_GAP + 200;
  const tl = useTimeline(done + 700);
  useBuzzAt(tl, done);
  const share = () => { Share.share({ message: `Completé ${c.weeks === 1 ? 'una semana' : `${c.weeks} semanas`} seguidas cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} night announce={`Semana completa. Ganaste ${c.points} Puntos de racha.`}>
      <Enter tl={tl} delay={0} dy={14} scale={0.8} duration={480}>
        <Flame size={56} color={t.mint} weight="fill" />
      </Enter>
      <Enter tl={tl} delay={60} style={{ alignItems: 'center', marginTop: 14 }}>
        <Title>¡Semana completa!</Title>
      </Enter>
      <View accessible accessibilityLabel="7 de 7 días" style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
        {DIAS.map((d, i) => <Day key={d} tl={tl} i={i} />)}
      </View>
      <Enter tl={tl} delay={done - 80} scale={0.9} style={{ alignItems: 'center', marginTop: 26 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, backgroundColor: t.rowMe }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: t.mint, fontVariant: ['tabular-nums'] }}>+{c.points} Puntos</Text>
        </View>
        <Sub>{c.weeks > 1 ? `Ya son ${c.weeks} semanas seguidas cumpliendo tu meta.` : '7 días seguidos cumpliendo tu meta.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={done}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}
