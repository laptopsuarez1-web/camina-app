import React, { useId, type ReactNode } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinear, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { CrownMark } from '@/components/CrownMark';
import { FlameArt, TrophyArt } from '@/components/share/art';
import { WORDMARK_FAMILY } from '@/theme/fonts';
import { Grow, Stagger, useCountUp } from '@/components/share/slide-motion';
import { fmtInt, fmtKm, rangeLabel, shortDay, weekdayName, weeklyTotals, type ShareStats } from '@/lib/share-stats';
import { STEP_LENGTH_METERS } from '@/constants/business-rules';

// Tarjetas que la persona comparte como imagen (historias, WhatsApp, donde quiera). Se dibujan siempre a 360 px de ancho
// (9:16 para historias, 1:1 para chats) y se capturan a 1080 px. Los colores son propios: no cambian con el modo de la app.
// Nada de esto sale de la app hasta que la persona toca Compartir: se arma en el teléfono.
export type CardTheme = 'light' | 'dark';
// 'overlay' = fondo transparente, solo texto en blanco: se pega como sticker sobre la foto de la persona (como en Strava).
export type CardFormat = 'story' | 'square' | 'overlay';

export const CARD_W = 360;
export const cardHeight = (f: CardFormat) => (f === 'square' ? 360 : 640);

const PAL = {
  light: {
    bg: ['#FCFBFF', '#F8F6FC', '#F5F3FB'] as const,
    ink: '#291C47', muted: '#655483', accent: '#1F7A66', accentSoft: 'rgba(31,122,102,0.12)',
    tile: 'rgba(255,255,255,0.74)', tileLine: 'rgba(255,255,255,0.95)', pill: 'rgba(255,255,255,0.8)', rule: 'rgba(41,28,71,0.12)',
    bar: '#4FC3A8', barBest: '#1F7A66', barOff: '#D4C8EC', goal: 'rgba(41,28,71,0.35)',
    track: 'rgba(91,49,163,0.12)', mark: '#8B4FD1', flame: '#E0782A', gold: '#B77A0B',
    logo: '#5B6B99', logoOpacity: 0.15, onBar: '#FFFFFF',
    heat: ['#CFEDE4', '#8FD8C2', '#3FB896', '#1F7A66'], heatInk: ['#291C47', '#291C47', '#10261F', '#FFFFFF'], heatEmpty: 'rgba(91,49,163,0.22)',
  },
  dark: {
    bg: ['#15141B', '#1A1822', '#201C2B'] as const,
    ink: '#F4EFFF', muted: '#B3A6D6', accent: '#62F0B6', accentSoft: 'rgba(98,240,182,0.14)',
    tile: 'rgba(255,255,255,0.08)', tileLine: 'rgba(255,255,255,0.14)', pill: 'rgba(255,255,255,0.12)', rule: 'rgba(255,255,255,0.14)',
    bar: '#62F0B6', barBest: '#FFFFFF', barOff: 'rgba(255,255,255,0.18)', goal: 'rgba(255,255,255,0.5)',
    track: 'rgba(255,255,255,0.14)', mark: '#C9ADF5', flame: '#F2985C', gold: '#F5C645',
    logo: '#C9ADF5', logoOpacity: 0.1, onBar: '#12281F',
    heat: ['#2E5F52', '#3C8F76', '#59CBA6', '#A2F6D8'], heatInk: ['#F4EFFF', '#FFFFFF', '#0D2019', '#0D2019'], heatEmpty: 'rgba(255,255,255,0.28)',
  },
} as const;
// Sombra suave para que el texto blanco se lea sobre cualquier foto.
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;
export type Pal = (typeof PAL)['light'] | (typeof PAL)['dark'];
export const palette = (t: CardTheme): Pal => PAL[t];

// ---------- Marco común ----------

