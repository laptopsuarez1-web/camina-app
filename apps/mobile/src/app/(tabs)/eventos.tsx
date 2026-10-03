import { View, Text, ScrollView, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Calendar, Users, Flame, CheckCircle2, Gift, Trophy, IconBubble } from '@/components/icons';
import { useRetos, useClaimReto, type Reto } from '@/hooks/useRetos';
import { usePromotions, useJoinPromotion, type PromotionItem } from '@/hooks/usePromotions';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { celebrate } from '@/store/useCelebrationStore';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';

export default function EventosScreen() {
  const tabSpace = useTabBarSpace();
  const { data: retos } = useRetos();
  const claim = useClaimReto();
  const { data: promos } = usePromotions();
  const join = useJoinPromotion();
  const hasPromos = (promos ?? []).length > 0;

  async function handleJoin(p: PromotionItem) {
    try {
      await join.mutateAsync(p.id);
      Alert.alert('¡Listo!', p.kind === 'sorteo' ? 'Ya estás anotado. Cumplí la meta y participás del sorteo.' : 'Ya estás anotado en el evento.');
    } catch (e) {
      Alert.alert('No pudimos anotarte', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  }

  async function handleClaim(reto: Reto) {
    try {
      const points = await claim.mutateAsync(reto.id);
      celebrate({ kind: 'sheet', title: '¡Reto cumplido!', body: reto.title, points: Number(points) || reto.reward_points });
    } catch (e) {
      Alert.alert('No pudimos darte los puntos', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <Text className="text-[21px] font-extrabold mb-0.5 text-text-light dark:text-text-dark">
        Eventos
      </Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-5">
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
                  {p.prize ? <Text className="text-[12.5px] font-semibold mt-1.5 text-text-light dark:text-text-dark">🎁 {p.prize}</Text> : null}
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
                  <Text style={{ color: '#9A6A08', fontWeight: '800', fontSize: 13 }}>¡Ganaste! Te vamos a contactar</Text>
                </View>
              ) : p.joined ? (
                <View className="rounded-2xl py-3 items-center mt-3 bg-mint/15">
                  <Text className="text-mint-dark dark:text-mint font-bold text-[13px]">Ya estás anotado ✓</Text>
                </View>
              ) : (
                <Pressable onPress={() => handleJoin(p)} disabled={join.isPending} className="bg-mint rounded-2xl py-3 items-center mt-3">
                  <Text className="text-mint-dark font-bold text-[13.5px]">{p.kind === 'sorteo' ? 'Participar del sorteo' : 'Anotarme'}</Text>
                </Pressable>
              )}
            </Glass>
          ))}
        </View>
      )}

      {!hasPromos && (
        <Glass className="flex-row items-center rounded-2xl p-4 mb-7" style={{ gap: 12 }}>
          <IconBubble icon={Calendar} tone="purple" size={40} />
          <View className="flex-1">
            <Text className="font-bold text-[14px] text-text-light dark:text-text-dark">Todavía no hay eventos</Text>
            <Text className="text-muted-light dark:text-muted-dark text-xs mt-0.5 leading-5">
              Cuando un comercio de tu ciudad publique uno, lo vas a ver acá.
            </Text>
          </View>
        </Glass>
      )}
      <Text className="font-bold text-[17px] mb-1 text-text-light dark:text-text-dark">Retos Camina</Text>
      <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-4 leading-relaxed">
        Cumplí metas caminando y ganá Puntos extra.
      </Text>

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
          <Image source={require('@/../assets/camina-coin.png')} style={{ width: 13, height: 13, borderRadius: 6.5 }} />
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
          <Pressable onPress={onClaim} disabled={claiming} className="bg-mint rounded-full px-4 py-1.5">
            {claiming ? (
              <ActivityIndicator size="small" color="#1E8F6F" />
            ) : (
              <Text className="text-mint-dark text-[12px] font-bold">Reclamar +{reward}</Text>
            )}
          </Pressable>
        )}
      </View>
    </Glass>
  );
}
