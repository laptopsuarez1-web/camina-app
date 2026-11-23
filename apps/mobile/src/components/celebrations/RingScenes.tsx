import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Image, Share, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Check, Flame, Plus } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { buzz } from '@/lib/haptics';
import { type CinePerson, type Timeline, display, LinkButton, MainButton, Stage, useCount, useTimeline } from '@/components/challenge/ChallengeCinematics';
import { Dome, Enter, arcTime, domeGeo, domePoint, useRingTheme, useTween, type DomeGeo } from '@/components/celebrations/Ring';
import type {
  GroupCreatedCinematic, GroupGoalCinematic, GroupJoinedCinematic, GroupWeekCinematic, RankingResultCinematic, StreakCinematic, StreakWeekCinematic,
} from '@/components/celebrations/MomentScenes';

// Festejos con la media luna de Camina: un solo arco que se dibuja mientras las huellas caminan sobre él, y el logro en grande,
// en la letra del logo, adentro. Todo lo importante aparece antes del primer segundo; una sola vibración, cuando el arco llega.

const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const n = (v: number) => v.toLocaleString('es-BO');
const W = 340; // ancho de la media luna
const ARC_AT = 120; // cuándo empieza a dibujarse
const ARC_MS = 720; // cuánto tarda
const LAND = ARC_AT + ARC_MS; // cuándo llega: vibración y cierre
const G = domeGeo(W);

// Cuándo pasa la punta del trazo por la fracción `t` del arco (`to` = hasta dónde llega el arco).
const pass = (t: number, to = 1) => ARC_AT + ARC_MS * arcTime(t / to);

// ---------- piezas ----------
function Avatar({ p, size, ring }: { p: CinePerson; size: number; ring?: string }) {
  const t = useRingTheme();
  const border = ring ? { borderWidth: Math.max(2, size * 0.045), borderColor: ring } : {};
  return (
    <AvatarImage
      uri={p.photoUrl}
      style={{ width: size, height: size, borderRadius: size / 2, ...border }}
      fallback={
        <LinearGradient colors={t.avatar} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', ...border }}>
          <Text style={{ color: t.avatarInk, fontWeight: '700', fontSize: size * 0.38 }}>{p.name[0]?.toUpperCase() ?? '?'}</Text>
        </LinearGradient>
      }
    />
  );
}

function Eyebrow({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text numberOfLines={2} style={{ maxWidth: 320, lineHeight: 18, fontSize: 12, letterSpacing: 2.2, fontWeight: '700', color: t.mint, textTransform: 'uppercase', textAlign: 'center' }}>{children}</Text>;
}
function Title({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ ...display(28), letterSpacing: -0.3, color: t.text, textAlign: 'center' }}>{children}</Text>;
}
function Sub({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 6, lineHeight: 21, maxWidth: 310 }}>{children}</Text>;
}

