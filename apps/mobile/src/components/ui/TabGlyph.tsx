import { useEffect, useId, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { Foot, gradientDefs, PARTS, type Fills, type IllKind } from '@/components/ui/IllustratedIcons';
import { partProgress, sample } from '@/lib/motion';

// Íconos de la barra de abajo, armados por partes para que cada uno haga su gesto al tocarlo:
// la casa se levanta, las barras crecen, los grupos saltan, el calendario pasa de página, la bolsa se balancea.
// Mismo dibujo en todos los teléfonos. Los dibujos están en IllustratedIcons.
export type TabKind = 'home' | 'activity' | 'groups' | 'events' | 'canjes';

const TOTAL_MS = 700;
type PartAnim = { delay: number; dur: number; at: number[]; y?: number[]; scaleY?: number[]; rotate?: number[]; opacity?: number[] };

const hop: PartAnim['at'] = [0, 0.35, 0.65, 1];
const squash: PartAnim = { delay: 0, dur: 560, at: [0, 0.28, 0.55, 1], scaleY: [1, 0.92, 1.04, 1] };
const bar = (delay: number): PartAnim => ({ delay, dur: 520, at: [0, 0.3, 0.7, 1], scaleY: [1, 0.55, 1.08, 1] });
const jump = (delay: number): PartAnim => ({ delay, dur: 520, at: hop, y: [0, -6, 1.5, 0] });
const swing: PartAnim = { delay: 0, dur: 700, at: [0, 0.22, 0.5, 0.72, 1], rotate: [0, -15, 11, -5, 0] };
const step = (delay: number): PartAnim => ({ delay, dur: 480, at: [0, 0.6, 1], y: [8, -1.5, 0], opacity: [0, 1, 1] });

// Gesto de cada parte, en el mismo orden que PARTS (IllustratedIcons): la casa se levanta, las barras crecen, los grupos saltan,
// el calendario sacude las argollas y las huellas aparecen paso a paso, la bolsa se balancea.
const ANIM: Partial<Record<TabKind, (PartAnim | undefined)[]>> = {
  home: [{ delay: 0, dur: 560, at: [0, 0.28, 0.55, 1], y: [0, -4.5, 1, 0] }, squash, squash],
  activity: [bar(0), bar(70), bar(140)],
  groups: [undefined, jump(0), jump(80), jump(140)],
  events: [undefined, { delay: 0, dur: 520, at: [0, 0.25, 0.6, 1], rotate: [0, -14, 10, 0] }, step(0), step(160)],
  canjes: [swing, swing, swing, swing],
};
const KIND: Record<TabKind, IllKind> = { home: 'home', activity: 'activity', groups: 'groups', events: 'events', canjes: 'canjes' };

// Oscurece un #rrggbb para el segundo tono de los íconos apagados.
function shade(hex: string, k: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

function Layer({ children, a, size, t, origin, reduced }: { children: ReactNode; a?: PartAnim; size: number; t: { value: number }; origin: string; reduced: boolean }) {
  const k = size / 48;
  const style = useAnimatedStyle(() => {
    if (!a || reduced) return {};
    const q = partProgress(t.value, a.delay, a.dur);
    const y = a.y ? sample(a.at, a.y, q) * k : 0;
    const sy = a.scaleY ? sample(a.at, a.scaleY, q) : 1;
    const r = a.rotate ? sample(a.at, a.rotate, q) : 0;
    const o = a.opacity ? sample(a.at, a.opacity, q) : 1;
    return { opacity: o, transform: [{ translateY: y }, { scaleY: sy }, { rotate: `${r}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: origin }, style]}>
      {children}
    </Animated.View>
  );
}

// `tick` sube cada vez que se toca la pestaña (también si ya estaba activa); además se anima al pasar a activa por otro camino.
// Activa: ilustrada con degradé. Inactiva: del gris de la barra, en dos tonos.
export function TabGlyph({ kind, color, focused, tick = 0, size = 28 }: { kind: TabKind; color: string; focused: boolean; tick?: number; size?: number }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Empieza en el final (reposo): si la animación no corre, el ícono se ve normal.
  const t = useSharedValue(TOTAL_MS);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    t.value = 0;
    t.value = withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear });
  }, [tick, focused, reduced, t]);

  const ill = KIND[kind];
  const c: Fills = focused ? { f: `url(#${uid}f)`, g: `url(#${uid}g)` } : { f: color, g: shade(color, 0.28) };
  const anims = ANIM[kind] ?? [];
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PARTS[ill].map((part, i) => (
        <Layer key={i} a={anims[i]} size={size} t={t} origin={part.origin} reduced={reduced}>
          {part.node ? (
            <Svg width={size} height={size} viewBox="0 0 48 48">
              {focused ? gradientDefs(uid, ill) : null}
              {part.node(c)}
            </Svg>
          ) : part.foot ? (
            <Foot part={part.foot} size={size} tint={focused ? '#FFF6D2' : c.g} />
          ) : null}
        </Layer>
      ))}
    </View>
  );
}