export function CardFrame({
  theme, format, label, progress, children, noFooter,
}: { theme: CardTheme; format: CardFormat; label: string; progress?: { index: number; total: number }; children: ReactNode; noFooter?: boolean }) {
  const p = PAL[theme];
  const story = format !== 'square';
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (format === 'overlay') {
    // Sin fondo ni logo grande: solo el contenido abajo y la marca chica, para que se vea la foto de atrás.
    return (
      <View style={{ width: CARD_W, height: cardHeight(format), overflow: 'hidden' }}>
        <View style={{ flex: 1, paddingTop: 64, paddingBottom: 56, paddingHorizontal: 26, justifyContent: 'flex-end' }}>
          <View style={{ flexShrink: 1 }}>{children}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 }}>
            <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 20, height: 20, borderRadius: 10 }} />
            <Text style={[{ fontFamily: WORDMARK_FAMILY, fontSize: 12, letterSpacing: 2.2, color: '#FFFFFF', fontWeight: '900' }, SHADOW]}>CAMINA</Text>
            <Text style={[{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }, SHADOW]}>· caminaapp.com</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: CARD_W, height: cardHeight(format), overflow: 'hidden', backgroundColor: p.bg[1] }}>
      {/* Fondo limpio: degradé liso con un brillo suave arriba (sin olas ni logo de fondo). */}
      <Svg width={CARD_W} height={cardHeight(format)} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgLinear id={`${gid}b`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme === 'dark' ? '#221840' : '#FBF9FF'} />
            <Stop offset="1" stopColor={theme === 'dark' ? '#110B20' : '#F1ECFA'} />
          </SvgLinear>
          <RadialGradient id={`${gid}g`} cx="0.85" cy="0.05" r="0.75">
            <Stop offset="0" stopColor={p.bar} stopOpacity={theme === 'dark' ? 0.22 : 0.18} />
            <Stop offset="1" stopColor={p.bar} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={CARD_W} height={cardHeight(format)} fill={`url(#${gid}b)`} />
        <Rect x={0} y={0} width={CARD_W} height={cardHeight(format)} fill={`url(#${gid}g)`} />
      </Svg>
      {/* Zona segura de Instagram: arriba y abajo queda libre lo que tapan la barra y la caja de respuesta. */}
      <View style={{ flex: 1, paddingTop: story ? 64 : 18, paddingBottom: story ? 50 : 14, paddingHorizontal: story ? 22 : 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: story ? 18 : 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 22, height: 22, borderRadius: 11 }} />
            <Text style={{ fontFamily: WORDMARK_FAMILY, fontSize: 13, letterSpacing: 2.2, color: p.ink, fontWeight: '900' }}>CAMINA</Text>
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: p.muted, letterSpacing: 0.3 }}>{label}</Text>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        {/* Cada tarjeta que se comparte invita a descargar la app (salvo que ya lleve la franja para sumarse al grupo). */}
        {noFooter ? null : <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: story ? 10 : 6 }}>
          <Text style={{ fontSize: story ? 11 : 9.5, fontWeight: '700', color: p.muted }}>Gana premios caminando ·</Text>
          <Text style={{ fontSize: story ? 11 : 9.5, fontWeight: '800', color: p.accent }}>caminaapp.com</Text>
        </View>}
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
    <View style={[{ flex: 1, paddingVertical: 6 }, style]}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: p.muted, letterSpacing: 1.1, textTransform: 'uppercase' }} numberOfLines={1}>{label}</Text>
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
    <View>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderColor: p.rule, paddingTop: 2 }}>
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
function Bars({ p, stats, height, goal, showLabels, width }: { p: Pal; stats: ShareStats; height: number; goal: number; showLabels: boolean; width?: number }) {
  const W = width ?? CARD_W - 44;
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

  if (format === 'overlay') return <ResumenOverlay data={data} />;

  if (stats.period === 'day') {
    const pct = goal > 0 ? stats.steps / goal : 0;
    const done = pct >= 1;
    const ringSize = story ? 250 : 140;
    return (
      <CardFrame theme={theme} format={format} label={`Hoy · ${shortDay(stats.rangeEnd)}`}>
        <View style={story ? { flex: 1, justifyContent: 'space-between', paddingBottom: 30 } : undefined}>
        <Text style={{ fontSize: story ? 14 : 12, fontWeight: '700', color: p.muted }}>{name ? `Mi día · ${name}` : 'Mi día'}</Text>
        <View style={{ alignItems: 'center', marginTop: story ? 0 : 2, marginBottom: story ? 0 : 6 }}>
          <Ring p={p} size={ringSize} pct={pct}>
            <Text style={{ fontSize: story ? 54 : 32, fontWeight: '800', color: p.ink, letterSpacing: -1.5 }}>{fmtInt(stats.steps)}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: p.muted }}>pasos hoy</Text>
          </Ring>
          <Text style={{ fontSize: story ? 14 : 12, fontWeight: '800', color: p.accent, marginTop: 14 }}>
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
        </View>
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

  const body = (
    <>
      <View>
        <Text style={{ fontSize: story ? 14 : 12, fontWeight: '700', color: p.muted }}>{`${week ? 'Mi semana' : 'Mi mes'}${name ? ` · ${name}` : ''}`}</Text>
        <Text style={{ fontSize: bigSize, lineHeight: Math.round(bigSize * 1.12), flexShrink: 0, fontWeight: '800', color: p.ink, letterSpacing: -1.5, marginTop: 2 }} numberOfLines={1}>{fmtInt(stats.steps)}</Text>
        <Text style={{ fontSize: story ? 18 : 13, fontWeight: story ? '800' : '600', color: story ? p.ink : p.muted }}>{week ? 'pasos esta semana' : 'pasos este mes'}</Text>
        {story ? <View style={{ marginTop: 8 }}><Trend p={p} pct={stats.trendPct} what={week ? 'la anterior' : 'el mes pasado'} inline /></View> : null}
      </View>
      {story ? (
        <Panel p={p} style={{ alignItems: week ? undefined : 'center' }}>
          <PanelTitle p={p}>{week ? 'Tus pasos por día' : 'Tu mes, día por día'}</PanelTitle>
          {week ? (
            <Bars p={p} stats={stats} height={104} goal={goal} showLabels width={W_INNER - 30} />
          ) : (
            <CalendarDots p={p} stats={stats} cell={28} pitch={35} width={CARD_W - 44 - 30} />
          )}
        </Panel>
      ) : (
        <View style={{ marginTop: 8, marginBottom: 6 }}>
          {week ? <Bars p={p} stats={stats} height={62} goal={goal} showLabels /> : <CalendarDots p={p} stats={stats} cell={13} pitch={15} width={CARD_W - 36} />}
        </View>
      )}
      {story ? (
        <View>
          <TileGrid p={p} tiles={week ? [tiles[0], tiles[1], tiles[3], tiles[4]] : [tiles[0], tiles[1], tiles[3], tiles[5]]} />
          <Note p={p} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {squareTiles.map((t) => <Tile key={t.label} p={p} {...t} stack small />)}
        </View>
      )}
    </>
  );

  return (
    <CardFrame theme={theme} format={format} label={label}>
      {story ? <View style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>{body}</View> : body}
    </CardFrame>
  );
}


// ---------- Resumen transparente (tipo Strava) ----------

function OStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }, SHADOW]} numberOfLines={1}>{label}</Text>
      <Text style={[{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }, SHADOW]} numberOfLines={1}>{value}</Text>
      {unit ? <Text style={[{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }, SHADOW]} numberOfLines={1}>{unit}</Text> : null}
    </View>
  );
}

