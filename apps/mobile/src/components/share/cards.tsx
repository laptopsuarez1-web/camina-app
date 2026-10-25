import React, { type ReactNode } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Crown, Flame, Trophy } from '@/components/icons';
import { WORDMARK_FAMILY } from '@/theme/fonts';
import { fmtInt, fmtKm, rangeLabel, shortDay, weekdayName, type ShareStats } from '@/lib/share-stats';

// Tarjetas que la persona comparte como imagen (historias, WhatsApp, donde quiera). Se dibujan siempre a 360 px de ancho
// (9:16 para historias, 1:1 para chats) y se capturan a 1080 px. Los colores son propios: no cambian con el modo de la app.
// Nada de esto sale de la app hasta que la persona toca Compartir: se arma en el teléfono.
export type CardTheme = 'light' | 'dark';
export type CardFormat = 'story' | 'square';

export const CARD_W = 360;
export const cardHeight = (f: CardFormat) => (f === 'story' ? 640 : 360);
export const CAMINA_HANDLE = '@caminaapp';

const PAL = {
  light: {
    bg: ['#FCE9F2', '#E6F8F0', '#E8E0FB'] as const,
    ink: '#291C47', muted: '#655483', accent: '#1F7A66', accentSoft: 'rgba(31,122,102,0.12)',
    tile: 'rgba(255,255,255,0.74)', tileLine: 'rgba(255,255,255,0.95)', pill: 'rgba(255,255,255,0.8)',
    bar: '#4FC3A8', barBest: '#1F7A66', barOff: '#D4C8EC', goal: 'rgba(41,28,71,0.35)',
    track: 'rgba(91,49,163,0.12)', mark: '#8B4FD1', flame: '#E0782A', gold: '#B77A0B',
    logo: '#5B6B99', logoOpacity: 0.15, onBar: '#FFFFFF',
  },
  dark: {
    bg: ['#2A1B52', '#1B1236', '#120C1F'] as const,
    ink: '#F4EFFF', muted: '#B3A6D6', accent: '#7FEDC4', accentSoft: 'rgba(127,237,196,0.14)',
    tile: 'rgba(255,255,255,0.08)', tileLine: 'rgba(255,255,255,0.14)', pill: 'rgba(255,255,255,0.12)',
    bar: '#7FEDC4', barBest: '#FFFFFF', barOff: 'rgba(255,255,255,0.18)', goal: 'rgba(255,255,255,0.5)',
    track: 'rgba(255,255,255,0.14)', mark: '#C9ADF5', flame: '#F2985C', gold: '#F5C645',
    logo: '#C9ADF5', logoOpacity: 0.1, onBar: '#12281F',
  },
} as const;
export type Pal = (typeof PAL)['light'] | (typeof PAL)['dark'];
export const palette = (t: CardTheme): Pal => PAL[t];

// ---------- Marco común ----------

export function CardFrame({
  theme, format, label, progress, children,
}: { theme: CardTheme; format: CardFormat; label: string; progress?: { index: number; total: number }; children: ReactNode }) {
  const p = PAL[theme];
  const story = format === 'story';
  return (
    <View style={{ width: CARD_W, height: cardHeight(format), overflow: 'hidden', backgroundColor: p.bg[1] }}>
      <LinearGradient colors={[...p.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      {/* El logo de Camina grande y apagado de fondo, cortado por el borde. */}
      <Image
        source={require('@/../assets/logo-mint.png')}
        accessible={false}
        style={story
          ? { position: 'absolute', left: 112, top: 268, width: 340, height: 340, tintColor: p.logo, opacity: p.logoOpacity }
          : { position: 'absolute', left: 170, top: 100, width: 250, height: 250, tintColor: p.logo, opacity: p.logoOpacity }}
      />
      {/* Zona segura de Instagram: arriba y abajo queda libre lo que tapan la barra y la caja de respuesta. */}
      <View style={{ flex: 1, paddingTop: story ? 64 : 18, paddingBottom: story ? 50 : 14, paddingHorizontal: story ? 22 : 18 }}>
        {progress ? (
          <View style={{ position: 'absolute', top: 30, left: 22, right: 22, flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: progress.total }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= progress.index ? p.accent : p.track }} />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: story ? 18 : 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 22, height: 22, borderRadius: 11 }} />
            <Text style={{ fontFamily: WORDMARK_FAMILY, fontSize: 13, letterSpacing: 2.2, color: p.ink, fontWeight: '900' }}>CAMINA</Text>
          </View>
          <View style={{ backgroundColor: p.pill, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.ink }}>{label}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted, marginTop: story ? 10 : 4 }}>{CAMINA_HANDLE} · Camina y gana Puntos</Text>
      </View>
    </View>
  );
}

