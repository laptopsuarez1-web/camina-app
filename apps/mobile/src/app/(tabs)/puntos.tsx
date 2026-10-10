import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, ScrollView, Share, Image, AccessibilityInfo, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Share2, Users, Trophy, Flame, Activity, Gift, IconBubble } from '@/components/icons';
import { useStreak } from '@/hooks/useStreak';
import { useRetos } from '@/hooks/useRetos';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance, usePointsToday, usePointsExpiringSoon } from '@/hooks/usePoints';
import { referralLink } from '@/constants/sharing';
import { POINTS_PER_STEP_UNIT, DAILY_POINTS_CAP } from '@/constants/business-rules';
import { colors } from '@/theme/tokens';
import { dayLabel, localDay, plural } from '@/lib/format';
import { Glass } from '@/components/ui/Glass';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { DarkHeader } from '@/components/ui/DarkHeader';
import { CoinHalo } from '@/components/ui/CoinHalo';
import { typo } from '@/theme/type';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';

function useMovimientos() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['movimientos', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = localDay(since);

      const [{ data: steps, error: stepsError }, { data: ledger, error: ledgerError }] = await Promise.all([
        supabase
          .from('steps_daily')
          .select('day, steps')
          .eq('user_id', userId!)
          .gte('day', sinceISO)
          .order('day', { ascending: false }),
        supabase
          .from('points_ledger')
          .select('id, amount, reason, note, ref_day, earned_at')
          .eq('user_id', userId!)
          .neq('reason', 'steps')
          .order('earned_at', { ascending: false })
          .limit(40),
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

      // Categoría corta + detalle ("Ana se sumó", "Canje en Bloom", "Pusiste en «Gym bro»"...).
      const kindOf = (reason: string, note: string | null, amount: number) => {
        if (reason === 'referral') return 'Invitación';
        if (reason === 'redemption') return amount < 0 ? 'Canje' : 'Devolución';
        if (note?.startsWith('Reto:')) return 'Reto';
        return 'Desafío de grupo';
      };
      const ledgerRows = (ledger ?? []).map((l) => ({
        id: l.id,
        day: l.ref_day ?? localDay(new Date(l.earned_at)),
        reason: l.reason as string,
        title: kindOf(l.reason, l.note, l.amount),
        subtitle: (l.note ? l.note.replace(/^Reto: /, '') : null) as string | null,
        amount: l.amount,
      }));

      return [...stepRows, ...ledgerRows]
        .filter((r) => r.amount !== 0)
        .sort((a, b) => (a.day < b.day ? 1 : -1));
    },
  });
}

