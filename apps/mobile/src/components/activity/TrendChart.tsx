import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop, Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { colors } from '@/theme/tokens';
import { areaPath, chartPoints, smoothPath, trendScale } from '@/lib/trend-line';

// Gráfico de "30 días" de Actividad: una curva con el promedio de 7 días, con el área rellena en degradé
// y un punto en el día de hoy. Se dibuja de izquierda a derecha la primera vez en la sesión.
// Tocar un tramo abre el detalle de ese día (igual que las barras de 7 días).

let drawn = false;

export function TrendChart({ values, days, goal, height, startLabel, onSelect, dayLabel }: {
  values: number[];
  days: { key: string; steps: number; isToday: boolean }[];
  goal: number;
  height: number;
  startLabel: string;
  onSelect: (key: string) => void;
  dayLabel: (key: string) => string;
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
  // La etiqueta de la meta va del lado donde la curva no la tapa: abajo si la curva pasa por encima de la meta.
  const curveAbove = values.length > 0 && values[0] >= goal;
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
            {last ? <Circle cx={last.x + 6} cy={last.y} r={5.5} fill={colors.mint} stroke="#2A1A55" strokeWidth={3} /> : null}
          </Svg>
        </Animated.View>
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 20 + goalY, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)' }}>
        <View style={{ position: 'absolute', left: 0, ...(curveAbove ? { top: 5 } : { top: -27 }), backgroundColor: '#2c1366', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text className="text-[12px] font-bold" style={{ color: colors.mint }}>meta {goal.toLocaleString('es-BO')}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text className="text-[12px]" style={{ color: colors.authMuted }}>{startLabel}</Text>
        <Text className="text-[12px]" style={{ color: '#fff', fontWeight: '800' }}>Hoy</Text>
      </View>
      {/* Zonas táctiles: una por día, a lo ancho del gráfico. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height + 28, flexDirection: 'row' }}>
        {days.map((d) => (
          <Press
            key={d.key}
            feedback="none"
            onPress={() => onSelect(d.key)}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${d.isToday ? 'Hoy' : dayLabel(d.key)}: ${d.steps.toLocaleString('es-BO')} pasos. Ver detalle`}
          />
        ))}
      </View>
    </View>
  );
}
