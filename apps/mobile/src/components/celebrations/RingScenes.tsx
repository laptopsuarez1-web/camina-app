import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Share, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Check, Flame, Plus } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { buzz } from '@/lib/haptics';
import { type CinePerson, type Timeline, LinkButton, MainButton, Stage, useCount, useTimeline } from '@/components/challenge/ChallengeCinematics';
import { CaminaRing, Enter, onRing, ringRadius, useRingTheme, useTween } from '@/components/celebrations/Ring';
import type { GroupCreatedCinematic, GroupGoalCinematic, GroupJoinedCinematic, GroupWeekCinematic, RankingResultCinematic, StreakCinematic, StreakWeekCinematic } from '@/components/celebrations/MomentScenes';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarImage } from '@/components/ui/AvatarImage';

// Festejos de ranking y grupos con el anillo de Camina como protagonista. Noche morada, el anillo doble que se dibuja,
// caras que llegan cuando el punto blanco pasa por su lugar y un cierre de luz suave. Una sola vibración, en el cierre.

const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const n = (v: number) => v.toLocaleString('es-BO');

// Foto de la persona; sin foto, sus iniciales en blanco sobre un morado de la noche (nada de colores sueltos).
function Avatar({ p, size, ring }: { p: CinePerson; size: number; ring?: string }) {
  const t = useRingTheme();
  const border = ring ? { borderWidth: Math.max(2, size * 0.04), borderColor: ring } : {};
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

// ---------- piezas de texto ----------
function Eyebrow({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text numberOfLines={2} style={{ maxWidth: 320, lineHeight: 18, fontSize: 12, letterSpacing: 2.2, fontWeight: '700', color: t.mint, textTransform: 'uppercase', textAlign: 'center' }}>{children}</Text>;
}
function Title({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: t.text, textAlign: 'center' }}>{children}</Text>;
}
function Sub({ children }: { children: string }) {
  const t = useRingTheme();
  return <Text style={{ fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 310 }}>{children}</Text>;
}
function Rank({ rank, label }: { rank: number; label: string }) {
  const t = useRingTheme();
  return (
    <View accessible accessibilityLabel={`Puesto ${rank} ${label}`} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <Text allowFontScaling={false} style={{ fontSize: 64, fontWeight: '800', letterSpacing: -2.5, color: t.text, fontVariant: ['tabular-nums'] }}>{rank}.º</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: t.muted }}>{label}</Text>
    </View>
  );
}

// Cara con un borde del color de la noche, para que "corte" el anillo cuando va encima.
function Face({ p, size, me }: { p: CinePerson; size: number; me?: boolean }) {
  const t = useRingTheme();
  return (
    <View style={{ borderRadius: (size + 8) / 2, borderWidth: 4, borderColor: t.edge }}>
      <Avatar p={p} size={size} ring={me ? t.mint : undefined} />
    </View>
  );
}

// ---------- podio de anillos ----------
// Los tres primeros como anillos: el del 1.º, grande y cerrado; el 2.º y el 3.º, más chicos, llenos según cuánto le
// faltó para alcanzar al primero. Se dibujan del 3.º al 1.º, y el del 1.º cierra con la luz.
type PodiumEntry = { rank: number; person: CinePerson; steps: number; me: boolean };

function PodiumSlot({ tl, e, top, size, delay, duration }: { tl: Timeline; e: PodiumEntry; top: number; size: number; delay: number; duration: number }) {
  const t = useRingTheme();
  return (
    <View style={{ alignItems: 'center', width: size + 8, marginTop: e.rank === 1 ? 0 : 44 }}>
      <CaminaRing tl={tl} delay={delay} size={size} progress={e.steps / top} duration={duration} dim={!e.me && e.rank !== 1} onClose={e.rank === 1 ? { at: delay + duration } : undefined}>
        <Enter tl={tl} delay={delay + 180} scale={0.92}>
          <Avatar p={e.person} size={size * 0.5} ring={e.me ? t.mint : undefined} />
        </Enter>
      </CaminaRing>
      <Enter tl={tl} delay={delay + duration * 0.6} style={{ alignItems: 'center', marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: e.rank === 1 ? t.mint : t.faint, fontVariant: ['tabular-nums'] }}>{e.rank}.º</Text>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700', color: e.me ? t.mint : t.text, marginTop: 1, maxWidth: size }}>{e.me ? 'Tú' : first(e.person.name)}</Text>
        <Text style={{ fontSize: 12.5, color: t.muted, fontVariant: ['tabular-nums'] }}>{n(e.steps)}</Text>
      </Enter>
    </View>
  );
}

