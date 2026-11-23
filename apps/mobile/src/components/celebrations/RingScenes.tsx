import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Share, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Check, Flame, Plus } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { buzz } from '@/lib/haptics';
import { type CinePerson, type Timeline, Avatar, display, LinkButton, MainButton, Stage, useCount, useTimeline } from '@/components/challenge/ChallengeCinematics';
import { Dome, Enter, arcTime, domeGeo, domePoint, useRingTheme, useTween } from '@/components/celebrations/Ring';
import type {
  GroupCreatedCinematic, GroupGoalCinematic, GroupJoinedCinematic, GroupWeekCinematic, RankingResultCinematic, StreakCinematic, StreakWeekCinematic,
} from '@/components/celebrations/MomentScenes';

// Festejos sobrios: fondo negro o blanco, el verde de Camina como único color, el logro en grande y sin esperas.
// Ranking y metas usan la media luna (un solo arco); grupos y rachas, piezas simples (fila de caras, días de la semana).
// Una sola vibración por festejo, en el momento del logro.

const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const n = (v: number) => v.toLocaleString('es-BO');
const W = 340; // ancho de la media luna
const ARC_AT = 120; // cuándo empieza a dibujarse
const ARC_MS = 720; // cuánto tarda
const LAND = ARC_AT + ARC_MS; // cuándo llega
const G = domeGeo(W);
// Cuándo pasa la punta del trazo por la fracción `t` del arco.
const pass = (t: number) => ARC_AT + ARC_MS * arcTime(t);

// ---------- piezas ----------
function Eyebrow({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text numberOfLines={2} style={{ maxWidth: 320, lineHeight: 18, fontSize: 12, letterSpacing: 2, fontWeight: '700', color: t.mint, textTransform: 'uppercase', textAlign: 'center' }}>{children}</Text>;
}
function Title({ children, size = 28 }: { children: ReactNode; size?: number }) {
  const t = useRingTheme();
  return <Text style={{ ...display(size), lineHeight: size * 1.2, color: t.text, textAlign: 'center', maxWidth: 330 }}>{children}</Text>;
}
function Sub({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 310 }}>{children}</Text>;
}
function Mint({ children }: { children: ReactNode }) {
  const t = useRingTheme();
  return <Text style={{ color: t.mint }}>{children}</Text>;
}

// El logro, en grande: entra creciendo apenas.
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

// Cara con borde del color del fondo (para que se recorte sobre el arco o sobre otra cara).
function Face({ p, size, me }: { p: CinePerson; size: number; me?: boolean }) {
  const t = useRingTheme();
  return (
    <View style={{ borderRadius: (size + 8) / 2, borderWidth: 4, borderColor: t.edge }}>
      <Avatar p={p} size={size} ring={me ? t.mint : undefined} />
    </View>
  );
}

function Inside({ top, side = 0, children }: { top: number; side?: number; children: ReactNode }) {
  return <View style={{ position: 'absolute', left: side, right: side, top: G.cy - top, alignItems: 'center' }}>{children}</View>;
}

// Cara sobre la media luna, en el punto `at` del arco. Aparece cuando la punta del trazo pasa por ahí.
function DomeFace({ tl, at, delay, p, size, me, rank, name }: { tl: Timeline; at: number; delay: number; p: CinePerson; size: number; me?: boolean; rank?: number; name?: string }) {
  const th = useRingTheme();
  const pt = domePoint(G, at);
  return (
    <Enter tl={tl} delay={delay} dy={0} scale={0.82} duration={400} style={{ position: 'absolute', left: pt.x - 45, top: pt.y - (size + 8) / 2, width: 90, alignItems: 'center' }}>
      <View>
        <Face p={p} size={size} me={me} />
        {rank ? (
          <View style={{ position: 'absolute', right: -4, top: -4, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: rank === 1 ? th.arc : th.seat, borderWidth: 2, borderColor: th.edge, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: rank === 1 ? '#06231a' : th.text }}>{rank}</Text>
          </View>
        ) : null}
      </View>
      {name ? <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: me ? '800' : '600', color: me ? th.mint : th.muted, marginTop: 2, textAlign: 'center' }}>{name}</Text> : null}
    </Enter>
  );
}

