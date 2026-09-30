import { View, Text, ScrollView, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Calendar, Users, Flame, CheckCircle2, IconBubble } from '@/components/icons';
import { useRetos, useClaimReto, type Reto } from '@/hooks/useRetos';
import { HeaderLight } from '@/components/ui/HeaderLight';

export default function EventosScreen() {
  const { data: retos } = useRetos();
  const claim = useClaimReto();

  async function handleClaim(reto: Reto) {
    try {
      const points = await claim.mutateAsync(reto.id);
      Alert.alert('¡Reto cumplido! 🎉', `Ganaste ${points} Puntos.`);
    } catch (e) {
      Alert.alert('No pudimos darte los puntos', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3 pb-10">
      <Text className="text-[21px] font-extrabold mb-0.5 text-text-light dark:text-text-dark">
        Eventos
      </Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-5">
        Viví experiencias únicas con tus marcas favoritas
      </Text>
      <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md py-7 px-6 items-center mb-7">
        <View className="mb-3.5">
          <IconBubble icon={Calendar} tone="purple" size={58} />
        </View>
        <Text className="font-bold text-[15px] mb-1.5 text-text-light dark:text-text-dark">
          Sin eventos de comercios próximos
        </Text>
        <Text className="text-muted-light dark:text-muted-dark text-xs text-center leading-5">
          Estamos armando alianzas con comercios de tu zona. Volvé pronto.
        </Text>
      </View>

      <Text className="font-bold text-[17px] mb-1 text-text-light dark:text-text-dark">Retos Camina</Text>
      <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-4 leading-relaxed">
        Mientras se suman comercios con eventos propios, estos son nuestros.
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
    <View className="bg-card-light dark:bg-card-dark rounded-3xl p-4">
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
          <Text className="text-mint-dark dark:text-mint text-[11px] font-bold">+{reward}</Text>
        </View>
      </View>
      <View className="h-1.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden mb-1.5">
        <View className="h-full bg-aqua rounded-full" style={{ width: `${pct}%` }} />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-muted-light dark:text-muted-dark">
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
    </View>
  );
}