// ---------- Piezas ----------

// Tamaño de fuente para que un número grande entre en `maxW` px (sin depender de adjustsFontSizeToFit, que no se banca en todos lados).
// Los dígitos en negrita miden ~0,58 em y el punto de miles ~0,3 em.
function fitSize(text: string, base: number, maxW: number) {
  const em = [...text].reduce((a, c) => a + (/\d/.test(c) ? 0.58 : 0.32), 0);
  return Math.min(base, Math.floor(maxW / em));
}

function Tile({ p, label, value, unit, style, stack, small }: { p: Pal; label: string; value: string; unit?: string; style?: ViewStyle; stack?: boolean; small?: boolean }) {
  return (
    <View style={[{ flex: 1, backgroundColor: p.tile, borderColor: p.tileLine, borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: small ? 9 : 11 }, style]}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }} numberOfLines={1}>{label}</Text>
      <View style={stack ? { marginTop: 1 } : { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 }}>
        <Text style={{ fontSize: small ? 17 : 20, fontWeight: '800', color: p.ink, letterSpacing: -0.4 }} numberOfLines={1}>{value}</Text>
        {unit ? <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted }} numberOfLines={1}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function TileGrid({ p, tiles }: { p: Pal; tiles: { label: string; value: string; unit?: string; stack?: boolean }[] }) {
  const rows: (typeof tiles)[] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((t) => <Tile key={t.label} p={p} {...t} />)}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function Trend({ p, pct, what, inline }: { p: Pal; pct: number | null; what: string; inline?: boolean }) {
  if (pct === null || pct === 0) return null;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: p.accentSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, marginTop: inline ? 0 : 6 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.accent }}>{pct > 0 ? '↑' : '↓'} {Math.abs(pct)} % {pct > 0 ? 'más' : 'menos'} que {what}</Text>
    </View>
  );
}