// El logro, en grande: entra apenas creciendo, con una luz verde detrás.
function Hero({ tl, at, children, label, size = 96 }: { tl: Timeline; at: number; children: string; label?: string; size?: number }) {
  const t = useRingTheme();
  const k = useTween(tl, at, 460);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.86 + 0.14 * k.value }] }));
  return (
    <Animated.View style={[{ alignItems: 'center' }, a]}>
      <Text allowFontScaling={false} style={{ ...display(size), lineHeight: size * 1.04, color: t.text, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(98,240,182,0.45)', textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } }}>{children}</Text>
      {label ? <Text style={{ fontSize: 14, fontWeight: '600', color: t.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>{label}</Text> : null}
    </Animated.View>
  );
}

// Lo que va adentro de la media luna, centrado.
function Inside({ top, side = 0, children }: { top: number; side?: number; children: ReactNode }) {
  return <View style={{ position: 'absolute', left: side, right: side, top: G.cy - top, alignItems: 'center' }}>{children}</View>;
}

// Cara sobre la media luna, en el punto `at` del arco. Aparece cuando la punta del trazo pasa por ahí.
function DomeFace({ tl, at, delay, p, size, me, rank, name }: { tl: Timeline; at: number; delay: number; p: CinePerson; size: number; me?: boolean; rank?: number; name?: string }) {
  const th = useRingTheme();
  const pt = domePoint(G, at);
  const box = size + 8;
  return (
    <Enter tl={tl} delay={delay} dy={0} scale={0.8} duration={420} style={{ position: 'absolute', left: pt.x - 45, top: pt.y - box / 2, width: 90, alignItems: 'center' }}>
      <View style={{ borderRadius: box / 2, borderWidth: 4, borderColor: th.edge }}>
        <Avatar p={p} size={size} ring={me ? th.mint : undefined} />
        {rank ? (
          <View style={{ position: 'absolute', right: -6, top: -6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: rank === 1 ? th.mint : th.seat, borderWidth: 2, borderColor: th.edge, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: rank === 1 ? '#06231a' : th.text }}>{rank}</Text>
          </View>
        ) : null}
      </View>
      {name ? <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: me ? '800' : '600', color: me ? th.mint : th.muted, marginTop: 2, textAlign: 'center' }}>{name}</Text> : null}
    </Enter>
  );
}

type Row = { rank: number; person: CinePerson; steps: number; me?: boolean };
function NightList({ tl, delay, rows }: { tl: Timeline; delay: number; rows: Row[] }) {
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
  return <Enter tl={tl} delay={delay} dy={12} scale={1} duration={440} style={{ alignSelf: 'stretch', marginTop: 22 }}>{children}</Enter>;
}

// La media luna con el espacio de abajo para lo que asoma bajo el arco (etiqueta del número).
function Moon({ children, below = 28, top = 18 }: { children: ReactNode; below?: number; top?: number }) {
  return <View style={{ marginTop: top, marginBottom: below }}>{children}</View>;
}

// Vibración única, cuando el arco llega.
function useLandBuzz(tl: Timeline, at: number, kind: () => void = buzz.success) {
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
    <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS} steps={8} glowAt={LAND}>
      {entries.map((e) => (
        <DomeFace key={e.rank} tl={tl} at={PODIUM_T[e.rank]} delay={pass(PODIUM_T[e.rank]) - 80} p={e.person}
          size={e.me ? 58 : e.rank === 1 ? 50 : 44} me={e.me} rank={e.rank} name={e.rank === 1 ? undefined : e.me ? 'Tú' : first(e.person.name)} />
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
  const tl = useTimeline(LAND + 700);
  useLandBuzz(tl, LAND);
  const share = () => { Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${n(c.steps)} pasos. ¿Me alcanzas?` }).catch(() => {}); };
  const label = `de todo Camina · ${n(c.steps)} pasos`;
  return (
    <Stage tl={tl} night announce={`${tier.title}. Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>{`Ranking semanal · ${c.weekLabel}`}</Eyebrow></Enter>
      <Moon>
        {showPodium ? (
          <PodiumDome tl={tl} entries={podium} hero={`${c.position}.º`} label={label} />
        ) : (
          // Fuera del podio: las huellas te llevan por el arco hasta donde llegaste; la cima es el 1.º.
          <Dome tl={tl} delay={ARC_AT} width={W} progress={reach} duration={ARC_MS} steps={8}>
            <DomeFace tl={tl} at={reach} delay={LAND - 80} p={c.me} size={54} me name="Tú" />
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
          <NightList tl={tl} delay={LAND - 140} rows={[...podium, { rank: c.position, person: c.me, steps: c.steps, me: true }]} />
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
  const tl = useTimeline(LAND + 700);
  useLandBuzz(tl, LAND, won ? buzz.success : buzz.light);
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

function DonePill({ tl, delay }: { tl: Timeline; delay: number }) {
  const t = useRingTheme();
  const k = useTween(tl, delay, 400);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.9 + 0.1 * k.value }] }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: t.rowMe, marginTop: 8 }, a]}>
      <Check size={14} color={t.mint} />
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.mint }}>Meta cumplida</Text>
    </Animated.View>
  );
}

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(LAND + 700);
  const steps = useCount(tl, Math.round(c.total * 0.6), c.total, ARC_AT, ARC_MS);
  const meId = useAuthStore((st) => st.session?.user.id);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 3);
  const rest = sorted.length - top.length;
  useLandBuzz(tl, LAND);
  return (
    <Stage tl={tl} night announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>{`Meta del grupo · ${c.name}`}</Eyebrow></Enter>
      <Moon below={20}>
        <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS} steps={10} glowAt={LAND}>
          <Inside top={100}>
            <View accessible accessibilityLabel={`${c.total} de ${c.target} pasos`} style={{ alignItems: 'center' }}>
              <Enter tl={tl} delay={40} scale={0.9} duration={440} style={{ alignItems: 'center' }}>
                <Text allowFontScaling={false} style={{ ...display(54), color: t.text, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(98,240,182,0.45)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } }}>{n(steps)}</Text>
                <Text style={{ fontSize: 14, color: t.muted, fontVariant: ['tabular-nums'] }}>de {n(c.target)} pasos</Text>
              </Enter>
              <DonePill tl={tl} delay={LAND - 40} />
            </View>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 180} style={{ alignItems: 'center' }}>
        <Title>Lo lograron juntos</Title>
        <Sub>El grupo cumplió la meta de la semana.</Sub>
      </Enter>
      <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
        <NightList tl={tl} delay={LAND - 100} rows={top.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === meId }))} />
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
// Unirse a un grupo: la gente del grupo sentada sobre la media luna; tu cara llega a la cima.
// =====================================================================