type Row = { rank: number; person: CinePerson; steps: number; me?: boolean };
function List({ tl, delay, rows }: { tl: Timeline; delay: number; rows: Row[] }) {
  const t = useRingTheme();
  return (
    <View style={{ alignSelf: 'stretch', borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <Enter key={`${r.rank}-${r.person.id}`} tl={tl} delay={delay + i * 50} dy={6} scale={1} duration={400}>
          <View accessible accessibilityLabel={`${r.rank}.º ${r.me ? 'Tú' : r.person.name}: ${r.steps} pasos`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.line, backgroundColor: r.me ? t.rowMe : 'transparent' }}>
            <Text style={{ width: 28, fontSize: 13.5, fontWeight: '700', color: t.faint, fontVariant: ['tabular-nums'] }}>{r.rank}.º</Text>
            <Avatar p={r.person} size={28} />
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

function Moon({ children, below = 28, top = 18 }: { children: ReactNode; below?: number; top?: number }) {
  return <View style={{ marginTop: top, marginBottom: below }}>{children}</View>;
}

// Vibración única, en el momento del logro.
function useBuzzAt(tl: Timeline, at: number, kind: () => void = buzz.success) {
  useEffect(() => {
    tl.at(tl.reduced ? 0 : at, kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ---------- podio sobre la media luna ----------
// El 1.º en la cima del arco; el 2.º a la izquierda y el 3.º a la derecha. Tu cara, más grande y con el aro verde.
type PodiumEntry = { rank: number; person: CinePerson; steps: number; me: boolean };
const PODIUM_T: Record<number, number> = { 1: 0.5, 2: 0.15, 3: 0.85 };

function PodiumDome({ tl, entries, hero, label }: { tl: Timeline; entries: PodiumEntry[]; hero: string; label: string }) {
  return (
    <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS}>
      {entries.map((e) => (
        <DomeFace key={e.rank} tl={tl} at={PODIUM_T[e.rank]} delay={pass(PODIUM_T[e.rank]) - 80} p={e.person}
          size={e.me ? 58 : e.rank === 1 ? 50 : 44} me={e.me} rank={e.rank} />
      ))}
      <Inside top={86}><Hero tl={tl} at={40} label={label}>{hero}</Hero></Inside>
    </Dome>
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
  const podium = (c.podium ?? []).slice(0, 3).map((q, i) => ({ rank: i + 1, person: q.id === c.me.id ? c.me : q, steps: q.steps, me: q.id === c.me.id }));
  const showPodium = c.position <= 3 && podium.length >= 2;
  const limit = c.position <= 10 ? 10 : 100;
  const reach = Math.min(0.42, Math.max(0.12, 1 - c.position / (limit + 1)));
  const tl = useTimeline(LAND + 600);
  useBuzzAt(tl, LAND);
  const share = () => { Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${n(c.steps)} pasos. ¿Me alcanzas?` }).catch(() => {}); };
  const label = `de todo Camina · ${n(c.steps)} pasos`;
  return (
    <Stage tl={tl} night announce={`${tier.title}. Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>{`Ranking semanal · ${c.weekLabel}`}</Eyebrow></Enter>
      <Moon>
        {showPodium ? (
          <PodiumDome tl={tl} entries={podium} hero={`${c.position}.º`} label={label} />
        ) : (
          // Fuera del podio: el arco te lleva hasta donde llegaste; la cima es el 1.º.
          <Dome tl={tl} delay={ARC_AT} width={W} progress={reach} duration={ARC_MS}>
            <DomeFace tl={tl} at={reach} delay={LAND - 80} p={c.me} size={54} me />
            <Inside top={86}><Hero tl={tl} at={40} label={label}>{`${c.position}.º`}</Hero></Inside>
          </Dome>
        )}
      </Moon>
      <Enter tl={tl} delay={LAND - 240} style={{ alignItems: 'center' }}>
        <Title>{tier.title}</Title>
        <Sub>{tier.sub}</Sub>
      </Enter>
      {!showPodium && podium.length ? (
        <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
          <List tl={tl} delay={LAND - 140} rows={[...podium, { rank: c.position, person: c.me, steps: c.steps, me: true }]} />
        </View>
      ) : null}
      <Buttons tl={tl} delay={LAND - 60}>
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
  const tl = useTimeline(LAND + 600);
  useBuzzAt(tl, LAND, won ? buzz.success : buzz.light);
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
  const entries = c.podium.slice(0, 3).map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === c.meId }));
  return (
    <Stage tl={tl} night announce={`${title}. ${sub} Entre todos caminaron ${c.total} pasos.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>{`${c.name} · semana del ${c.weekLabel}`}</Eyebrow></Enter>
      <Moon>
        <PodiumDome tl={tl} entries={entries} hero={`${c.myRank}.º`} label={`de ${c.members} · ${n(c.mySteps)} pasos`} />
      </Moon>
      <Enter tl={tl} delay={LAND - 240} style={{ alignItems: 'center' }}>
        <Title>{title}</Title>
        <Sub>{sub}</Sub>
      </Enter>
      <Enter tl={tl} delay={LAND - 160} style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 13.5, color: t.muted, fontVariant: ['tabular-nums'] }}>Entre todos: <Text style={{ color: t.text, fontWeight: '700' }}>{n(c.total)} pasos</Text></Text>
      </Enter>
      <Buttons tl={tl} delay={LAND - 60}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label={c.onOpen ? 'Ver el grupo' : 'Listo'} onPress={() => { onDone(); c.onOpen?.(); }} color={t.mint} />
        {c.onOpen ? <LinkButton label="Seguir" onPress={onDone} color={t.muted} /> : null}
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Meta del grupo cumplida: el arco se completa mientras suben los pasos
// =====================================================================

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(LAND + 600);
  const steps = useCount(tl, Math.round(c.total * 0.6), c.total, ARC_AT, ARC_MS);
  const meId = useAuthStore((st) => st.session?.user.id);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 3);
  const rest = sorted.length - top.length;
  useBuzzAt(tl, LAND);
  return (
    <Stage tl={tl} night announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>{`Meta del grupo · ${c.name}`}</Eyebrow></Enter>
      <Moon below={20}>
        <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS}>
          <Inside top={92}>
            <Enter tl={tl} delay={40} scale={0.9} duration={440} style={{ alignItems: 'center' }}>
              <View accessible accessibilityLabel={`${c.total} de ${c.target} pasos`} style={{ alignItems: 'center' }}>
                <Text allowFontScaling={false} style={{ ...display(44), color: t.text, fontVariant: ['tabular-nums'] }}>{n(steps)}</Text>
                <Text style={{ fontSize: 14, color: t.muted, fontVariant: ['tabular-nums'] }}>de {n(c.target)} pasos</Text>
              </View>
            </Enter>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 180} style={{ alignItems: 'center' }}>
        <Title>Lo lograron juntos</Title>
        <Sub>El grupo cumplió la meta de la semana.</Sub>
      </Enter>
      <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
        <List tl={tl} delay={LAND - 100} rows={top.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === meId }))} />
        {rest > 0 ? <Enter tl={tl} delay={LAND + 60}><Text style={{ fontSize: 12.5, color: t.faint, textAlign: 'center', marginTop: 8 }}>y {rest} {rest === 1 ? 'persona más' : 'personas más'}</Text></Enter> : null}
      </View>
      <Buttons tl={tl} delay={LAND}>
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