// Barras de pasos del período con la línea de la meta; la del día más activo va resaltada.
function Bars({ p, stats, height, goal, showLabels }: { p: Pal; stats: ShareStats; height: number; goal: number; showLabels: boolean }) {
  const W = CARD_W - 44;
  const n = stats.bars.length;
  const gap = n > 12 ? 2 : 8;
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(goal * 1.15, ...stats.bars.map((b) => b.steps), 1);
  return (
    <View>
      <Svg width={W} height={height}>
        {stats.bars.map((b, i) => {
          const h = Math.max(3, (b.steps / max) * (height - 4));
          const fill = b.isBest ? p.barBest : b.met ? p.bar : p.barOff;
          return <Rect key={b.key} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={fill} />;
        })}
        <Line x1={0} x2={W} y1={height - (goal / max) * (height - 4)} y2={height - (goal / max) * (height - 4)} stroke={p.goal} strokeWidth={1} strokeDasharray="3 3" />
      </Svg>
      {showLabels ? (
        <View style={{ flexDirection: 'row', gap, marginTop: 3 }}>
          {stats.bars.map((b) => (
            <Text key={b.key} style={{ width: bw, textAlign: 'center', fontSize: 10, fontWeight: b.isBest ? '800' : '600', color: b.isBest ? p.ink : p.muted }}>{b.label}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Calendario del mes: un círculo por día, con tilde si se cumplió la meta (el día más activo, más oscuro).
function CalendarDots({ p, stats, cell, pitch, width }: { p: Pal; stats: ShareStats; cell: number; pitch: number; width: number }) {
  const [y, m, d] = stats.rangeStart.split('-').map(Number);
  const off = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const colW = width / 7;
  const rows = Math.ceil((off + stats.bars.length) / 7);
  const r = cell / 2;
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l) => (
          <Text key={l} style={{ width: colW, textAlign: 'center', fontSize: 10, fontWeight: '700', color: p.muted }}>{l}</Text>
        ))}
      </View>
      <Svg width={width} height={rows * pitch}>
        {stats.bars.map((b, i) => {
          const pos = off + i;
          const cx = (pos % 7) * colW + colW / 2;
          const cy = Math.floor(pos / 7) * pitch + pitch / 2;
          if (!b.met) return <Circle key={b.key} cx={cx} cy={cy} r={r - 0.75} stroke={p.barOff} strokeWidth={1.5} fill="none" />;
          return (
            <React.Fragment key={b.key}>
              <Circle cx={cx} cy={cy} r={r} fill={b.isBest ? p.barBest : p.bar} />
              <Polyline
                points={`${cx - r * 0.42},${cy + r * 0.04} ${cx - r * 0.1},${cy + r * 0.38} ${cx + r * 0.46},${cy - r * 0.32}`}
                stroke={p.onBar} strokeWidth={Math.max(1.4, cell * 0.12)} strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function Ring({ p, size, pct, children }: { p: Pal; size: number; pct: number; children: ReactNode }) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={p.bar} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * Math.min(1, pct)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const KCAL_NOTE = '* Estimado a partir de tus pasos, no es una medición.';
function Note({ p }: { p: Pal }) {
  return <Text style={{ fontSize: 9.5, color: p.muted, marginTop: 6 }}>{KCAL_NOTE}</Text>;
}

// ---------- Resumen del día, la semana o el mes ----------

export type ResumenData = {
  stats: ShareStats;
  streak: number;
  // Solo si la persona activó "Aparecer en el ranking" y tiene puesto esta semana.
  weeklyRank: number | null;
  name: string | null;
};

export function ResumenCard({ theme, format, data }: { theme: CardTheme; format: CardFormat; data: ResumenData }) {
  const p = PAL[theme];
  const { stats, streak, weeklyRank, name } = data;
  const story = format === 'story';
  const goal = stats.goalToday;

  if (stats.period === 'day') {
    const pct = goal > 0 ? stats.steps / goal : 0;
    const done = pct >= 1;
    const ringSize = story ? 210 : 140;
    return (
      <CardFrame theme={theme} format={format} label={`Hoy · ${shortDay(stats.rangeEnd)}`}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: p.muted }}>{name ? `El día de ${name}` : 'Mi día'}</Text>
        <View style={{ alignItems: 'center', marginTop: story ? 10 : 2, marginBottom: story ? 12 : 6 }}>
          <Ring p={p} size={ringSize} pct={pct}>
            <Text style={{ fontSize: story ? 44 : 32, fontWeight: '800', color: p.ink, letterSpacing: -1 }}>{fmtInt(stats.steps)}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: p.muted }}>pasos hoy</Text>
          </Ring>
          <Text style={{ fontSize: 12, fontWeight: '700', color: p.accent, marginTop: 8 }}>
            {done ? `¡Meta superada! ${Math.round(pct * 100)} % de ${fmtInt(goal)}` : `${Math.round(pct * 100)} % de tu meta de ${fmtInt(goal)}`}
          </Text>
        </View>
        <TileGrid
          p={p}
          tiles={
            story
              ? [
                  { label: 'Puntos de hoy', value: `+${stats.pointsToday}`, unit: 'de 20 posibles' },
                  { label: 'Racha', value: String(streak), unit: streak === 1 ? 'día con meta' : 'días con meta' },
                  { label: 'Distancia', value: fmtKm(stats.km), unit: 'km' },
                  { label: 'Calorías*', value: `≈ ${fmtInt(stats.kcal)}`, unit: 'kcal' },
                ]
              : [
                  { label: 'Puntos de hoy', value: `+${stats.pointsToday}` },
                  { label: 'Distancia', value: fmtKm(stats.km), unit: 'km' },
                ]
          }
        />
        {story ? <Note p={p} /> : null}
      </CardFrame>
    );
  }

  const week = stats.period === 'week';
  const label = week ? `Mi semana · ${rangeLabel(stats.rangeStart, stats.rangeEnd)}` : `Mi mes · ${rangeLabel(stats.rangeStart, stats.rangeEnd)}`;
  const tiles = [
    { label: 'Promedio por día', value: fmtInt(stats.avgPerDay), unit: 'pasos' },
    { label: 'Día más activo', value: stats.best ? (week ? weekdayName(stats.best.key) : shortDay(stats.best.key)) : '–', unit: stats.best ? `${fmtInt(stats.best.steps)} pasos` : undefined, stack: true },
    { label: 'Racha', value: String(streak), unit: streak === 1 ? 'día seguido' : 'días seguidos' },
    { label: 'Meta cumplida', value: `${stats.daysMet} de ${stats.days}`, unit: 'días' },
    weeklyRank
      ? { label: 'Ranking global', value: `${weeklyRank}.º`, unit: 'esta semana' }
      : { label: 'Distancia', value: fmtKm(stats.km), unit: 'km' },
    { label: 'Calorías*', value: `≈ ${fmtInt(stats.kcal)}`, unit: 'kcal' },
  ];
  const squareTiles = [
    { label: 'Promedio/día', value: fmtInt(stats.avgPerDay), unit: 'pasos' },
    { label: 'Más activo', value: stats.best ? shortDay(stats.best.key) : '–', unit: stats.best ? `${fmtInt(stats.best.steps)} pasos` : undefined },
    { label: 'Meta cumplida', value: `${stats.daysMet} de ${stats.days}`, unit: 'días' },
  ];
  const bigSize = fitSize(fmtInt(stats.steps), story ? 50 : 40, CARD_W - (story ? 44 : 36));

  return (
    <CardFrame theme={theme} format={format} label={label}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: p.muted }}>{name ? `${week ? 'La semana' : 'El mes'} de ${name}` : week ? 'Mi semana' : 'Mi mes'}</Text>
      <Text style={{ fontSize: bigSize, lineHeight: Math.round(bigSize * 1.12), flexShrink: 0, fontWeight: '800', color: p.ink, letterSpacing: -1.5, marginTop: 2 }} numberOfLines={1}>{fmtInt(stats.steps)}</Text>
      {week ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: p.muted }}>pasos esta semana</Text>
          {story ? <Trend p={p} pct={stats.trendPct} what="la anterior" /> : null}
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: p.muted }}>pasos este mes</Text>
          {story ? <Trend p={p} pct={stats.trendPct} what="el mes pasado" inline /> : null}
        </View>
      )}
      <View style={{ marginTop: story ? 12 : 8, marginBottom: story ? 10 : 6 }}>
        {week ? (
          <Bars p={p} stats={stats} height={story ? 84 : 62} goal={goal} showLabels />
        ) : (
          <CalendarDots p={p} stats={stats} cell={story ? 20 : 13} pitch={story ? 25 : 15} width={CARD_W - (story ? 44 : 36)} />
        )}
      </View>
      {story ? (
        <>
          {/* En el mes el calendario ya cuenta la racha, así que van solo cuatro cuadros. */}
          <TileGrid p={p} tiles={week ? tiles : [tiles[0], tiles[1], tiles[3], tiles[5]]} />
          <Note p={p} />
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {squareTiles.map((t) => <Tile key={t.label} p={p} {...t} stack small />)}
        </View>
      )}
    </CardFrame>
  );
}

