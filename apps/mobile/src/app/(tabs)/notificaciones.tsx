import { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Press } from '@/components/ui/Press';
import { router, useFocusEffect } from 'expo-router';
import { EmptyIllustration } from '@/components/ui/EmptyIllustration';
import { ChevronLeft, Bell, Clock, Flame, MapPin, Trophy, Gift, IconBubble } from '@/components/icons';
import { useNotifications } from '@/hooks/useNotifications';
import { colors } from '@/theme/tokens';
import { DarkHeader } from '@/components/ui/DarkHeader';
import { Glass } from '@/components/ui/Glass';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { routeForNotification } from '@/lib/notification-routes';

function bubbleFor(type?: string) {
  switch (type) {
    case 'redemption_expiring':
      return <IconBubble icon={Clock} tone="orange" size={38} />;
    case 'streak':
    case 'streak_reminder':
      return <IconBubble icon={Flame} tone="orange" size={38} />;
    case 'nearby':
      return <IconBubble icon={MapPin} tone="purple" size={38} />;
    case 'reto':
      return <IconBubble icon={Trophy} tone="gold" size={38} />;
    case 'redemption':
      return <IconBubble icon={Gift} tone="purple" size={38} />;
    default:
      return <IconBubble icon={Bell} tone="aqua" size={38} />;
  }
}

function timeAgo(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'Recién';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
}

export default function NotificacionesScreen() {
  const tabSpace = useTabBarSpace();
  const { items, seenAt, markAllSeen, isLoading, isError, refetch } = useNotifications();

  // Al salir de la pantalla (las pestañas no se desmontan, por eso se usa el foco), todo queda como leído:
  // los avisos nuevos se ven resaltados mientras estás adentro.
  useFocusEffect(useCallback(() => () => { markAllSeen(); }, [markAllSeen]));

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <DarkHeader style={{ paddingBottom: 24 }}>
        <View className="flex-row items-center gap-3">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Press>
          <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Avisos</Text>
        </View>
      </DarkHeader>

      <View className="px-5 pt-5" style={{ gap: 10 }}>
        {items.map((n) => {
          const isNew = !seenAt || n.created_at > seenAt;
          // Si el destino es esta misma pantalla no hay a dónde ir: la fila queda solo para leer.
          const dest = routeForNotification(n.data?.type);
          const opens = dest !== '/(tabs)/notificaciones';
          return (
            <Press
              key={n.id}
              accessibilityRole={opens ? 'button' : undefined}
              accessibilityLabel={`${isNew ? 'Nueva. ' : ''}${n.title}. ${n.body}. ${timeAgo(n.created_at)}`}
              onPress={opens ? () => router.push(dest as never) : undefined}
            >
            <Glass
              className="rounded-2xl p-4"
              style={isNew ? { borderColor: colors.aqua, borderWidth: 1.5 } : undefined}
            >
              <View className="flex-row" style={{ gap: 12 }}>
                {bubbleFor(n.data?.type)}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="flex-1 text-[14px] font-bold text-text-light dark:text-text-dark pr-2">{n.title}</Text>
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark">{timeAgo(n.created_at)}</Text>
                  </View>
                  <Text className="text-[13px] leading-5 text-muted-light dark:text-muted-dark">{n.body}</Text>
                </View>
              </View>
            </Glass>
            </Press>
          );
        })}
        {isError && items.length === 0 && (
          <EmptyState
            title="No pudimos cargar"
            text="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        )}
        {!isLoading && !isError && items.length === 0 && (
          <View className="items-center py-14" style={{ gap: 10 }}>
            <EmptyIllustration kind="avisos" />
            <Text className="text-[14px] font-semibold text-text-light dark:text-text-dark">Todo tranquilo por acá</Text>
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark text-center px-8">
              Te avisamos acá de tus códigos y Puntos por vencer, tu racha, retos y promociones de comercios cerca.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