function ResumenOverlay({ data }: { data: ResumenData }) {
  const { stats, streak, weeklyRank, name } = data;
  const period = stats.period;
  const title = period === 'day' ? 'Hoy' : period === 'week' ? 'Mi semana' : 'Mi mes';
  const when = period === 'day' ? shortDay(stats.rangeEnd) : rangeLabel(stats.rangeStart, stats.rangeEnd);
  const big = fmtInt(stats.steps);
  const bigSize = fitSize(big, 76, CARD_W - 52);
  const W = CARD_W - 52;
  const n = stats.bars.length;
  const max = Math.max(stats.goalToday * 1.15, ...stats.bars.map((b) => b.steps), 1);
  const bw = n > 0 ? (W - 6 * (n - 1)) / n : 0;
  const stat3 = period === 'day'
    ? [{ label: 'Puntos', value: `+${stats.pointsToday}` }, { label: 'Distancia', value: fmtKm(stats.km), unit: 'km' }, { label: 'Racha', value: String(streak), unit: streak === 1 ? 'día' : 'días' }]
    : [{ label: 'Promedio', value: fmtInt(stats.avgPerDay), unit: 'pasos/día' }, { label: 'Distancia', value: fmtKm(stats.km), unit: 'km' }, weeklyRank ? { label: 'Ranking', value: `${weeklyRank}.º`, unit: 'esta semana' } : { label: 'Meta', value: `${stats.daysMet}/${stats.days}`, unit: 'días' }];
  return (
    <CardFrame theme="dark" format="overlay" label="">
      <Text style={[{ fontSize: 13, fontWeight: '800', color: '#62F0B6' }, SHADOW]}>{title}{name ? ` · ${name}` : ''} · {when}</Text>
      <Text style={[{ fontSize: bigSize, lineHeight: Math.round(bigSize * 1.1), fontWeight: '800', color: '#FFFFFF', letterSpacing: -2, marginTop: 2 }, SHADOW]} numberOfLines={1}>{big}</Text>
      <Text style={[{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }, SHADOW]}>pasos</Text>
      {period === 'month' ? null : (
        <View style={{ marginTop: 16 }}>
          <Svg width={W} height={52}>
            {stats.bars.map((b, i) => {
              const h = Math.max(3, (b.steps / max) * 50);
              return <Rect key={b.key} x={i * (bw + 6)} y={52 - h} width={bw} height={h} rx={Math.min(5, bw / 2)} fill={b.met ? '#62F0B6' : 'rgba(255,255,255,0.55)'} />;
            })}
          </Svg>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {stat3.map((t) => <OStat key={t.label} {...t} />)}
      </View>
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
  // Código para sumarse al grupo (si la persona elige invitar en la imagen).
  inviteCode?: string | null;
};

// Franja para que quien ve la historia se sume al grupo.
function InviteStrip({ p, code, compact }: { p: Pal; code: string; compact?: boolean }) {
  return (
    <View style={{ marginTop: compact ? 6 : 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: p.accent, borderRadius: compact ? 12 : 16, paddingVertical: compact ? 6 : 9, paddingHorizontal: compact ? 10 : 14 }}>
      <View>
        <Text style={{ fontSize: compact ? 10.5 : 12.5, fontWeight: '800', color: p.onBar === '#FFFFFF' ? '#FFFFFF' : '#12281F' }}>Súmate a nuestro grupo</Text>
        <Text style={{ fontSize: compact ? 9 : 10, fontWeight: '700', color: p.onBar === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(18,40,31,0.75)' }}>Descarga Camina en caminaapp.com</Text>
      </View>
      <Text style={{ fontSize: compact ? 12 : 15, fontWeight: '900', letterSpacing: 1.5, color: p.onBar === '#FFFFFF' ? '#FFFFFF' : '#12281F' }}>{code}</Text>
    </View>
  );
}

// compact: en la cuadrada el podio va más bajo para que la meta del grupo no quede encimada.
function Medal({ p, label, rank, steps, isMe, big, compact }: { p: Pal; label: string; rank: number; steps: number; isMe: boolean; big?: boolean; compact?: boolean }) {
  const d = compact ? (big ? 44 : 36) : big ? 54 : 44;
  const crown = compact ? 36 : 44;
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {rank === 1 ? <View style={{ marginBottom: 3 }}><CrownMark size={crown} /></View> : <View style={{ height: crown * 0.75 + 3 }} />}
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: isMe ? p.accent : p.tile, borderWidth: 1.5, borderColor: isMe ? p.accent : p.tileLine, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: compact ? (big ? 19 : 16) : big ? 22 : 18, fontWeight: '800', color: isMe ? (p === PAL.dark ? '#12281F' : '#fff') : p.ink }}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      {isMe || label.length > 1 ? <Text style={{ fontSize: 11, fontWeight: '700', color: p.ink, marginTop: compact ? 3 : 4 }} numberOfLines={1}>{label}</Text> : <View style={{ height: 4 }} />}
      <View style={{ width: '88%', marginTop: compact ? 4 : 5, borderRadius: 14, backgroundColor: 'transparent', borderColor: isMe ? p.accent : 'transparent', borderWidth: isMe ? 1.5 : 0, alignItems: 'center', paddingVertical: compact ? (big ? 7 : 5) : big ? 14 : 9 }}>
        <Text style={{ fontSize: compact ? (big ? 22 : 18) : big ? 26 : 20, fontWeight: '800', color: p.ink }}>{rank}.º</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }}>{fmtInt(steps)}</Text>
      </View>
    </View>
  );
}

