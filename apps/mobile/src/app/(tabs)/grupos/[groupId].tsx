import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Animated, Easing } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, Send, Trophy, Users, Plus, Flame, Check, Crown, IconBubble } from '@/components/icons';
import { celebrate } from '@/store/useCelebrationStore';
import { useGroupChallenge, useJoinChallenge, useMyChallengeResult, RULE_LABEL, daysLeft, ruleText } from '@/hooks/useChallenges';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupDetail, useGroupNotes, usePostGroupNote, useGroupHistory } from '@/hooks/useGroupDetail';
import { GroupShareSheet } from '@/components/friends/GroupShareSheet';
import { GroupShareImageSheet } from '@/components/share/GroupShareImageSheet';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { useBlocks, reportContent, REPORT_REASONS } from '@/hooks/useModeration';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { Glass } from '@/components/ui/Glass';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { localDay, plural } from '@/lib/format';
import { friendlyServerError } from '@/lib/errors';
import { Coin } from '@/components/ui/Coin';

// Acción para lector de pantalla / control por switch: el menú del mensaje solo abría con toque largo.
const NOTE_ACTIONS = [{ name: 'options', label: 'Opciones del mensaje' }];

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
  const { muted, accentText, accentIcon, warnText } = useThemeColors();
  const { groupId, nuevo, bienvenida } = useLocalSearchParams<{ groupId: string; nuevo?: string; bienvenida?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data, isLoading, refetch } = useGroupDetail(groupId);
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
  const [shareOpen, setShareOpen] = useState(false);
  const [rankShareOpen, setRankShareOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const { data: lastResult } = useMyChallengeResult(groupId);
  const groupName = data?.group.name;
  // Recién creado o recién unido: escena de bienvenida, una vez. "Invitar amigos" abre la hoja para compartir.
  const welcomed = useRef(false);
  useEffect(() => {
    if (welcomed.current || !data || !userId || (nuevo !== '1' && bienvenida !== '1')) return;
    welcomed.current = true;
    const me = { id: userId, name: profile?.full_name ?? 'Tú', photoUrl: profile?.photo_url ?? null };
    if (nuevo === '1') {
      celebrate({ kind: 'group-created', name: data.group.name, me, code: data.group.invite_code, onInvite: () => setShareOpen(true) });
      return;
    }
    const target = data.group.challenge_target;
    const done = data.members.reduce((a, m) => a + m.steps, 0);
    celebrate({
      kind: 'group-joined',
      name: data.group.name,
      me,
      others: data.members.filter((m) => m.id !== userId).map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl ?? null })),
      total: data.members.length,
      goalText: target > 0 ? `Meta de la semana: ${target.toLocaleString('es-BO')} pasos juntos. Van ${done.toLocaleString('es-BO')}.` : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevo, bienvenida, data, userId]);
  const groupTotal = data ? data.members.reduce((a, m) => a + m.steps, 0) : 0;
  const groupTarget = data?.group.challenge_target ?? 0;

  // Terminó el último desafío: cinemática del podio, una sola vez (ganes o no).
  useEffect(() => {
    if (!lastResult || !data || !userId) return;
    const key = `camina_ch_end_${lastResult.challengeId}`;
    // Quien ya vio la pantalla vieja de "Ganaste" no la vuelve a ver.
    AsyncStorage.multiGet([key, `camina_ch_win_${lastResult.challengeId}`]).then((pairs) => {
      if (pairs.some(([, v]) => v)) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      const person = (id: string) => {
        const m = data.members.find((x) => x.id === id);
        return { id, name: m?.name ?? 'Caminante', photoUrl: m?.photoUrl ?? null };
      };
      const { results, mine, rule } = lastResult;
      const above = results.find((r) => r.rank === mine.rank - 1);
      let gap: string | undefined;
      if (above && rule === 'steps') gap = `Te faltaron ${(above.steps - mine.steps).toLocaleString('es-BO')} pasos para alcanzar a ${person(above.user_id).name.split(' ')[0]}. ¡La próxima es tuya!`;
      else if (above && rule === 'days' && above.goal_days > mine.goal_days) gap = `Te ${above.goal_days - mine.goal_days === 1 ? 'faltó 1 día' : `faltaron ${above.goal_days - mine.goal_days} días`} con meta para alcanzar a ${person(above.user_id).name.split(' ')[0]}.`;
      celebrate({
        kind: 'challenge-ended',
        name: lastResult.name,
        groupName,
        meId: userId,
        myRank: mine.rank,
        participants: results.length,
        payout: mine.payout,
        podium: results.slice(0, 3).map((r) => ({ person: person(r.user_id), value: ruleText(rule, r) })),
        myValue: ruleText(rule, mine),
        goalDays: mine.goal_days,
        days: lastResult.days,
        gap,
        onRematch: () => router.push({ pathname: '/(tabs)/grupos/nuevo-desafio', params: { groupId: groupId! } }),
      });
      if (mine.payout > 0) queryClient.invalidateQueries({ queryKey: ['points-balance'] });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult?.challengeId, !!data]);

  // Meta semanal del grupo cumplida: aviso una sola vez por semana.
  useEffect(() => {
    if (!groupId || groupTarget <= 0 || groupTotal < groupTarget) return;
    const key = `camina_gwk_${groupId}_${weekKey()}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      celebrate({
        kind: 'group-goal',
        name: groupName ?? 'Tu grupo',
        total: groupTotal,
        target: groupTarget,
        people: (data?.members ?? []).map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl ?? null, steps: m.steps })),
        onShare: () => setRankShareOpen(true),
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupTotal >= groupTarget && groupTarget > 0]);

  async function saveGoal() {
    const n = parseInt(goalInput.replace(/\D/g, ''), 10);
    if (!n || n < 5000 || n > 5_000_000) {
      Alert.alert('Meta no válida', 'Ingresa una meta semanal entre 5.000 y 5.000.000 de pasos.');
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

  function askReason(kind: 'message' | 'photo' | 'user', targetUser: string, messageId: string | null) {
    setSheet({
      title: '¿Por qué lo reportas?',
      actions: REPORT_REASONS.map((r) => ({
        label: r.label,
        onPress: async () => {
          try {
            await reportContent(kind, targetUser, messageId, r.key);
            Alert.alert('Gracias', 'Recibimos tu reporte. Lo revisamos y, si corresponde, actuamos.');
          } catch (e) {
            Alert.alert('No se pudo reportar', friendlyServerError(e, 'Intenta de nuevo.'));
          }
        },
      })),
    });
  }

  function confirmBlock(id: string, name: string) {
    Alert.alert(`¿Bloquear a ${name}?`, 'Dejas de ver sus mensajes. Puedes desbloquearla o desbloquearlo desde Perfil.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => blocks.block.mutate(id) },
    ]);
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('group_notes').delete().eq('id', id);
    if (error) Alert.alert('No se pudo borrar', friendlyServerError(error, 'Intenta de nuevo.'));
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

  function openProfile(id: string) {
    router.push({ pathname: '/(tabs)/amigos/[userId]', params: { userId: id } });
  }

  function openMemberMenu(m: { id: string; name: string }) {
    setSheet({
      title: m.name,
      actions: [
        { label: 'Ver perfil y agregar amigo', onPress: () => openProfile(m.id) },
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
      Alert.alert('No se pudo enviar', friendlyServerError(e, 'Intenta de nuevo.'));
      return;
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} accessibilityLabel="Cargando" />
      </View>
    );
  }

  // Grupo que no existe o que no cargó: en vez de un spinner eterno, salida clara.
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-bg-light dark:bg-bg-dark">
        <Text className="text-[17px] font-bold text-center text-text-light dark:text-text-dark">No pudimos abrir este grupo</Text>
        <Text className="text-[13px] text-center text-muted-light dark:text-muted-dark mt-2">
          Puede que ya no exista o que no tengas conexión.
        </Text>
        <Press accessibilityRole="button" onPress={() => refetch()} className="bg-aqua-deep rounded-2xl py-3 px-8 mt-6">
          <Text className="text-white font-bold text-[14px]">Reintentar</Text>
        </Press>
        <Press
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/grupos'))}
          className="py-3 px-6 mt-2"
        >
          <Text className="font-bold text-[14px] text-aqua-ink dark:text-mint">Volver</Text>
        </Press>
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
  const today = localDay();
  const left = active ? daysLeft(active.end_day) : 0;
  const canJoin = !!active && !ch?.joined && today <= active.start_day;
  const pot = active ? active.stake * (ch?.entries ?? 0) : 0;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} ref={scrollRef} className="flex-1" contentContainerClassName="pb-4">
        <LinearGradient colors={colors.headerGradient} style={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 54, paddingBottom: 0 }}>
          <View className="flex-row items-center justify-between px-5">
            <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ChevronLeft size={18} color="#fff" />
            </Press>
            <Text className="flex-1 text-center text-[17px] font-bold text-white px-3" numberOfLines={1}>
              {data.group.name}
            </Text>
            <Press accessibilityRole="button" accessibilityLabel="Compartir invitación al grupo" onPress={() => setShareOpen(true)} hitSlop={10}>
              <IconBubble icon={Share2} tone="aqua" size={36} />
            </Press>
          </View>

          <View className="flex-row items-end justify-center px-6" style={{ marginTop: 52, gap: 10 }}>
            {podiumOrder.map((m) => {
              const rank = data.members.findIndex((x) => x.id === m.id);
              return (
                <View key={m.id} className="items-center" style={{ width: 92 }}>
                  {rank === 0 && <View importantForAccessibility="no" accessibilityElementsHidden style={{ marginBottom: 2 }}><Crown size={20} color={colors.warn} weight="fill" /></View>}
                  <AvatarImage
                    uri={m.photoUrl}
                    style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}
                    fallback={
                      <View style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                        <Text style={{ fontWeight: '900', color: colors.mintDark, fontSize: 18 }}>{m.name[0]?.toUpperCase()}</Text>
                      </View>
                    }
                  />
                  <Text className="text-[12px] text-white mt-1" numberOfLines={1}>{m.id === userId ? 'Tú' : m.name}</Text>
                  <Text className="text-[12px]" style={{ color: colors.authMuted }}>{m.steps >= 1000 ? `${Math.round(m.steps / 100) / 10}k` : m.steps} pasos</Text>
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

        <Glass className="flex-row mx-5 mt-3 mb-3 rounded-2xl p-3.5">
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

        <Press
          accessibilityRole="button"
          accessibilityLabel="Compartir el ranking del grupo como imagen"
          onPress={() => setRankShareOpen(true)}
          className="mx-5 mb-3 flex-row items-center justify-center rounded-2xl"
          style={{ gap: 9, paddingVertical: 13, backgroundColor: colors.aquaDeep }}
        >
          <Share2 size={17} color="#fff" weight="bold" />
          <Text className="text-white font-bold text-[14px]">Compartir ranking</Text>
        </Press>

        <Glass className="mx-5 rounded-2xl p-4 mb-3" style={challengePct >= 100 ? { borderColor: colors.aqua, borderWidth: 1.5 } : undefined}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <IconBubble icon={Users} tone="purple" size={34} />
              <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">Meta del grupo</Text>
            </View>
            {isCreator && !editingGoal && (
              <Press
                accessibilityRole="button"
                onPress={() => {
                  setGoalInput(String(challengeTarget));
                  setEditingGoal(true);
                }}
                hitSlop={8}
                className="rounded-full px-3 py-1.5 bg-purple-light-light dark:bg-purple-light-dark"
              >
                <Text className="text-xs font-semibold text-purple-ink dark:text-purple-soft">Cambiar meta</Text>
              </Press>
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
                accessibilityLabel="Meta semanal de pasos"
                placeholderTextColor={muted}
                className="flex-1 bg-bg-light dark:bg-bg-dark rounded-full px-3.5 py-2 text-xs text-text-light dark:text-text-dark"
              />
              <Press accessibilityRole="button" onPress={saveGoal} className="bg-purple-deep rounded-full px-3.5 py-2">
                <Text className="text-xs font-semibold text-white">Guardar</Text>
              </Press>
              <Press accessibilityRole="button" onPress={() => setEditingGoal(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark">Cancelar</Text>
              </Press>
            </View>
          )}
          <GoalBar pct={challengePct} />
          {challengePct >= 100 ? (
            <View className="flex-row items-center mt-2.5 rounded-xl px-3 py-2" style={{ gap: 6, backgroundColor: 'rgba(79,195,168,0.14)' }}>
              <Check size={14} color={accentIcon} />
              <Text className="text-[12.5px] font-bold" style={{ color: accentText }}>¡Lo lograron juntos!</Text>
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
                    {RULE_LABEL[active.rule]} · meta {active.daily_goal.toLocaleString('es-BO')} · {today < active.start_day ? 'empieza pronto' : left === 0 ? 'último día' : `${plural(left, 'queda', 'quedan')} ${left} ${plural(left, 'día', 'días')}`}
                  </Text>
                </View>
              </View>
              {pot > 0 && (
                <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ gap: 5, backgroundColor: 'rgba(79,195,168,0.18)' }}>
                  <Coin size={15} />
                  <Text className="text-[12.5px] font-extrabold text-mint-dark dark:text-mint">{pot}</Text>
                </View>
              )}
            </View>
            {(ch?.standings ?? []).slice(0, 3).map((st, i) => (
              <View key={st.user_id} className="flex-row items-center py-1" style={{ gap: 8 }}>
                <Text className="w-4 text-[12px] font-bold text-text-light dark:text-text-dark">{i + 1}</Text>
                <Text className="flex-1 text-[12.5px] text-text-light dark:text-text-dark" numberOfLines={1}>{st.user_id === userId ? `${nameOf(st.user_id)} (tú)` : nameOf(st.user_id)}</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                  {active.rule === 'steps' ? st.steps.toLocaleString('es-BO') : active.rule === 'days' ? `${st.goal_days} ${plural(st.goal_days, 'día', 'días')}` : `racha ${st.best_streak}`}
                </Text>
              </View>
            ))}
            {canJoin ? (
              <Press
                accessibilityRole="button"
                onPress={async () => {
                  const others = (ch?.standings ?? []).filter((st) => st.user_id !== userId).map((st) => {
                    const m = data.members.find((x) => x.id === st.user_id);
                    return { id: st.user_id, name: m?.name ?? 'Caminante', photoUrl: m?.photoUrl ?? null };
                  });
                  const me = data.members.find((x) => x.id === userId);
                  try {
                    await joinChallenge.mutateAsync(active.id);
                    celebrate({
                      kind: 'challenge-joined',
                      name: active.name,
                      me: { id: userId ?? 'yo', name: me?.name ?? 'Tú', photoUrl: me?.photoUrl ?? null },
                      others,
                      stake: active.stake,
                      potBefore: pot,
                      subtitle: `Tus pasos de hoy ya cuentan. ${others.length + 1} ${plural(others.length + 1, 'caminante', 'caminantes')}, ${left + 1} ${plural(left + 1, 'día', 'días')}.`,
                    });
                  } catch (e) {
                    Alert.alert('No se pudo sumar', friendlyServerError(e, 'Intenta de nuevo.'));
                  }
                }}
                disabled={joinChallenge.isPending}
                className="bg-mint rounded-2xl py-3 items-center mt-2.5 flex-row justify-center"
                style={{ gap: 6 }}
              >
                <Text className="text-mint-dark font-bold text-[13.5px]">Sumarme{active.stake > 0 ? ' · pones' : ''}</Text>
                {active.stake > 0 && (
                  <>
                    <Coin size={16} />
                    <Text className="text-mint-dark font-extrabold text-[13.5px]">{active.stake}</Text>
                  </>
                )}
              </Press>
            ) : ch?.joined ? (
              <View accessible accessibilityLabel="Ya estás dentro" className="flex-row items-center justify-center mt-2" style={{ gap: 4 }}>
                <Check size={14} color={accentText} />
                <Text importantForAccessibility="no" className="text-center text-[12px] font-bold text-mint-dark dark:text-mint">Ya estás dentro</Text>
              </View>
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
                  Arma uno: elijan la regla, la meta y cuántos puntos poner en juego.
                </Text>
              </View>
            </View>
            <Press
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/(tabs)/grupos/nuevo-desafio', params: { groupId: data.group.id } })}
              className="bg-mint rounded-2xl py-3 items-center mt-3 flex-row justify-center"
              style={{ gap: 6 }}
            >
              <Plus size={15} color={colors.mintDark} />
              <Text className="text-mint-dark font-bold text-[13.5px]">Crear desafío</Text>
            </Press>
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
              <Text className="w-5 text-xs font-bold text-muted-light dark:text-muted-dark">{i + 1}.º</Text>
              <Press
                accessibilityRole="button"
                accessibilityLabel={m.id === userId ? 'Tu perfil' : `Ver perfil de ${m.name}`}
                disabled={m.id === userId}
                onPress={() => openProfile(m.id)}
                className="flex-1 flex-row items-center gap-3"
              >
              <AvatarImage
                uri={m.photoUrl}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                fallback={
                  <View className="w-8 h-8 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                    <Text className="text-purple-ink dark:text-purple-soft text-xs font-bold">{m.name[0]?.toUpperCase()}</Text>
                  </View>
                }
              />
              <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>
                {m.id === userId ? `${m.name} (tú)` : m.name}
              </Text>
              </Press>
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'rgba(79,195,168,0.16)' }}>
                <Text className="text-[12.5px] font-bold text-aqua-ink dark:text-aqua">
                  {m.steps.toLocaleString('es-BO')}
                </Text>
              </View>
              {m.id !== userId ? (
                <Press accessibilityRole="button" accessibilityLabel={`Opciones de ${m.name}`} onPress={() => openMemberMenu(m)} hitSlop={10} className="pl-1">
                  <Text className="text-muted-light dark:text-muted-dark text-[18px] font-bold">⋯</Text>
                </Press>
              ) : (
                // Mismo ancho que el menú de las otras filas para que los puntos queden alineados.
                <View className="pl-1" style={{ width: 17 }} />
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
                <Press accessibilityRole="button" onPress={() => setOpenWeek(open ? '' : week)} className="flex-row items-center justify-between py-2.5">
                  <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">Semana del {label}</Text>
                  <View accessible={!!rows[0]} accessibilityLabel={rows[0] ? `Ganó ${rows[0].name}` : undefined} className="flex-row items-center" style={{ gap: 4 }}>
                    <Trophy size={14} color={warnText} />
                    <Text importantForAccessibility="no" className="text-[12px] text-muted-light dark:text-muted-dark">{rows[0]?.name}</Text>
                  </View>
                </Press>
                {open &&
                  rows.map((r) => (
                    <View key={r.user_id} className="flex-row items-center py-1" style={{ gap: 10 }}>
                      <Text className="w-6 text-[12px] font-bold text-muted-light dark:text-muted-dark">{r.rank}.º</Text>
                      <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>
                        {r.user_id === userId ? `${r.name} (tú)` : r.name}
                      </Text>
                      <Text className="text-[12px] text-muted-light dark:text-muted-dark">{r.goal_days} {plural(r.goal_days, 'día', 'días')} de meta</Text>
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
          <Text className="text-[12px] text-muted-light dark:text-muted-dark">se vacía cada mes</Text>
        </View>
        <View className="px-5 gap-2 pb-2">
        {(notes ?? []).filter((n) => !blocks.ids.has(n.user_id)).map((n) => {
          const mine = n.user_id === userId;
          return (
            <Press
              key={n.id}
              onLongPress={() => openNoteMenu(n)}
              delayLongPress={350}
              accessibilityActions={NOTE_ACTIONS}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'options') openNoteMenu(n);
              }}
              className={mine ? 'self-end items-end' : 'self-start items-start'}
              style={{ maxWidth: '78%' }}
            >
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
            </Press>
          );
        })}
        {(notes ?? []).length === 0 && (
          <Text className="text-center text-muted-light dark:text-muted-dark text-[13px] py-6">
            Todavía no hay mensajes. Escribe el primero.
          </Text>
        )}
        </View>
      </ScrollView>

      <View className="flex-row items-end gap-2.5 px-5 pt-2.5 border-t border-line-light dark:border-line-dark" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje…"
          accessibilityLabel="Mensaje para el grupo"
          placeholderTextColor={muted}
          className="flex-1 bg-card-light dark:bg-card-dark rounded-[20px] px-4 py-2.5 text-[13.5px] text-text-light dark:text-text-dark"
          style={{ minHeight: 40, maxHeight: 110, textAlignVertical: 'center' }}
          // En web el textarea arranca en dos líneas si no se le dice otra cosa.
          {...(Platform.OS === 'web' ? { numberOfLines: 1 } : null)}
          multiline
        />
        <Press accessibilityRole="button" accessibilityLabel="Enviar mensaje" onPress={send} disabled={!text.trim() || postNote.isPending} className="w-10 h-10 rounded-full bg-aqua-deep items-center justify-center">
          <Send size={16} color="#fff" />
        </Press>
      </View>
      <ActionSheet visible={!!sheet} title={sheet?.title} actions={sheet?.actions ?? []} onClose={() => setSheet(null)} />
      <GroupShareImageSheet visible={rankShareOpen} onClose={() => setRankShareOpen(false)} groupName={data.group.name} members={data.members} userId={userId} target={challengeTarget} />
      <GroupShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} groupId={data.group.id} groupName={data.group.name} inviteCode={data.group.invite_code} />
    </KeyboardAvoidingView>
  );
}
