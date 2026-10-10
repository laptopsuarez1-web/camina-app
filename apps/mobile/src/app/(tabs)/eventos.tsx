import { View, Text, ScrollView, Image, Alert, ActivityIndicator, AccessibilityInfo, Platform } from 'react-native';
import { Press } from '@/components/ui/Press';
import { Calendar, Users, Flame, CheckCircle2, Gift, Trophy, Check, IconBubble } from '@/components/icons';
import { useRetos, useClaimReto, type Reto } from '@/hooks/useRetos';
import { usePromotions, useJoinPromotion, type PromotionItem } from '@/hooks/usePromotions';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmptyIllustration } from '@/components/ui/EmptyIllustration';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { celebrate } from '@/store/useCelebrationStore';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { friendlyServerError } from '@/lib/errors';

export default function EventosScreen() {
  const tabSpace = useTabBarSpace();
  const t = useThemeColors();
  const { data: retos } = useRetos();
  const claim = useClaimReto();
  const { data: promos, isLoading: promosLoading, isError: promosError, refetch: refetchPromos } = usePromotions();
  const join = useJoinPromotion();
  const hasPromos = (promos ?? []).length > 0;

  async function handleJoin(p: PromotionItem) {
    try {
      await join.mutateAsync(p.id);
      // iOS ignora accessibilityLiveRegion: se anuncia a mano que ya quedó anotado.
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Ya estás anotado');
      Alert.alert('¡Listo!', p.kind === 'sorteo' ? 'Ya estás anotado. Cumplí la meta y participás del sorteo.' : 'Ya estás anotado en el evento.');
    } catch (e) {
      Alert.alert('No pudimos anotarte', friendlyServerError(e, 'Intentá de nuevo.'));
    }
  }

  async function handleClaim(reto: Reto) {
    try {
      const points = await claim.mutateAsync(reto.id);
      celebrate({ kind: 'sheet', title: '¡Reto cumplido!', body: reto.title, points: Number(points) || reto.reward_points });
    } catch (e) {
      Alert.alert('No pudimos darte los puntos', friendlyServerError(e, 'Intentá de nuevo.'));
    }
  }

  return (
    <View className="flex-1">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <ScreenTitle>Eventos</ScreenTitle>
      <Text className="text-muted-light dark:text-muted-dark mb-4" style={typo.body}>
        Viví experiencias únicas con tus marcas favoritas
      </Text>
      {hasPromos && (
        <View className="gap-3 mb-7">
          {(promos ?? []).map((p) => (
            <Glass key={p.id} className="rounded-3xl p-4">
              <View className="flex-row items-start" style={{ gap: 12 }}>
                <IconBubble icon={p.won ? Trophy : p.kind === 'sorteo' ? Gift : Calendar} tone={p.won ? 'gold' : p.kind === 'sorteo' ? 'orange' : 'purple'} size={42} />
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-muted-light dark:text-muted-dark mb-0.5">
                    {p.business?.name ?? 'Comercio'} · {p.kind === 'sorteo' ? 'Sorteo' : 'Evento'}
                  </Text>
                  <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">{p.title}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-1 leading-relaxed">{p.description}</Text>
                  {p.prize ? (
                    <View accessible accessibilityLabel={`Premio: ${p.prize}`} className="flex-row items-center mt-1.5" style={{ gap: 5 }}>
                      <Gift size={14} color={t.purpleText} />
                      <Text importantForAccessibility="no" className="text-[12.5px] font-semibold text-text-light dark:text-text-dark shrink">{p.prize}</Text>
                    </View>
                  ) : null}
                  {p.req_steps ? (
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-1">
                      Para participar: {p.req_steps.toLocaleString('es-BO')} pasos por día durante {p.req_days} días.
                    </Text>
                  ) : null}
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-1">
                    Hasta el {new Date(p.ends_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}
                  </Text>
                </View>
              </View>
              {p.won ? (
                <View className="rounded-2xl py-3 items-center mt-3" style={{ backgroundColor: '#FFF3D1' }}>
                  <Text style={{ color: colors.goldInk, fontWeight: '800', fontSize: 13 }}>¡Ganaste! Te vamos a contactar</Text>
                </View>
              ) : p.joined ? (
                <View className="rounded-2xl py-3 items-center mt-3 bg-mint/15">
                  <View accessible accessibilityLiveRegion="polite" accessibilityLabel="Ya estás anotado" className="flex-row items-center" style={{ gap: 5 }}>
                    <Check size={14} color={t.accentText} />
                    <Text importantForAccessibility="no" className="text-mint-dark dark:text-mint font-bold text-[13px]">Ya estás anotado</Text>
                  </View>
                </View>
              ) : (
                <Press accessibilityRole="button" onPress={() => handleJoin(p)} disabled={join.isPending} className="bg-mint rounded-2xl py-3 items-center mt-3">
                  <Text className="text-mint-dark font-bold text-[13.5px]">{p.kind === 'sorteo' ? 'Participar del sorteo' : 'Anotarme'}</Text>
                </Press>
              )}
            </Glass>
          ))}
        </View>
      )}

      {promosError && !promos && (
        <View className="mb-8">
          <EmptyState
            title="No pudimos cargar"
            text="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetchPromos()}
          />
        </View>
      )}
      {!promosLoading && !promosError && !hasPromos && (
        <Glass className="rounded-3xl items-center mb-8" style={{ paddingVertical: 34, paddingHorizontal: 24 }}>
          <EmptyIllustration kind="eventos" />
          <Text className="font-extrabold text-[20px] text-text-light dark:text-text-dark text-center" style={{ marginTop: 12 }}>
            Todavía no hay eventos
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-[14px] text-center leading-5" style={{ marginTop: 6 }}>
            Cuando un comercio de tu ciudad publique uno, lo vas a ver acá.
          </Text>
        </Glass>
      )}
      <Text accessibilityRole="header" className="mb-1 text-text-light dark:text-text-dark" style={typo.section}>Retos Camina</Text>
      <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-4 leading-relaxed">
        Cumplí metas caminando y ganá Puntos extra.
      </Text>

      {(retos ?? []).length === 0 && (
        <Text className="text-[13px] text-muted-light dark:text-muted-dark">Todavía no hay retos activos.</Text>
      )}
      <View className="gap-3">
        {(retos ?? []).map((reto) => (
          <RetoCard
            key={reto.id}
            icon={
              reto.kind === 'referrals' ? (
                <IconBubble icon={Users} tone="purple" size={40} />
              ) : reto.kind === 'steps_streak' ? (
                <IconBubble icon={Flame} tone="orange" size={40} />
              ) : (
                <IconBubble icon={CheckCircle2} tone="aqua" size={40} />
              )
            }
            title={reto.title}
            description={reto.description}
            reward={reto.reward_points}
            pct={reto.pct}
            met={reto.met}
            target={reto.target}
            claimable={reto.claimable}
            claimed={reto.claimed}
            claiming={claim.isPending && claim.variables === reto.id}
            onClaim={() => handleClaim(reto)}
          />
        ))}
      </View>

      </ScrollView>
    </View>
  );
}

function RetoCard({
  icon,
  title,
  description,
  reward,
  pct,
  met,
  target,
  claimable,
  claimed,
  claiming,
  onClaim,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  reward: number;
  pct: number;
  met: number;
  target: number;
  claimable: boolean;
  claimed: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  return (
    <Glass className="rounded-3xl p-4">
      <View className="flex-row items-start gap-3 mb-3">
        {icon}
        <View className="flex-1">
          <Text className="font-bold text-[14px] text-text-light dark:text-text-dark">{title}</Text>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">
            {description}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 bg-mint/15 px-2.5 py-1 rounded-full">
          <Image accessible={false} source={require('@/../assets/camina-coin.png')} style={{ width: 13, height: 13, borderRadius: 6.5 }} />
          <Text className="text-mint-dark dark:text-mint text-[12px] font-bold">+{reward}</Text>
        </View>
      </View>
      <View className="h-1.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden mb-1.5">
        <View className="h-full bg-aqua rounded-full" style={{ width: `${pct}%` }} />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-muted-light dark:text-muted-dark">
          {claimed ? 'Ya lo cobraste' : `${met} de ${target}`}
        </Text>
        {claimable && (
          <Press accessibilityRole="button" hitSlop={{ top: 9, bottom: 9, left: 8, right: 8 }} onPress={onClaim} haptic="light" disabled={claiming} className="bg-mint rounded-full px-4 py-1.5">
            {claiming ? (
              <ActivityIndicator size="small" color="#1E8F6F" />
            ) : (
              <Text className="text-mint-dark text-[12px] font-bold">Reclamar +{reward}</Text>
            )}
          </Press>
        )}
      </View>
    </Glass>
  );
}
