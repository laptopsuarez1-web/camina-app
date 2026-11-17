import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function longDayLabel(key: string, isToday: boolean) {
  const d = new Date(`${key}T00:00:00`);
  return isToday ? `Hoy, ${d.getDate()} de ${MESES[d.getMonth()]}` : `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// Franja bajo el gráfico con el día tocado: fecha, pasos y si llegó a la meta. Reemplaza la ventana del detalle.
// `opened` = la app sincronizó ese día (si no, los pasos no cuentan para la meta); se omite en el perfil de amigos.
export function DayStrip({ dayKey, isToday, steps, goal, opened = true }: { dayKey: string; isToday: boolean; steps: number; goal: number; opened?: boolean }) {
  const met = opened && steps >= goal;
  const chip = !opened
    ? { text: 'No abriste la app', bg: 'rgba(255,255,255,0.1)', fg: colors.authMuted }
    : met
      ? { text: 'Meta cumplida', bg: 'rgba(98,240,182,0.15)', fg: colors.mint }
      : { text: `${isToday ? 'Faltan' : 'Faltaron'} ${(goal - steps).toLocaleString('es-BO')}`, bg: 'rgba(242,152,92,0.16)', fg: colors.warnSoft };
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${longDayLabel(dayKey, isToday)}: ${steps.toLocaleString('es-BO')} pasos. ${chip.text}`}
      style={{ marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} className="text-[12px]" style={{ color: colors.authMuted }}>{longDayLabel(dayKey, isToday)}</Text>
        <Text numberOfLines={1} className="text-[16px] font-extrabold text-white">{steps.toLocaleString('es-BO')} pasos</Text>
      </View>
      <View style={{ backgroundColor: chip.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
        <Text numberOfLines={1} className="text-[11.5px] font-bold" style={{ color: chip.fg }}>{chip.text}</Text>
      </View>
    </View>
  );
}
