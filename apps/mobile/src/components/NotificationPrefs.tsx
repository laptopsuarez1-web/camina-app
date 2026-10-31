import { View, Switch } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { useNotificationPrefs } from '@/store/useNotificationPrefs';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

function PrefRow({ title, text, value, onChange, last }: { title: string; text: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? '' : 'border-b border-line-light dark:border-line-dark'}`} style={{ gap: 12 }}>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-text-light dark:text-text-dark">{title}</Text>
        <Text className="text-[12.5px] leading-[18px] text-muted-light dark:text-muted-dark mt-0.5">{text}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={(v) => { buzz.selection(); onChange(v); }}
        trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }}
      />
    </View>
  );
}

// Dentro de Perfil > Permisos > Notificaciones: qué avisos quiere recibir la persona, en dos grupos (como Pasito).
export function NotificationPrefs() {
  const prefs = useNotificationPrefs();
  const profile = useAuthStore((s) => s.profile);

  async function setServicio(value: boolean) {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ push_servicio: value }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  return (
    <View className="px-3.5 pb-1 border-t border-line-light dark:border-line-dark">
      <Text accessibilityRole="header" className="text-[12px] font-bold text-muted-light dark:text-muted-dark mt-3">Notificaciones de servicio</Text>
      <PrefRow title="Canjes y Puntos por vencer" text="Códigos de canje activos y Puntos que están por vencerse." value={profile?.push_servicio ?? true} onChange={setServicio} last />
      <Text accessibilityRole="header" className="text-[12px] font-bold text-muted-light dark:text-muted-dark mt-2">Cómo funciona</Text>
      <PrefRow title="Aliento del día" text="A las 18:30 te contamos cuánto te falta para tu meta o cuántos Puntos más puedes sumar." value={prefs.aliento} onChange={(v) => prefs.set('aliento', v)} />
      <PrefRow title="Racha" text="Avisos de la tarde y la noche para que no cortes tu racha." value={prefs.racha} onChange={(v) => prefs.set('racha', v)} last />
    </View>
  );
}
