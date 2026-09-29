import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Bell } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { colors } from '@/theme/tokens';

function timeAgo(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'Recién';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
}

export default function NotificacionesScreen() {
  const { items, seenAt, markAllSeen } = useNotifications();

  // Al salir de la pantalla, todo queda como leído (los puntitos se ven mientras estás adentro).
  useEffect(() => () => { markAllSeen(); }, [markAllSeen]);

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="pb-10">
      <View className="bg-auth-bg pt-14 pb-6 px-5" style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Pressable>
          <Text className="text-white text-[17px] font-bold">Avisos</Text>
        </View>
      </View>

      <View className="px-5 pt-5" style={{ gap: 10 }}>
        {items.map((n) => {
          const isNew = !seenAt || n.created_at > seenAt;
          return (
            <View
              key={n.id}
              className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-2xl p-4"
              style={isNew ? { borderColor: colors.aqua, borderWidth: 1.5 } : undefined}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="flex-1 text-[14px] font-bold text-text-light dark:text-text-dark pr-2">{n.title}</Text>
                <Text className="text-[11px] text-muted-light dark:text-muted-dark">{timeAgo(n.created_at)}</Text>
              </View>
              <Text className="text-[13px] leading-5 text-muted-light dark:text-muted-dark">{n.body}</Text>
            </View>
          );
        })}
        {items.length === 0 && (
          <View className="items-center py-14" style={{ gap: 10 }}>
            <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-full items-center justify-center" style={{ width: 56, height: 56 }}>
              <Bell size={24} color={colors.purple} />
            </View>
            <Text className="text-[14px] font-semibold text-text-light dark:text-text-dark">Todo tranquilo por acá</Text>
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark text-center px-8">
              Cuando tengas un código por vencer, Puntos por vencer o tu racha en juego, te avisamos acá.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