// Ranking transparente: nombre del grupo, meta y los primeros puestos en blanco, para pegar sobre una foto.
function GroupOverlay({ data }: { data: GroupCardData }) {
  const pct = data.target > 0 ? Math.min(1, data.total / data.target) : 0;
  return (
    <CardFrame theme="dark" format="overlay" label="">
      <Text style={[{ fontSize: 13, fontWeight: '800', color: '#62F0B6' }, SHADOW]}>Ranking del grupo · {data.weekLabel}</Text>
      <Text style={[{ fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1, marginTop: 2 }, SHADOW]} numberOfLines={2}>{data.groupName}</Text>
      <Text style={[{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }, SHADOW]}>Meta: {Math.round(pct * 100)} % · {fmtInt(data.total)} de {fmtInt(data.target)} pasos</Text>
      <View style={{ marginTop: 14, gap: 8 }}>
        {data.members.slice(0, 5).map((m, i) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[{ width: 30, fontSize: 18, fontWeight: '800', color: i === 0 ? '#F5C645' : '#FFFFFF' }, SHADOW]}>{i + 1}.º</Text>
            <Text style={[{ flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' }, SHADOW]} numberOfLines={1}>{m.label}</Text>
            <Text style={[{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }, SHADOW]}>{fmtInt(m.steps)}</Text>
          </View>
        ))}
      </View>
      {data.inviteCode ? <Text style={[{ fontSize: 14, fontWeight: '800', color: '#62F0B6', marginTop: 12 }, SHADOW]}>Súmate a nuestro grupo · código {data.inviteCode}</Text> : null}
    </CardFrame>
  );
}

export function GroupCard({ theme, format, data }: { theme: CardTheme; format: CardFormat; data: GroupCardData }) {
  if (format === 'overlay') return <GroupOverlay data={data} />;
  const p = PAL[theme];
  const story = format !== 'square';
  const { members } = data;
  const top = members.slice(0, 3);
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  // Con el código para sumarse va una franja más: se muestran menos filas para que todo entre.
  const rest = story ? members.slice(3, data.inviteCode ? 5 : 8) : [];
  const max = Math.max(...members.map((m) => m.steps), 1);
  const pct = data.target > 0 ? Math.min(1, data.total / data.target) : 0;
  const leader = members[0];
  const me = members.find((m) => m.isMe);
  const gap = leader && me && leader.id !== me.id ? leader.steps - me.steps : 0;
  const done = pct >= 1;
  return (
    <CardFrame theme={theme} format={format} label={`Grupo · ${data.weekLabel}`} noFooter={!!data.inviteCode}>
      <View style={story ? { flex: 1, justifyContent: 'space-between', paddingBottom: data.inviteCode ? 2 : 30 } : undefined}>
      <View>
      <Text style={{ fontSize: story ? 14 : 11.5, fontWeight: '700', color: p.muted }}>Ranking del grupo · {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}</Text>
      <Text style={{ fontSize: story ? 32 : 20, fontWeight: '800', color: p.ink, letterSpacing: -0.8, marginTop: 2 }} numberOfLines={story ? 2 : 1}>{data.groupName}</Text>
      </View>
      <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: story ? 0 : 6, gap: 8 }}>
        {podium.map((m) => {
          const rank = members.findIndex((x) => x.id === m.id) + 1;
          return <Medal key={m.id} p={p} label={m.label} rank={rank} steps={m.steps} isMe={m.isMe} big={rank === 1} compact={!story} />;
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
      </View>
      {story && !data.inviteCode ? (
        // Comparativo corto, para que la historia se entienda sin abrir la app.
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Tile p={p} small stack label="Pasos del grupo" value={fmtInt(data.total)} />
          <Tile p={p} small stack label={gap > 0 ? 'Te faltan para el 1.º' : 'Líder del grupo'} value={gap > 0 ? fmtInt(gap) : leader?.label ?? '–'} />
        </View>
      ) : null}
      {!story ? <View style={{ flex: 1 }} /> : null}
      {/* Meta del grupo: barra de progreso, igual que en la pantalla del grupo (sin aro). */}
      <View style={{ marginTop: story ? 12 : 10, marginBottom: story ? 0 : 6, borderTopWidth: 1, borderColor: p.rule, paddingTop: story ? 12 : 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: story ? 9 : 6 }}>
          <Text style={{ fontSize: story ? 15 : 11, fontWeight: story ? '800' : '700', color: p.ink }}>Meta del grupo</Text>
          <Text style={{ fontSize: story ? 15 : 11, fontWeight: '800', color: p.accent }}>{done ? '¡Meta cumplida!' : `${Math.round(pct * 100)} %`}</Text>
        </View>
        <View style={{ height: story ? 12 : 8, borderRadius: 6, backgroundColor: p.track, overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(2, pct * 100)}%`, height: story ? 12 : 8, borderRadius: 6, backgroundColor: p.bar }} />
        </View>
        <Text style={{ fontSize: story ? 12 : 10, fontWeight: '600', color: p.muted, marginTop: story ? 7 : 5 }}>{fmtInt(data.total)} de {fmtInt(data.target)} pasos</Text>
      </View>
      {data.inviteCode ? <InviteStrip p={p} code={data.inviteCode} compact={!story} /> : null}
      </View>
    </CardFrame>
  );
}

// ---------- Resultado de la semana del grupo ----------

export type GroupWeekData = {
  groupName: string;
  weekLabel: string;
  // De mejor a peor. `label` ya viene listo (inicial o primer nombre).
  rows: { id: string; label: string; steps: number; isMe: boolean }[];
  total: number;
  inviteCode?: string | null;
};

export function GroupWeekCard({ theme, format, data }: { theme: CardTheme; format: CardFormat; data: GroupWeekData }) {
  const winner = data.rows[0];
  const me = data.rows.find((r) => r.isMe);
  const myRank = me ? data.rows.indexOf(me) + 1 : 0;
  if (format === 'overlay') {
    return (
      <CardFrame theme="dark" format="overlay" label="">
        <Text style={[{ fontSize: 13, fontWeight: '800', color: '#62F0B6' }, SHADOW]}>Resultado de la semana · {data.weekLabel}</Text>
        <Text style={[{ fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1, marginTop: 2 }, SHADOW]} numberOfLines={2}>{data.groupName}</Text>
        {winner ? <View style={{ marginTop: 10 }}><CrownMark size={30} /></View> : null}
        {winner ? <Text style={[{ fontSize: 22, fontWeight: '800', color: '#F5C645', marginTop: 2 }, SHADOW]}>Ganó {winner.isMe ? 'yo' : winner.label} · {fmtInt(winner.steps)}</Text> : null}
        {me && myRank > 1 ? <Text style={[{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }, SHADOW]}>Yo quedé {myRank}.º con {fmtInt(me.steps)} pasos</Text> : null}
        {data.inviteCode ? <Text style={[{ fontSize: 14, fontWeight: '800', color: '#62F0B6', marginTop: 10 }, SHADOW]}>Súmate a nuestro grupo · código {data.inviteCode}</Text> : null}
      </CardFrame>
    );
  }
  const p = PAL[theme];
  const story = format !== 'square';
  const max = Math.max(...data.rows.map((r) => r.steps), 1);
  return (
    <CardFrame theme={theme} format={format} label={`Semana · ${data.weekLabel}`} noFooter={!!data.inviteCode}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: story ? 14 : 11.5, fontWeight: '700', color: p.muted }}>Resultado de la semana</Text>
          <Text style={{ fontSize: story ? 30 : 19, fontWeight: '800', color: p.ink, letterSpacing: -0.8, marginTop: 2 }} numberOfLines={2}>{data.groupName}</Text>
        </View>
        {winner ? (
          <View style={{ alignItems: 'center', marginTop: story ? 34 : 20 }}>
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: story ? -26 : -18 }}><CrownMark size={story ? 34 : 24} /></View>
              <View style={{ width: story ? 84 : 52, height: story ? 84 : 52, borderRadius: 99, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: p.gold }}>
                <Text style={{ fontSize: story ? 36 : 22, fontWeight: '900', color: p.onBar }}>{winner.label.slice(0, 1).toUpperCase()}</Text>
              </View>
            </View>
            <Text style={{ fontSize: story ? 13 : 11, fontWeight: '800', color: p.gold, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: story ? 10 : 6 }}>Ganó la semana</Text>
            <Text style={{ fontSize: story ? 28 : 18, fontWeight: '800', color: p.ink }} numberOfLines={1}>{winner.isMe ? 'Yo' : winner.label}</Text>
            <Text style={{ fontSize: story ? 15 : 12, fontWeight: '700', color: p.muted }}>{fmtInt(winner.steps)} pasos</Text>
          </View>
        ) : null}
        <View style={{ gap: story ? 7 : 4, marginTop: story ? 10 : 4 }}>
          {data.rows.slice(1, story ? 7 : 4).map((r, i) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 24, fontSize: 11, fontWeight: '800', color: r.isMe ? p.accent : p.muted }}>{i + 2}.º</Text>
              <Text style={{ width: story ? 74 : 56, fontSize: 11.5, fontWeight: r.isMe ? '800' : '600', color: r.isMe ? p.accent : p.ink }} numberOfLines={1}>{r.isMe ? 'Yo' : r.label}</Text>
              <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: p.track, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(4, (r.steps / max) * 100)}%`, height: 7, borderRadius: 4, backgroundColor: r.isMe ? p.accent : p.bar }} />
              </View>
              <Text style={{ width: 46, textAlign: 'right', fontSize: 10.5, fontWeight: '700', color: p.ink }}>{fmtInt(r.steps)}</Text>
            </View>
          ))}
        </View>
        {story ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Tile p={p} small stack label="Pasos del grupo" value={fmtInt(data.total)} />
            <Tile p={p} small stack label="Mi puesto" value={myRank ? `${myRank}.º de ${data.rows.length}` : '–'} />
          </View>
        ) : null}
        {data.inviteCode ? <InviteStrip p={p} code={data.inviteCode} compact={!story} /> : null}
      </View>
    </CardFrame>
  );
}