// Devuelve el cuadro en que cierra el anillo del 1.º (para la vibración).
const PODIUM_CLOSE = (d: number) => d + 420 + 1500;

function RingPodium({ tl, delay, entries }: { tl: Timeline; delay: number; entries: PodiumEntry[] }) {
  const top = Math.max(1, entries.find((x) => x.rank === 1)?.steps ?? entries[0]?.steps ?? 1);
  const by = (r: number) => entries.find((x) => x.rank === r);
  const e1 = by(1);
  const e2 = by(2);
  const e3 = by(3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 2 }}>
      {e2 ? <PodiumSlot tl={tl} e={e2} top={top} size={104} delay={delay + 160} duration={1150} /> : <View style={{ width: 112 }} />}
      {e1 ? <PodiumSlot tl={tl} e={e1} top={top} size={150} delay={delay + 420} duration={1500} /> : null}
      {e3 ? <PodiumSlot tl={tl} e={e3} top={top} size={104} delay={delay} duration={1150} /> : <View style={{ width: 112 }} />}
    </View>
  );
}

// ---------- lista de la noche ----------
type Row = { rank: number; person: CinePerson; steps: number; me?: boolean };
function NightList({ tl, delay, rows }: { tl: Timeline; delay: number; rows: Row[] }) {
  const t = useRingTheme();
  return (
    <View style={{ alignSelf: 'stretch', borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <Enter key={`${r.rank}-${r.person.id}`} tl={tl} delay={delay + i * 70} dy={6} scale={1}>
          <View accessible accessibilityLabel={`${r.rank}.º ${r.me ? 'Tú' : r.person.name}: ${r.steps} pasos`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.line, backgroundColor: r.me ? t.rowMe : 'transparent' }}>
            <Text style={{ width: 28, fontSize: 13.5, fontWeight: '700', color: t.faint, fontVariant: ['tabular-nums'] }}>{r.rank}.º</Text>
            <Avatar p={r.person} size={30} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: r.me ? '800' : '600', color: r.me ? t.mint : t.text }}>{r.me ? 'Tú' : first(r.person.name)}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.muted, fontVariant: ['tabular-nums'] }}>{n(r.steps)}</Text>
          </View>
        </Enter>
      ))}
    </View>
  );
}

