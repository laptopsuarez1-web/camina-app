import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { dayLabel } from '@/lib/format';
import { areaPath, linePath, nearestIndex, pointXY } from '@/lib/trend';

export type TrendSeries = { id: string; label: string; color: string; values: number[] };

const H = 120;
const PAD = 6;

// Gráfico de líneas de los últimos días: una serie con área, o varias para comparar. Se toca (o se arrastra el dedo)
// para ver el día; sin tocar, muestra hoy.
export function TrendChart({ days, series, goal, muted, textColor, gridColor }: {
  days: string[];
  series: TrendSeries[];
  goal?: number;
  muted: string;
  textColor: string;
  gridColor: string;
}) {
  const [w, setW] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const idx = picked ?? days.length - 1;
  const max = Math.max(goal ?? 0, ...series.flatMap((s) => s.values), 1) * 1.1;
  const single = series.length === 1;
  const pick = (x: number) => setPicked(nearestIndex(x, days.length, w, PAD));

  return (
    <View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        accessibilityLabel={`Gráfico de los últimos ${days.length} días. Toca un día para ver sus pasos.`}
        style={{ height: H + 8 }}
      >
        {w > 0 && (
          <Svg width={w} height={H + 8}>
            <Defs>
              <SvgGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={series[0]?.color ?? '#4FC3A8'} stopOpacity="0.38" />
                <Stop offset="1" stopColor={series[0]?.color ?? '#4FC3A8'} stopOpacity="0" />
              </SvgGradient>
            </Defs>
            {goal != null && goal <= max && (
              <Line x1={0} x2={w} y1={pointXY(0, 2, goal, max, w, H).y} y2={pointXY(0, 2, goal, max, w, H).y} stroke={gridColor} strokeWidth={1} strokeDasharray="4 4" />
            )}
            {single && series[0] ? <Path d={areaPath(series[0].values, max, w, H, PAD)} fill="url(#trendFill)" /> : null}
            {series.map((s) => (
              <Path key={s.id} d={linePath(s.values, max, w, H, PAD)} stroke={s.color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            <Line x1={pointXY(idx, days.length, 0, max, w, H, PAD).x} x2={pointXY(idx, days.length, 0, max, w, H, PAD).x} y1={0} y2={H} stroke={gridColor} strokeWidth={1} />
            {series.map((s) => {
              const p = pointXY(idx, days.length, s.values[idx] ?? 0, max, w, H, PAD);
              return <Circle key={s.id} cx={p.x} cy={p.y} r={4.5} fill={s.color} stroke="#fff" strokeWidth={1.5} />;
            })}
          </Svg>
        )}
      </View>
      <View className="flex-row justify-between mt-1.5">
        <Text className="text-[12px]" style={{ color: muted }}>{dayLabel(days[0])}</Text>
        <Text className="text-[12px]" style={{ color: muted }}>{dayLabel(days[days.length - 1])}</Text>
      </View>
      <View className="mt-2.5 rounded-xl px-3 py-2.5" style={{ backgroundColor: gridColor + '55' }}>
        <Text className="text-[12px] font-bold mb-1" style={{ color: textColor }}>{idx === days.length - 1 && picked == null ? 'Hoy' : dayLabel(days[idx])}</Text>
        {series.map((s) => (
          <View key={s.id} className="flex-row items-center justify-between py-0.5">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text className="text-[12.5px]" style={{ color: textColor }}>{s.label}</Text>
            </View>
            <Text className="text-[12.5px] font-bold" style={{ color: textColor }}>{(s.values[idx] ?? 0).toLocaleString('es-BO')} pasos</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