// ---------- Récord personal ----------

export type RecordData = { steps: number; prevBest: number; prevBestDay: string | null; dayKey: string; name: string | null };

export function RecordCard({ theme, format, data }: { theme: CardTheme; format: CardFormat; data: RecordData }) {
  const km = (data.steps * STEP_LENGTH_METERS) / 1000;
  const up = data.prevBest > 0 ? data.steps - data.prevBest : 0;
  if (format === 'overlay') {
    return (
      <CardFrame theme="dark" format="overlay" label="">
        <TrophyArt size={64} />
        <Text style={[{ fontSize: 15, fontWeight: '800', color: '#F5C645', marginTop: 8 }, SHADOW]}>¡Nuevo récord personal!</Text>
        <Text style={[{ fontSize: 64, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 }, SHADOW]}>{fmtInt(data.steps)}</Text>
        <Text style={[{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }, SHADOW]}>pasos en un día · {fmtKm(km)} km</Text>
        {up > 0 ? <Text style={[{ fontSize: 14, fontWeight: '700', color: '#62F0B6', marginTop: 4 }, SHADOW]}>{fmtInt(up)} más que mi mejor día</Text> : null}
      </CardFrame>
    );
  }
  const p = PAL[theme];
  const story = format !== 'square';
  return (
    <CardFrame theme={theme} format={format} label={shortDay(data.dayKey)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TrophyArt size={story ? 120 : 66} />
        <Text style={{ fontSize: story ? 15 : 12, fontWeight: '800', color: p.gold, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: story ? 16 : 8 }}>Nuevo récord personal</Text>
        {data.name ? <Text style={{ fontSize: story ? 15 : 12, fontWeight: '700', color: p.muted, marginTop: 4 }}>{data.name}</Text> : null}
        <Text style={{ fontSize: fitSize(fmtInt(data.steps), story ? 84 : 54, CARD_W - 60), fontWeight: '900', color: p.ink, letterSpacing: -2.5, marginTop: story ? 6 : 2 }}>{fmtInt(data.steps)}</Text>
        <Text style={{ fontSize: story ? 17 : 13, fontWeight: '700', color: p.muted }}>pasos en un día</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: story ? 26 : 12, alignSelf: 'stretch' }}>
          <Tile p={p} small={!story} stack label="Distancia*" value={`${fmtKm(km)} km`} />
          <Tile p={p} small={!story} stack label={data.prevBestDay ? `Antes: ${shortDay(data.prevBestDay)}` : 'Antes'} value={data.prevBest > 0 ? fmtInt(data.prevBest) : '–'} />
        </View>
        {up > 0 && story ? (
          <View style={{ marginTop: 12, backgroundColor: p.accentSoft, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: p.accent }}>↑ {fmtInt(up)} pasos más que mi mejor día</Text>
          </View>
        ) : null}
        {story ? <Text style={{ fontSize: 9.5, color: p.muted, marginTop: 10 }}>* Estimado a partir de tus pasos.</Text> : null}
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
  // Un día por casilla del mes, en orden: calendario, gráfico por día y semanas.
  calendar: { key: string; day: number; met: boolean; steps: number }[];
  firstWeekday: number; // 0 = lunes, la columna donde cae el día 1
  goal: number;
  prevSteps: number | null; // pasos del mes anterior (null si no hay)
  prevMonthName: string;
  run: { length: number; from: string | null; to: string | null };
  rank: { weekStart: string; weekEnd: string; position: number; participants: number } | null;
  points: { steps: number; bonus: number; total: number };
};

export const wrappedSlideCount = (d: WrappedData) => (d.rank ? 6 : 5);

const W_INNER = CARD_W - 44;
const onAccent = (theme: CardTheme) => (theme === 'dark' ? '#12281F' : '#FFFFFF');

function BigNumber({ p, value, size = 64 }: { p: Pal; value: string; size?: number }) {
  // El tamaño se calcula con el valor final: mientras el número sube, la letra no cambia de tamaño.
  const fs = fitSize(value, size, W_INNER);
  const shown = useCountUp(value, fmtInt);
  return <Text style={{ fontSize: fs, fontWeight: '800', color: p.ink, letterSpacing: -2, lineHeight: Math.round(fs * 1.12), fontVariant: ['tabular-nums'] }} numberOfLines={1}>{shown}</Text>;
}
function Kicker({ p, children }: { p: Pal; children: ReactNode }) {
  return <Text style={{ fontSize: 14, fontWeight: '700', color: p.muted, marginBottom: 4 }}>{children}</Text>;
}
function Panel({ p, children, style }: { p: Pal; children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ paddingVertical: 4 }, style]}>{children}</View>;
}
function PanelTitle({ p, children, right }: { p: Pal; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: p.muted, letterSpacing: 1.1, textTransform: 'uppercase' }}>{children}</Text>
      {right}
    </View>
  );
}
function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}
function Pill({ p, children }: { p: Pal; children: ReactNode }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: p.accentSoft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: p.accent }}>{children}</Text>
    </View>
  );
}

