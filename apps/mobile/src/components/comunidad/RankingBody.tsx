import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ActionSheet } from '@/components/ActionSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { PersonAvatar } from '@/components/friends/PersonAvatar';
import { Sliders } from '@/components/icons';
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
  const { line, accentText, text, muted } = useThemeColors();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`Puesto ${r.position}: ${r.name}${r.me ? ' (tú)' : ''}, ${r.steps.toLocaleString('es-BO')} ${plural(r.steps, 'paso', 'pasos')}. Ver perfil`}
      onPress={() => router.push({ pathname: '/(tabs)/amigos/[userId]', params: { userId: r.id } })}
      feedback="row"
      className="flex-row items-center p-3.5"
      style={{ gap: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: line }}
    >
      <Text className="w-6 text-center text-[13px] font-semibold" style={{ color: muted }}>{r.position}</Text>
      <PersonAvatar name={r.name} photoUrl={r.photoUrl} size={40} />
      <View className="flex-1">
        <Text className="text-[14.5px] font-semibold" style={{ color: text }} numberOfLines={1}>{r.me ? `${r.name} (tú)` : r.name}</Text>
        {r.sub ? <Text className="text-[12.5px]" style={{ color: muted }} numberOfLines={1}>{r.sub}</Text> : null}
      </View>
      <View className="items-end">
        <Text style={{ fontSize: 15, fontWeight: '800', color: accentText, fontVariant: ['tabular-nums'] }}>{r.steps.toLocaleString('es-BO')}</Text>
        <Text className="text-[12px]" style={{ color: muted }}>{plural(r.steps, 'paso', 'pasos')}</Text>
      </View>
    </Press>
  );
}