// Lugares a los costados del arco, dejando libre la cima.
function sideSpots(count: number) {
  const left = Math.ceil(count / 2);
  return Array.from({ length: count }, (_, i) => {
    const side = i < left ? i : i - left;
    const of = i < left ? left : count - left;
    const t = 0.07 + (0.27 * (side + 0.5)) / of;
    return i < left ? t : 1 - t;
  });
}

export function GroupJoinedScene({ c, onDone }: { c: GroupJoinedCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(LAND + 700);
  useLandBuzz(tl, pass(0.5));
  const shown = c.others.slice(0, 6);
  const spots = sideSpots(shown.length);
  return (
    <Stage tl={tl} night announce={`Ya eres parte de ${c.name}. ${c.total} caminantes.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>Te uniste a</Eyebrow></Enter>
      <Moon below={10} top={22}>
        <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS} glowAt={LAND}>
          {shown.map((q, i) => <DomeFace key={q.id} tl={tl} at={spots[i]} delay={pass(spots[i]) - 60} p={q} size={40} />)}
          <DomeFace tl={tl} at={0.5} delay={pass(0.5) - 60} p={c.me} size={58} me />
          <Inside top={74} side={88}>
            <Enter tl={tl} delay={40} scale={0.92} duration={440} style={{ alignItems: 'center' }}>
              <Text numberOfLines={2} adjustsFontSizeToFit style={{ ...display(23), lineHeight: 26, color: t.text, textAlign: 'center' }}>{c.name}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.mint, marginTop: 6, fontVariant: ['tabular-nums'] }}>{c.total} {c.total === 1 ? 'caminante' : 'caminantes'}</Text>
            </Enter>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 220} style={{ alignItems: 'center' }}>
        <Title>Ya eres parte del grupo</Title>
        <Sub>{c.goalText ?? 'Caminar juntos suma más.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={LAND - 100}>
        <MainButton label="Ver el grupo" onPress={onDone} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Crear un grupo: tus huellas suben hasta la cima, donde llega tu cara; alrededor, los lugares para tus amigos.
// =====================================================================

export function GroupCreatedScene({ c, onDone }: { c: GroupCreatedCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const [copied, setCopied] = useState(false);
  const tl = useTimeline(LAND + 700);
  useLandBuzz(tl, LAND);
  const invite = () => { onDone(); c.onInvite?.(); };
  const seats = [0.09, 0.28, 0.72, 0.91];
  return (
    <Stage tl={tl} night announce={`Grupo ${c.name} creado. Código ${Array.from(c.code).join(' ')}.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>Nuevo grupo</Eyebrow></Enter>
      <Moon below={6} top={22}>
        <Dome tl={tl} delay={ARC_AT} width={W} progress={0.5} duration={ARC_MS} steps={5}>
          {seats.map((s, i) => {
            const p = domePoint(G, s);
            return (
              <Enter key={s} tl={tl} delay={LAND - 120 + i * 50} dy={0} scale={0.85} duration={400} style={{ position: 'absolute', left: p.x - 24, top: p.y - 24 }}>
                <Press accessibilityRole="button" accessibilityLabel="Invitar a alguien" onPress={invite}
                  style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: t.edge, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.faint, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} color={t.muted} />
                  </View>
                </Press>
              </Enter>
            );
          })}
          <DomeFace tl={tl} at={0.5} delay={LAND - 80} p={c.me} size={58} me />
          <Inside top={72} side={74}>
            <Enter tl={tl} delay={40} scale={0.92} duration={440} style={{ alignItems: 'center' }}>
              <Text numberOfLines={2} adjustsFontSizeToFit style={{ ...display(26), lineHeight: 29, color: t.text, textAlign: 'center' }}>{c.name}</Text>
              {c.target ? <Text style={{ fontSize: 13, color: t.muted, marginTop: 6, textAlign: 'center', fontVariant: ['tabular-nums'] }}>Meta: {n(c.target)} pasos por semana</Text> : null}
            </Enter>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 200} style={{ alignItems: 'center' }}>
        <Title>Grupo creado</Title>
        <Sub>Invita a tus amigos: caminar juntos suma más.</Sub>
      </Enter>
      <Enter tl={tl} delay={LAND - 120} style={{ marginTop: 16 }}>
        <Press accessibilityRole="button" accessibilityLabel={`Código ${Array.from(c.code).join(' ')}. Toca para copiarlo`}
          onPress={async () => { await Clipboard.setStringAsync(c.code); buzz.success(); setCopied(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: copied ? t.mint : t.line }}>
          <Text style={{ fontSize: 12, letterSpacing: 1.8, fontWeight: '700', color: t.faint, textTransform: 'uppercase' }}>Código</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: 5, fontVariant: ['tabular-nums'] }}>{c.code}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: copied ? t.mint : t.muted }}>{copied ? 'Copiado' : 'Copiar'}</Text>
        </Press>
      </Enter>
      <Buttons tl={tl} delay={LAND - 40}>
        <MainButton label="Invitar amigos" onPress={invite} />
        <LinkButton label="Ir al grupo" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha de 30 y 100 días: las huellas recorren toda la media luna; adentro, los días en grande.
