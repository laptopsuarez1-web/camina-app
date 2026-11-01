import { useId, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Circle, Stop } from 'react-native-svg';

// Íconos ilustrados con degradé, en la línea del trofeo (dibujo en una grilla de 48). Los usan la barra de abajo (TabGlyph, por partes
// para que cada uno haga su gesto) y las fichas de Inicio (IconBubble). Calendario y bolsa llevan las huellas de Camina, como el trofeo.
export type IllKind = 'home' | 'activity' | 'groups' | 'events' | 'canjes' | 'target' | 'friend' | 'gift' | 'bell' | 'flame';

export type Fills = { f: string; g: string };
export type IllPart = { origin: string; node?: (c: Fills) => ReactNode; foot?: { x: number; y: number; w: number; h: number; side: 0 | 1 } };

const TONE: Record<IllKind, keyof typeof GRAD> = { home: 'mint', activity: 'aqua', groups: 'purple', events: 'coral', canjes: 'gold', target: 'coral', friend: 'aqua', gift: 'pink', bell: 'gold', flame: 'coral' };
const SECOND: Record<keyof typeof GRAD, keyof typeof GRAD> = { mint: 'aqua', aqua: 'mint', purple: 'pink', coral: 'gold', gold: 'coral', pink: 'purple' };
const GRAD = {
  mint: ['#5CEBC0', '#1F9C7C'], gold: ['#FFE08A', '#E8A12A'], purple: ['#C4AEFF', '#7050E0'],
  aqua: ['#7BDCFA', '#2B8FD0'], coral: ['#FFAE8E', '#E55A3C'], pink: ['#FF9FC4', '#D9457F'],
} as const;