// El ranking semanal (global y entre amigos). Se usa dentro de la pestaña Comunidad (`embedded`) y en su pantalla propia.
// `onInvite`: qué hacer con "Invitar amigos" (en Comunidad cambia de solapa; en la pantalla propia abre Amigos).
export function RankingBody({ initialView = 'global', embedded = false, onInvite }: { initialView?: 'global' | 'amigos'; embedded?: boolean; onInvite?: () => void }) {

  const { dark, text, muted } = useThemeColors();
  // La vista pedida al llegar manda hasta que la persona toca otra; si se llega de nuevo con otra vista pedida, se respeta.
  const [picked, setPicked] = useState<{ from: 'global' | 'amigos'; view: 'global' | 'amigos' } | null>(null);
  const view = picked && picked.from === initialView ? picked.view : initialView;
  const setView = (v: 'global' | 'amigos') => setPicked({ from: initialView, view: v });
  const [options, setOptions] = useState(false);
  // De 15 en 15: así la lista no es un montón de gente de golpe.
  const PAGE = 15;
  const [shown, setShown] = useState(PAGE);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: global, isLoading: globalLoading, isError: globalError, refetch: refetchGlobal } = useGlobalRanking(shown);
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

  const myFriendRow = friendRows.find((r) => r.me);
  const myName = profile?.full_name?.trim() || 'Tú';
  // Hay más para mostrar si la lista llegó llena (global) o si quedan amigos sin mostrar.
  const moreGlobal = (global?.length ?? 0) >= shown && shown < 100;
  const moreFriends = friendRows.length > shown;
  const myPosition = view === 'global' ? (myRank ? myRank.position : null) : myFriendRow ? myFriendRow.position : null;
  const myScope = view === 'global' ? 'de todo Camina' : `de ${friendRows.length} en tu círculo`;

  const chip = (key: 'global' | 'amigos', label: string) => (
    <Press
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: view === key }}
      aria-pressed={view === key}
      haptic="selection"
      onPress={() => { setView(key); setShown(PAGE); }}
      className="rounded-full px-[18px] py-2.5"
      style={{ backgroundColor: view === key ? colors.aquaDeep : dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: view === key ? colors.aquaDeep : dark ? colors.dark.line : colors.light.line }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: view === key ? '#fff' : text }}>{label}</Text>
    </Press>
  );


  const verMas = (
    <Press accessibilityRole="button" accessibilityLabel="Ver más personas" onPress={() => setShown((n) => n + PAGE)} className="rounded-full py-3 items-center mt-3" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: dark ? colors.dark.line : colors.light.line }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>Ver más</Text>
    </Press>
  );

  return (
    <>
        <View className="flex-row items-center justify-between mb-3.5">
          <View style={{ flex: 1 }}>
            {embedded ? null : <Text accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2} style={[typo.title, { color: text, lineHeight: 40, paddingBottom: 2 }]}>Ranking</Text>}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[typo.body, { color: muted, marginTop: embedded ? 0 : 2 }]}>Semanal · se reinicia cada lunes</Text>
          </View>
          <Press accessibilityRole="button" accessibilityLabel="Opciones del ranking" onPress={() => setOptions(true)} className="flex-row items-center rounded-full px-3.5 py-2 ml-2" style={{ gap: 6, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: dark ? colors.dark.line : colors.light.line }}>
            <Sliders size={14} color={text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>Opciones</Text>
          </Press>
        </View>

        <Glass className="rounded-3xl p-4 mb-4">
          <View className="flex-row items-center" style={{ gap: 14 }}>
            <PersonAvatar name={myName} photoUrl={profile?.photo_url ?? null} size={52} />
            <View className="flex-1">
              <Text className="text-[17px] font-bold" style={{ color: text }} numberOfLines={1}>{myName}</Text>
              <Text className="text-[14px]" style={{ color: muted }} numberOfLines={1}>
                {myPosition ? `#${myPosition.toLocaleString('es-BO')} ${myScope}` : 'Camina para entrar al ranking de la semana'}
              </Text>
            </View>
          </View>
        </Glass>

        <View className="flex-row mb-4" style={{ gap: 8 }}>
          {chip('global', 'Global')}
          {chip('amigos', 'Entre amigos')}
        </View>

        {view === 'global' ? (
          <>
            {average != null && average > 0 && (
              <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: dark ? 'rgba(183,166,240,0.16)' : '#F0EAFA' }}>
                <Text className="text-[13px]" style={{ color: text }}>
                  La comunidad de Camina promedia{' '}
                  <Text className="font-bold">{Math.round(average).toLocaleString('es-BO')} pasos</Text> por semana.
                </Text>
              </View>
            )}
            {globalLoading && <SkeletonGroup style={{ gap: 8 }}>{[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}</SkeletonGroup>}
            {globalError && !global && <EmptyState mascot="confundido" title="No pudimos cargar el ranking" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetchGlobal()} />}
            {!globalLoading && !globalError && globalRows.length === 0 && (
              <EmptyState title="Todavía nadie caminó esta semana" text="Sé la primera persona en sumar pasos: el ranking arranca cada lunes." />
            )}
            {globalRows.length > 0 && (
              <Glass className="rounded-3xl overflow-hidden">
                {globalRows.map((r, i) => <RankingRow key={r.id} r={r} last={i === globalRows.length - 1 && !myExtra} />)}
                {myExtra && <RankingRow r={myExtra} last />}
              </Glass>
            )}
            {moreGlobal ? verMas : null}
            <Text className="text-[12px] mt-3.5 mx-1" style={{ lineHeight: 17, color: muted }}>
              {visible ? 'Apareces en el ranking global por defecto. Puedes desactivarlo en Opciones.' : 'Ahora no apareces en el ranking global. Puedes activarlo en Opciones.'}
            </Text>
          </>
        ) : (
          <>
            {friendsLoading && <SkeletonGroup style={{ gap: 8 }}>{[0, 1, 2].map((i) => <SkeletonRow key={i} />)}</SkeletonGroup>}
            {friendsError && !friends && <EmptyState mascot="confundido" title="No pudimos cargar a tus amigos" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetchFriends()} />}
            {!friendsLoading && !friendsError && friendRows.length <= 1 && (
              <View className="mb-4">
                <EmptyState
                  title="Todavía no tienes amigos en Camina"
                  text="Invita a quienes caminan contigo y compitan cada semana. Los pasos los ven solo los amigos que aceptaste."
                  actionLabel="Invitar amigos"
                  onAction={() => (onInvite ? onInvite() : router.push('/(tabs)/amigos'))}
                />
              </View>
            )}
            {friendRows.length > 1 && (
              <Glass className="rounded-3xl overflow-hidden">
                {friendRows.slice(0, shown).map((r, i, arr) => <RankingRow key={r.id} r={r} last={i === arr.length - 1} />)}
              </Glass>
            )}
            {friendRows.length > 1 && moreFriends ? verMas : null}
            <Text className="text-[12px] mt-3.5 mx-1" style={{ lineHeight: 17, color: muted }}>
              Tus pasos los ven solo los amigos que aceptaste.
            </Text>
          </>
        )}
      <ActionSheet
        visible={options}
        title="Opciones del ranking"
        onClose={() => setOptions(false)}
        actions={[{ label: visible ? 'Dejar de aparecer en el ranking global' : 'Aparecer en el ranking global', onPress: toggleVisible }]}
      />
    </>
  );
}