// =====================================================================

export function StreakScene({ c, onDone }: { c: StreakCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(LAND + 700);
  const days = useCount(tl, Math.max(1, c.days - 12), c.days, ARC_AT, ARC_MS);
  useLandBuzz(tl, LAND);
  const share = () => { Share.share({ message: `Llevo ${c.days} días seguidos cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} night announce={`${c.days} días seguidos de racha.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>Racha</Eyebrow></Enter>
      <Moon>
        <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS} steps={11} glowAt={LAND}>
          <Inside top={124}>
            <View accessible accessibilityLabel={`${c.days} días seguidos`} style={{ alignItems: 'center' }}>
              <Enter tl={tl} delay={20} scale={0.85} duration={400}><Flame size={30} color={t.mint} weight="fill" /></Enter>
              <Hero tl={tl} at={40} size={104} label="días seguidos">{String(days)}</Hero>
            </View>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 220} style={{ alignItems: 'center' }}>
        <Title>{c.days >= 100 ? 'Cien días seguidos' : 'Un mes seguido'}</Title>
        <Sub>{c.days >= 100 ? 'Cien días cumpliendo tu meta. Eres imparable.' : 'Un mes entero cumpliendo tu meta.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={LAND - 100}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha semanal: siete huellas sobre la media luna, una por día, que se encienden cuando pasa el trazo.
// =====================================================================

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const FOOT_L = require('@/../assets/pie-izq-mint.png');
const FOOT_R = require('@/../assets/pie-der-mint.png');

function DayStep({ tl, i, g }: { tl: Timeline; i: number; g: DomeGeo }) {
  const th = useRingTheme();
  const at = (i + 0.5) / 7;
  const k = useTween(tl, pass(at) - 40, 340);
  const p = domePoint(g, at, 32);
  const label = domePoint(g, at, -24);
  const src = i % 2 ? FOOT_R : FOOT_L;
  const lit = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ rotate: `${p.deg}deg` }, { scale: 0.7 + 0.3 * k.value }] }));
  const box = { position: 'absolute' as const, left: p.x - 10, top: p.y - 19, width: 20, height: 38 };
  return (
    <>
      <View pointerEvents="none" style={[box, { opacity: 0.16, transform: [{ rotate: `${p.deg}deg` }] }]}>
        <Image source={src} style={{ width: 20, height: 38 }} resizeMode="contain" />
      </View>
      <Animated.View pointerEvents="none" style={[box, lit]}>
        <Image source={src} style={{ width: 20, height: 38 }} resizeMode="contain" />
      </Animated.View>
      <Text style={{ position: 'absolute', left: label.x - 12, top: label.y - 9, width: 24, textAlign: 'center', fontSize: 12, fontWeight: '700', color: th.faint }}>{DIAS[i]}</Text>
    </>
  );
}

export function StreakWeekScene({ c, onDone }: { c: StreakWeekCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const tl = useTimeline(LAND + 700);
  useLandBuzz(tl, LAND);
  const share = () => { Share.share({ message: `Completé ${c.weeks === 1 ? 'una semana' : `${c.weeks} semanas`} seguidas cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} night announce={`Semana completa. Ganaste ${c.points} Puntos de racha.`}>
      <Enter tl={tl} delay={0} duration={400}><Eyebrow>Racha semanal</Eyebrow></Enter>
      <Moon top={30} below={20}>
        <Dome tl={tl} delay={ARC_AT} width={W} duration={ARC_MS} glowAt={LAND}>
          {DIAS.map((d, i) => <DayStep key={d} tl={tl} i={i} g={G} />)}
          <Inside top={78}>
            <View accessible accessibilityLabel="7 de 7 días" style={{ alignItems: 'center' }}>
              <Hero tl={tl} at={40} size={56}>7 de 7</Hero>
              <Enter tl={tl} delay={LAND - 60} scale={0.9} duration={400}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: t.rowMe, marginTop: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: t.mint, fontVariant: ['tabular-nums'] }}>+{c.points} Puntos</Text>
                </View>
              </Enter>
            </View>
          </Inside>
        </Dome>
      </Moon>
      <Enter tl={tl} delay={LAND - 180} style={{ alignItems: 'center' }}>
        <Title>Semana completa</Title>
        <Sub>{c.weeks > 1 ? `Ya son ${c.weeks} semanas seguidas cumpliendo tu meta.` : '7 días seguidos cumpliendo tu meta.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={LAND - 60}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}
