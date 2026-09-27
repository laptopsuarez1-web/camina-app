import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps } from '@/hooks/usePedometer';
import { usePointsBalance, useSyncSteps } from '@/hooks/usePoints';
import { useBenefits } from '@/hooks/useBenefits';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';

function greeting(name: string) {
  const h = new Date().getHours();
  const label = name || 'caminante';
  if (h < 6) return `¿Todavía despierto, ${label}?`;
  if (h < 12) return `Buen día, ${label}`;
  if (h < 19) return `Buenas tardes, ${label}`;
  return `Buenas noches, ${label}`;
}

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { steps, available } = useTodaySteps();
  const { data: balance } = usePointsBalance();
  const { data: benefits } = useBenefits();
  const syncSteps = useSyncSteps();
  const lastSynced = useRef(0);

  useEffect(() => {
    if (steps > 0 && steps !== lastSynced.current) {
      lastSynced.current = steps;
      syncSteps.mutate(steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const goal = profile?.daily_goal ?? 6000;
  const pct = goal > 0 ? steps / goal : 0;
  const pointsToday = Math.min(Math.floor(steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP);
  const nearby = (benefits ?? []).slice(0, 3);

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark">
      <View className="bg-auth-bg rounded-b-[32px] pb-5">
        <View className="flex-row justify-between items-center px-5 pt-4">
          <View className="flex-row items-center gap-1.5 bg-white/10 rounded-full pl-1.5 pr-3 py-1.5">
            <Image source={require('@/../assets/camina-coin.png')} style={{ width: 18, height: 18, borderRadius: 9 }} />
            <Text className="text-white font-semibold text-[13px]">{balance ?? 0}</Text>
          </View>
          <Text className="text-mint font-extrabold text-xl tracking-tight">CAMINA</Text>
          <View className="flex-row items-center gap-2.5">
            <Pressable className="bg-white/10 w-8 h-8 rounded-full items-center justify-center">
              <Bell size={16} color="#C4B8E8" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/perfil')}
              className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
            >
              {profile?.photo_url ? (
                <Image source={{ uri: profile.photo_url }} className="w-full h-full" />
              ) : (
                <Text className="text-mint-dark font-bold">
                  {(profile?.full_name || 'C')[0]?.toUpperCase()}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <Text className="text-auth-muted px-5 pt-4 font-semibold text-sm">
          {greeting(profile?.full_name ?? '')}
        </Text>

        <View className="items-center justify-center mt-4">
          <ProgressRing size={250} strokeWidth={26} progress={pct}>
            <View className="items-center">
              <Text className="text-white text-5xl font-extrabold tracking-tight">{steps}</Text>
              <Text className="text-auth-muted text-[13px] mt-1">pasos hoy</Text>
              <View className="flex-row items-center gap-1 mt-2.5 bg-mint/15 px-3 py-1 rounded-full">
                <Text className="text-mint text-xs font-bold">+{pointsToday} Puntos</Text>
              </View>
            </View>
          </ProgressRing>
        </View>

        {available === false && (
          <Text className="text-auth-muted text-center text-xs mt-3 px-6">
            Este dispositivo no tiene podómetro disponible — conectá HealthKit/Google Fit para un
            conteo más preciso.
          </Text>
        )}
      </View>

      <View className="px-5 pt-4">
        <View className="flex-row justify-between items-center mb-2.5">
          <Text className="font-bold text-base text-text-light dark:text-text-dark">
            Beneficios cerca tuyo
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/canjes')}>
            <Text className="text-aqua text-xs">Ver todo</Text>
          </Pressable>
        </View>

        <View className="gap-2.5 mb-4">
          {nearby.length === 0 && (
            <Text className="text-muted-light dark:text-muted-dark text-[13px] py-2">
              Todavía no hay comercios cargados.
            </Text>
          )}
          {nearby.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push('/(tabs)/canjes')}
              className="flex-row items-center gap-3 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-3.5"
            >
              <View className="w-14 h-14 rounded-2xl bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
                <Text className="text-aqua font-bold">{b.business.name[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-sm text-text-light dark:text-text-dark">
                  {b.business.name}
                </Text>
                <Text className="text-muted-light dark:text-muted-dark text-xs mt-0.5">{b.name}</Text>
              </View>
              <View className="bg-aqua rounded-full px-2.5 py-1">
                <Text className="text-white text-xs font-bold">{b.cost_points}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