export function gradientDefs(uid: string, kind: IllKind): ReactNode {
  const t = TONE[kind];
  return (
    <Defs>
      {([['f', t], ['g', SECOND[t]]] as const).map(([k, tone]) => (
        <LinearGradient key={k} id={`${uid}${k}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GRAD[tone][0]} />
          <Stop offset="1" stopColor={GRAD[tone][1]} />
        </LinearGradient>
      ))}
    </Defs>
  );
}

export const PARTS: Record<IllKind, IllPart[]> = {
  home: [
    { origin: '50% 100%', node: ({ f }) => <Path d="M4.5 25.500 24 7.500l19.500 18" fill="none" stroke={f} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" /> },
    { origin: '50% 100%', node: ({ f }) => <Path d="M9 24 24 10.500 39 24V37a3.500 3.500 0 0 1-3.500 3.500h-23A3.500 3.500 0 0 1 9 37Z" fill={f} /> },
    { origin: '50% 100%', node: ({ g }) => <Rect x={19} y={27} width={10} height={13.500} rx={3} fill={g} /> },
  ],
  activity: [
    { origin: '50% 100%', node: ({ g }) => <Rect x={7} y={26} width={8.5} height={15} rx={4.2} fill={g} /> },
    { origin: '50% 100%', node: ({ f }) => <Rect x={19.700} y={16} width={8.5} height={25} rx={4.2} fill={f} /> },
    { origin: '50% 100%', node: ({ f }) => <Rect x={32.500} y={8} width={8.5} height={33} rx={4.2} fill={f} /> },
  ],
  groups: [
    { origin: '50% 50%', node: ({ f }) => <Path d="M11 40c0-8 5-13 13-13s13 5 13 13z" fill={f} /> },
    { origin: '50% 50%', node: ({ f }) => <Circle cx={24} cy={15} r={7} fill={f} /> },
    { origin: '50% 50%', node: ({ g }) => (
      <>
        <Circle cx={10} cy={19} r={5} fill={g} />
        <Path d="M1.500 38c0-6 3-10 8.500-10 1.300 0 2.500.2 3.500.7-3 2.400-4.800 5.700-5 9.300z" fill={g} />
      </>
    ) },
    { origin: '50% 50%', node: ({ g }) => (
      <>
        <Circle cx={38} cy={19} r={5} fill={g} />
        <Path d="M46.500 38c0-6-3-10-8.500-10-1.300 0-2.500.2-3.500.7 3 2.400 4.800 5.700 5 9.300z" fill={g} />
      </>
    ) },
  ],
  events: [
    { origin: '50% 50%', node: ({ f, g }) => (
      <>
        <Rect x={6} y={9} width={36} height={33} rx={8} fill={f} />
        <Path d="M6 20h36v-3a8 8 0 0 0-8-8H14a8 8 0 0 0-8 8z" fill={g} />
      </>
    ) },
    { origin: '50% 100%', node: ({ g }) => (
      <>
        <Rect x={14} y={4} width={4.500} height={11} rx={2.250} fill={g} />
        <Rect x={29.500} y={4} width={4.500} height={11} rx={2.250} fill={g} />
      </>
    ) },
    { origin: '50% 50%', foot: { x: 14.500, y: 23, w: 8, h: 16, side: 0 } },
    { origin: '50% 50%', foot: { x: 25.500, y: 25, w: 8, h: 16, side: 1 } },
  ],
  canjes: [
    { origin: '50% 0%', node: ({ g }) => <Path d="M16 17v-3a8 8 0 0 1 16 0v3" fill="none" stroke={g} strokeWidth={4} strokeLinecap="round" /> },
    { origin: '50% 0%', node: ({ f }) => <Path d="M8 17h32l2.500 21a5 5 0 0 1-5 5.500h-27a5 5 0 0 1-5-5.500z" fill={f} /> },
    { origin: '50% 0%', foot: { x: 14, y: 22, w: 8, h: 16, side: 0 } },
    { origin: '50% 0%', foot: { x: 25, y: 24, w: 8, h: 16, side: 1 } },
  ],
  target: [
    { origin: '50% 50%', node: ({ f, g }) => (
      <>
        <Circle cx={22} cy={26} r={17} fill={f} />
        <Circle cx={22} cy={26} r={11.500} fill="#fff" fillOpacity={0.9} />
        <Circle cx={22} cy={26} r={6.500} fill={g} />
      </>
    ) },
    { origin: '50% 50%', node: ({ g }) => (
      <>
        <Path d="m24 24 15-15" stroke={g} strokeWidth={3.600} strokeLinecap="round" />
        <Path d="M33 4v8h8" fill="none" stroke={g} strokeWidth={3.600} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) },
  ],
  friend: [
    { origin: '50% 50%', node: ({ f }) => (
      <>
        <Circle cx={19} cy={15} r={8} fill={f} />
        <Path d="M4 41c0-9 6-14 15-14s15 5 15 14z" fill={f} />
      </>
    ) },
    { origin: '50% 50%', node: ({ g }) => (
      <>
        <Circle cx={38} cy={30} r={9} fill={g} />
        <Path d="M38 25v10M33 30h10" stroke="#fff" strokeWidth={3.200} strokeLinecap="round" />
      </>
    ) },
  ],
  gift: [
    { origin: '50% 100%', node: ({ g }) => (
      <>
        <Rect x={6} y={18} width={36} height={9} rx={3.500} fill={g} />
        <Path d="M24 18c-3-8-12-9-12-4 0 3 5 4 12 4zm0 0c3-8 12-9 12-4 0 3-5 4-12 4z" fill="none" stroke={g} strokeWidth={3.200} strokeLinejoin="round" />
      </>
    ) },
    { origin: '50% 100%', node: ({ f }) => (
      <>
        <Path d="M9 27h30v11a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z" fill={f} />
        <Rect x={21} y={18} width={6} height={24} fill="#fff" fillOpacity={0.85} />
      </>
    ) },
  ],
  bell: [
    { origin: '50% 0%', node: ({ f }) => <Path d="M24 5a3 3 0 0 1 3 3v1.500c6 1.500 9.500 6.500 9.500 12.500v6.500l3.500 5c.8 1.200 0 2.800-1.500 2.800h-29c-1.500 0-2.300-1.600-1.500-2.800l3.500-5V22C11.500 16 15 11 21 9.500V8a3 3 0 0 1 3-3z" fill={f} /> },
    { origin: '50% 0%', node: ({ g }) => <Path d="M18.500 41.500a5.500 5.500 0 0 0 11 0z" fill={g} /> },
  ],
  flame: [
    { origin: '50% 100%', node: ({ f }) => <Path d="M24 3c1 8 12 13 12 25a12 12 0 0 1-24 0c0-5 2.500-8 5-10 .3 3 1.500 5 3.500 6C19 17 21 9 24 3z" fill={f} /> },
    { origin: '50% 100%', node: ({ g }) => <Path d="M24 25c1.500 3.500 6 5 6 10a6 6 0 0 1-12 0c0-3 1.500-4.500 3-5.500.2 1.500.8 2.200 1.800 2.700C23 30 23 27 24 25z" fill={g} /> },
  ],
};

const FOOT_L = require('@/../assets/pie-izq-mint.png');
const FOOT_R = require('@/../assets/pie-der-mint.png');

// Huella de Camina (la del logo) tintada, posicionada en la grilla de 48.
export function Foot({ part, size, tint }: { part: NonNullable<IllPart['foot']>; size: number; tint: string }) {
  const k = size / 48;
  return (
    <Image
      source={part.side === 0 ? FOOT_L : FOOT_R}
      accessible={false}
      resizeMode="contain"
      style={{ position: 'absolute', left: part.x * k, top: part.y * k, width: part.w * k, height: part.h * k, tintColor: tint, opacity: 0.95 }}
    />
  );
}

// Ícono entero, estático. `muted` lo pinta con dos colores apagados (pestañas inactivas).
export function IllArt({ kind, size = 48, muted }: { kind: IllKind; size?: number; muted?: Fills }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c: Fills = muted ?? { f: `url(#${uid}f)`, g: `url(#${uid}g)` };
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {muted ? null : gradientDefs(uid, kind)}
        {PARTS[kind].map((p, i) => (p.node ? <G key={i}>{p.node(c)}</G> : null))}
      </Svg>
      {PARTS[kind].map((p, i) => (p.foot ? <Foot key={i} part={p.foot} size={size} tint={muted ? muted.g : '#FFF6D2'} /> : null))}
    </View>
  );
}
