import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Users } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps } from '@/hooks/usePedometer';
import { usePointsBalance, useSyncSteps } from '@/hooks/usePoints';
import { useBenefits } from '@/hooks/useBenefits';
import { useGroups } from '@/hooks/useGroups';
import { useStreak } from '@/hooks/useStreak';
import { useWeeklyGoalReto } from '@/hooks/useRetos';
import { useMyGroupRanking } from '@/hooks/useGroupRanking';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { colors } from '@/theme/tokens';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';
import { Flame, Trophy, ChevronRight, Activity } from 'lucide-react-native';

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
  const userId = useAuthStore((s) => s.session?.user.id);
  const { steps, available } = useTodaySteps();
  const { data: balance } = usePointsBalance();
  const { data: benefits } = useBenefits();
  const { data: groups } = useGroups();
  const { data: streak } = useStreak();
  const { data: reto } = useWeeklyGoalReto();
  const { data: groupRanking } = useMyGroupRanking();
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
  const goalMet = steps >= goal;
  const pointsToday = Math.min(Math.floor(steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP);
  const nearby = (benefits ?? []).slice(0, 2);
  const myGroup = (groups ?? []).find((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));

  const metaPct = Math.min(100, Math.round(pct * 100));

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark">
      <LinearGradient
        colors={['#3a2668', '#1c1030', '#120a1e']}
        start={{ x: 0.15, y: -0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={{ borderRadius: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingBottom: 22, overflow: 'hidden' }}
      >
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(127,237,196,0.14)', top: -60, right: -50 }} />

        <View className="flex-row justify-between items-center px-5 pt-4">
          <Pressable
            onPress={() => router.push('/(tabs)/perfil')}
            className="flex-row items-center gap-1.5 bg-white/10 rounded-full pl-1.5 pr-3 py-1.5"
          >
            <Image source={require('@/../assets/camina-coin.png')} style={{ width: 18, height: 18, borderRadius: 9 }} />
            <Text className="text-white font-semibold text-[13px]">{balance ?? 0}</Text>
          </Pressable>
          <Text className="text-mint font-extrabold text-xl tracking-tight">CAMINA</Text>
          <View className="flex-row items-center gap-2.5">
            <View className="bg-white/10 w-8 h-8 rounded-full items-center justify-center">
              <Bell size={15} color="#C4B8E8" />
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/perfil')}
              className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
            >
              {profile?.photo_url ? (
                <Image source={{ uri: profile.photo_url }} className="w-full h-full" />
              ) : (
                <Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>
              )}
            </Pressable>
          </View>
        </View>

        <Text className="text-auth-muted px-5 pt-3.5 font-semibold text-[13.5px]">
          {greeting(profile?.full_name ?? '')}
        </Text>

        <View className="items-center justify-center mt-2.5">
          <ProgressRing size={222} strokeWidth={22} progress={pct}>
            <View className="items-center">
              <Text className="text-white text-[42px] font-extrabold tracking-tight">{steps}</Text>
              <Text className="text-auth-muted text-xs mt-1">de {goal} pasos</Text>
              <View className="flex-row items-center gap-1 mt-2.5 bg-mint/15 px-3 py-1 rounded-full">
                <Text className="text-mint text-xs font-bold">+{pointsToday} Puntos hoy</Text>
              </View>
            </View>
          </ProgressRing>
        </View>

        <View className="flex-row justify-center gap-2 mt-1.5 flex-wrap">
          {(streak ?? 0) > 0 && (
            <View className="bg-mint/10 px-2.5 py-1.5 rounded-full">
              <Text className="text-mint text-[11px] font-bold">🔥 {streak} días de racha</Text>
            </View>
          )}
          {goalMet && (
            <View className="bg-mint/10 px-2.5 py-1.5 rounded-full">
              <Text className="text-mint text-[11px] font-bold">Meta cumplida</Text>
            </View>
          )}
        </View>

        {available === false && (
          <Text className="text-auth-muted text-center text-[11px] mt-3 px-8">
            Este dispositivo no tiene podómetro disponible.
          </Text>
        )}
      </LinearGradient>

      <View className="pt-5 pb-2">
        <Text className="font-bold text-base text-text-light dark:text-text-dark px-5 mb-3">Para vos</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 gap-3">
          {nearby.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push('/(tabs)/canjes')}
              className="bg-card-light dark:bg-card-dark rounded-3xl p-3.5"
              style={{ width: 158, shadowColor: '#291C47', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3 }}
            >
              <View className="w-10 h-10 rounded-2xl bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center mb-2.5">
                <Text className="text-aqua font-bold">{b.business.name[0]}</Text>
              </View>
              <Text className="text-[13px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>
                {b.business.name}
              </Text>
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark mt-0.5 mb-2.5" numberOfLines={1}>
                {b.name}
              </Text>
              <View className="self-start bg-aqua rounded-full px-2.5 py-1">
                <Text className="text-white text-[11px] font-bold">{b.cost_points} Pts</Text>
              </View>
            </Pressable>
          ))}

          {myGroup && (
            <Pressable
              onPress={() => router.push('/(tabs)/grupos')}
              className="bg-auth-bg rounded-3xl p-3.5"
              style={{ width: 158, shadowColor: '#291C47', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3 }}
            >
              <View className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center mb-2.5">
                <Users size={18} color={colors.mint} />
              </View>
              <Text className="text-[13px] font-bold text-white" numberOfLines={1}>
                {myGroup.name}
              </Text>
              <Text className="text-[11.5px] text-auth-muted mt-0.5">
                {myGroup.group_members.length} miembro{myGroup.group_members.length === 1 ? '' : 's'}
              </Text>
            </Pressable>
          )}

          {nearby.length === 0 && !myGroup && (
            <Pressable
              onPress={() => router.push('/(tabs)/canjes')}
              className="bg-card-light dark:bg-card-dark rounded-3xl p-4 items-start justify-center"
              style={{ width: 220 }}
            >
              <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-1">Explorá beneficios</Text>
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark">Todavía no hay nada cerca — mirá qué se puede canjear.</Text>
            </Pressable>
          )}
        </ScrollView>

        {reto && (
          <Pressable
            onPress={() => router.push('/(tabs)/eventos')}
            className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mx-5 mt-4"
            style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
          >
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
                  <Flame size={15} color={colors.aqua} />
                </View>
                <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark">
                  {reto.met}/{reto.target} metas esta semana
                </Text>
              </View>
              <Text className="text-xs text-muted-light dark:text-muted-dark">{reto.pct}%</Text>
            </View>
            <View className="h-1.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
              <View className="h-full bg-aqua rounded-full" style={{ width: `${reto.pct}%` }} />
            </View>
          </Pressable>
        )}

        <View className="bg-card-light dark:bg-card-dark rounded-3xl mx-5 mt-4 overflow-hidden" style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
          <Pressable
            onPress={() => router.push('/(tabs)/grupos')}
            className="flex-row items-center justify-between p-4 border-b border-line-light dark:border-line-dark"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Trophy size={15} color={colors.purple} />
              </View>
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">
                {groupRanking ? `Ranking · ${groupRanking.group.name}` : 'Ranking semanal'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-muted-light dark:text-muted-dark">
                {groupRanking?.myPosition ? `Vas ${groupRanking.myPosition}°` : 'Unite a un grupo'}
              </Text>
              <ChevronRight size={14} color={colors.light.muted} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/grupos')} className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Users size={15} color={colors.purple} />
              </View>
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">Tus grupos</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-muted-light dark:text-muted-dark">{myGroup ? '1 activo' : 'Ninguno'}</Text>
              <ChevronRight size={14} color={colors.light.muted} />
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/actividad')}
          className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mx-5 mt-4 flex-row items-center justify-between"
          style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-xl bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
              <Activity size={15} color={colors.aqua} />
            </View>
            <View>
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">Ver toda tu actividad</Text>
              <Text className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">Gráfico, calendario e historial</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.light.muted} />
        </Pressable>

        <View className="flex-row gap-2.5 px-5 mt-5">
          <View className="flex-1 bg-card-light dark:bg-card-dark rounded-2xl py-3.5 items-center" style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Text className="text-xl font-extrabold text-text-light dark:text-text-dark">{balance ?? 0}</Text>
            <Text className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">Puntos</Text>
          </View>
          <View className="flex-1 bg-card-light dark:bg-card-dark rounded-2xl py-3.5 items-center" style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Text className="text-xl font-extrabold text-text-light dark:text-text-dark">{metaPct}%</Text>
            <Text className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">Meta de hoy</Text>
          </View>
          <View className="flex-1 bg-card-light dark:bg-card-dark rounded-2xl py-3.5 items-center" style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Text className="text-xl font-extrabold text-text-light dark:text-text-dark">{streak ?? 0}</Text>
            <Text className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">Racha</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
