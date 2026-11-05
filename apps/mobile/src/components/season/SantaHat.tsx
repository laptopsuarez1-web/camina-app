import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Gorro navideño dibujado (no es una imagen): se ve nítido en cualquier tamaño y en cualquier cabeza.
// Caja 220 x 180. El punto (ANCHOR_X, ANCHOR_Y) es el centro de la banda de peluche: es lo que se apoya sobre la cabeza.
// BAND es el ancho de la banda en unidades de la caja (para calcular qué tan grande dibujarlo sobre una vincha o una foto).
export const HAT_BOX = { w: 220, h: 180, anchorX: 104, anchorY: 138, band: 178 };

type Tone = 'red' | 'gold';

const BODY: Record<Tone, [string, string, string]> = {
  red: ['#FF7A7E', '#E23A48', '#9E1229'],
  gold: ['#FFE6A0', '#F2B84B', '#BF7E16'],
};

type P = [number, number];

// Punto y normal de una curva cuadrática (para armar la banda curva).
function quad(a: P, c: P, b: P, t: number): { p: P; n: P } {
  const u = 1 - t;
  const p: P = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  const d: P = [2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1])];
  const len = Math.hypot(d[0], d[1]) || 1;
  return { p, n: [-d[1] / len, d[0] / len] };
}