// ---------- Ranking del grupo ----------

export type GroupCardData = {
  groupName: string;
  weekLabel: string;
  // Ordenados de mayor a menor. `label` ya viene listo: inicial (por defecto) o primer nombre si la persona lo eligió.
  members: { id: string; label: string; steps: number; isMe: boolean }[];
  target: number;
  total: number;
};

function Medal({ p, label, rank, steps, isMe, big }: { p: Pal; label: string; rank: number; steps: number; isMe: boolean; big?: boolean }) {
  const d = big ? 54 : 44;
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {rank === 1 ? <Crown size={18} color={p.gold} weight="fill" /> : <View style={{ height: 18 }} />}
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: isMe ? p.accent : p.tile, borderWidth: 1.5, borderColor: isMe ? p.accent : p.tileLine, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: big ? 22 : 18, fontWeight: '800', color: isMe ? (p === PAL.dark ? '#12281F' : '#fff') : p.ink }}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      {isMe || label.length > 1 ? <Text style={{ fontSize: 11, fontWeight: '700', color: p.ink, marginTop: 4 }} numberOfLines={1}>{isMe ? 'Tú' : label}</Text> : <View style={{ height: 4 }} />}
      <View style={{ width: '88%', marginTop: 5, borderRadius: 14, backgroundColor: p.tile, borderColor: isMe ? p.accent : p.tileLine, borderWidth: isMe ? 1.5 : 1, alignItems: 'center', paddingVertical: big ? 14 : 9 }}>
        <Text style={{ fontSize: big ? 26 : 20, fontWeight: '800', color: p.ink }}>{rank}.º</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }}>{fmtInt(steps)}</Text>
      </View>
    </View>
  );
}

