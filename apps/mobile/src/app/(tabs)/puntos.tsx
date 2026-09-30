import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Share, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Share2, Users, Trophy, Flame, Activity, IconBubble } from '@/components/icons';
import { useStreak } from '@/hooks/useStreak';
import { useRetos } from '@/hooks/useRetos';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance, usePointsToday, usePointsExpiringSoon } from '@/hooks/usePoints';
import { referralLink } from '@/constants/sharing';
import { POINTS_PER_STEP_UNIT, DAILY_POINTS_CAP } from '@/constants/business-rules';
import { colors } from '@/theme/tokens';
import { dayLabel } from '@/lib/format';
import { Glass } from '@/components/ui/Glass';

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
        reason: 'steps',
        title: 'Actividad diaria',
        subtitle: `Hiciste ${s.steps.toLocaleString('es-BO')} pasos`,
        amount: Math.min(Math.floor(s.steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP),
      }));

      const REASON_LABEL: Record<string, string> = { referral: 'Invitaste a un amigo', challenge: 'Reto cumplido' };
      const ledgerRows = (ledger ?? []).map((l) => ({
        id: l.id,
        day: l.ref_day ?? l.earned_at.slice(0, 10),
        reason: l.reason as string,
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
  const { data: streak } = useStreak();
  const { data: retos } = useRetos();
  const retosListos = (retos ?? []).filter((r) => r.claimable).length;
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
      <View className="bg-auth-bg pt-14 pb-6 px-5" style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View className="flex-row items-center gap-3" style={{ marginBottom: 28 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Pressable>
          <Text className="text-white text-[17px] font-bold">Tus Puntos</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Image source={require('@/../assets/camina-coin.png')} style={{ width: 46, height: 46, borderRadius: 23 }} />
          <View>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 30 }}>{balance ?? 0}</Text>
            {(earnedToday ?? 0) > 0 && (
              <View className="bg-mint/15 px-2.5 py-0.5 rounded-full self-start mt-1.5">
                <Text className="text-mint font-semibold text-[11.5px]">Ganaste {earnedToday} Puntos hoy</Text>
              </View>
            )}
          </View>
        </View>

        {expiring && expiring.days <= 30 && (
          <Text className="text-auth-muted text-xs mt-3">
            {expiring.amount} puntos vencen en {expiring.days} día{expiring.days === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      <View className="flex-row gap-2.5 mx-5 mt-5">
        <Glass className="flex-1 flex-row items-center gap-2.5 rounded-2xl p-3">
          <IconBubble icon={Flame} tone="orange" size={34} />
          <View>
            <Text className="font-extrabold text-[15px] text-text-light dark:text-text-dark">{streak ?? 0}</Text>
            <Text className="text-[10.5px] text-muted-light dark:text-muted-dark">días de racha</Text>
          </View>
        </Glass>
        <Pressable
          onPress={() => router.push('/(tabs)/eventos')}
          className="flex-1 flex-row items-center gap-2.5 bg-card-light dark:bg-card-dark rounded-2xl p-3"
        >
          <IconBubble icon={Trophy} tone="gold" size={34} />
          <View>
            <Text className="font-extrabold text-[15px] text-text-light dark:text-text-dark">{retosListos}</Text>
            <Text className="text-[10.5px] text-muted-light dark:text-muted-dark">{retosListos === 1 ? 'reto listo' : 'retos listos'}</Text>
          </View>
        </Pressable>
      </View>

      <View className="bg-purple-light-light dark:bg-purple-light-dark mx-5 mt-3 rounded-2xl p-4">
        <View className="flex-row items-center gap-3 mb-2">
          <IconBubble icon={Users} tone="purple" size={40} />
          <Text className="flex-1 font-bold text-[14px] text-text-light dark:text-text-dark">
            Invitá a tus amigos y ganá 5 Puntos por cada uno
          </Text>
        </View>
        <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-3.5 leading-relaxed">
          Compartí tu link de invitación. Recibís 5 Puntos cuando tu amigo se registra y consigue su primer punto.
        </Text>
        <Pressable
          onPress={shareLink}
          className="bg-purple rounded-xl py-3 items-center flex-row justify-center gap-2"
        >
          <Share2 size={15} color="#fff" />
          <Text className="text-white font-bold text-[13px]">Compartir link</Text>
        </Pressable>
        <Pressable onPress={copyLink} className="items-center py-2.5">
          <Text className="text-aqua font-semibold text-[12.5px]">
            {copied ? 'Copiado ✓' : 'Copiar link'}
          </Text>
        </Pressable>
      </View>

      <Text className="font-bold text-base px-5 mt-6 mb-3 text-text-light dark:text-text-dark">Movimientos</Text>
      <View className="px-5 gap-2">
        {isLoading && <ActivityIndicator color={colors.aqua} />}
        {(movimientos ?? []).map((m) => (
          <Glass
            key={m.id}
            className="rounded-2xl p-3.5 flex-row items-center justify-between"
          >
            <View className="mr-3">
              {m.reason === 'referral' ? (
                <IconBubble icon={Users} tone="purple" size={36} />
              ) : m.reason === 'challenge' ? (
                <IconBubble icon={Trophy} tone="gold" size={36} />
              ) : (
                <IconBubble icon={Activity} tone="aqua" size={36} />
              )}
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark mb-0.5">
                {dayLabel(m.day)} · {m.title}
              </Text>
              {m.subtitle && (
                <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">{m.subtitle}</Text>
              )}
            </View>
            <View className="flex-row items-center rounded-full" style={{ gap: 5, backgroundColor: colors.aqua, paddingVertical: 3, paddingLeft: 3, paddingRight: 11 }}>
              <Image source={require('@/../assets/camina-coin.png')} style={{ width: 20, height: 20, borderRadius: 10 }} />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+{m.amount}</Text>
            </View>
          </Glass>
        ))}
        {!isLoading && (movimientos ?? []).length === 0 && (
          <Text className="text-muted-light dark:text-muted-dark text-[13px]">Todavía no hay movimientos.</Text>
        )}
      </View>
    </ScrollView>
  );
}