// Borde de peluche: una línea con ondas suaves (no bolitas sueltas), para que se vea esponjoso pero de una pieza.
function fluffyBand(a: P, c: P, b: P, half: number, bumps: number, amp: number) {
  const N = bumps * 2;
  const edge = (side: 1 | -1) => {
    const pts: { p: P; n: P }[] = [];
    for (let i = 0; i <= N; i++) {
      const { p, n } = quad(a, c, b, i / N);
      pts.push({ p: [p[0] + n[0] * half * side, p[1] + n[1] * half * side], n: [n[0] * side, n[1] * side] });
    }
    return pts;
  };
  const top = edge(-1);
  const bottom = edge(1).reverse();
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(top[0].p[0])} ${f(top[0].p[1])}`;
  for (let i = 1; i < top.length; i += 2) {
    const m = top[i];
    const e = top[Math.min(i + 1, top.length - 1)];
    d += ` Q${f(m.p[0] + m.n[0] * amp * 2)} ${f(m.p[1] + m.n[1] * amp * 2)} ${f(e.p[0])} ${f(e.p[1])}`;
  }
  // Punta redondeada a la derecha.
  d += ` Q${f(b[0] + 16)} ${f(b[1])} ${f(bottom[0].p[0])} ${f(bottom[0].p[1])}`;
  for (let i = 1; i < bottom.length; i += 2) {
    const m = bottom[i];
    const e = bottom[Math.min(i + 1, bottom.length - 1)];
    d += ` Q${f(m.p[0] + m.n[0] * amp * 2)} ${f(m.p[1] + m.n[1] * amp * 2)} ${f(e.p[0])} ${f(e.p[1])}`;
  }
  d += ` Q${f(a[0] - 16)} ${f(a[1])} ${f(top[0].p[0])} ${f(top[0].p[1])} Z`;
  return d;
}

// Pompón: un círculo con el borde ondulado.
function fluffyBall(cx: number, cy: number, r: number, bumps: number, amp: number) {
  const f = (v: number) => v.toFixed(1);
  let d = '';
  for (let i = 0; i <= bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2;
    const am = ((i - 0.5) / bumps) * Math.PI * 2;
    const x = cx + r * Math.cos(a0);
    const y = cy + r * Math.sin(a0);
    if (i === 0) d = `M${f(x)} ${f(y)}`;
    else d += ` Q${f(cx + (r + amp * 2) * Math.cos(am))} ${f(cy + (r + amp * 2) * Math.sin(am))} ${f(x)} ${f(y)}`;
  }
  return d + ' Z';
}

const BAND_A: P = [26, 144];
const BAND_C: P = [104, 122];
const BAND_B: P = [182, 144];
const BAND = fluffyBand(BAND_A, BAND_C, BAND_B, 14, 9, 1.6);
const BAND_SHADE = fluffyBand([30, 152], [104, 132], [178, 152], 4.5, 9, 1);
const POM = fluffyBall(194, 88, 14, 11, 1.8);

export function SantaHat({ width, tone = 'red', style }: { width: number; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const [hi, mid, lo] = BODY[tone];
  const id = tone;
  return (
    <View pointerEvents="none" style={[{ width, height: (width * HAT_BOX.h) / HAT_BOX.w }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${HAT_BOX.w} ${HAT_BOX.h}`}>
        <Defs>
          <LinearGradient id={`hb-${id}`} x1="0.05" y1="0.1" x2="0.95" y2="0.9">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.5" stopColor={mid} />
            <Stop offset="1" stopColor={lo} />
          </LinearGradient>
          <LinearGradient id={`hs-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id={`hf-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.6" stopColor="#F4F0F9" />
            <Stop offset="1" stopColor="#D8CFE6" />
          </LinearGradient>
          <RadialGradient id={`hp-${id}`} cx="0.38" cy="0.32" r="0.8">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.65" stopColor="#F2EDF8" />
            <Stop offset="1" stopColor="#CFC4E0" />
          </RadialGradient>
        </Defs>

        {/* Cuerpo: sube desde la banda y la punta cae hacia la derecha hasta el pompón. */}
        <Path
          d="M32 140 C 30 90 66 36 126 26 C 162 20 188 36 196 68 C 198 76 197 82 195 88 C 186 74 174 66 164 70 C 170 94 176 118 180 140 Z"
          fill={`url(#hb-${id})`}
        />
        {/* Pliegue de la punta y sombra sobre la banda: le dan volumen. */}
        <Path d="M164 70 C 170 94 176 118 180 140 L 156 140 C 156 116 158 92 164 70 Z" fill="#000" opacity={0.12} />
        <Path d="M32 140 C 31 128 33 116 37 106 L 179 106 C 179 118 179 129 180 140 Z" fill={`url(#hs-${id})`} />
        {/* Brillo a la izquierda. */}
        <Path d="M54 110 C 58 76 84 48 120 38" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={7} strokeLinecap="round" fill="none" />

        {/* Banda de peluche. */}
        <G>
          <Path d={BAND} fill={`url(#hf-${id})`} />
          <Path d={BAND_SHADE} fill="#C9BEDA" opacity={0.35} />
          <Ellipse cx={74} cy={130} rx={18} ry={3.2} fill="#FFFFFF" opacity={0.95} />
        </G>

        {/* Pompón. */}
        <Path d={POM} fill={`url(#hp-${id})`} />
        <Ellipse cx={189} cy={82} rx={4.5} ry={3.5} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

// Gorro puesto sobre una foto redonda (`size` = diámetro de la foto): arriba a la derecha, inclinado, como puesto de verdad.
export function AvatarHat({ size, tone = 'red' }: { size: number; tone?: Tone }) {
  const w = size * 0.95;
  return (
    <SantaHat
      width={w}
      tone={tone}
      style={{ position: 'absolute', left: size * 0.13, top: -size * 0.5, transform: [{ rotate: '17deg' }] }}
    />
  );
}

// Gorro sobre la vincha de una imagen (el Baifo). `l` y `r` son los extremos de la vincha ya en píxeles de pantalla.
// `drop` baja el gorro y `shift` lo corre a lo largo de la vincha (en píxeles de pantalla) para que la banda la tape entera.
export function HeadbandHat({ l, r, scale = 1.22, drop = 0, shift = 0 }: { l: [number, number]; r: [number, number]; scale?: number; drop?: number; shift?: number }) {
  const dist = Math.hypot(r[0] - l[0], r[1] - l[1]);
  const angle = (Math.atan2(r[1] - l[1], r[0] - l[0]) * 180) / Math.PI;
  const width = (dist * HAT_BOX.w * scale) / HAT_BOX.band;
  const height = (width * HAT_BOX.h) / HAT_BOX.w;
  const rad = (angle * Math.PI) / 180;
  const cx = (l[0] + r[0]) / 2 - Math.sin(rad) * drop + Math.cos(rad) * shift;
  const cy = (l[1] + r[1]) / 2 + Math.cos(rad) * drop + Math.sin(rad) * shift;
  return (
    <SantaHat
      width={width}
      style={{
        position: 'absolute',
        left: cx - (width * HAT_BOX.anchorX) / HAT_BOX.w,
        top: cy - (height * HAT_BOX.anchorY) / HAT_BOX.h,
        transform: [{ rotate: `${angle}deg` }],
        transformOrigin: `${(HAT_BOX.anchorX / HAT_BOX.w) * 100}% ${(HAT_BOX.anchorY / HAT_BOX.h) * 100}%`,
      }}
    />
  );
}