export function GroupCard({ theme, format, data }: { theme: CardTheme; format: CardFormat; data: GroupCardData }) {
  const p = PAL[theme];
  const story = format === 'story';
  const { members } = data;
  const top = members.slice(0, 3);
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  const rest = story ? members.slice(3, 7) : [];
  const max = Math.max(...members.map((m) => m.steps), 1);
  const pct = data.target > 0 ? Math.min(1, data.total / data.target) : 0;
  return (
    <CardFrame theme={theme} format={format} label={`Grupo · ${data.weekLabel}`}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.muted }}>Ranking del grupo · {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}</Text>
      <Text style={{ fontSize: story ? 28 : 22, fontWeight: '800', color: p.ink, letterSpacing: -0.6, marginTop: 2 }} numberOfLines={2}>{data.groupName}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: story ? 14 : 6, gap: 8 }}>
        {podium.map((m) => {
          const rank = members.findIndex((x) => x.id === m.id) + 1;
          return <Medal key={m.id} p={p} label={m.label} rank={rank} steps={m.steps} isMe={m.isMe} big={rank === 1} />;
        })}
      </View>
      {rest.length ? (
        <View style={{ marginTop: 12, gap: 7 }}>
          {rest.map((m, i) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 24, fontSize: 11, fontWeight: '800', color: m.isMe ? p.accent : p.muted }}>{i + 4}.º</Text>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: m.isMe ? p.accent : p.tile, borderWidth: 1, borderColor: p.tileLine, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: m.isMe ? (theme === 'dark' ? '#12281F' : '#fff') : p.ink }}>{m.label.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: p.track, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(4, (m.steps / max) * 100)}%`, height: 7, borderRadius: 4, backgroundColor: m.isMe ? p.accent : p.bar }} />
              </View>
              <Text style={{ width: 46, textAlign: 'right', fontSize: 10.5, fontWeight: '700', color: p.ink }}>{fmtInt(m.steps)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      <View style={{ backgroundColor: p.tile, borderColor: pct >= 1 ? p.accent : p.tileLine, borderWidth: pct >= 1 ? 1.5 : 1, borderRadius: 16, padding: 11 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: p.ink }}>Meta del grupo</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: p.accent }}>{pct >= 1 ? '¡Meta cumplida!' : `${Math.round(pct * 100)} %`}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: p.track, overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(2, pct * 100)}%`, height: 8, borderRadius: 4, backgroundColor: p.bar }} />
        </View>
        <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted, marginTop: 5 }}>{fmtInt(data.total)} de {fmtInt(data.target)} pasos</Text>
      </View>
    </CardFrame>
  );
}