export default function PuntosScreen() {
  const tabSpace = useTabBarSpace();
  const profile = useAuthStore((s) => s.profile);
  const { data: balance, isError: balanceError } = usePointsBalance();
  const { data: earnedToday } = usePointsToday();
  const { data: expiring } = usePointsExpiringSoon();
  const { data: movimientos, isLoading, isError, refetch } = useMovimientos();
  const { data: streak } = useStreak();
  const { data: retos } = useRetos();
  const retosListos = (retos ?? []).filter((r) => r.claimable).length;
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => (profile ? referralLink(profile.id) : ''), [profile]);

  async function copyLink() {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    // iOS ignora accessibilityLiveRegion: el aviso de "copiado" se anuncia a mano.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Link copiado');
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
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <DarkHeader>
        <View className="flex-row items-center gap-3" style={{ marginBottom: 28 }}>
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Press>
          <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Tus Puntos</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <CoinHalo size={58}>
            <Image accessible={false} source={require('@/../assets/camina-coin.png')} style={{ width: 58, height: 58, borderRadius: 29 }} />
          </CoinHalo>
          <View>
            {balanceError && balance === undefined ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ ...typo.display, fontSize: 46, lineHeight: 50, color: '#fff' }}>—</Text>
            ) : (
              <AnimatedNumber id="puntos-saldo" value={balance ?? 0} ready={balance !== undefined} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ ...typo.display, fontSize: 46, lineHeight: 50, color: '#fff' }} />
            )}
            {(earnedToday ?? 0) > 0 && (
              <View className="bg-mint/15 px-2.5 py-0.5 rounded-full self-start mt-1.5">
                <Text className="text-mint font-semibold text-[12px]">Ganaste {earnedToday} {plural(earnedToday ?? 0, 'Punto', 'Puntos')} hoy</Text>
              </View>
            )}
          </View>
        </View>

        {expiring && expiring.days <= 30 && (
          <Text className="text-auth-muted text-xs mt-3">
            {expiring.amount} {plural(expiring.amount, 'Punto vence', 'Puntos vencen')} {expiring.days <= 0 ? 'hoy' : `en ${expiring.days} ${plural(expiring.days, 'día', 'días')}`}
          </Text>
        )}
      </DarkHeader>

      <View className="flex-row gap-3 mx-5 mt-4">
        <Glass className="flex-1 flex-row items-center gap-2.5 rounded-2xl p-3">
          <IconBubble icon={Flame} tone="orange" size={34} />
          <View>
            <Text className="font-extrabold text-[15px] text-text-light dark:text-text-dark">{streak ?? 0}</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">{streak === 1 ? 'día' : 'días'} de racha</Text>
          </View>
        </Glass>
        <Press
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/eventos')}
          className="flex-1 flex-row items-center gap-2.5 bg-card-light dark:bg-card-dark rounded-2xl p-3"
        >
          <IconBubble icon={Trophy} tone="gold" size={34} />
          <View>
            <Text className="font-extrabold text-[15px] text-text-light dark:text-text-dark">{retosListos}</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">{retosListos === 1 ? 'reto listo' : 'retos listos'}</Text>
          </View>
        </Press>
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
        <Press
          accessibilityRole="button"
          onPress={shareLink}
          haptic="light"
          className="bg-purple-deep rounded-xl py-3 items-center flex-row justify-center gap-2"
        >
          <Share2 size={15} color="#fff" />
          <Text className="text-white font-bold text-[13px]">Compartir link</Text>
        </Press>
        <Press accessibilityRole="button" onPress={copyLink} className="items-center py-2.5">
          <Text
            accessibilityLiveRegion="polite"
            accessibilityLabel={copied ? 'Link copiado' : 'Copiar link'}
            className="text-aqua-ink dark:text-aqua font-semibold text-[12.5px]"
          >
            {copied ? 'Copiado' : 'Copiar link'}
          </Text>
        </Press>
      </View>

      <Text accessibilityRole="header" className="px-5 mt-7 mb-3 text-text-light dark:text-text-dark" style={typo.section}>Movimientos</Text>
      <View className="px-5 gap-2">
        {isLoading && (
          <SkeletonGroup style={{ gap: 8 }}>
            {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </SkeletonGroup>
        )}
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
              ) : m.reason === 'redemption' ? (
                <IconBubble icon={Gift} tone="purple" size={36} />
              ) : (
                <IconBubble icon={Activity} tone="aqua" size={36} />
              )}
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-0.5">
                {dayLabel(m.day)} · {m.title}
              </Text>
              {m.subtitle && (
                <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">{m.subtitle}</Text>
              )}
            </View>
            <View className="flex-row items-center rounded-full" style={{ gap: 5, backgroundColor: m.amount < 0 ? '#E8836F' : colors.aquaDeep, paddingVertical: 3, paddingLeft: 3, paddingRight: 11 }}>
              <Image accessible={false} source={require('@/../assets/camina-coin.png')} style={{ width: 20, height: 20, borderRadius: 10 }} />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{m.amount > 0 ? '+' : '−'}{Math.abs(m.amount)}</Text>
            </View>
          </Glass>
        ))}
        {isError && !movimientos && (
          <EmptyState
            title="No pudimos cargar"
            text="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        )}
        {!isLoading && !isError && (movimientos ?? []).length === 0 && (
          <EmptyState
            illustration="puntos"
            title="Tus puntos van a aparecer acá"
            text="Cada 1.000 pasos que camines sumás un punto, siempre que abras la app ese día. También ganás por retos, invitando amigos y desafíos de grupo."
          />
        )}
      </View>
    </ScrollView>
  );
}