// Barras del mes, una por día, con la línea de la meta. El día más activo va resaltado.
function MonthBars({ p, data, width, height }: { p: Pal; data: WrappedData; width: number; height: number }) {
  const n = data.calendar.length;
  const gap = 2.5;
  const bw = (width - gap * (n - 1)) / n;
  const max = Math.max(data.goal * 1.1, ...data.calendar.map((c) => c.steps), 1);
  const y = (v: number) => height - (v / max) * (height - 2);
  const ticks = [1, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <View>
      <Grow>
      <Svg width={width} height={height}>
        {data.calendar.map((c, i) => {
          const h = Math.max(3, height - y(c.steps));
          const fill = data.best?.key === c.key ? p.barBest : c.met ? p.bar : p.barOff;
          return <Rect key={c.key} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={Math.min(3, bw / 2)} fill={fill} />;
        })}
        <Line x1={0} x2={width} y1={y(data.goal)} y2={y(data.goal)} stroke={p.goal} strokeWidth={1} strokeDasharray="3 3" />
      </Svg>
      </Grow>
      <View style={{ height: 14, marginTop: 4 }}>
        {ticks.map((t) => (
          <Text key={t} style={{ position: 'absolute', left: Math.min(width - 14, Math.max(0, (t - 1) * (bw + gap) + bw / 2 - 7)), width: 14, textAlign: 'center', fontSize: 9.5, fontWeight: '700', color: p.muted }}>{t}</Text>
        ))}
      </View>
    </View>
  );
}

function MiniStat({ p, label, value, unit }: { p: Pal; label: string; value: string; unit?: string }) {
  return (
    <Panel p={p} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 19, fontWeight: '800', color: p.ink, letterSpacing: -0.4, marginTop: 1 }} numberOfLines={1}>{value}</Text>
      {unit ? <Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }} numberOfLines={1}>{unit}</Text> : null}
    </Panel>
  );
}

function bestWeek(data: WrappedData) {
  const w = weeklyTotals(data.calendar, data.firstWeekday);
  const best = w.reduce<(typeof w)[number] | null>((a, x) => (!a || x.steps > a.steps ? x : a), null);
  return { weeks: w, best };
}

