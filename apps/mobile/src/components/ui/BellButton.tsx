import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Bell } from '@/components/icons';
import { useNotifications } from '@/hooks/useNotifications';

// Campanita con puntito rojo cuando hay avisos sin leer; abre la bandeja.
export function BellButton({ dark, color, bg }: { dark?: boolean; color: string; bg?: string }) {
  const { unread } = useNotifications();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
      hitSlop={6}
      onPress={() => router.push('/(tabs)/notificaciones')}
      className={dark ? 'bg-white/10 rounded-full items-center justify-center' : 'bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full items-center justify-center'}
      style={{ width: 32, height: 32, ...(bg ? { backgroundColor: bg } : {}) }}
    >
      <Bell size={15} color={color} />
      {unread > 0 && (
        <View style={{ position: 'absolute', top: 5, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: '#E5484D', borderWidth: 1.5, borderColor: dark ? '#241748' : '#fff' }} />
      )}
    </Pressable>
  );
}
