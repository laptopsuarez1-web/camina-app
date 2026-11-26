import { useState } from 'react';
import { Modal, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Clock, ChevronDown, ChevronUp } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { Glass } from '@/components/ui/Glass';

// Un día puede tener dos tramos (horario partido): from/to y from2/to2.
type DayHours = { from: string; to: string; from2?: string; to2?: string } | null;
export type OpeningHours = Record<string, DayHours> | null | undefined;

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Índice del día de hoy con lunes = 0.
export function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function inRange(now: string, from: string, to: string) {
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

// Los tramos del día, en orden: [[8:00, 12:00], [14:30, 21:00]] o uno solo si abre de corrido.
function ranges(h: NonNullable<DayHours>): [string, string][] {
  return h.from2 && h.to2 ? [[h.from, h.to], [h.from2, h.to2]] : [[h.from, h.to]];
}

export function rangesText(h: NonNullable<DayHours>) {
  return ranges(h).map(([a, b]) => `${a} – ${b}`).join(' y ');
}

export function isOpenNow(h: DayHours) {
  if (!h) return false;
  const now = new Date().toTimeString().slice(0, 5);
  return ranges(h).some(([a, b]) => inRange(now, a, b));
}

// Hasta qué hora está abierto en este momento (el cierre del tramo actual).
export function closesAt(h: NonNullable<DayHours>) {
  const now = new Date().toTimeString().slice(0, 5);
  return (ranges(h).find(([a, b]) => inRange(now, a, b)) ?? ranges(h)[0])[1];
}

// Chip de horario que al tocarlo muestra qué días abre el comercio y en qué horario.
export function BusinessHours({ openingHours, hoursText }: { openingHours: OpeningHours; hoursText: string | null }) {
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();
  const today = todayIndex();
  const week = openingHours ?? null;

  // Sin horario por día (comercio viejo): se muestra el texto que cargó.
  if (!week) {
    if (!hoursText) return null;
    return (
      <Glass
        className="flex-row items-center rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{hoursText}</Text>
      </Glass>
    );
  }

  const todayHours = week[String(today)] ?? null;
  const status = todayHours
    ? isOpenNow(todayHours)
      ? `Abierto ahora · hasta ${closesAt(todayHours)}`
      : `Hoy ${rangesText(todayHours).replace(/ – /g, ' a ')}`
    : 'Hoy cerrado';

  return (
    <View className="w-full">
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        hitSlop={{ top: 6, bottom: 6 }}
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center self-start bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{status}</Text>
        {open ? <ChevronUp size={14} color={muted} /> : <ChevronDown size={14} color={muted} />}
      </Press>

      {open && (
        <Glass className="rounded-2xl px-4 py-3 mt-2" style={{ gap: 7 }}>
          {DAYS.map((name, i) => {
            const h = week[String(i)] ?? null;
            const isToday = i === today;
            return (
              <View key={name} className="flex-row items-center justify-between">
                <Text
                  className="text-[13px] text-text-light dark:text-text-dark"
                  style={{ fontWeight: isToday ? '800' : '500' }}
                >
                  {name}
                  {isToday ? ' (hoy)' : ''}
                </Text>
                <Text
                  className={h ? 'text-[13px] text-aqua-ink dark:text-aqua' : 'text-[13px] text-muted-light dark:text-muted-dark'}
                  style={{ fontWeight: isToday ? '800' : '500' }}
                >
                  {h ? rangesText(h) : 'Cerrado'}
                </Text>
              </View>
            );
          })}
        </Glass>
      )}
    </View>
  );
}

// Estado del chip sobre la portada: abierto con el tramo en curso, o cerrado con el horario de hoy.
export function hoursChipInfo(week: NonNullable<OpeningHours>) {
  const h = week[String(todayIndex())] ?? null;
  if (!h) return { open: false, label: 'Cerrado', hours: 'hoy' };
  if (isOpenNow(h)) {
    const now = new Date().toTimeString().slice(0, 5);
    const r = ranges(h).find(([a, b]) => inRange(now, a, b)) ?? ranges(h)[0];
    return { open: true, label: 'Abierto', hours: `${r[0]} – ${r[1]}` };
  }
  return { open: false, label: 'Cerrado', hours: `hoy ${rangesText(h)}` };
}

const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();
const WEB_BLUR = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)' } as unknown as ViewStyle) : null;

// Chip de horario de vidrio sobre la portada (estilo Pasito): punto de estado + "Abierto · 08:00 – 23:00".
// En iOS 26 usa el vidrio líquido del sistema; en iOS anterior, desenfoque; en web, backdrop-filter; en Android, velo translúcido.
// Al tocarlo se abre la hoja con los 7 días.
export function HoursCoverChip({ openingHours, onPress, style }: { openingHours: NonNullable<OpeningHours>; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { open, label, hours } = hoursChipInfo(openingHours);
  const dot = open ? '#62F0B6' : '#FF8A8A';
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${hours}. Ver todos los horarios`}
      onPress={onPress}
      style={[{ borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, style]}
    >
      <View style={[{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderBottomColor: 'rgba(255,255,255,0.08)' }, WEB_BLUR]}>
        {LIQUID ? (
          <GlassView glassEffectStyle="regular" colorScheme="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        ) : Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        ) : null}
        {!LIQUID && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? 'rgba(24,14,40,0.72)' : 'rgba(24,14,40,0.38)' }]} />}
        <View className="flex-row items-center" style={{ gap: 7, paddingLeft: 12, paddingRight: 10, paddingVertical: 8 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: open ? 'rgba(98,240,182,0.25)' : 'rgba(255,138,138,0.22)' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
          </View>
          <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 13.5 }}>
            <Text allowFontScaling={false} style={{ color: open ? '#62F0B6' : '#FFB4B4', fontWeight: '800' }}>{label}</Text>
            <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.55)' }}>{'  ·  '}</Text>
            <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '700', fontVariant: ['tabular-nums'] }}>{hours}</Text>
          </Text>
          <ChevronDown size={14} color="rgba(255,255,255,0.85)" />
        </View>
      </View>
    </Press>
  );
}

// Hoja inferior "Horarios": los 7 días en lista limpia y el de hoy resaltado.
export function HoursSheet({ openingHours, visible, onClose }: { openingHours: NonNullable<OpeningHours>; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const today = todayIndex();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" onPress={() => {}} style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center', marginTop: 10 }} />
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Horarios</Text>
            {DAYS.map((name, i) => {
              const h = openingHours[String(i)] ?? null;
              const isToday = i === today;
              return (
                <View
                  key={name}
                  className="flex-row items-center justify-between"
                  style={{ paddingVertical: 11, paddingHorizontal: isToday ? 12 : 0, marginHorizontal: isToday ? -12 : 0, borderRadius: 14, backgroundColor: isToday ? 'rgba(98,240,182,0.14)' : 'transparent' }}
                >
                  <Text style={{ color: isToday ? '#62F0B6' : '#fff', fontSize: 15, fontWeight: isToday ? '800' : '500' }}>{name}{isToday ? ' (hoy)' : ''}</Text>
                  <Text style={{ color: isToday ? '#62F0B6' : h ? '#fff' : '#9a8cb8', fontSize: 15, fontWeight: isToday ? '800' : '500' }}>{h ? rangesText(h) : 'Cerrado'}</Text>
                </View>
              );
            })}
          </View>
        </Press>
      </Press>
    </Modal>
  );
}