function Buttons({ tl, delay, children }: { tl: Timeline; delay: number; children: React.ReactNode }) {
  return <Enter tl={tl} delay={delay} dy={14} scale={1} style={{ alignSelf: 'stretch', marginTop: 26 }}>{children}</Enter>;
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
  const close = showPodium ? PODIUM_CLOSE(250) : 250 + 1500;
  const tl = useTimeline(close + 900);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => {
    Share.share({ message: `Quedé ${c.position}.º en el ranking semanal global de Camina con ${n(c.steps)} pasos. ¿Me alcanzas?` }).catch(() => {});
  };
  const rows: Row[] = podium.slice();
  if (!showPodium && c.position > 3) rows.push({ rank: c.position, person: c.me, steps: c.steps, me: true });
  return (
    <Stage tl={tl} night announce={`${tier.title}. Puesto ${c.position} del ranking semanal global, ${c.weekLabel}, con ${c.steps} pasos.`}>
      <Enter tl={tl} delay={60}><Eyebrow>{`Ranking semanal · ${c.weekLabel}`}</Eyebrow></Enter>
      <View style={{ marginTop: 26 }}>
        {showPodium ? (
          <RingPodium tl={tl} delay={250} entries={podium} />
        ) : (
          <CaminaRing tl={tl} delay={250} size={184} progress={Math.max(0.04, 1 - (c.position - 1) / limit)} duration={1500}>
            <Enter tl={tl} delay={420} scale={0.92}><Avatar p={c.me} size={98} ring={t.mint} /></Enter>
          </CaminaRing>
        )}
      </View>
      <Enter tl={tl} delay={close - 150} style={{ marginTop: showPodium ? 18 : 14 }}><Rank rank={c.position} label="de todo Camina" /></Enter>
      <Enter tl={tl} delay={close - 60} style={{ alignItems: 'center', marginTop: 2 }}>
        <Title>{tier.title}</Title>
        <Sub>{tier.sub}</Sub>
      </Enter>
      {!showPodium && rows.length > 1 ? (
        <View style={{ alignSelf: 'stretch', marginTop: 20 }}><NightList tl={tl} delay={close + 60} rows={rows} /></View>
      ) : null}
      <Buttons tl={tl} delay={close + 200}>
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
  const close = PODIUM_CLOSE(250);
  const tl = useTimeline(close + 900);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, won ? buzz.success : buzz.light);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      <Enter tl={tl} delay={60}><Eyebrow>{`${c.name} · semana del ${c.weekLabel}`}</Eyebrow></Enter>
      <View style={{ marginTop: 26 }}><RingPodium tl={tl} delay={250} entries={entries} /></View>
      <Enter tl={tl} delay={close - 150} style={{ marginTop: 18 }}><Rank rank={c.myRank} label={`de ${c.members}`} /></Enter>
      <Enter tl={tl} delay={close - 60} style={{ alignItems: 'center', marginTop: 2 }}>
        <Title>{title}</Title>
        <Sub>{sub}</Sub>
      </Enter>
      <Enter tl={tl} delay={close + 80} style={{ marginTop: 16, flexDirection: 'row', gap: 18 }}>
        {!onPodium ? <Text style={{ fontSize: 13.5, color: t.muted, fontVariant: ['tabular-nums'] }}>Tus pasos: <Text style={{ color: t.text, fontWeight: '700' }}>{n(c.mySteps)}</Text></Text> : null}
        <Text style={{ fontSize: 13.5, color: t.muted, fontVariant: ['tabular-nums'] }}>Entre todos: <Text style={{ color: t.text, fontWeight: '700' }}>{n(c.total)}</Text></Text>
      </Enter>
      <Buttons tl={tl} delay={close + 200}>
        <MainButton label="Compartir" onPress={share} />
        <LinkButton label={c.onOpen ? 'Ver el grupo' : 'Listo'} onPress={() => { onDone(); c.onOpen?.(); }} color={t.mint} />
        {c.onOpen ? <LinkButton label="Seguir" onPress={onDone} color={t.muted} /> : null}
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Meta del grupo cumplida: el anillo se completa mientras suben los pasos, y cierra con la luz
// =====================================================================

function DonePill({ tl, delay }: { tl: Timeline; delay: number }) {
  const t = useRingTheme();
  const k = useTween(tl, delay, 520);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * 6 }] }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(98,240,182,0.14)', marginTop: 10 }, a]}>
      <Check size={14} color={t.mint} />
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.mint }}>Meta cumplida</Text>
    </Animated.View>
  );
}

export function GroupGoalScene({ c, onDone }: { c: GroupGoalCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const DRAW = 1700;
  const close = 300 + DRAW;
  const tl = useTimeline(close + 900);
  const steps = useCount(tl, 0, c.total, 300, DRAW);
  const meId = useAuthStore((st) => st.session?.user.id);
  const sorted = [...c.people].sort((a, b) => b.steps - a.steps);
  const top = sorted.slice(0, 3);
  const rest = sorted.length - top.length;
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stage tl={tl} night announce={`${c.name} cumplió la meta de la semana: ${c.total} pasos.`}>
      <Enter tl={tl} delay={60}><Eyebrow>{`Meta del grupo · ${c.name}`}</Eyebrow></Enter>
      <View style={{ marginTop: 26 }}>
        <CaminaRing tl={tl} delay={300} size={236} progress={1} duration={DRAW} onClose={{ at: close }}>
          <View accessible accessibilityLabel={`${steps} de ${c.target} pasos`} style={{ alignItems: 'center' }}>
            <Text allowFontScaling={false} style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.2, color: t.text, fontVariant: ['tabular-nums'] }}>{n(steps)}</Text>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 1 }}>de {n(c.target)} pasos</Text>
            <DonePill tl={tl} delay={close + 60} />
          </View>
        </CaminaRing>
      </View>
      <Enter tl={tl} delay={close + 80} style={{ alignItems: 'center', marginTop: 18 }}>
        <Title>Lo lograron juntos</Title>
        <Sub>El grupo cumplió la meta de la semana.</Sub>
      </Enter>
      <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <NightList tl={tl} delay={close + 200} rows={top.map((q, i) => ({ rank: i + 1, person: q, steps: q.steps, me: q.id === meId }))} />
        {rest > 0 ? <Enter tl={tl} delay={close + 420}><Text style={{ fontSize: 12.5, color: t.faint, textAlign: 'center', marginTop: 8 }}>y {rest} {rest === 1 ? 'persona más' : 'personas más'}</Text></Enter> : null}
      </View>
      <Buttons tl={tl} delay={close + 380}>
        {c.onShare ? <MainButton label="Compartir con el grupo" onPress={() => { c.onShare?.(); onDone(); }} /> : <MainButton label="Listo" onPress={onDone} />}
        {c.onShare ? <LinkButton label="Seguir" onPress={onDone} color={t.mint} /> : null}
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Unirse a un grupo: el anillo se dibuja y las caras del grupo aparecen cuando el punto blanco pasa por su lugar.
// Tu cara llega arriba, donde el anillo cierra.
// =====================================================================