// ---------- Wrapped del mes ----------

export type WrappedData = {
  monthName: string; // "septiembre"
  name: string | null;
  steps: number;
  trendPct: number | null; // contra el mes anterior completo
  avgPerDay: number;
  km: number;
  kcal: number;
  days: number;
  daysMet: number;
  best: { key: string; steps: number } | null;
  // Un día por casilla del mes, en orden: se usa para el calendario de la lámina 2.
  calendar: { key: string; day: number; met: boolean }[];
  firstWeekday: number; // 0 = lunes, la columna donde cae el día 1
  run: { length: number; from: string | null; to: string | null };
  rank: { weekStart: string; weekEnd: string; position: number; participants: number } | null;
  points: { steps: number; bonus: number; total: number };
};

export const wrappedSlideCount = (d: WrappedData) => (d.rank ? 6 : 5);

function BigNumber({ p, value, size = 64 }: { p: Pal; value: string; size?: number }) {
  return <Text style={{ fontSize: fitSize(value, size, CARD_W - 44), fontWeight: '800', color: p.ink, letterSpacing: -2, lineHeight: Math.round(fitSize(value, size, CARD_W - 44) * 1.12) }} numberOfLines={1}>{value}</Text>;
}
function Kicker({ p, children }: { p: Pal; children: ReactNode }) {
  return <Text style={{ fontSize: 14, fontWeight: '700', color: p.muted, marginBottom: 6 }}>{children}</Text>;
}

