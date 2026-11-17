import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { GrowIn } from '@/components/ui/GrowIn';
import { colors } from '@/theme/tokens';
import { GoalLine, GOAL_GUTTER } from '@/components/activity/GoalLine';
import { longDayLabel } from '@/components/activity/DayStrip';

export type BarDay = { key: string; steps: number; label: string; isToday: boolean };

// Barras de 7 días con la línea de la meta (y la llama de la racha). Tocar una barra la marca y avisa con onSelect;
// el detalle lo muestra quien usa el gráfico (en Actividad, la franja de abajo). Pensado para reusarse en el perfil de amigos.
export function WeekBars({ days, goal, goalFor, height, selectedKey, onSelect, streakLit }: {
  days: BarDay[];
  goal: number;
  goalFor?: (key: string) => number;
  height: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  streakLit: boolean;
}) {
  // Escala con margen sobre la meta para que la línea punteada siempre se vea.
  const max = Math.max(goal * 1.15, ...days.map((d) => d.steps));
  return (
    <View style={{ height: height + 40, paddingLeft: GOAL_GUTTER }}>
      <View className="flex-row items-end" style={{ gap: 8, height: height + 40 }}>
        {days.map((d, i) => {
          const hit = d.steps >= (goalFor ? goalFor(d.key) : goal);
          const sel = d.key === selectedKey;
          const grad = d.isToday ? ['#A4F7DB', colors.mint] : hit ? ['#6FE0BF', '#3FAE95'] : ['rgba(79,195,168,0.5)', 'rgba(79,195,168,0.22)'];
          return (
            <Press
              key={d.key}
              onPress={() => onSelect(d.key)}
              haptic="selection"
              className="flex-1 items-center justify-end"
              style={{ height: '100%' }}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${longDayLabel(d.key, d.isToday)}: ${d.steps.toLocaleString('es-BO')} pasos${hit ? ', meta cumplida' : ''}`}
            >
              {sel ? <Text className="text-[12px] font-bold text-white mb-1">{d.steps.toLocaleString('es-BO')}</Text> : null}
              <GrowIn id="actividad-barras" index={i} count={days.length}>
                <LinearGradient
                  colors={grad as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    width: '100%',
                    height: Math.max(4, (d.steps / max) * height),
                    borderTopLeftRadius: 11,
                    borderTopRightRadius: 11,
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                    ...(sel ? { borderWidth: 2, borderColor: '#fff' } : {}),
                    ...(d.isToday ? { shadowColor: colors.mint, shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : {}),
                  }}
                />
              </GrowIn>
              <Text
                className="text-[12px] mt-1.5"
                style={{ height: 16, color: d.isToday || sel ? '#fff' : colors.authMuted, fontWeight: d.isToday || sel ? '800' : '500' }}
              >
                {d.isToday ? 'Hoy' : d.label}
              </Text>
            </Press>
          );
        })}
      </View>
      {/* Va después de las barras para quedar por encima de ellas. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: GOAL_GUTTER, right: 0, top: 0, bottom: 0 }}>
        <GoalLine lit={streakLit} goal={goal} bottom={20 + (goal / max) * height} />
      </View>
    </View>
  );
}