export function WrappedSlide({ theme, data, index }: { theme: CardTheme; data: WrappedData; index: number }) {
  const p = PAL[theme];
  // Sin puesto en el ranking (ranking apagado o sin datos) la lámina 4 no existe y las demás se corren.
  const slide = !data.rank && index >= 3 ? index + 1 : index;
  const frame = (children: ReactNode) => (
    <CardFrame theme={theme} format="story" label={`Tu ${data.monthName}`}>{children}</CardFrame>
  );
  const nm = data.name ? `, ${data.name}` : '';
  const { weeks, best: bw } = bestWeek(data);

  // 0 · Portada: el número del mes, la comparación y los pasos día por día.
  if (slide === 0) {
    const diff = data.prevSteps ? data.steps - data.prevSteps : null;
    return frame(
      <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
        <View>
          <Kicker p={p}>Tu mes en Camina{nm}</Kicker>
          <BigNumber p={p} value={fmtInt(data.steps)} size={72} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink, marginTop: 2 }}>pasos en {data.monthName}</Text>
          <View style={{ marginTop: 10, gap: 6 }}>
            <Trend p={p} pct={data.trendPct} what={data.prevMonthName} />
            {diff !== null ? <Text style={{ fontSize: 12, fontWeight: '600', color: p.muted }}>{data.prevMonthName[0].toUpperCase() + data.prevMonthName.slice(1)}: {fmtInt(data.prevSteps!)} pasos ({diff >= 0 ? '+' : '−'}{fmtInt(Math.abs(diff))})</Text> : null}
          </View>
        </View>
        <Panel p={p}>
          <PanelTitle p={p} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Dot color={p.bar} /><Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }}>meta cumplida</Text></View>}>Tus pasos día por día</PanelTitle>
          <MonthBars p={p} data={data} width={W_INNER - 30} height={118} />
        </Panel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat p={p} label="Promedio" value={fmtInt(data.avgPerDay)} unit="pasos por día" />
          <MiniStat p={p} label="Distancia" value={fmtKm(data.km)} unit="km" />
          <MiniStat p={p} label="Con meta" value={`${data.daysMet}/${data.days}`} unit="días" />
        </View>
      </Stagger>,
    );
  }

  // 1 · Día más activo, con calendario de calor y mejor semana.
  if (slide === 1) {
    const cell = 32;
    const cells: (null | WrappedData['calendar'][number])[] = [...Array(data.firstWeekday).fill(null), ...data.calendar];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const max = Math.max(data.best?.steps ?? 1, 1);
    const over = data.best && data.avgPerDay > 0 ? Math.round((data.best.steps / data.avgPerDay - 1) * 100) : null;
    return frame(
      <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
        <View>
          <Kicker p={p}>Tu día más activo fue</Kicker>
          <Text style={{ fontSize: 54, fontWeight: '800', color: p.mark, letterSpacing: -1.8, lineHeight: 60 }}>{data.best ? shortDay(data.best.key) : '–'}</Text>
          {data.best ? <Text style={{ fontSize: 18, fontWeight: '800', color: p.ink }}>{fmtInt(data.best.steps)} pasos</Text> : null}
          {over && over > 0 ? <View style={{ marginTop: 8 }}><Pill p={p}>{over} % sobre tu promedio</Pill></View> : null}
        </View>
        <Panel p={p} style={{ alignItems: 'center' }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <Text key={d} style={{ width: cell, textAlign: 'center', fontSize: 10, fontWeight: '700', color: p.muted }}>{d}</Text>)}
            </View>
            {rows.map((w, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 4 }}>
                {w.map((c, j) => {
                  const isBest = !!c && data.best?.key === c.key;
                  if (!c) return <View key={j} style={{ width: cell, height: cell }} />;
                  // Cinco niveles de color sólidos (sin transparencia, así el número siempre se lee): 0 pasos = solo borde.
                  const lvl = c.steps <= 0 ? -1 : Math.min(3, Math.floor((c.steps / max) * 4 - 0.0001));
                  return (
                    <View
                      key={j}
                      style={{ width: cell, height: cell, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: lvl < 0 ? 'transparent' : p.heat[Math.max(0, lvl)], borderWidth: isBest ? 2.5 : lvl < 0 ? 1.5 : 0, borderColor: isBest ? p.ink : p.heatEmpty }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: lvl < 0 ? p.muted : p.heatInk[Math.max(0, lvl)] }}>{c.day}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 }}>
            <View style={{ width: 14, height: 14, borderRadius: 5, borderWidth: 1.5, borderColor: p.heatEmpty }} />
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted, marginRight: 6 }}>Sin pasos</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted }}>Menos</Text>
            {p.heat.map((c, k) => <View key={k} style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: c }} />)}
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted }}>Más pasos</Text>
          </View>
        </Panel>
        {bw ? (
          <Panel p={p} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
            <View>
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: p.muted }}>Tu mejor semana</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>{rangeLabel(bw.from, bw.to)}</Text>
            </View>
            <Text style={{ fontSize: 19, fontWeight: '800', color: p.accent }}>{fmtInt(bw.steps)} <Text style={{ fontSize: 11, color: p.muted, fontWeight: '600' }}>pasos</Text></Text>
          </Panel>
        ) : null}
      </Stagger>,
    );
  }

  // 2 · Racha.
  if (slide === 2) {
    const n = data.run.length;
    const count = data.calendar.length;
    const gap = 2.5;
    const bwid = (W_INNER - 30 - gap * (count - 1)) / count;
    const inRun = (k: string) => !!data.run.from && !!data.run.to && k >= data.run.from && k <= data.run.to;
    const pct = data.days > 0 ? data.daysMet / data.days : 0;
    return frame(
      <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
        <View>
          <View style={{ marginBottom: 4 }}><FlameArt size={64} /></View>
          <BigNumber p={p} value={String(n)} size={104} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>{n === 1 ? 'día seguido' : 'días seguidos'}, tu mejor racha</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: p.muted, marginTop: 4 }}>
            {data.run.from && data.run.to ? `Cumpliste tu meta del ${rangeLabel(data.run.from, data.run.to)}.` : 'El mes que viene, a por la primera.'}
          </Text>
        </View>
        <Panel p={p}>
          <PanelTitle p={p} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Dot color={p.flame} /><Text style={{ fontSize: 10, fontWeight: '600', color: p.muted }}>tu racha</Text></View>}>Tu mes, día por día</PanelTitle>
          <Svg width={W_INNER - 30} height={34}>
            {data.calendar.map((c, i) => (
              <Rect key={c.key} x={i * (bwid + gap)} y={0} width={bwid} height={34} rx={Math.min(3, bwid / 2)} fill={inRun(c.key) ? p.flame : c.met ? p.bar : p.barOff} />
            ))}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: p.muted }}>1</Text>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: p.muted }}>{count}</Text>
          </View>
        </Panel>
        <Panel p={p}>
          <PanelTitle p={p} right={<Text style={{ fontSize: 12, fontWeight: '800', color: p.accent }}>{Math.round(pct * 100)} %</Text>}>Días con meta cumplida</PanelTitle>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: p.track, overflow: 'hidden' }}>
            <Grow axis="x" delay={420}><View style={{ width: `${Math.max(3, pct * 100)}%`, height: 10, borderRadius: 5, backgroundColor: p.bar }} /></Grow>
          </View>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: p.muted, marginTop: 8 }}>{data.daysMet} de {data.days} días de {data.monthName}</Text>
        </Panel>
      </Stagger>,
    );
  }

  // 3 · Puesto en el ranking (solo si hay).
  if (slide === 3 && data.rank) {
    const { position, participants } = data.rank;
    const dots = Math.min(participants, 24);
    const mine = participants <= 24 ? position - 1 : Math.min(dots - 1, Math.round(((position - 1) / Math.max(participants - 1, 1)) * (dots - 1)));
    const topPct = Math.max(1, Math.ceil((position / participants) * 100));
    const beaten = Math.max(0, participants - position);
    return frame(
      <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
        <View>
          <View style={{ marginBottom: 4 }}><TrophyArt size={64} /></View>
          <Kicker p={p}>Tu mejor puesto en el ranking global</Kicker>
          <BigNumber p={p} value={`#${position}`} size={96} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: p.ink }}>en la semana del {rangeLabel(data.rank.weekStart, data.rank.weekEnd)}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: p.muted, marginTop: 4 }}>entre {fmtInt(participants)} {participants === 1 ? 'caminante' : 'caminantes'} del ranking.</Text>
        </View>
        <Panel p={p}>
          <PanelTitle p={p}>Dónde quedaste</PanelTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: dots }, (_, i) => (
              <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i === mine ? p.accent : p.barOff, alignItems: 'center', justifyContent: 'center', borderWidth: i === mine ? 0 : 0 }}>
                {i === mine ? <Text style={{ fontSize: 9.5, fontWeight: '800', color: onAccent(theme) }}>Tú</Text> : null}
              </View>
            ))}
          </View>
        </Panel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat p={p} label="Estás en el top" value={`${topPct} %`} />
          <MiniStat p={p} label="Superaste a" value={fmtInt(beaten)} unit={beaten === 1 ? 'caminante' : 'caminantes'} />
        </View>
      </Stagger>,
    );
  }

  // 4 · Puntos con desglose.
  if (slide === 4) {
    const t = Math.max(data.points.total, 1);
    const stepsPct = Math.round((data.points.steps / t) * 100);
    const perDay = data.days > 0 ? data.points.total / data.days : 0;
    const rowsP = [
      { label: 'Por tus pasos', value: data.points.steps, color: p.bar, pct: stepsPct },
      ...(data.points.bonus > 0 ? [{ label: 'Bonos y extras', value: data.points.bonus, color: p.mark, pct: 100 - stepsPct }] : []),
    ];
    return frame(
      <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
        <View>
          <Image source={require('@/../assets/camina-coin.png')} accessible={false} style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 6 }} />
          <BigNumber p={p} value={fmtInt(data.points.total)} size={96} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink }}>Puntos ganados en {data.monthName}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: p.muted, marginTop: 4 }}>Canjéalos por premios en los comercios de Camina.</Text>
        </View>
        <Panel p={p}>
          <PanelTitle p={p}>De dónde salieron</PanelTitle>
          <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: p.track, gap: 2 }}>
            {rowsP.map((r) => <View key={r.label} style={{ flex: Math.max(r.value, 1), backgroundColor: r.color }} />)}
          </View>
          <View style={{ marginTop: 12, gap: 9 }}>
            {rowsP.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Dot color={r.color} size={10} />
                <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: p.ink }}>{r.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: p.ink }}>+{fmtInt(r.value)}</Text>
                <Text style={{ width: 38, textAlign: 'right', fontSize: 11, fontWeight: '600', color: p.muted }}>{r.pct} %</Text>
              </View>
            ))}
          </View>
        </Panel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat p={p} label="Promedio" value={perDay >= 10 ? fmtInt(Math.round(perDay)) : perDay.toFixed(1).replace('.', ',')} unit="Puntos por día" />
          <MiniStat p={p} label="Días con meta" value={`${data.daysMet}`} unit={`de ${data.days}`} />
        </View>
      </Stagger>,
    );
  }

  // 5 · Resumen con semanas.
  const wmax = Math.max(...weeks.map((w) => w.steps), 1);
  return frame(
    <Stagger style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 30 }}>
      <View>
        <Kicker p={p}>{`Tu ${data.monthName}${nm}`}</Kicker>
        <Text style={{ fontSize: 32, fontWeight: '800', color: p.ink, letterSpacing: -1 }}>En resumen</Text>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat p={p} label="Pasos" value={fmtInt(data.steps)} />
          <MiniStat p={p} label="Distancia" value={fmtKm(data.km)} unit="km" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat p={p} label="Calorías*" value={`≈ ${fmtInt(data.kcal)}`} unit="kcal" />
          <MiniStat p={p} label="Meta cumplida" value={`${data.daysMet} de ${data.days}`} unit="días" />
        </View>
      </View>
      <Panel p={p}>
        <PanelTitle p={p}>Semana por semana</PanelTitle>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {weeks.map((w, i) => {
            const isBest = bw === w;
            return (
              <View key={w.from} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 120 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isBest ? p.ink : p.muted, marginBottom: 3 }} numberOfLines={1}>{w.steps >= 10000 ? `${Math.round(w.steps / 1000)}k` : fmtInt(w.steps)}</Text>
                <View style={{ width: '100%' }}><Grow delay={320 + i * 70}><View style={{ width: '100%', height: Math.max(6, (w.steps / wmax) * 84), borderRadius: 8, backgroundColor: isBest ? p.barBest : p.bar }} /></Grow></View>
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: p.muted, marginTop: 4 }}>S{i + 1}</Text>
              </View>
            );
          })}
        </View>
      </Panel>
      <View>
        <Note p={p} />
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: p.ink, marginTop: 6 }}>Un mes más caminando{data.name ? `, ${data.name}` : ''}. ¡Gracias por sumar!</Text>
      </View>
    </Stagger>,
  );
}

