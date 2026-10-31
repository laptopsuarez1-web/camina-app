import { useEffect, useState } from 'react';
import { View, Switch } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { IconBubble, Flame } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { buzz } from '@/lib/haptics';
import { loadReminderSettings, saveReminderSettings, resyncStreakReminders } from '@/lib/streak-reminders';
import { DAY_HOURS, NIGHT_HOURS, DEFAULT_REMINDER_SETTINGS, hourLabel, type StreakReminderSettings } from '@/lib/streak-reminder-plan';

function HourChips({ label, hours, value, onPick }: { label: string; hours: readonly number[]; value: number; onPick: (h: number) => void }) {
  return (
    <View className="mt-3">
      <Text className="text-[12px] mb-1.5 text-muted-light dark:text-muted-dark">{label}</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {hours.map((h) => {
          const on = h === value;
          return (
            <Press
              key={h}
              accessibilityRole="button"
              accessibilityLabel={`${label} a las ${hourLabel(h)}`}
              accessibilityState={{ selected: on }}
              aria-pressed={on}
              haptic="selection"
              onPress={() => onPick(h)}
              className="rounded-full border px-3.5 bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
              style={{ minHeight: 40, justifyContent: 'center', ...(on ? { backgroundColor: colors.aquaDeep, borderColor: colors.aqua } : null) }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : undefined }} className={on ? '' : 'text-muted-light dark:text-muted-dark'}>{hourLabel(h)}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

// Perfil: avisos para no cortar la racha, uno de día y otro de noche, con horarios para elegir (nada de teclear horas).
export function StreakReminderCard() {
  const isDark = useColorScheme().colorScheme === 'dark';
  const [s, setS] = useState<StreakReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  useEffect(() => {
    loadReminderSettings().then(setS);
  }, []);

  function update(next: StreakReminderSettings) {
    setS(next);
    saveReminderSettings(next).then(resyncStreakReminders);
  }

  return (
    <Glass className="rounded-2xl p-3.5 mb-3">
      <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
        <IconBubble icon={Flame} tone="gold" size={34} />
        <View className="flex-1">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Avisos de racha</Text>
          <Text className="text-[12px] mt-0.5 text-muted-light dark:text-muted-dark">Un aviso de día y otro de noche si todavía no cumpliste tu meta.</Text>
        </View>
        <Switch
          accessibilityLabel="Avisos de racha"
          value={s.enabled}
          onValueChange={(v) => { buzz.selection(); update({ ...s, enabled: v }); }}
          trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }}
        />
      </View>
      {s.enabled && (
        <>
          <HourChips label="Aviso de día" hours={DAY_HOURS} value={s.dayHour} onPick={(h) => update({ ...s, dayHour: h })} />
          <HourChips label="Aviso de noche" hours={NIGHT_HOURS} value={s.nightHour} onPick={(h) => update({ ...s, nightHour: h })} />
        </>
      )}
    </Glass>
  );
}