const RING_DRAW_T = (t: number) => {
  // inversa aproximada de la curva del anillo (ease-in-out): cuánto del tiempo tarda en llegar a la fracción t
  const lo = t < 0.5 ? Math.sqrt(t / 2) : 1 - Math.sqrt((1 - t) / 2);
  return lo;
};

export function GroupJoinedScene({ c, onDone }: { c: GroupJoinedCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const SIZE = 280;
  const DRAW = 1600;
  const D0 = 300;
  const close = D0 + DRAW;
  const tl = useTimeline(close + 900);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = c.others.slice(0, 7);
  const r = ringRadius(SIZE);
  const face = 40;
  return (
    <Stage tl={tl} night announce={`Ya eres parte de ${c.name}. ${c.total} caminantes.`}>
      <Enter tl={tl} delay={60}><Eyebrow>Te uniste a</Eyebrow></Enter>
      <View style={{ marginTop: 24, width: SIZE, height: SIZE }}>
        <CaminaRing tl={tl} delay={D0} size={SIZE} progress={1} duration={DRAW} onClose={{ at: close }}>
          <Enter tl={tl} delay={D0 + 200} style={{ alignItems: 'center', maxWidth: 150 }}>
            <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.6, color: t.text, textAlign: 'center' }}>{c.name}</Text>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.mint, marginTop: 4, fontVariant: ['tabular-nums'] }}>{c.total} {c.total === 1 ? 'caminante' : 'caminantes'}</Text>
          </Enter>
        </CaminaRing>
        {shown.map((q, i) => {
          const t = (i + 1) / (shown.length + 1);
          const pos = onRing(SIZE, r, t);
          return (
            <Enter key={q.id} tl={tl} delay={D0 + DRAW * RING_DRAW_T(t)} scale={0.8} dy={0} style={{ position: 'absolute', left: pos.x - face / 2 - 4, top: pos.y - face / 2 - 4 }}>
              <Face p={q} size={face} />
            </Enter>
          );
        })}
        <Enter tl={tl} delay={close - 40} scale={0.8} dy={0} style={{ position: 'absolute', left: SIZE / 2 - (face + 10) / 2 - 4, top: SIZE / 2 - r - (face + 10) / 2 - 4 }}>
          <Face p={c.me} size={face + 10} me />
        </Enter>
      </View>
      <Enter tl={tl} delay={close + 80} style={{ alignItems: 'center', marginTop: 22 }}>
        <Title>Ya eres parte del grupo</Title>
        <Sub>{c.goalText ?? 'Caminar juntos suma más.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={close + 220}>
        <MainButton label="Ver el grupo" onPress={onDone} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Crear un grupo: tu cara arriba del anillo y lugares vacíos alrededor; el anillo marca el primer tramo (tú).
// Adentro, el código para invitar.
// =====================================================================

export function GroupCreatedScene({ c, onDone }: { c: GroupCreatedCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const SIZE = 264;
  const SEATS = 5;
  const D0 = 300;
  const DRAW = 900;
  const [copied, setCopied] = useState(false);
  const tl = useTimeline(D0 + DRAW + 1100);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : D0 + DRAW, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const invite = () => { onDone(); c.onInvite?.(); };
  const r = ringRadius(SIZE);
  const face = 46;
  return (
    <Stage tl={tl} night announce={`Grupo ${c.name} creado. Código ${Array.from(c.code).join(' ')}.`}>
      <Enter tl={tl} delay={60}><Eyebrow>Nuevo grupo</Eyebrow></Enter>
      <Enter tl={tl} delay={120} style={{ marginTop: 8 }}>
        <Text numberOfLines={2} style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.9, color: t.text, textAlign: 'center' }}>{c.name}</Text>
      </Enter>
      <View style={{ marginTop: 22, width: SIZE, height: SIZE }}>
        <CaminaRing tl={tl} delay={D0} size={SIZE} progress={1 / SEATS} duration={DRAW}>
          <Enter tl={tl} delay={D0 + DRAW} style={{ alignItems: 'center' }}>
            <Press accessibilityRole="button" accessibilityLabel={`Código ${Array.from(c.code).join(' ')}. Toca para copiarlo`}
              onPress={async () => { await Clipboard.setStringAsync(c.code); buzz.success(); setCopied(true); }}
              style={{ alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8 }}>
              <Text style={{ fontSize: 12, letterSpacing: 2, fontWeight: '700', color: t.faint, textTransform: 'uppercase' }}>Código</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: 5, marginTop: 2, fontVariant: ['tabular-nums'] }}>{c.code}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: copied ? t.mint : t.muted, marginTop: 2 }}>{copied ? 'Copiado' : 'Toca para copiar'}</Text>
            </Press>
          </Enter>
        </CaminaRing>
        {Array.from({ length: SEATS - 1 }, (_, i) => {
          const pos = onRing(SIZE, r, (i + 1) / SEATS);
          return (
            <Enter key={i} tl={tl} delay={D0 + DRAW + 80 + i * 70} scale={0.85} dy={0} style={{ position: 'absolute', left: pos.x - 23, top: pos.y - 23 }}>
              <Press accessibilityRole="button" accessibilityLabel="Invitar a alguien" onPress={invite}
                style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 4, borderColor: t.edge, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.faint, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color={t.muted} />
                </View>
              </Press>
            </Enter>
          );
        })}
        <Enter tl={tl} delay={D0 - 60} scale={0.85} dy={0} style={{ position: 'absolute', left: SIZE / 2 - face / 2 - 4, top: SIZE / 2 - r - face / 2 - 4 }}>
          <Face p={c.me} size={face} me />
        </Enter>
      </View>
      {c.target ? (
        <Enter tl={tl} delay={D0 + DRAW + 300} style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 13.5, color: t.muted, textAlign: 'center' }}>Meta de la semana: <Text style={{ color: t.text, fontWeight: '700' }}>{n(c.target)} pasos</Text> · empieza hoy</Text>
        </Enter>
      ) : null}
      <Enter tl={tl} delay={D0 + DRAW + 360} style={{ alignItems: 'center', marginTop: 16 }}>
        <Title>Grupo creado</Title>
        <Sub>Invita a tus amigos: caminar juntos suma más.</Sub>
      </Enter>
      <Buttons tl={tl} delay={D0 + DRAW + 480}>
        <MainButton label="Invitar amigos" onPress={invite} />
        <LinkButton label="Ir al grupo" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha de 30 y 100 días: el anillo se cierra mientras cuentan los días; adentro, la llama verde.
