import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { partProgress, sample, withAlpha } from '@/lib/motion';

// Íconos de la barra de abajo, armados por partes para que cada uno haga su gesto al tocarlo:
// la casa se levanta, las barras crecen, los grupos saltan, el calendario pasa de página, la bolsa se balancea.
// Mismo dibujo en todos los teléfonos (antes en iPhone eran los símbolos del sistema). Inactivo: contorno; activo: contorno + relleno suave.
export type TabKind = 'home' | 'activity' | 'groups' | 'events' | 'canjes';

const TOTAL_MS = 700;
type PartAnim = { delay: number; dur: number; at: number[]; y?: number[]; scaleY?: number[]; rotate?: number[]; opacity?: number[] };
type Part = { origin: string; anim?: PartAnim; draw: (c: { stroke: string; fill: string; ink: string }) => ReactNode };

const hop: PartAnim['at'] = [0, 0.35, 0.65, 1];

const PARTS: Record<TabKind, Part[]> = {
  home: [
    { origin: '50% 100%', anim: { delay: 0, dur: 560, at: [0, 0.28, 0.55, 1], y: [0, -3.6, 0.8, 0] }, draw: ({ stroke }) => <Path d="M3.5 15.5 16 4.5l12.5 11" stroke={stroke} /> },
    {
      origin: '50% 100%',
      anim: { delay: 0, dur: 560, at: [0, 0.28, 0.55, 1], scaleY: [1, 0.92, 1.04, 1] },
      draw: ({ stroke, fill }) => (
        <>
          <Path d="M7 13.5V26a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V13.5" stroke={stroke} fill={fill} />
          <Path d="M13 28v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" stroke={stroke} />
        </>
      ),
    },
  ],
  activity: [
    { origin: '50% 100%', anim: { delay: 0, dur: 520, at: [0, 0.3, 0.7, 1], scaleY: [1, 0.55, 1.08, 1] }, draw: ({ stroke, fill }) => <Rect x={3} y={14} width={7.5} height={14} rx={2.2} stroke={stroke} fill={fill} /> },
    { origin: '50% 100%', anim: { delay: 70, dur: 520, at: [0, 0.3, 0.7, 1], scaleY: [1, 0.55, 1.08, 1] }, draw: ({ stroke, fill }) => <Rect x={12.25} y={8} width={7.5} height={20} rx={2.2} stroke={stroke} fill={fill} /> },
    { origin: '50% 100%', anim: { delay: 140, dur: 520, at: [0, 0.3, 0.7, 1], scaleY: [1, 0.55, 1.08, 1] }, draw: ({ stroke, fill }) => <Rect x={21.5} y={3} width={7.5} height={25} rx={2.2} stroke={stroke} fill={fill} /> },
  ],
  groups: [
    { origin: '50% 50%', draw: ({ stroke }) => <Path d="M8.5 27.5a7.5 7.5 0 0 1 15 0M2.5 25a5 5 0 0 1 5-4.2M29.5 25a5 5 0 0 0-5-4.2" stroke={stroke} /> },
    { origin: '50% 50%', anim: { delay: 80, dur: 520, at: hop, y: [0, -4.5, 1, 0] }, draw: ({ stroke, fill }) => <Circle cx={7} cy={13.5} r={3} stroke={stroke} fill={fill} /> },
    { origin: '50% 50%', anim: { delay: 140, dur: 520, at: hop, y: [0, -4.5, 1, 0] }, draw: ({ stroke, fill }) => <Circle cx={25} cy={13.5} r={3} stroke={stroke} fill={fill} /> },
    { origin: '50% 50%', anim: { delay: 0, dur: 520, at: hop, y: [0, -4.5, 1, 0] }, draw: ({ stroke, fill }) => <Circle cx={16} cy={10} r={4} stroke={stroke} fill={fill} /> },
  ],
  events: [
    {
      origin: '50% 50%',
      draw: ({ stroke, fill }) => (
        <>
          <Rect x={4} y={6.5} width={24} height={21.5} rx={5} stroke={stroke} fill={fill} />
          <Path d="M4 12.5h24" stroke={stroke} />
        </>
      ),
    },
    { origin: '50% 100%', anim: { delay: 0, dur: 520, at: [0, 0.25, 0.6, 1], rotate: [0, -14, 10, 0] }, draw: ({ stroke }) => <Path d="M10.5 3.8v5M21.5 3.8v5" stroke={stroke} /> },
    {
      origin: '50% 50%',
      anim: { delay: 0, dur: 480, at: [0, 0.6, 1], y: [7, -1, 0], opacity: [0, 1, 1] },
      draw: ({ ink }) => (
        <>
          <Circle cx={11} cy={18.5} r={1.5} fill={ink} stroke="none" />
          <Circle cx={16} cy={18.5} r={1.5} fill={ink} stroke="none" />
          <Circle cx={21} cy={18.5} r={1.5} fill={ink} stroke="none" />
          <Circle cx={11} cy={23} r={1.5} fill={ink} stroke="none" />
          <Circle cx={16} cy={23} r={1.5} fill={ink} stroke="none" />
        </>
      ),
    },
  ],
  canjes: [
    {
      origin: '50% 0%',
      anim: { delay: 0, dur: 700, at: [0, 0.22, 0.5, 0.72, 1], rotate: [0, -15, 11, -5, 0] },
      draw: ({ stroke, fill }) => (
        <>
          <Path d="M6.5 11h19l1.5 14a3 3 0 0 1-3 3.3H8a3 3 0 0 1-3-3.3Z" stroke={stroke} fill={fill} />
          <Path d="M11 11V9a5 5 0 0 1 10 0v2" stroke={stroke} />
          <Path d="M12 17.5q4 3.5 8 0" stroke={stroke} />
        </>
      ),
    },
  ],
};

function Layer({ part, size, t, colors, reduced }: { part: Part; size: number; t: { value: number }; colors: { stroke: string; fill: string; ink: string }; reduced: boolean }) {
  const a = part.anim;
  const k = size / 32;
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
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: part.origin }, style]}>
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
        {part.draw(colors)}
      </Svg>
    </Animated.View>
  );
}

// `tick` sube cada vez que se toca la pestaña (también si ya estaba activa); además se anima al pasar a activa por otro camino.
export function TabGlyph({ kind, color, focused, tick = 0, size = 26 }: { kind: TabKind; color: string; focused: boolean; tick?: number; size?: number }) {
  const reduced = useReducedMotion();
  // Empieza en el final (reposo): si la animación no corre, el ícono se ve normal.
  const t = useSharedValue(TOTAL_MS);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    t.value = 0;
    t.value = withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear });
  }, [tick, focused, reduced, t]);

  const colors = { stroke: color, fill: focused ? withAlpha(color, 0.22) : 'none', ink: color };
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PARTS[kind].map((part, i) => (
        <Layer key={i} part={part} size={size} t={t} colors={colors} reduced={reduced} />
      ))}
    </View>
  );
}
