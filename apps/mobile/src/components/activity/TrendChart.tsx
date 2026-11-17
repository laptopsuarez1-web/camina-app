import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop, Circle, Line } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { buzz } from '@/lib/haptics';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';
import { areaPath, chartPoints, smoothPath, trendScale } from '@/lib/trend-line';
import { GoalLine } from '@/components/activity/GoalLine';

// Gráfico de "30 días" de Actividad: una curva con los pasos de cada día, con el área rellena en degradé
// y un punto en el día de hoy. Se dibuja de izquierda a derecha la primera vez en la sesión.
// Deslizar el dedo sobre la curva muestra cada día (como en la bolsa): una línea y un punto siguen al dedo y
// arriba se ve la fecha y los pasos de ese día. Tocar (o soltar el dedo) deja marcado ese día; el detalle va en la franja de abajo.

let drawn = false;

export function TrendChart({ values, days, goal, height, startLabel, onSelect, onScrub, selectedKey, streakLit = false }: {
  values: number[];
  days: { key: string; steps: number; isToday: boolean }[];
  goal: number;
  height: number;
  startLabel: string;
  onSelect: (key: string) => void;
  // Día que se está mirando con el dedo (índice en `days`), o null al soltar.
  onScrub?: (index: number | null) => void;
  // Día marcado (queda con su línea y punto cuando no hay dedo encima).
  selectedKey?: string | null;
  // Llama encendida en la línea de la meta.
  streakLit?: boolean;
}) {
  const [w, setW] = useState(0);
  const reduced = useReducedMotion();
  const [play] = useState(() => !drawn && !reduced);
  const k = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (!play || w === 0) return;
    drawn = true;
    k.value = withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
  }, [play, w, k]);
  const reveal = useAnimatedStyle(() => ({ width: Math.max(0, k.value * (w + 12)) }));

  const { min, max } = trendScale(values, goal);
  const pts = w > 0 ? chartPoints(values, w, height, max, min) : [];
  const last = pts[pts.length - 1];
  const goalY = height - ((goal - min) / (max - min)) * height;

  const [sel, setSel] = useState<number | null>(null);
  const indexAt = (x: number) => {
    if (w <= 0 || values.length === 0) return 0;
    return Math.max(0, Math.min(values.length - 1, Math.round((x / w) * (values.length - 1))));
  };
  const mirar = (x: number) => {
    const i = indexAt(x);
    if (i === sel) return;
    buzz.selection();
    setSel(i);
    onScrub?.(i);
  };
  const soltar = () => {
    if (sel != null && days[sel]) onSelect(days[sel].key);
    setSel(null);
    onScrub?.(null);
  };
  // Solo arranca con un movimiento de lado: así la pantalla se sigue pudiendo deslizar hacia abajo.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onStart((e) => mirar(e.x))
    .onUpdate((e) => mirar(e.x))
    .onFinalize(() => soltar());
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, ok) => { if (ok && days.length) onSelect(days[indexAt(e.x)].key); });
  const gesto = Gesture.Exclusive(pan, tap);
  const marcadoIdx = selectedKey != null ? days.findIndex((d) => d.key === selectedKey) : -1;
  const marca = sel != null ? pts[sel] : marcadoIdx >= 0 ? pts[marcadoIdx] : null;
  return (
    <View style={{ height: height + 40, paddingTop: 20 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Animated.View style={[{ height: height + 8, overflow: 'hidden', marginLeft: -6, paddingLeft: 6 }, reveal]}>
          <Svg width={w + 12} height={height + 8} style={{ marginLeft: -6 }}>
            <Defs>
              <SvgGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.mint} stopOpacity={0.32} />
                <Stop offset="1" stopColor={colors.mint} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Path d={areaPath(pts, height)} fill="url(#trendFill)" transform="translate(6,0)" />
            <Path d={smoothPath(pts)} stroke={colors.mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(6,0)" />
            {marca ? <Line x1={marca.x + 6} x2={marca.x + 6} y1={0} y2={height} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} /> : null}
            {marca ? <Circle cx={marca.x + 6} cy={marca.y} r={7} fill={colors.mint} stroke="#2A1A55" strokeWidth={3} /> : null}
            {last && !marca ? <Circle cx={last.x + 6} cy={last.y} r={5.5} fill={colors.mint} stroke="#2A1A55" strokeWidth={3} /> : null}
          </Svg>
        </Animated.View>
      ) : null}
      <GoalLine lit={streakLit} goal={goal} top={20 + goalY} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text className="text-[12px]" style={{ color: colors.authMuted }}>{startLabel}</Text>
        <Text className="text-[12px]" style={{ color: '#fff', fontWeight: '800' }}>Hoy</Text>
      </View>
      {/* Zona del dedo: deslizar para ver cada día; tocar para marcar un día. */}
      <GestureDetector gesture={gesto}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Pasos de los últimos ${days.length} días. Desliza el dedo sobre la curva para ver cada día.`}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height + 28 }}
        />
      </GestureDetector>
    </View>
  );
}
