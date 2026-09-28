import { View, Text, ScrollView, Image } from 'react-native';
import { Calendar, Users, Flame, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { useWeeklyGoalReto, useTenKStreakReto, useReferralReto } from '@/hooks/useRetos';
import { RETO_REWARD_WEEKLY_GOAL, RETO_REWARD_TENK_STREAK, RETO_REWARD_REFERRAL } from '@/constants/business-rules';

export default function EventosScreen() {
  const { data: metaReto } = useWeeklyGoalReto();
  const { data: tenkReto } = useTenKStreakReto();
  const { data: referralReto } = useReferralReto();

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14 pb-10">
      <Text className="text-[21px] font-extrabold mb-0.5 text-text-light dark:text-text-dark">
        Eventos
      </Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-5">
        Viví experiencias únicas con tus marcas favoritas
      </Text>
      <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md py-7 px-6 items-center mb-7">
        <View className="w-14 h-14 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center mb-3.5">
          <Calendar size={24} color={colors.purple} />
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
        <RetoCard
          icon={<Users size={18} color={colors.purple} />}
          title="Invitá 5 amigos"
          description="Sumá 5 amigos nuevos a Camina y ganá Puntos extra."
          reward={RETO_REWARD_REFERRAL}
          pct={referralReto?.pct ?? 0}
        />
        <RetoCard
          icon={<Flame size={18} color={colors.aqua} />}
          title="10.000 pasos x 14 días"
          description="Caminá 10.000 pasos por día durante 14 días seguidos."
          reward={RETO_REWARD_TENK_STREAK}
          pct={tenkReto?.pct ?? 0}
        />
        <RetoCard
          icon={<CheckCircle2 size={18} color={colors.mintDark} />}
          title="5 metas esta semana"
          description="Cumplí tu meta diaria 5 veces en la misma semana."
          reward={RETO_REWARD_WEEKLY_GOAL}
          pct={metaReto?.pct ?? 0}
        />
      </View>
    </ScrollView>
  );
}

function RetoCard({
  icon,
  title,
  description,
  reward,
  pct,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  reward: number;
  pct: number;
}) {
  return (
    <View className="bg-card-light dark:bg-card-dark rounded-3xl p-4">
      <View className="flex-row items-start gap-3 mb-3">
        <View className="w-10 h-10 rounded-full bg-bg-light dark:bg-bg-dark items-center justify-center">
          {icon}
        </View>
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
      <Text className="text-[11px] text-muted-light dark:text-muted-dark">{pct}% completado</Text>
    </View>
  );
}
