import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Share, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance, usePointsToday, usePointsExpiringSoon } from '@/hooks/usePoints';
import { referralLink } from '@/constants/sharing';
import { POINTS_PER_STEP_UNIT, DAILY_POINTS_CAP } from '@/constants/business-rules';
import { colors } from '@/theme/tokens';
import { dayLabel } from '@/lib/format';

function useMovimientos() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['movimientos', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString().slice(0, 10);

      const [{ data: steps, error: stepsError }, { data: ledger, error: ledgerError }] = await Promise.all([
        supabase
          .from('steps_daily')
          .select('day, steps')
          .eq('user_id', userId!)
          .gte('day', sinceISO)
          .order('day', { ascending: false }),
        supabase
          .from('points_ledger')
          .select('id, amount, reason, ref_day, earned_at')
          .eq('user_id', userId!)
          .neq('reason', 'steps')
          .gt('amount', 0)
          .order('earned_at', { ascending: false })
          .limit(20),
      ]);
      if (stepsError) throw stepsError;
      if (ledgerError) throw ledgerError;

      const stepRows = (steps ?? []).map((s) => ({
        id: `steps-${s.day}`,
        day: s.day,
        title: 'Actividad diaria',
        subtitle: `Hiciste ${s.steps.toLocaleString('es-BO')} pasos`,
        amount: Math.min(Math.floor(s.steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP),
      }));

      const REASON_LABEL: Record<string, string> = { referral: 'Invitaste a un amigo', challenge: 'Reto cumplido' };
      const ledgerRows = (ledger ?? []).map((l) => ({
        id: l.id,
        day: l.ref_day ?? l.earned_at.slice(0, 10),
        title: REASON_LABEL[l.reason] ?? l.reason,
        subtitle: null as string | null,
        amount: l.amount,
      }));

      return [...stepRows, ...ledgerRows]
        .filter((r) => r.amount > 0)
        .sort((a, b) => (a.day < b.day ? 1 : -1));
    },
  });
}

export default function PuntosScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: balance } = usePointsBalance();
  const { data: earnedToday } = usePointsToday();
  const { data: expiring } = usePointsExpiringSoon();
  const { data: movimientos, isLoading } = useMovimientos();
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => (profile ? referralLink(profile.id) : ''), [profile]);

  async function copyLink() {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!link) return;
    await Share.share({
      message: `Te invito a Camina — caminá y ganá Puntos para canjear en comercios adheridos. Sumate con mi link:\n${link}`,
      url: link,
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="pb-10">
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.light.text} />
        </Pressable>
        <Text className="text-[19px] font-extrabold text-text-light dark:text-text-dark">Tus Puntos</Text>
      </View>

      <View className="px-5 mt-4">
        <View className="flex-row items-center gap-3.5">
          <View className="w-14 h-14 rounded-full bg-mint items-center justify-center">
            <Text className="text-mint-dark font-extrabold text-lg">{balance ?? 0}</Text>
          </View>
          <View>
            <Text className="text-[26px] font-extrabold text-text-light dark:text-text-dark">{balance ?? 0}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mt-3">
          {(earnedToday ?? 0) > 0 && (
            <View className="bg-mint/15 px-3 py-1.5 rounded-full">
              <Text className="text-mint-dark dark:text-mint font-bold text-[12px]">Ganaste {earnedToday} Puntos hoy</Text>
            </View>
          )}
        </View>
        {expiring && expiring.days <= 30 && (
          <Text className="text-warn text-[12.5px] mt-2.5">
            {expiring.amount} puntos vencen en {expiring.days} día{expiring.days === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      <View className="bg-card-light dark:bg-card-dark mx-5 mt-6 rounded-3xl p-4.5">
        <Text className="font-bold text-[15px] text-text-light dark:text-text-dark mb-1">
          Invitá a tus amigos y ganá 5 Puntos por cada uno
        </Text>
        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mb-4 leading-relaxed">
          Compartí tu link de invitación. Recibís 5 Puntos cuando tu amigo se registra y consigue su primer punto.
        </Text>
        <Pressable
          onPress={shareLink}
          className="bg-purple rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
        >
          <Share2 size={15} color="#fff" />
          <Text className="text-white font-bold text-[14px]">Compartir link</Text>
        </Pressable>
        <Pressable onPress={copyLink} className="items-center py-3">
          <Text className="text-aqua font-semibold text-[12.5px]">
            {copied ? 'Copiado ✓' : 'Copiar link'}
          </Text>
        </Pressable>
      </View>

      <Text className="font-bold text-base px-5 mt-6 mb-2.5 text-text-light dark:text-text-dark">Movimientos</Text>
      <View className="px-5 gap-2.5">
        {isLoading && <ActivityIndicator color={colors.aqua} />}
        {(movimientos ?? []).map((m) => (
          <View
            key={m.id}
            className="bg-card-light dark:bg-card-dark rounded-2xl p-3.5 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark mb-0.5">
                {dayLabel(m.day)} · {m.title}
              </Text>
              {m.subtitle && (
                <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">{m.subtitle}</Text>
              )}
            </View>
            <View className="bg-mint/15 rounded-full px-2.5 py-1">
              <Text className="text-mint-dark dark:text-mint font-bold text-[12px]">+{m.amount}</Text>
            </View>
          </View>
        ))}
        {!isLoading && (movimientos ?? []).length === 0 && (
          <Text className="text-muted-light dark:text-muted-dark text-[13px]">Todavía no hay movimientos.</Text>
        )}
      </View>
    </ScrollView>
  );
}