// Versión transparente de cada lámina (sin fondo, texto blanco): se pega como sticker sobre la foto o el video de la historia.
export function WrappedOverlay({ data, index }: { data: WrappedData; index: number }) {
  const slide = !data.rank && index >= 3 ? index + 1 : index;
  // Con nombre: "El octubre de Marcos" (no "Mi octubre de Marcos"). Sin nombre: "Mi octubre".
  const mesDe = data.name ? `El ${data.monthName} de ${data.name}` : `Mi ${data.monthName}`;
  const big = (v: string, size = 76) => {
    const fs = fitSize(v, size, CARD_W - 52);
    return <Text style={[{ fontSize: fs, lineHeight: Math.round(fs * 1.1), fontWeight: '800', color: '#FFFFFF', letterSpacing: -2 }, SHADOW]} numberOfLines={1}>{v}</Text>;
  };
  const kick = (t: string) => <Text style={[{ fontSize: 13, fontWeight: '800', color: '#62F0B6' }, SHADOW]}>{t}</Text>;
  const sub = (t: string) => <Text style={[{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }, SHADOW]}>{t}</Text>;
  const stats = (items: { label: string; value: string; unit?: string }[]) => (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>{items.map((t) => <OStat key={t.label} {...t} />)}</View>
  );
  let body: ReactNode;
  if (slide === 0) {
    body = (<>{kick(`${mesDe} en Camina`)}{big(fmtInt(data.steps))}{sub('pasos')}
      {stats([{ label: 'Promedio', value: fmtInt(data.avgPerDay), unit: 'pasos/día' }, { label: 'Distancia', value: fmtKm(data.km), unit: 'km' }, { label: 'Meta', value: `${data.daysMet}/${data.days}`, unit: 'días' }])}</>);
  } else if (slide === 1) {
    body = (<>{kick('Mi día más activo')}{big(data.best ? shortDay(data.best.key) : '–', 60)}{sub(data.best ? `${fmtInt(data.best.steps)} pasos` : '')}</>);
  } else if (slide === 2) {
    body = (<>{kick('Mi mejor racha')}{big(String(data.run.length), 96)}{sub(data.run.length === 1 ? 'día seguido' : 'días seguidos')}</>);
  } else if (slide === 3 && data.rank) {
    body = (<>{kick('Mi mejor puesto en el ranking')}{big(`#${data.rank.position}`, 90)}{sub(`entre ${fmtInt(data.rank.participants)} caminantes`)}</>);
  } else if (slide === 4) {
    body = (<>{kick(`Puntos ganados en ${data.monthName}`)}{big(fmtInt(data.points.total), 90)}{sub('Puntos')}
      {stats([{ label: 'Por pasos', value: `+${fmtInt(data.points.steps)}` }, ...(data.points.bonus > 0 ? [{ label: 'Bonos', value: `+${fmtInt(data.points.bonus)}` }] : [])])}</>);
  } else {
    body = (<>{kick(`${mesDe} en resumen`)}{big(fmtInt(data.steps), 60)}{sub('pasos')}
      {stats([{ label: 'Promedio', value: fmtInt(data.avgPerDay), unit: 'pasos/día' }, { label: 'Distancia', value: fmtKm(data.km), unit: 'km' }, { label: 'Meta', value: `${data.daysMet}/${data.days}`, unit: 'días' }])}</>);
  }
  return <CardFrame theme="dark" format="overlay" label="">{body}</CardFrame>;
}
