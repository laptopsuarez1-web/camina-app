import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Share, Image, KeyboardAvoidingView, Platform, Alert, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, Send, Trophy, Users, Plus, Flame, Check, IconBubble } from '@/components/icons';
import { celebrate } from '@/store/useCelebrationStore';
import { useGroupChallenge, useJoinChallenge, useMyChallengeResult, RULE_LABEL, daysLeft } from '@/hooks/useChallenges';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupDetail, useGroupNotes, usePostGroupNote, useGroupHistory } from '@/hooks/useGroupDetail';
import { groupInviteLink } from '@/constants/sharing';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { useBlocks, reportContent, REPORT_REASONS } from '@/hooks/useModeration';
import { colors } from '@/theme/tokens';
import { Glass } from '@/components/ui/Glass';

// Lunes de esta semana (hora local): identifica "la semana" para celebrar la meta una sola vez.
function weekKey() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Barra de la meta del grupo: se llena con animación al entrar.
function GoalBar({ pct }: { pct: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 900, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View className="h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
      <Animated.View style={{ width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), height: '100%', backgroundColor: colors.aqua }} />
    </View>
  );
}

export default function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data, isLoading } = useGroupDetail(groupId);
  const { data: notes } = useGroupNotes(groupId);
  const postNote = usePostGroupNote(groupId);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const blocks = useBlocks();
  const { data: ch } = useGroupChallenge(groupId);
  const joinChallenge = useJoinChallenge(groupId);
  const { data: history } = useGroupHistory(groupId);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ title: string; actions: SheetAction[] } | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const { data: lastResult } = useMyChallengeResult(groupId);
  const groupName = data?.group.name;
  const groupTotal = data ? data.members.reduce((a, m) => a + m.steps, 0) : 0;
  const groupTarget = data?.group.challenge_target ?? 0;

  // Gané puntos en un desafío que ya terminó: pantalla de celebración, una sola vez.
  useEffect(() => {
    if (!lastResult || lastResult.payout <= 0) return;
    const key = `camina_ch_win_${lastResult.challengeId}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      celebrate({ kind: 'win', title: `Ganaste «${lastResult.name}»`, body: `Quedaste #${lastResult.rank}${groupName ? ` en ${groupName}` : ''}`, points: lastResult.payout });
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult?.challengeId]);

  // Meta semanal del grupo cumplida: aviso una sola vez por semana.
  useEffect(() => {
    if (!groupId || groupTarget <= 0 || groupTotal < groupTarget) return;
    const key = `camina_gwk_${groupId}_${weekKey()}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      celebrate({ kind: 'toast', at: 'bottom', icon: 'users', title: '¡Lo lograron juntos!', body: `${groupName ?? 'Tu grupo'} cumplió la meta de la semana` });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupTotal >= groupTarget && groupTarget > 0]);

  async function saveGoal() {
    const n = parseInt(goalInput.replace(/\D/g, ''), 10);
    if (!n || n < 5000 || n > 5_000_000) {
      Alert.alert('Meta no válida', 'Ingresá una meta semanal entre 5.000 y 5.000.000 de pasos.');
      return;
    }
    const { error } = await supabase.from('groups').update({ challenge_target: n }).eq('id', groupId!);
    if (error) {
      Alert.alert('No se pudo cambiar la meta', 'Solo quien creó el grupo puede cambiarla.');
      return;
    }
    setEditingGoal(false);
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  }

  async function share() {
    if (!data) return;
    await Share.share({
      message: `Unite a mi grupo "${data.group.name}" en Camina — caminemos y ganemos Puntos juntos.\n${groupInviteLink(data.group.id)}`,
      url: groupInviteLink(data.group.id),
    });
  }

  function askReason(kind: 'message' | 'photo' | 'user', targetUser: string, messageId: string | null) {
    setSheet({
      title: '¿Por qué lo reportás?',
      actions: REPORT_REASONS.map((r) => ({
        label: r.label,
        onPress: async () => {
          try {
            await reportContent(kind, targetUser, messageId, r.key);
            Alert.alert('Gracias', 'Recibimos tu reporte. Lo revisamos y, si corresponde, actuamos.');
          } catch (e) {
            Alert.alert('No se pudo reportar', e instanceof Error ? e.message : 'Intentá de nuevo.');
          }
        },
      })),
    });
  }

  function confirmBlock(id: string, name: string) {
    Alert.alert(`¿Bloquear a ${name}?`, 'Dejás de ver sus mensajes. Podés desbloquearla o desbloquearlo desde Perfil.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => blocks.block.mutate(id) },
    ]);
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('group_notes').delete().eq('id', id);
    if (error) Alert.alert('No se pudo borrar', error.message);
    else queryClient.invalidateQueries({ queryKey: ['group-notes', groupId] });
  }

  function openNoteMenu(n: { id: string; user_id: string; author?: { full_name: string } | null }) {
    const mine = n.user_id === userId;
    const name = n.author?.full_name ?? 'esta persona';
    const actions: SheetAction[] = [];
    if (!mine) {
      actions.push({ label: 'Reportar mensaje', onPress: () => askReason('message', n.user_id, n.id) });
      actions.push({ label: `Bloquear a ${name}`, danger: true, onPress: () => confirmBlock(n.user_id, name) });
    }
    if (mine || isCreator) actions.push({ label: 'Borrar mensaje', danger: true, onPress: () => deleteNote(n.id) });
    setSheet({ title: mine ? 'Tu mensaje' : name, actions });
  }

  function openMemberMenu(m: { id: string; name: string }) {
    setSheet({
      title: m.name,
      actions: [
        { label: 'Reportar foto o perfil', onPress: () => askReason('photo', m.id, null) },
        { label: `Bloquear a ${m.name}`, danger: true, onPress: () => confirmBlock(m.id, m.name) },
      ],
    });
  }

  async function send() {
    if (!text.trim() || !userId) return;
    const value = text.trim();
    setText('');
    try {
      await postNote.mutateAsync({ userId, text: value });
    } catch (e) {
      setText(value);
      Alert.alert('No se pudo enviar', e instanceof Error ? e.message : 'Intentá de nuevo.');
      return;
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  if (isLoading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} />
      </View>
    );
  }

  const totalSteps = data.members.reduce((a, m) => a + m.steps, 0);
  const challengeTarget = data.group.challenge_target;
  const isCreator = data.group.created_by === userId;
  const challengePct = challengeTarget > 0 ? Math.min(100, (totalSteps / challengeTarget) * 100) : 0;

  const myRank = data.members.findIndex((m) => m.id === userId) + 1;
  const top = data.members.slice(0, 3);
  const podiumOrder = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  const heights: Record<number, number> = { 0: 104, 1: 76, 2: 58 };
  const nameOf = (id: string) => data.members.find((m) => m.id === id)?.name ?? 'Caminante';
  const active = ch?.active ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const canJoin = !!active && !ch?.joined && today <= active.start_day;
  const pot = active ? active.stake * (ch?.entries ?? 0) : 0;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="pb-4">
        <LinearGradient colors={['#3a2668', '#1c1030', '#120a1e']} style={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 54, paddingBottom: 0 }}>
          <View className="flex-row items-center justify-between px-5">
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ChevronLeft size={18} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-center text-[17px] font-bold text-white px-3" numberOfLines={1}>
              {data.group.name}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Compartir invitación al grupo" onPress={share} hitSlop={10}>
              <IconBubble icon={Share2} tone="aqua" size={36} />
            </Pressable>
          </View>

          <View className="flex-row items-end justify-center px-6" style={{ marginTop: 52, gap: 10 }}>
            {podiumOrder.map((m) => {
              const rank = data.members.findIndex((x) => x.id === m.id);
              return (
                <View key={m.id} className="items-center" style={{ width: 92 }}>
                  {rank === 0 && <Text style={{ fontSize: 20, marginBottom: 2 }}>👑</Text>}
                  {m.photoUrl ? (
                    <Image source={{ uri: m.photoUrl }} style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }} />
                  ) : (
                    <View style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                      <Text style={{ fontWeight: '900', color: colors.mintDark, fontSize: 18 }}>{m.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <Text className="text-[12px] text-white mt-1" numberOfLines={1}>{m.id === userId ? 'Vos' : m.name}</Text>
                  <Text className="text-[12px]" style={{ color: '#C4B8E8' }}>{m.steps >= 1000 ? `${Math.round(m.steps / 100) / 10}k` : m.steps} pasos</Text>
                  <View
                    style={{
                      width: '100%', height: heights[rank] ?? 58, marginTop: 6, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                      backgroundColor: rank === 0 ? 'rgba(127,237,196,0.28)' : 'rgba(255,255,255,0.12)',
                      borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', paddingTop: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{rank + 1}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        <Glass className="flex-row mx-5 mt-4 mb-3 rounded-2xl p-3.5">
          <View className="flex-1">
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">Pasos del grupo</Text>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark">{totalSteps.toLocaleString('es-BO')}</Text>
          </View>
          <View className="w-px mx-3.5 bg-line-light dark:bg-line-dark" />
          <View className="flex-1">
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">Tu puesto</Text>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark">
              {myRank ? `${myRank}.º` : '-'}
              <Text className="text-[13px] font-semibold text-muted-light dark:text-muted-dark"> de {data.members.length}</Text>
            </Text>
          </View>
        </Glass>

        <Glass className="mx-5 rounded-2xl p-4 mb-3" style={challengePct >= 100 ? { borderColor: colors.aqua, borderWidth: 1.5 } : undefined}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <IconBubble icon={Users} tone="purple" size={34} />
              <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">Meta del grupo</Text>
            </View>
            {isCreator && !editingGoal && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setGoalInput(String(challengeTarget));
                  setEditingGoal(true);
                }}
                hitSlop={8}
                className="rounded-full px-3 py-1.5 bg-purple-light-light dark:bg-purple-light-dark"
              >
                <Text className="text-xs font-semibold text-purple dark:text-purple-light-light">Cambiar meta</Text>
              </Pressable>
            )}
          </View>
          <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-2">
            {totalSteps.toLocaleString('es-BO')}
            <Text className="font-normal text-muted-light dark:text-muted-dark"> / {challengeTarget.toLocaleString('es-BO')} pasos</Text>
          </Text>
          {editingGoal && (
            <View className="flex-row items-center gap-2 mb-3">
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                placeholder="Meta semanal de pasos"
                placeholderTextColor={colors.light.muted}
                className="flex-1 bg-bg-light dark:bg-bg-dark rounded-full px-3.5 py-2 text-xs text-text-light dark:text-text-dark"
              />
              <Pressable onPress={saveGoal} className="bg-purple rounded-full px-3.5 py-2">
                <Text className="text-xs font-semibold text-white">Guardar</Text>
              </Pressable>
              <Pressable onPress={() => setEditingGoal(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark">Cancelar</Text>
              </Pressable>
            </View>
          )}
          <GoalBar pct={challengePct} />
          {challengePct >= 100 ? (
            <View className="flex-row items-center mt-2.5 rounded-xl px-3 py-2" style={{ gap: 6, backgroundColor: 'rgba(79,195,168,0.14)' }}>
              <Check size={14} color={colors.aqua} />
              <Text className="text-[12.5px] font-bold" style={{ color: '#1f7d68' }}>¡Lo lograron juntos!</Text>
            </View>
          ) : (
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2">
              Meta semanal compartida: sumen pasos juntos.
            </Text>
          )}
        </Glass>

        {active ? (
          <Glass className="mx-5 rounded-2xl p-4 mb-3" style={{ borderColor: colors.aqua, borderWidth: 1.5 }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                <IconBubble icon={Trophy} tone="gold" size={34} />
                <View className="flex-1">
                  <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>{active.name}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                    {RULE_LABEL[active.rule]} · meta {active.daily_goal.toLocaleString('es-BO')} · {today < active.start_day ? 'empieza pronto' : `quedan ${daysLeft(active.end_day)} días`}
                  </Text>
                </View>
              </View>
              {pot > 0 && (
                <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ gap: 5, backgroundColor: 'rgba(79,195,168,0.18)' }}>
                  <Image source={require('@/../assets/camina-coin.png')} style={{ width: 15, height: 15, borderRadius: 7.5 }} />
                  <Text className="text-[12.5px] font-extrabold text-mint-dark dark:text-mint">{pot}</Text>
                </View>
              )}
            </View>
            {(ch?.standings ?? []).slice(0, 3).map((st, i) => (
              <View key={st.user_id} className="flex-row items-center py-1" style={{ gap: 8 }}>
                <Text className="w-4 text-[12px] font-bold text-text-light dark:text-text-dark">{i + 1}</Text>
                <Text className="flex-1 text-[12.5px] text-text-light dark:text-text-dark" numberOfLines={1}>{st.user_id === userId ? `${nameOf(st.user_id)} (vos)` : nameOf(st.user_id)}</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                  {active.rule === 'steps' ? st.steps.toLocaleString('es-BO') : active.rule === 'days' ? `${st.goal_days} días` : `racha ${st.best_streak}`}
                </Text>
              </View>
            ))}
            {canJoin ? (
              <Pressable
                onPress={async () => {
                  try {
                    await joinChallenge.mutateAsync(active.id);
                  } catch (e) {
                    Alert.alert('No se pudo sumar', e instanceof Error ? e.message : 'Intentá de nuevo.');
                  }
                }}
                disabled={joinChallenge.isPending}
                className="bg-mint rounded-2xl py-3 items-center mt-2.5 flex-row justify-center"
                style={{ gap: 6 }}
              >
                <Text className="text-mint-dark font-bold text-[13.5px]">Sumarme{active.stake > 0 ? ' · ponés' : ''}</Text>
                {active.stake > 0 && (
                  <>
                    <Image source={require('@/../assets/camina-coin.png')} style={{ width: 16, height: 16, borderRadius: 8 }} />
                    <Text className="text-mint-dark font-extrabold text-[13.5px]">{active.stake}</Text>
                  </>
                )}
              </Pressable>
            ) : ch?.joined ? (
              <Text className="text-center text-[12px] font-bold text-mint-dark dark:text-mint mt-2">Ya estás dentro ✓</Text>
            ) : (
              <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-2">Ya empezó: ya no se puede sumar.</Text>
            )}
          </Glass>
        ) : (
          <Glass className="mx-5 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <IconBubble icon={Flame} tone="orange" size={40} />
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark">Sin desafíos por ahora</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">
                  Armá uno: elijan la regla, la meta y cuántos puntos poner en juego.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/grupos/nuevo-desafio', params: { groupId: data.group.id } })}
              className="bg-mint rounded-2xl py-3 items-center mt-3 flex-row justify-center"
              style={{ gap: 6 }}
            >
              <Plus size={15} color={colors.mintDark} />
              <Text className="text-mint-dark font-bold text-[13.5px]">Crear desafío</Text>
            </Pressable>
          </Glass>
        )}

        <Glass className="mx-5 rounded-2xl p-4 mb-3">
          <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
            <IconBubble icon={Trophy} tone="gold" size={34} />
            <Text className="flex-1 text-[13px] font-bold text-text-light dark:text-text-dark">
              Ranking de la semana
            </Text>
          </View>
          {data.members.map((m, i) => (
            <View key={m.id} className="flex-row items-center gap-3 py-1.5">
              <Text className="w-5 text-xs font-bold text-muted-light dark:text-muted-dark">{i + 1}°</Text>
              {m.photoUrl ? (
                <Image source={{ uri: m.photoUrl }} className="w-8 h-8 rounded-full" />
              ) : (
                <View className="w-8 h-8 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                  <Text className="text-purple text-xs font-bold">{m.name[0]?.toUpperCase()}</Text>
                </View>
              )}
              <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>
                {m.id === userId ? `${m.name} (vos)` : m.name}
              </Text>
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'rgba(79,195,168,0.16)' }}>
                <Text className="text-[12.5px] font-bold text-aqua-deep dark:text-aqua">
                  {m.steps.toLocaleString('es-BO')}
                </Text>
              </View>
              {m.id !== userId && (
                <Pressable onPress={() => openMemberMenu(m)} hitSlop={10} className="pl-1">
                  <Text className="text-muted-light dark:text-muted-dark text-[18px] font-bold">⋯</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Glass>
      {(history ?? []).length > 0 && (
        <View className="mx-5 bg-card-light dark:bg-card-dark rounded-2xl p-4 mb-3">
          <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-2">Semanas anteriores</Text>
          {Array.from(new Set((history ?? []).map((r) => r.week_start))).slice(0, 8).map((week, idx) => {
            const rows = (history ?? []).filter((r) => r.week_start === week);
            const open = openWeek === week || (openWeek === null && idx === 0);
            const end = new Date(new Date(week + 'T12:00:00').getTime() + 6 * 86400000);
            const label = `${new Date(week + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}`;
            return (
              <View key={week} className="border-t border-line-light dark:border-line-dark">
                <Pressable onPress={() => setOpenWeek(open ? '' : week)} className="flex-row items-center justify-between py-2.5">
                  <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">Semana del {label}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark">🏆 {rows[0]?.name}</Text>
                </Pressable>
                {open &&
                  rows.map((r) => (
                    <View key={r.user_id} className="flex-row items-center py-1" style={{ gap: 10 }}>
                      <Text className="w-6 text-[12px] font-bold text-muted-light dark:text-muted-dark">{r.rank}°</Text>
                      <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>
                        {r.user_id === userId ? `${r.name} (vos)` : r.name}
                      </Text>
                      <Text className="text-[12px] text-muted-light dark:text-muted-dark">{r.goal_days} días de meta</Text>
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{r.steps.toLocaleString('es-BO')}</Text>
                    </View>
                  ))}
              </View>
            );
          })}
        </View>
      )}

        <View className="mx-5 mt-2 mb-2 flex-row items-baseline justify-between">
          <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">Chat del grupo</Text>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark">se vacía cada lunes</Text>
        </View>
        <View className="px-5 gap-2 pb-2">
        {(notes ?? []).filter((n) => !blocks.ids.has(n.user_id)).map((n) => {
          const mine = n.user_id === userId;
          return (
            <Pressable key={n.id} onLongPress={() => openNoteMenu(n)} delayLongPress={350} className={mine ? 'self-end items-end' : 'self-start items-start'} style={{ maxWidth: '78%' }}>
              {!mine && (
                <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-0.5 px-1">
                  {n.author?.full_name ?? 'Caminante'}
                </Text>
              )}
              <View
                className="rounded-2xl px-3.5 py-2.5"
                style={{ backgroundColor: mine ? colors.aquaDeep : colors.light.card, borderWidth: mine ? 0 : 1, borderColor: colors.light.line }}
              >
                <Text style={{ color: mine ? '#fff' : colors.light.text, fontSize: 13.5 }}>{n.text}</Text>
              </View>
            </Pressable>
          );
        })}
        {(notes ?? []).length === 0 && (
          <Text className="text-center text-muted-light dark:text-muted-dark text-[13px] py-6">
            Todavía no hay mensajes. Escribí el primero.
          </Text>
        )}
        </View>
      </ScrollView>

      <View className="flex-row items-end gap-2.5 px-5 pt-2.5 border-t border-line-light dark:border-line-dark" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribí un mensaje…"
          accessibilityLabel="Mensaje para el grupo"
          placeholderTextColor={colors.light.muted}
          className="flex-1 bg-card-light dark:bg-card-dark rounded-[20px] px-4 py-2.5 text-[13.5px] text-text-light dark:text-text-dark"
          style={{ minHeight: 40, maxHeight: 110, textAlignVertical: 'center' }}
          // En web el textarea arranca en dos líneas si no se le dice otra cosa.
          {...(Platform.OS === 'web' ? { numberOfLines: 1 } : null)}
          multiline
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" onPress={send} disabled={!text.trim() || postNote.isPending} className="w-10 h-10 rounded-full bg-aqua-deep items-center justify-center">
          <Send size={16} color="#fff" />
        </Pressable>
      </View>
      <ActionSheet visible={!!sheet} title={sheet?.title} actions={sheet?.actions ?? []} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}
