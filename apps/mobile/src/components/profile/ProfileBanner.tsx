import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { profileBg } from '@/lib/profile-bg';

// Banner de arriba del perfil. Cada fondo es un dibujo vectorial plano en capas (cielo, luz, planos lejanos y cercanos),
// anclado abajo: lo importante queda en la parte baja y el nombre y la foto quedan sobre el cielo, sin chocar con el dibujo.
const W = 400;
const H = 300;

// Números repetibles (así los dibujos no cambian entre pantallas ni entre aperturas).
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function Stars({ n, seed, maxY = 150, tint = '#fff' }: { n: number; seed: number; maxY?: number; tint?: string }) {
  const r = rng(seed);
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W;
        const y = r() * maxY;
        const big = r() > 0.88;
        return <Circle key={i} cx={x} cy={y} r={big ? 1.7 : 0.7 + r() * 0.7} fill={tint} opacity={big ? 0.95 : 0.35 + r() * 0.5} />;
      })}
    </G>
  );
}

function Glow({ id, cx, cy, r, color, opacity = 0.5 }: { id: string; cx: number; cy: number; r: number; color: string; opacity?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

function Bird({ x, y, s = 1, color = '#fff', o = 0.7 }: { x: number; y: number; s?: number; color?: string; o?: number }) {
  return <Path d={`M${x} ${y} q${5 * s} ${-6 * s} ${10 * s} 0 q${5 * s} ${-6 * s} ${10 * s} 0`} stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={o} />;
}

// Pino de tres pisos.
function pine(x: number, base: number, h: number, w: number) {
  const t = h * 0.38;
  return (
    `M${x} ${base - h} L${x + w * 0.5} ${base - h + t} L${x + w * 0.3} ${base - h + t} ` +
    `L${x + w * 0.7} ${base - h + t * 1.9} L${x + w * 0.42} ${base - h + t * 1.9} ` +
    `L${x + w * 0.9} ${base - h + t * 2.9} L${x + w * 0.1} ${base - h + t * 2.9} ` +
    `L${x - w * 0.42} ${base - h + t * 1.9} L${x - w * 0.7} ${base - h + t * 1.9} ` +
    `L${x - w * 0.3} ${base - h + t} L${x - w * 0.5} ${base - h + t} Z M${x - w * 0.06} ${base - h + t * 2.9} h${w * 0.12} V${base} h${-w * 0.12} Z`
  );
}

function Bosque() {
  const r = rng(21);
  const back = Array.from({ length: 14 }, (_, i) => pine(i * 31 - 6 + r() * 10, 236, 52 + r() * 26, 24));
  const mid = Array.from({ length: 10 }, (_, i) => pine(i * 44 + 8 + r() * 16, 262, 86 + r() * 34, 40));
  const front = [pine(26, 300, 150, 66), pine(96, 300, 112, 52), pine(318, 300, 120, 56), pine(378, 300, 158, 70)];
  const flies = Array.from({ length: 9 }, () => ({ x: 20 + r() * 360, y: 190 + r() * 80, o: 0.35 + r() * 0.5, s: 1.1 + r() * 1.2 }));
  return (
    <>
      <Stars n={46} seed={5} maxY={120} />
      <Glow id="bq-moon" cx={318} cy={100} r={70} color="#d9f99d" opacity={0.35} />
      <Circle cx={318} cy={100} r={17} fill="#ecfccb" />
      <Circle cx={312} cy={96} r={3} fill="#bef264" opacity={0.45} />
      <Circle cx={324} cy={106} r={2.2} fill="#bef264" opacity={0.4} />
      <Path d="M0 210 Q70 168 140 196 T270 180 T400 200 V300 H0Z" fill="#0d4a44" opacity={0.85} />
      <Path d={back.join(' ')} fill="#0b3b37" />
      <Defs>
        <SvgLinear id="bq-mist" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9ff5d4" stopOpacity={0} />
          <Stop offset="1" stopColor="#9ff5d4" stopOpacity={0.2} />
        </SvgLinear>
      </Defs>
      <Rect x={0} y={190} width={W} height={70} fill="url(#bq-mist)" />
      <Path d={mid.join(' ')} fill="#072926" />
      <Rect x={0} y={236} width={W} height={64} fill="#072926" />
      <Path d={front.join(' ')} fill="#04171a" />
      <Path d="M0 300 V276 Q80 262 160 272 T320 268 T400 274 V300Z" fill="#04171a" />
      {flies.map((f, i) => (
        <G key={i}>
          <Circle cx={f.x} cy={f.y} r={f.s * 3.2} fill="#fde68a" opacity={f.o * 0.25} />
          <Circle cx={f.x} cy={f.y} r={f.s} fill="#fef08a" opacity={f.o} />
        </G>
      ))}
    </>
  );
}

function Ciudad() {
  const r = rng(77);
  const far: [number, number, number][] = [[0, 34, 190], [30, 28, 170], [56, 40, 196], [100, 26, 160], [124, 38, 184], [166, 30, 150], [194, 44, 190], [236, 30, 168], [264, 40, 186], [302, 28, 156], [328, 44, 194], [370, 34, 172]];
  const near: [number, number, number][] = [[-6, 52, 150], [44, 40, 118], [82, 56, 164], [136, 44, 104], [178, 60, 150], [236, 46, 112], [280, 52, 160], [330, 44, 122], [370, 40, 146]];
  const windows: ReactNode[] = [];
  near.forEach(([x, w, top], bi) => {
    for (let wy = top + 10; wy < 292; wy += 11) {
      for (let wx = x + 6; wx < x + w - 6; wx += 9) {
        const v = r();
        if (v > 0.58) windows.push(<Rect key={`${bi}-${wx}-${wy}`} x={wx} y={wy} width={4} height={5} fill={v > 0.9 ? '#fff7d6' : '#ffd166'} opacity={0.55 + r() * 0.4} />);
      }
    }
  });
  return (
    <>
      <Stars n={40} seed={11} maxY={140} />
      <Glow id="cd-moon" cx={330} cy={92} r={60} color="#c4b5fd" opacity={0.35} />
      <Circle cx={330} cy={92} r={14} fill="#ede9fe" />
      <Circle cx={326} cy={88} r={2.4} fill="#c4b5fd" opacity={0.55} />
      <Defs>
        <SvgLinear id="cd-haze" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8b5cf6" stopOpacity={0} />
          <Stop offset="1" stopColor="#8b5cf6" stopOpacity={0.35} />
        </SvgLinear>
      </Defs>
      <Rect x={0} y={150} width={W} height={110} fill="url(#cd-haze)" />
      {far.map(([x, w, top], i) => (
        <Rect key={`f${i}`} x={x} y={top} width={w} height={H - top} fill="#2a1b66" />
      ))}
      {near.map(([x, w, top], i) => (
        <Rect key={`n${i}`} x={x} y={top} width={w} height={H - top} fill="#150e30" />
      ))}
      <Rect x={207} y={118} width={2} height={34} fill="#150e30" />
      <Circle cx={208} cy={118} r={2.4} fill="#f87171" />
      <Circle cx={208} cy={118} r={7} fill="#f87171" opacity={0.25} />
      {windows}
      <Rect x={0} y={282} width={W} height={18} fill="#0a0618" />
      <Path d="M0 290 H400" stroke="#ffd166" strokeWidth={1.4} strokeDasharray="10 14" opacity={0.5} />
    </>
  );
}

function Sendero() {
  return (
    <>
      <Glow id="sd-sun" cx={290} cy={170} r={150} color="#fde68a" opacity={0.65} />
      <Circle cx={290} cy={170} r={26} fill="#fff1c2" />
      <Path d="M0 200 Q60 150 130 178 T250 168 T400 186 V300 H0Z" fill="#8a2f7a" opacity={0.75} />
      <Path d="M0 226 Q90 186 190 214 T400 204 V300 H0Z" fill="#5a2078" />
      <Path d="M0 258 Q110 226 220 250 T400 240 V300 H0Z" fill="#33124f" />
      <Path d="M0 300 V280 Q120 262 260 276 T400 270 V300Z" fill="#1d0a34" />
      <Path d="M168 300 Q176 268 210 252 Q246 238 238 214 Q232 198 262 190 L270 192 Q246 202 252 218 Q262 246 222 262 Q196 274 206 300 Z" fill="#ffd9a0" opacity={0.5} />
      <G opacity={0.9}>
        <Bird x={70} y={90} s={1.1} color="#2b1048" />
        <Bird x={96} y={76} s={0.8} color="#2b1048" />
        <Bird x={118} y={96} s={0.7} color="#2b1048" />
      </G>
      <G fill="#1d0a34">
        <Path d="M36 292 q2 -16 6 -22 q1 12 5 22Z" />
        <Path d="M48 294 q2 -12 6 -16 q0 10 4 16Z" />
        <Path d="M344 290 q2 -18 6 -24 q2 12 6 24Z" />
      </G>
    </>
  );
}

function Pista() {
  const r = rng(33);
  const crowd = Array.from({ length: 60 }, () => ({ x: r() * W, y: 148 + r() * 14 }));
  const lane = (f: number) => `M${140 + f * 120} 172 L${-60 + f * 520} 300`;
  return (
    <>
      <Stars n={22} seed={9} maxY={90} />
      <Glow id="pt-l" cx={46} cy={92} r={90} color="#fff7d6" opacity={0.55} />
      <Glow id="pt-r" cx={354} cy={92} r={90} color="#fff7d6" opacity={0.55} />
      {[46, 354].map((x) => (
        <G key={x}>
          <Rect x={x - 1.5} y={96} width={3} height={78} fill="#06101f" />
          <Rect x={x - 20} y={80} width={40} height={16} rx={2} fill="#0a1a30" />
          {[-14, -5, 5, 14].map((o) => (
            <Circle key={o} cx={x + o} cy={88} r={2.4} fill="#fff7d6" />
          ))}
        </G>
      ))}
      <Rect x={0} y={140} width={W} height={34} fill="#0a1a30" />
      <Rect x={0} y={138} width={W} height={4} fill="#122846" />
      {crowd.map((c, i) => (
        <Circle key={i} cx={c.x} cy={c.y} r={1.1} fill={i % 3 ? '#fcd34d' : '#fca5a5'} opacity={0.5} />
      ))}
      <Rect x={0} y={172} width={W} height={128} fill="#0a5a45" />
      <Path d="M0 196 H400 M0 222 H400 M0 252 H400" stroke="#0e6b52" strokeWidth={10} opacity={0.5} />
      <Path d="M140 172 L260 172 L460 300 L-60 300Z" fill="#c2410c" />
      <Path d="M140 172 L260 172 L260 175 L140 175Z" fill="#fff" opacity={0.9} />
      <Path d={`${lane(0.25)} ${lane(0.5)} ${lane(0.75)}`} stroke="#fff" strokeWidth={2.4} opacity={0.75} />
      <Path d="M120 206 L280 206" stroke="#fff" strokeWidth={2} opacity={0.6} />
      <Path d="M90 250 L310 250" stroke="#fff" strokeWidth={2.6} opacity={0.5} />
      <Path d="M0 300 V288 H400 V300Z" fill="#06301f" />
    </>
  );
}

function Cloud({ x, y, s = 1, o = 0.9, shade = '#c4b5fd' }: { x: number; y: number; s?: number; o?: number; shade?: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <Ellipse cx={0} cy={6} rx={46} ry={11} fill={shade} />
      <Circle cx={-22} cy={-2} r={15} fill="#fff" />
      <Circle cx={0} cy={-10} r={20} fill="#fff" />
      <Circle cx={24} cy={-1} r={14} fill="#fff" />
      <Ellipse cx={0} cy={4} rx={44} ry={9} fill="#fff" />
      <Ellipse cx={0} cy={9} rx={40} ry={5} fill={shade} opacity={0.55} />
    </G>
  );
}

function Cielo() {
  return (
    <>
      <Stars n={16} seed={14} maxY={110} />
      <Glow id="cl-sun" cx={316} cy={96} r={130} color="#fcd9ff" opacity={0.55} />
      <Circle cx={316} cy={96} r={22} fill="#fff4d6" />
      <G>
        <Cloud x={70} y={196} s={0.7} o={0.4} shade="#8b8cf5" />
        <Cloud x={340} y={206} s={0.6} o={0.4} shade="#8b8cf5" />
        <Cloud x={190} y={226} s={1.2} o={0.9} />
        <Cloud x={40} y={252} s={1.35} o={0.95} shade="#a5a8ff" />
        <Cloud x={338} y={258} s={1.5} o={0.95} shade="#a5a8ff" />
      </G>
      <Path d="M0 292 Q100 270 200 288 T400 280 V300 H0Z" fill="#fff" opacity={0.92} />
      <Bird x={96} y={120} s={1} />
      <Bird x={122} y={108} s={0.75} />
    </>
  );
}

const SCENES = { bosque: Bosque, ciudad: Ciudad, sendero: Sendero, pista: Pista, cielo: Cielo } as const;

// Solo el dibujo (para banners y miniaturas). 'violeta' no dibuja nada: es el degradé de siempre.
// El dibujo baja 80 unidades para que lo alto (edificios, árboles, nubes) quede debajo del nombre y la foto; el cielo queda libre arriba.
// El dibujo llena la caja (banner o miniatura), anclado abajo.
export function ProfileBgArt({ bg }: { bg: string | null | undefined }) {
  const key = profileBg(bg).key;
  if (key === 'violeta') return null;
  const Scene = SCENES[key];
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" style={StyleSheet.absoluteFill} pointerEvents="none">
      {key !== 'sendero' ? <Stars n={34} seed={3} maxY={170} /> : null}
      <G transform="translate(0 80)">
        <Scene />
      </G>
    </Svg>
  );
}

// artPad: espacio extra abajo cuando el fondo tiene dibujo, para que se vea el paisaje debajo del nombre.
export function ProfileBanner({ bg, children, style, artPad = 0 }: { bg: string | null | undefined; children: ReactNode; style?: StyleProp<ViewStyle>; artPad?: number }) {
  const theme = profileBg(bg);
  const drawn = theme.key !== 'violeta';
  const base = StyleSheet.flatten(style) ?? {};
  const padBottom = Number(base.paddingBottom ?? 28) + (drawn ? artPad : 0);
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: drawn ? 0.2 : 0.8, y: 1 }}
      style={[{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' }, style, { paddingBottom: padBottom }]}
    >
      <ProfileBgArt bg={bg} />
      {drawn ? <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} start={{ x: 0, y: 0.5 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {children}
    </LinearGradient>
  );
}

// Miniatura del selector.
export function ProfileBgThumb({ bg, selected, width, height = 68 }: { bg: string; selected: boolean; width?: number; height?: number }) {
  const theme = profileBg(bg);
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: theme.key === 'violeta' ? 0.8 : 0.2, y: 1 }}
      style={{ width: width ?? '100%', height, borderRadius: 14, overflow: 'hidden', borderWidth: selected ? 2.5 : 1, borderColor: selected ? '#fff' : 'rgba(255,255,255,0.18)' }}
    >
      <View style={StyleSheet.absoluteFill}>
        <ProfileBgArt bg={bg} />
      </View>
    </LinearGradient>
  );
}