export function WrappedSlide({ theme, data, index }: { theme: CardTheme; data: WrappedData; index: number }) {
  const p = PAL[theme];
  const total = wrappedSlideCount(data);
  // Sin puesto en el ranking (ranking apagado o sin datos) la lámina 4 no existe y las demás se corren.
  const slide = !data.rank && index >= 3 ? index + 1 : index;
  const label = `Tu ${data.monthName}`;
  const frame = (children: ReactNode) => (
    <CardFrame theme={theme} format="story" label={label} progress={{ index, total }}>{children}</CardFrame>
  );
  const nm = data.name ? `, ${data.name}` : '';

  if (slide === 0) {
    return frame(
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
        <Kicker p={p}>Tu mes en Camina{nm}</Kicker>
        <BigNumber p={p} value={fmtInt(data.steps)} size={72} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink, marginTop: 4 }}>pasos en {data.monthName}</Text>
        <Trend p={p} pct={data.trendPct} what="el mes anterior" />
      </View>,
    );
  }

  if (slide === 1) {
    const cell = 36;
    const cells: (null | WrappedData['calendar'][number])[] = [...Array(data.firstWeekday).fill(null), ...data.calendar];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return frame(
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Kicker p={p}>Tu día más activo fue</Kicker>
        <Text style={{ fontSize: 50, fontWeight: '800', color: p.mark, letterSpacing: -1.5 }}>{data.best ? shortDay(data.best.key) : '–'}</Text>
        {data.best ? <Text style={{ fontSize: 17, fontWeight: '800', color: p.ink }}>{fmtInt(data.best.steps)} pasos</Text> : null}
        <View style={{ marginTop: 22, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <Text key={d} style={{ width: cell, textAlign: 'center', fontSize: 10, fontWeight: '700', color: p.muted }}>{d}</Text>)}
          </View>
          {weeks.map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
              {w.map((c, j) => (
                <View
                  key={j}
                  style={{
                    width: cell, height: cell, borderRadius: cell / 2, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: c ? (c.met ? p.bar : 'transparent') : 'transparent',
                    borderWidth: c && !c.met ? 1.5 : c && data.best?.key === c.key ? 2 : 0,
                    borderColor: c && data.best?.key === c.key ? p.ink : p.track,
                  }}
                >
                  {c ? <Text style={{ fontSize: 11, fontWeight: '700', color: c.met ? (theme === 'dark' ? '#12281F' : '#fff') : p.muted }}>{c.day}</Text> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, fontWeight: '600', color: p.muted, marginTop: 12 }}>Cumpliste tu meta {data.daysMet} de {data.days} días.</Text>
      </View>,
    );
  }

  if (slide === 2) {
    const n = data.run.length;
    const shown = Math.min(n, 14);
    return frame(
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Flame size={44} color={p.flame} weight="fill" />
        <BigNumber p={p} value={String(n)} size={96} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>{n === 1 ? 'día seguido' : 'días seguidos'}, tu mejor racha</Text>
        {data.run.from && data.run.to ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: p.muted, marginTop: 4 }}>Cumpliste tu meta del {rangeLabel(data.run.from, data.run.to)}.</Text>
        ) : (
          <Text style={{ fontSize: 13, fontWeight: '600', color: p.muted, marginTop: 4 }}>El mes que viene, a por la primera.</Text>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
          {Array.from({ length: shown }, (_, i) => (
            <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.bar }} />
          ))}
          {n > shown ? <Text style={{ fontSize: 12, fontWeight: '800', color: p.ink, alignSelf: 'center' }}>+{n - shown}</Text> : null}
        </View>
      </View>,
    );
  }

  if (slide === 3 && data.rank) {
    return frame(
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Trophy size={44} color={p.gold} weight="fill" />
        <Kicker p={p}>Tu mejor puesto en el ranking global</Kicker>
        <BigNumber p={p} value={`${data.rank.position}.º`} size={88} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: p.ink }}>en la semana del {rangeLabel(data.rank.weekStart, data.rank.weekEnd)}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: p.muted, marginTop: 4 }}>entre {fmtInt(data.rank.participants)} {data.rank.participants === 1 ? 'caminante' : 'caminantes'} del ranking.</Text>
      </View>,
    );
  }

  if (slide === 4) {
    return frame(
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Image source={require('@/../assets/camina-coin.png')} accessible={false} style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 6 }} />
        <BigNumber p={p} value={fmtInt(data.points.total)} size={88} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>Puntos ganados en {data.monthName}</Text>
        <View style={{ marginTop: 18, gap: 8 }}>
          <Tile p={p} label="Por tus pasos" value={`+${fmtInt(data.points.steps)}`} />
          {data.points.bonus > 0 ? <Tile p={p} label="Bonos y extras" value={`+${fmtInt(data.points.bonus)}`} /> : null}
        </View>
      </View>,
    );
  }

  return frame(
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: p.ink, letterSpacing: -0.8, marginBottom: 14 }}>En resumen</Text>
      <TileGrid
        p={p}
        tiles={[
          { label: 'Promedio por día', value: fmtInt(data.avgPerDay), unit: 'pasos' },
          { label: 'Distancia', value: fmtKm(data.km), unit: 'km' },
          { label: 'Calorías*', value: `≈ ${fmtInt(data.kcal)}`, unit: 'kcal' },
          { label: 'Meta cumplida', value: `${data.daysMet} de ${data.days}`, unit: 'días' },
        ]}
      />
      <Note p={p} />
      <View style={{ flex: 1 }} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: p.muted }}>Un mes más caminando{data.name ? `, ${data.name}` : ''}. ¡Gracias por sumar!</Text>
    </View>,
  );
}