// =====================================================================

export function StreakScene({ c, onDone }: { c: StreakCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const DRAW = 1700;
  const close = 300 + DRAW;
  const tl = useTimeline(close + 900);
  const days = useCount(tl, 1, c.days, 300, DRAW);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => { Share.share({ message: `Llevo ${c.days} días seguidos cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  return (
    <Stage tl={tl} night announce={`${c.days} días seguidos de racha.`}>
      <Enter tl={tl} delay={60}><Eyebrow>Racha</Eyebrow></Enter>
      <View style={{ marginTop: 26 }}>
        <CaminaRing tl={tl} delay={300} size={248} progress={1} duration={DRAW} onClose={{ at: close }}>
          <View accessible accessibilityLabel={`${c.days} días seguidos`} style={{ alignItems: 'center' }}>
            <Enter tl={tl} delay={300} scale={0.9}><Flame size={34} color={t.mint} /></Enter>
            <Text allowFontScaling={false} style={{ fontSize: 64, fontWeight: '800', letterSpacing: -2.5, color: t.text, fontVariant: ['tabular-nums'], marginTop: 2 }}>{days}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.muted, marginTop: -4 }}>días seguidos</Text>
          </View>
        </CaminaRing>
      </View>
      <Enter tl={tl} delay={close + 80} style={{ alignItems: 'center', marginTop: 22 }}>
        <Title>{c.days >= 100 ? 'Cien días seguidos' : 'Un mes seguido'}</Title>
        <Sub>{c.days >= 100 ? 'Cien días cumpliendo tu meta. Eres imparable.' : 'Un mes entero cumpliendo tu meta.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={close + 220}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}

// =====================================================================
// Racha semanal completa: los 7 días están sobre el anillo y se encienden cuando pasa el punto blanco.
// =====================================================================

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function DayMark({ tl, at, label }: { tl: Timeline; at: number; label: string }) {
  const t = useRingTheme();
  const k = useTween(tl, at, 380);
  const on = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.86 + 0.14 * k.value }] }));
  const S = 34;
  return (
    <View style={{ width: S + 8, height: S + 8, borderRadius: (S + 8) / 2, borderWidth: 4, borderColor: t.edge, backgroundColor: t.seat, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.faint }}>{label}</Text>
      <Animated.View style={[{ position: 'absolute', width: S, height: S, borderRadius: S / 2, backgroundColor: t.mint, alignItems: 'center', justifyContent: 'center' }, on]}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.dark ? '#06231a' : '#FFFFFF' }}>{label}</Text>
      </Animated.View>
    </View>
  );
}

export function StreakWeekScene({ c, onDone }: { c: StreakWeekCinematic; onDone: () => void }) {
  const t = useRingTheme();
  const SIZE = 268;
  const DRAW = 1700;
  const D0 = 300;
  const close = D0 + DRAW;
  const tl = useTimeline(close + 1000);
  useEffect(() => {
    tl.at(tl.reduced ? 0 : close, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const share = () => { Share.share({ message: `Completé ${c.weeks === 1 ? 'una semana' : `${c.weeks} semanas`} seguidas cumpliendo mi meta en Camina. ¿Te animas?` }).catch(() => {}); };
  const r = ringRadius(SIZE);
  return (
    <Stage tl={tl} night announce={`Semana completa. Ganaste ${c.points} Puntos de racha.`}>
      <Enter tl={tl} delay={60}><Eyebrow>Racha semanal</Eyebrow></Enter>
      <View style={{ marginTop: 24, width: SIZE, height: SIZE }}>
        <CaminaRing tl={tl} delay={D0} size={SIZE} progress={1} duration={DRAW} onClose={{ at: close }}>
          <View accessible accessibilityLabel="7 de 7 días" style={{ alignItems: 'center' }}>
            <Enter tl={tl} delay={D0} scale={0.9}><Flame size={30} color={t.mint} /></Enter>
            <Enter tl={tl} delay={D0 + 150} scale={1} dy={4}>
              <Text allowFontScaling={false} style={{ fontSize: 44, fontWeight: '800', letterSpacing: -1.5, color: t.text, fontVariant: ['tabular-nums'] }}>7 de 7</Text>
            </Enter>
            <Enter tl={tl} delay={close + 40} scale={0.94} dy={4}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: t.rowMe, marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: t.mint, fontVariant: ['tabular-nums'] }}>+{c.points} Puntos</Text>
              </View>
            </Enter>
          </View>
        </CaminaRing>
        {DIAS.map((d, i) => {
          const f = (i + 1) / 7;
          const pos = onRing(SIZE, r, f);
          return (
            <View key={d} style={{ position: 'absolute', left: pos.x - 21, top: pos.y - 21 }}>
              <DayMark tl={tl} at={D0 + DRAW * RING_DRAW_T(f) - 60} label={d} />
            </View>
          );
        })}
      </View>
      <Enter tl={tl} delay={close + 120} style={{ alignItems: 'center', marginTop: 22 }}>
        <Title>Semana completa</Title>
        <Sub>{c.weeks > 1 ? `Ya son ${c.weeks} semanas seguidas cumpliendo tu meta.` : '7 días seguidos cumpliendo tu meta.'}</Sub>
      </Enter>
      <Buttons tl={tl} delay={close + 260}>
        <MainButton label="Compartir mi racha" onPress={share} />
        <LinkButton label="Seguir caminando" onPress={onDone} color={t.mint} />
      </Buttons>
    </Stage>
  );
}
