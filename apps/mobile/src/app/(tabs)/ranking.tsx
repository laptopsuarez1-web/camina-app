import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ActionSheet } from '@/components/ActionSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { PersonAvatar } from '@/components/friends/PersonAvatar';
import { ChevronLeft, Sliders } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { useGlobalRanking, useCommunityAverage, useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { useFriendsRanking } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { plural } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

type Row = { id: string; name: string; photoUrl: string | null; steps: number; sub?: string; position: number; me: boolean };

function RankingRow({ r, last }: { r: Row; last: boolean }) {
  const { line, accentText } = useThemeColors();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`Puesto ${r.position}: ${r.name}${r.me ? ' (tú)' : ''}, ${r.steps.toLocaleString('es-BO')} ${plural(r.steps, 'paso', 'pasos')}. Ver perfil`}
      onPress={() => router.push({ pathname: '/(tabs)/amigos/[userId]', params: { userId: r.id } })}
      feedback="row"
      className="flex-row items-center p-3.5"
      style={{ gap: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: line }}
    >
      <Text className="w-6 text-center text-[13px] font-semibold text-muted-light dark:text-muted-dark">{r.position}</Text>
      <PersonAvatar name={r.name} photoUrl={r.photoUrl} size={40} />
      <View className="flex-1">
        <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{r.me ? `${r.name} (tú)` : r.name}</Text>
        {r.sub ? <Text className="text-[12.5px] text-muted-light dark:text-muted-dark" numberOfLines={1}>{r.sub}</Text> : null}
      </View>
      <View className="items-end">
        <Text style={{ fontSize: 15, fontWeight: '800', color: accentText, fontVariant: ['tabular-nums'] }}>{r.steps.toLocaleString('es-BO')}</Text>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark">{plural(r.steps, 'paso', 'pasos')}</Text>
      </View>
    </Press>
  );
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { dark, text, accentIcon } = useThemeColors();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'global' | 'amigos'>(params.view === 'amigos' ? 'amigos' : 'global');
  const [options, setOptions] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: global, isLoading: globalLoading, isError: globalError, refetch: refetchGlobal } = useGlobalRanking();
  const { data: myRank } = useMyWeeklyRank();
  const { data: average } = useCommunityAverage();
  const { data: friends, isLoading: friendsLoading, isError: friendsError, refetch: refetchFriends } = useFriendsRanking();

  const visible = profile?.ranking_visible !== false;

  async function toggleVisible() {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ ranking_visible: !visible }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  const globalRows: Row[] = (global ?? []).map((r: { user_id: string; full_name: string; photo_url: string | null; total_steps: number }, i: number) => ({
    id: r.user_id, name: r.full_name || 'Caminante', photoUrl: r.photo_url, steps: Number(r.total_steps), position: i + 1, me: r.user_id === userId,
  }));
  const meInTop = globalRows.some((r) => r.me);
  const myExtra: Row | null = !meInTop && myRank && userId
    ? { id: userId, name: profile?.full_name ?? 'Tú', photoUrl: profile?.photo_url ?? null, steps: myRank.steps, position: myRank.position, me: true }
    : null;

  const friendRows: Row[] = (friends ?? []).map((r, i) => ({
    id: r.user_id, name: r.full_name || 'Caminante', photoUrl: r.photo_url, steps: r.total_steps, position: i + 1, me: r.is_me,
    sub: r.streak > 0 ? `Racha de ${r.streak} ${r.streak === 1 ? 'día' : 'días'}` : undefined,
  }));

  const chip = (key: 'global' | 'amigos', label: string) => (
    <Press
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: view === key }}
      aria-pressed={view === key}
      haptic="selection"
      onPress={() => setView(key)}
      className="rounded-full px-[18px] py-2.5"
      style={{ backgroundColor: view === key ? colors.aquaDeep : dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: view === key ? colors.aquaDeep : dark ? colors.dark.line : colors.light.line }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: view === key ? '#fff' : text }}>{label}</Text>
    </Press>
  );

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace }}>
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Ranking</Text>
          <View style={{ width: 40 }} />
        </View>

        <View className="flex-row items-center justify-between mb-3.5">
          <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2} style={[typo.title, { color: text, flexShrink: 1 }]}>Ranking semanal</Text>
          <Press accessibilityRole="button" accessibilityLabel="Opciones del ranking" onPress={() => setOptions(true)} className="flex-row items-center rounded-full px-3.5 py-2 ml-2" style={{ gap: 6, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: dark ? colors.dark.line : colors.light.line }}>
            <Sliders size={14} color={text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>Opciones</Text>
          </Press>
        </View>

        <View className="flex-row mb-4" style={{ gap: 8 }}>
          {chip('global', 'Global')}
          {chip('amigos', 'Amigos')}
        </View>

        {view === 'global' ? (
          <>
            {average != null && average > 0 && (
              <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-4">
                <Text className="text-[13px] text-text-light dark:text-text-dark">
                  La comunidad de Camina camina en promedio{' '}
                  <Text className="font-bold">{Math.round(average).toLocaleString('es-BO')} pasos</Text> por semana.
                </Text>
              </View>
            )}
            {globalLoading && <SkeletonGroup style={{ gap: 8 }}>{[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}</SkeletonGroup>}
            {globalError && !global && <EmptyState title="No pudimos cargar el ranking" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetchGlobal()} />}
            {!globalLoading && !globalError && globalRows.length === 0 && (
              <EmptyState title="Todavía nadie caminó esta semana" text="Sé la primera persona en sumar pasos: el ranking arranca cada lunes." />
            )}
            {globalRows.length > 0 && (
              <Glass className="rounded-3xl overflow-hidden">
                {globalRows.map((r, i) => <RankingRow key={r.id} r={r} last={i === globalRows.length - 1 && !myExtra} />)}
                {myExtra && <RankingRow r={myExtra} last />}
              </Glass>
            )}
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-3.5 mx-1" style={{ lineHeight: 17 }}>
              {visible ? 'Apareces en el ranking global por defecto. Puedes desactivarlo en Opciones.' : 'Ahora no apareces en el ranking global. Puedes activarlo en Opciones.'}
            </Text>
          </>
        ) : (
          <>
            {friendsLoading && <SkeletonGroup style={{ gap: 8 }}>{[0, 1, 2].map((i) => <SkeletonRow key={i} />)}</SkeletonGroup>}
            {friendsError && !friends && <EmptyState title="No pudimos cargar a tus amigos" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetchFriends()} />}
            {!friendsLoading && !friendsError && friendRows.length <= 1 && (
              <View className="mb-4">
                <EmptyState
                  title="Todavía no tienes amigos en Camina"
                  text="Invita a quienes caminan contigo y compitan cada semana. Los pasos los ven solo los amigos que aceptaste."
                  actionLabel="Invitar amigos"
                  onAction={() => router.push('/(tabs)/amigos')}
                />
              </View>
            )}
            {friendRows.length > 1 && (
              <Glass className="rounded-3xl overflow-hidden">
                {friendRows.map((r, i) => <RankingRow key={r.id} r={r} last={i === friendRows.length - 1} />)}
              </Glass>
            )}
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-3.5 mx-1" style={{ lineHeight: 17 }}>
              Tus pasos los ven solo los amigos que aceptaste.
            </Text>
          </>
        )}
      </ScrollView>

      <ActionSheet
        visible={options}
        title="Opciones del ranking"
        onClose={() => setOptions(false)}
        actions={[{ label: visible ? 'Dejar de aparecer en el ranking global' : 'Aparecer en el ranking global', onPress: toggleVisible }]}
      />
    </View>
  );
}
