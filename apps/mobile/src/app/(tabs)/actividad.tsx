import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps } from '@/hooks/usePedometer';
import { colors } from '@/theme/tokens';

function useStepsHistory() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['steps-history', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data, error } = await supabase
        .from('steps_daily')
        .select('*')
        .eq('user_id', userId!)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export default function ActividadScreen() {
  const { steps } = useTodaySteps();
  const { data: history, isLoading } = useStepsHistory();
  const profile = useAuthStore((s) => s.profile);
  const goal = profile?.daily_goal ?? 6000;
  const max = Math.max(steps, goal, ...((history ?? []).map((h) => h.steps)), 1);

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14">
      <Text className="text-[21px] font-extrabold mb-4 text-text-light dark:text-text-dark">
        Actividad
      </Text>

      <View className="bg-auth-bg rounded-2xl p-4.5 mb-4">
        <Text className="text-auth-muted text-xs mb-1.5">Hoy</Text>
        <Text className="text-white text-3xl font-bold">{steps}</Text>
        <Text className="text-auth-muted text-xs mt-1">pasos · meta {goal}</Text>
      </View>

      <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">
        Últimos días
      </Text>

      {isLoading && <ActivityIndicator color={colors.aqua} />}

      <View className="flex-row items-end gap-2 h-[90px] mb-2">
        {(history ?? []).map((h) => (
          <View key={h.day} className="flex-1 items-center gap-1">
            <View
              className="w-full rounded-md bg-aqua"
              style={{ height: Math.max(4, (h.steps / max) * 70) }}
            />
            <Text className="text-[10px] text-muted-light dark:text-muted-dark">
              {new Date(h.day).getDate()}
            </Text>
          </View>
        ))}
        {!isLoading && (history ?? []).length === 0 && (
          <Text className="text-muted-light dark:text-muted-dark text-[13px]">
            Todavía no hay historial — sincronizá pasos desde Inicio.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
