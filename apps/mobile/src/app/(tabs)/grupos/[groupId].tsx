import { createElement, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { View, ScrollView, Keyboard, Platform, Alert } from 'react-native';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { backSkipping, WIZARD_STEPS } from '@/lib/nav-back';
import { ChevronLeft, ChevronRight, Share2, MenuIcon, Send, Trophy, Plus, Flame, Check, IconBubble } from '@/components/icons';
import { CrownMark } from '@/components/CrownMark';
import { celebrate } from '@/store/useCelebrationStore';
import { useRuta } from '@/hooks/useRuta';
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
import { GoalBar } from '@/components/ui/GoalBar';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { localDay, plural } from '@/lib/format';
import { boliviaToday } from '@/lib/bolivia';
import { friendlyServerError } from '@/lib/errors';
import { Coin } from '@/components/ui/Coin';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { GroupDrawer } from '@/components/GroupDrawer';
import { groupGradient, groupTheme } from '@/lib/group-look';
import { uploadGroupBanner, uploadGroupPhoto } from '@/lib/avatar';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import { markNewGroupFormStale } from '@/lib/new-group-form';
import { pickPhoto as pickFromGallery } from '@/lib/pick-photo';

// Acción para lector de pantalla / control por switch: el menú del mensaje solo abría con toque largo.
const NOTE_ACTIONS = [{ name: 'options', label: 'Opciones del mensaje' }];

// Lunes de esta semana (hora local): identifica "la semana" para celebrar la meta una sola vez.
function weekKey() {
  const d = boliviaToday();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Cuánto se difumina la parte de abajo de la portada. En iPhone y Android el desenfoque se mide sobre los píxeles de
// la foto (más grandes que los de la pantalla), por eso el número es mayor que en la web para verse parecido.
const BANNER_BLUR = Platform.OS === 'web' ? 10 : 36;

// La parte difuminada de la portada: la misma foto, borrosa, que aparece de a poco de abajo hacia arriba. En el
// celular con MaskedView; en la web (solo para vistas previas) con una máscara CSS, porque MaskedView no la soporta ahí.
const BANNER_FADE_STOPS = { colors: ['transparent', 'transparent', 'rgba(0,0,0,0.8)', '#000'] as const, locations: [0, 0.36, 0.62, 1] as const };
function BannerBlurFade({ uri }: { uri: string }) {
  const img = <Image source={{ uri }} cachePolicy="memory-disk" contentFit="cover" blurRadius={BANNER_BLUR} style={{ flex: 1 }} />;
  if (Platform.OS === 'web') {
    const css = `linear-gradient(to bottom, ${BANNER_FADE_STOPS.colors.map((c, k) => `${c} ${BANNER_FADE_STOPS.locations[k] * 100}%`).join(', ')})`;
    return createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none', maskImage: css, WebkitMaskImage: css } }, img);
  }
  return (
    <MaskedView
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      maskElement={<LinearGradient colors={BANNER_FADE_STOPS.colors} locations={BANNER_FADE_STOPS.locations} style={{ flex: 1 }} />}
    >
      {img}
    </MaskedView>
  );
}

export default function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const kbOpen = useKeyboardVisible();
  const navigation = useNavigation();
  // Al abrir el teclado el chat queda a la vista (los mensajes están al final de la pantalla).
  useEffect(() => { if (kbOpen) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60); }, [kbOpen]);
  const goBack = () => backSkipping(navigation as never, WIZARD_STEPS, '/(tabs)/grupos');
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
  const { data: ruta } = useRuta();
  const { data: pending } = useQuery({
    queryKey: ['group-pending', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc('group_pending_invitees', { p_group: groupId! });
      if (error) return [] as { user_id: string; full_name: string | null; photo_url: string | null }[];
      return (rows ?? []) as { user_id: string; full_name: string | null; photo_url: string | null }[];
    },
  });
  const joinChallenge = useJoinChallenge(groupId);
  const { data: history } = useGroupHistory(groupId);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ title: string; actions: SheetAction[] } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lookBusy, setLookBusy] = useState(false);
  const [rankShareOpen, setRankShareOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const goalCardY = useRef(0);
  const [goalInput, setGoalInput] = useState('');
  const { data: lastResult } = useMyChallengeResult(groupId);
  const groupName = data?.group.name;
  // Recién creado o recién unido: escena de bienvenida, una vez. "Invitar amigos" abre la hoja para compartir.
  // Se recuerda POR GRUPO: la pantalla queda montada entre grupos, y con un sí/no la escena no salía al crear otro grupo.
  const welcomed = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !userId || (nuevo !== '1' && bienvenida !== '1') || welcomed.current === data.group.id) return;
    welcomed.current = data.group.id;
    Keyboard.dismiss();
    setEditingGoal(false);
    const me = { id: userId, name: profile?.full_name ?? 'Tú', photoUrl: profile?.photo_url ?? null };
    if (nuevo === '1') {
      celebrate({ kind: 'group-created', name: data.group.name, me, code: data.group.invite_code, target: data.group.challenge_target, onInvite: () => setShareOpen(true) });
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

  // Cierre de la semana que pasó: al entrar al grupo, una vez por semana, podio del grupo con fotos y tu puesto.
  useEffect(() => {
    if (!groupId || !userId || !data || !history?.length) return;
    const monday = boliviaToday();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const start = new Date(monday);
    start.setDate(start.getDate() - 7);
    const week = localDay(start);
    const rows = history.filter((r) => r.week_start === week);
    const mine = rows.find((r) => r.user_id === userId);
    const total = rows.reduce((a, r) => a + r.steps, 0);
    // Sin tu fila, con una sola persona o sin pasos, no hay nada que celebrar.
    if (!mine || rows.length < 2 || total <= 0) return;
    const key = `camina_gweek_${userId}_${groupId}_${week}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() - 1);
      const mes = (d: Date) => d.toLocaleDateString('es-BO', { month: 'short' }).replace('.', '');
      const photo = (id: string) => data.members.find((m) => m.id === id)?.photoUrl ?? null;
      celebrate({
        kind: 'group-week',
        name: data.group.name,
        weekLabel: `${start.getDate()} ${mes(start)} al ${sunday.getDate()} ${mes(sunday)}`,
        podium: rows.filter((r) => r.rank <= 3).slice(0, 3).map((r) => ({ id: r.user_id, name: r.name, photoUrl: photo(r.user_id), steps: r.steps })),
        meId: userId,
        myRank: mine.rank,
        mySteps: mine.steps,
        members: rows.length,
        total,
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, userId, !!data, history?.length]);

  function openGroupMenu() {
    setDrawerOpen(true);
  }

  // Foto y fondo los cambia solo quien creó el grupo (policies de la migración 0069).
  async function pickGroupPhoto() {
    if (!groupId) return;
    const picked = await pickFromGallery({ aspect: 1, max: 640 });
    if (!picked) return;
    setLookBusy(true);
    try {
      const url = await uploadGroupPhoto(groupId, picked.uri, null);
      const { error } = await supabase.from('groups').update({ photo_url: url }).eq('id', groupId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (e) {
      Alert.alert('No se pudo cambiar la foto', friendlyServerError(e, 'Intenta de nuevo.'));
    } finally {
      setLookBusy(false);
    }
  }

  // Portada (opcional): una foto ancha arriba del grupo. Sin portada queda el tema de color con su dibujo.
  async function pickGroupBanner() {
    if (!groupId) return;
    const picked = await pickFromGallery({ aspect: 16 / 10, max: 1280 });
    if (!picked) return;
    setLookBusy(true);
    try {
      const url = await uploadGroupBanner(groupId, picked.uri);
      const { error } = await supabase.from('groups').update({ banner_url: url }).eq('id', groupId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (e) {
      Alert.alert('No se pudo poner la portada', friendlyServerError(e, 'Intenta de nuevo.'));
    } finally {
      setLookBusy(false);
    }
  }
  async function removeGroupBanner() {
    if (!groupId) return;
    const { error } = await supabase.from('groups').update({ banner_url: null }).eq('id', groupId);
    if (error) { Alert.alert('No se pudo quitar la portada', friendlyServerError(error, 'Intenta de nuevo.')); return; }
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  }

  // El nombre pasa por el filtro de palabras del servidor (guard_group_name) y solo lo cambia quien creó el grupo.
  async function renameGroup(newName: string) {
    if (!groupId || newName.length < 2) return false;
    if (newName === data?.group.name) return true;
    setLookBusy(true);
    const { error } = await supabase.from('groups').update({ name: newName }).eq('id', groupId);
    setLookBusy(false);
    if (error) {
      Alert.alert('No se pudo cambiar el nombre', friendlyServerError(error, 'Intenta de nuevo.'));
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    return true;
  }

  // El fondo se aplica al instante (en el detalle y en la lista de Grupos) y el guardado va en segundo plano;
  // si falla, se vuelve al fondo anterior.
  async function pickGroupBackground(key: string) {
    if (!groupId) return;
    const prevDetail = queryClient.getQueryData<any>(['group-detail', groupId]);
    const prevList = queryClient.getQueryData<any[]>(['groups']);
    const prevKey = prevDetail?.group?.background ?? null;
    const hadBanner = !!prevDetail?.group?.banner_url;
    if (prevKey === key && !hadBanner) return;
    // Tocar un color también quita la foto de portada (si no, la foto seguía tapando el color).
    queryClient.setQueryData<any>(['group-detail', groupId], (d: any) => (d ? { ...d, group: { ...d.group, background: key, banner_url: null } } : d));
    queryClient.setQueryData<any[]>(['groups'], (l) => (l ? l.map((g) => (g.id === groupId ? { ...g, background: key, banner_url: null } : g)) : l));
    const { error } = await supabase.from('groups').update({ background: key, banner_url: null }).eq('id', groupId);
    if (error) {
      queryClient.setQueryData(['group-detail', groupId], prevDetail);
      queryClient.setQueryData(['groups'], prevList);
      Alert.alert('No se pudo cambiar el fondo', friendlyServerError(error, 'Intenta de nuevo.'));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  }

  function confirmExit(del: boolean) {
    const creator = data?.group.created_by === userId;
    Alert.alert(
      del ? '¿Eliminar este grupo?' : '¿Salir de este grupo?',
      del
        ? 'Se borran el grupo, el chat, el historial y los desafíos para todos los miembros. Los puntos puestos en un desafío activo se devuelven. No se puede deshacer.'
        : creator
          ? 'Eres quien creó el grupo: la administración pasa a la persona más antigua del grupo. Si eres la única, el grupo se elimina.'
          : 'Dejas de ver el ranking y el chat. Puedes volver a entrar con el código o el link de invitación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: del ? 'Eliminar grupo' : 'Salir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc(del ? 'delete_group' : 'leave_group', { p_group: groupId! });
            if (error) {
              Alert.alert(del ? 'No se pudo eliminar' : 'No se pudo salir', friendlyServerError(error, 'Intenta de nuevo.'));
              return;
            }
            queryClient.removeQueries({ queryKey: ['group-detail', groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['my-groups-week'] });
            markNewGroupFormStale();
            router.replace('/(tabs)/grupos');
          },
        },
      ]
    );
  }

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
        { label: 'Ver perfil', onPress: () => openProfile(m.id) },
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
        <Spinner color={colors.aqua} accessibilityLabel="Cargando" />
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
          onPress={goBack}
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
  const theme = groupTheme(data.group.background);
  const bannerUrl = (data.group as { banner_url?: string | null }).banner_url ?? null;
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
  // Sumarse al desafío en marcha (desde la tarjeta del desafío o desde su tarjeta en el chat).
  async function joinActive() {
    if (!active || !data) return;
    const others = (ch?.standings ?? []).filter((st) => st.user_id !== userId).map((st) => {
      const m = data.members.find((x) => x.id === st.user_id);
      return { id: st.user_id, name: m?.name ?? 'Caminante', photoUrl: m?.photoUrl ?? null };
    });
    const me = data.members.find((x) => x.id === userId);
    try {
      // Desafío de la Ruta: quien se suma queda anotado en la Ruta del mes si todavía no estaba.
      if (active.rule === 'ruta' && ruta && !ruta.joined) {
        await supabase.rpc('route_join');
        queryClient.invalidateQueries({ queryKey: ['ruta'] });
      }
      await joinChallenge.mutateAsync(active.id);
      celebrate({
        kind: 'challenge-joined',
        name: active.name,
        me: { id: userId ?? 'yo', name: me?.name ?? 'Tú', photoUrl: me?.photoUrl ?? null },
        others,
        stake: active.stake,
        potBefore: pot,
        subtitle: active.rule === 'ruta'
          ? `Cada local de tu Ruta que visites ya cuenta. ${others.length + 1} ${plural(others.length + 1, 'caminante', 'caminantes')}, ${left + 1} ${plural(left + 1, 'día', 'días')}.`
          : `Tus pasos de hoy ya cuentan. ${others.length + 1} ${plural(others.length + 1, 'caminante', 'caminantes')}, ${left + 1} ${plural(left + 1, 'día', 'días')}.`,
      });
    } catch (e) {
      Alert.alert('No se pudo sumar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }


  return (
    <KeyboardSafe className="flex-1 bg-bg-light dark:bg-bg-dark">
      <LinearGradient pointerEvents="none" colors={[theme.wash + '66', theme.wash + '22', 'transparent']} locations={[0, 0.45, 0.8]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <ScrollView showsVerticalScrollIndicator={false} ref={scrollRef} className="flex-1" contentContainerClassName="pb-4" keyboardShouldPersistTaps="handled">
        {/* Portada: la foto que eligió el grupo o, si no puso, el degradé de su color. */}
        <LinearGradient colors={groupGradient(data.group.background)} style={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: insets.top + 8, paddingBottom: 0, overflow: 'hidden' }}>
          {bannerUrl ? (
            // Portada con foto: nítida arriba y, de abajo hacia arriba, cada vez más difuminada y oscura (morado oscuro
            // del tema), así el podio y los nombres se leen siempre, sea cual sea la foto.
            <>
              <Image source={{ uri: bannerUrl }} cachePolicy="memory-disk" contentFit="cover" transition={200} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              {/* Copia difuminada de la misma foto que aparece de a poco de abajo hacia arriba (máscara con degradé):
                  sin cortes ni líneas entre la parte nítida y la difuminada. */}
              <BannerBlurFade uri={bannerUrl} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors[1] + '14' }} />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(10,6,20,0.4)', 'rgba(10,6,20,0)', theme.colors[2] + '33', theme.colors[2] + '80', theme.colors[2] + 'C2']}
                locations={[0, 0.26, 0.58, 0.82, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </>
          ) : null}
          <View className="flex-row items-center justify-between px-5">
            <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (nuevo === '1' ? router.replace('/(tabs)/grupos') : goBack())} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ChevronLeft size={18} color="#fff" />
            </Press>
            {/* Nombre del grupo con su foto, en una pastilla (como el nombre de un chat). */}
            <View className="flex-1 items-center px-2">
              <View className="flex-row items-center" style={{ gap: 8, maxWidth: '100%', paddingLeft: 4, paddingRight: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                <AvatarImage
                  uri={data.group.photo_url}
                  style={{ width: 32, height: 32, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' }}
                  fallback={
                    <View style={{ width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{data.group.name.trim()[0]?.toUpperCase()}</Text>
                    </View>
                  }
                />
                <View className="flex-shrink">
                  <Text className="text-[15.5px] font-bold text-white" numberOfLines={1}>{data.group.name}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }} numberOfLines={1}>{data.members.length} {plural(data.members.length, 'miembro', 'miembros')}</Text>
                </View>
              </View>
            </View>
            <Press accessibilityRole="button" accessibilityLabel="Menú del grupo" onPress={openGroupMenu} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <MenuIcon size={18} color="#fff" />
            </Press>
          </View>

          <View className="flex-row items-end justify-center px-6" style={{ marginTop: 52, gap: 10 }}>
            {podiumOrder.map((m) => {
              const rank = data.members.findIndex((x) => x.id === m.id);
              return (
                <View key={m.id} className="items-center" style={{ width: 92 }}>
                  {rank === 0 && <View importantForAccessibility="no" accessibilityElementsHidden style={{ marginBottom: 3 }}><CrownMark size={44} /></View>}
                  <AvatarImage
                    uri={m.photoUrl}
                    style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}
                    fallback={
                      <View style={{ width: rank === 0 ? 54 : 46, height: rank === 0 ? 54 : 46, borderRadius: 27, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                        <Text style={{ fontWeight: '900', color: colors.mintDark, fontSize: 18 }}>{m.name[0]?.toUpperCase()}</Text>
                      </View>
                    }
                  />
                  {/* Con foto de portada, el nombre y los pasos van en una burbujita oscura: se leen sobre cualquier foto. */}
                  <View style={bannerUrl ? { marginTop: 4, maxWidth: '100%', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(12,8,24,0.55)' } : { alignItems: 'center', maxWidth: '100%' }}>
                    <Text className={`text-[12px] text-white ${bannerUrl ? 'font-semibold' : 'mt-1'}`} numberOfLines={1}>{m.id === userId ? 'Tú' : m.name}</Text>
                    <Text className="text-[12px]" style={{ color: bannerUrl ? '#DCD3F5' : colors.authMuted }}>{m.steps >= 1000 ? `${Math.round(m.steps / 100) / 10}k` : m.steps} pasos</Text>
                  </View>
                  <View
                    style={{
                      width: '100%', height: heights[rank] ?? 58, marginTop: 6, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                      backgroundColor: rank === 0 ? 'rgba(98,240,182,0.28)' : 'rgba(255,255,255,0.12)',
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

        {/* La semana del grupo en una sola tarjeta: pasos, tu puesto, la meta (y cambiarla) y compartir el ranking. */}
        <Glass onLayout={(e) => { goalCardY.current = e.nativeEvent.layout.y; }} className="mx-5 mt-3 mb-3 rounded-3xl p-4" style={challengePct >= 100 ? { borderColor: colors.aqua, borderWidth: 1.5 } : undefined}>
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Pasos del grupo</Text>
              <Text className="text-[22px] font-extrabold text-text-light dark:text-text-dark"><AnimatedNumber value={totalSteps} id={`group-goal-${groupId}`} /></Text>
            </View>
            <View className="w-px mx-3.5 bg-line-light dark:bg-line-dark" />
            <View className="flex-1">
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Tu puesto</Text>
              <Text className="text-[22px] font-extrabold text-text-light dark:text-text-dark">
                {myRank ? `${myRank}.º` : '-'}
                <Text className="text-[13px] font-semibold text-muted-light dark:text-muted-dark"> de {data.members.length}</Text>
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-3.5 mb-2">
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">
              Meta de la semana · <Text className="font-bold text-text-light dark:text-text-dark">{challengeTarget.toLocaleString('es-BO')}</Text>
            </Text>
            {isCreator && !editingGoal ? (
              <Press
                accessibilityRole="button"
                onPress={() => {
                  setGoalInput(String(challengeTarget));
                  setEditingGoal(true);
                }}
                hitSlop={8}
                className="rounded-full px-3 py-1 bg-purple-light-light dark:bg-purple-light-dark"
              >
                <Text className="text-[11.5px] font-semibold text-purple-ink dark:text-purple-soft">Cambiar meta</Text>
              </Press>
            ) : (
              <Text className="text-[12.5px] font-bold" style={{ color: accentText }}>{Math.floor(challengePct)}%</Text>
            )}
          </View>
          {editingGoal && (
            <View className="flex-row items-center gap-2 mb-3">
              <TextInput
                value={goalInput}
                onChangeText={(v) => setGoalInput(v.replace(/\D/g, '').slice(0, 7))}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, goalCardY.current - 12), animated: true }), 250)}
                placeholder="Meta semanal de pasos"
                accessibilityLabel="Meta semanal de pasos"
                placeholderTextColor={muted}
                className="flex-1 bg-bg-light dark:bg-bg-dark rounded-full px-3.5 py-2 text-[15px] font-semibold text-text-light dark:text-text-dark"
              />
              <Press accessibilityRole="button" onPress={saveGoal} className="bg-purple-deep rounded-full px-3.5 py-2">
                <Text className="text-xs font-semibold text-white">Guardar</Text>
              </Press>
              <Press accessibilityRole="button" onPress={() => setEditingGoal(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark">Cancelar</Text>
              </Press>
            </View>
          )}
          <GoalBar pct={challengePct} accent={theme.accent} />
          {challengePct >= 100 ? (
            <View className="flex-row items-center mt-2.5 rounded-xl px-3 py-2" style={{ gap: 6, backgroundColor: 'rgba(79,195,168,0.14)' }}>
              <Check size={14} color={accentIcon} />
              <Text className="text-[12.5px] font-bold" style={{ color: accentText }}>¡Lo lograron juntos!</Text>
            </View>
          ) : null}
          <Press
            accessibilityRole="button"
            accessibilityLabel="Compartir el ranking del grupo como imagen"
            onPress={() => setRankShareOpen(true)}
            className="mt-3.5 flex-row items-center justify-center rounded-2xl"
            style={{ gap: 9, paddingVertical: 12, backgroundColor: theme.accentDeep }}
          >
            <Share2 size={16} color="#fff" weight="bold" />
            <Text className="text-white font-bold text-[13.5px]">Compartir ranking</Text>
          </Press>
        </Glass>

        {/* Desafío del grupo: el que está en marcha o, si no hay, una fila corta para crear uno. */}
        {active ? (
          <Glass className="mx-5 rounded-2xl p-4 mb-3" style={{ borderColor: colors.aqua, borderWidth: 1.5 }}>
            <Press accessibilityRole="button" accessibilityLabel="Ver cómo va el reto" onPress={() => router.push({ pathname: '/(tabs)/grupos/reto', params: { groupId: data.group.id } })} className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                <IconBubble icon={Trophy} tone="gold" size={34} />
                <View className="flex-1">
                  <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>{active.name}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                    {RULE_LABEL[active.rule]} · {active.rule === 'ruta' ? 'más locales gana' : `meta ${active.daily_goal.toLocaleString('es-BO')}`} · {today < active.start_day ? 'empieza pronto' : left === 0 ? 'último día' : `${plural(left, 'queda', 'quedan')} ${left} ${plural(left, 'día', 'días')}`}
                  </Text>
                </View>
              </View>
              {pot > 0 && (
                <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ gap: 5, backgroundColor: 'rgba(79,195,168,0.18)' }}>
                  <Coin size={15} />
                  <Text className="text-[12.5px] font-extrabold text-mint-dark dark:text-mint">{pot}</Text>
                </View>
              )}
              <ChevronRight size={16} color={muted} />
            </Press>
            {(ch?.standings ?? []).slice(0, 3).map((st, i) => (
              <View key={st.user_id} className="flex-row items-center py-1" style={{ gap: 8 }}>
                <Text className="w-4 text-[12px] font-bold text-text-light dark:text-text-dark">{i + 1}</Text>
                <Text className="flex-1 text-[12.5px] text-text-light dark:text-text-dark" numberOfLines={1}>{st.user_id === userId ? `${nameOf(st.user_id)} (tú)` : nameOf(st.user_id)}</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                  {active.rule === 'steps' ? st.steps.toLocaleString('es-BO') : active.rule === 'days' ? `${st.goal_days} ${plural(st.goal_days, 'día', 'días')}` : active.rule === 'ruta' ? `${st.ruta_visits ?? 0} de 3 locales` : `racha ${st.best_streak}`}
                </Text>
              </View>
            ))}
            {canJoin ? (
              <Press
                accessibilityRole="button"
                onPress={joinActive}
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
          <Glass className="mx-5 rounded-2xl p-3.5 mb-3">
            <Press accessibilityRole="button" accessibilityLabel="Crear un desafío para el grupo" onPress={() => router.push({ pathname: '/(tabs)/grupos/nuevo-desafio', params: { groupId: data.group.id } })} className="flex-row items-center" style={{ gap: 12 }}>
              <IconBubble icon={Flame} tone="orange" size={38} />
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark">Sin desafíos por ahora</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Elijan la regla, la meta y los Puntos en juego.</Text>
              </View>
              <View className="bg-mint rounded-full px-3.5 py-2 flex-row items-center" style={{ gap: 4 }}>
                <Plus size={13} color={colors.mintDark} />
                <Text className="text-mint-dark font-bold text-[12.5px]">Crear</Text>
              </View>
            </Press>
          </Glass>
        )}
        {/* El último desafío que terminó, en una línea: quién ganó y cómo te fue. */}
        {lastResult && !active ? (
          <View className="mx-6 mb-3 flex-row items-center" style={{ gap: 8 }}>
            <Trophy size={14} color={warnText} />
            <Text className="flex-1 text-[12px] text-muted-light dark:text-muted-dark" numberOfLines={1}>
              Último: {lastResult.name} · ganó {lastResult.results[0]?.user_id === userId ? 'tú' : nameOf(lastResult.results[0]?.user_id ?? '')} · quedaste {lastResult.mine.rank}.º
            </Text>
          </View>
        ) : null}

        <Glass className="mx-5 rounded-2xl p-4 mb-3">
          <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
            <IconBubble icon={Trophy} tone="gold" size={34} />
            <Text className="flex-1 text-[13px] font-bold text-text-light dark:text-text-dark">
              Ranking de la semana
            </Text>
          </View>
          {(rankOpen ? data.members : data.members.slice(0, 5)).map((m, i) => (
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
          {(rankOpen || data.members.length <= 5 ? pending ?? [] : []).map((p) => (
            <View key={p.user_id} className="flex-row items-center gap-3 py-1.5" style={{ opacity: 0.7 }}>
              <Text className="w-5 text-xs font-bold text-muted-light dark:text-muted-dark">·</Text>
              <AvatarImage
                uri={p.photo_url}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                fallback={
                  <View className="w-8 h-8 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                    <Text className="text-purple-ink dark:text-purple-soft text-xs font-bold">{(p.full_name ?? 'C')[0]?.toUpperCase()}</Text>
                  </View>
                }
              />
              <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" numberOfLines={1}>{p.full_name ?? 'Caminante'}</Text>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Invitación enviada</Text>
            </View>
          ))}
          {/* Hasta 5 personas a la vista; el resto con "Ver más". */}
          {data.members.length > 5 ? (
            <Press accessibilityRole="button" onPress={() => setRankOpen((v) => !v)} hitSlop={8} className="items-center pt-2.5 mt-1 border-t border-line-light dark:border-line-dark">
              <Text className="text-[12.5px] font-bold" style={{ color: accentText }}>{rankOpen ? 'Ver menos' : `Ver más (${data.members.length - 5})`}</Text>
            </Press>
          ) : null}
        </Glass>
      {(history ?? []).length > 0 && (
        <View className="mx-5 bg-card-light dark:bg-card-dark rounded-2xl p-4 mb-3">
          <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-2">Semanas anteriores</Text>
          {Array.from(new Set((history ?? []).map((r) => r.week_start))).slice(0, 8).map((week, idx) => {
            const rows = (history ?? []).filter((r) => r.week_start === week);
            const open = openWeek === week;
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


        <View className="mx-5 mt-1 mb-2 flex-row items-baseline justify-between">
          <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">Chat del grupo</Text>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark">se vacía cada mes</Text>
        </View>
        <View className="px-5 gap-2 pb-2">
        {(notes ?? []).filter((n) => !blocks.ids.has(n.user_id)).map((n) => {
          const mine = n.user_id === userId;
          // Tarjeta del sistema: alguien creó un desafío. Desde acá mismo se puede sumar.
          if (n.kind === 'challenge') {
            const live = !!active && n.challenge_id === active.id;
            return (
              <Press
                key={n.id}
                accessibilityRole="button"
                accessibilityLabel={`Desafío ${n.text}. Ver cómo va`}
                onPress={() => router.push({ pathname: '/(tabs)/grupos/reto', params: { groupId: data.group.id } })}
                className="self-center my-1"
                style={{ width: '92%' }}
              >
                <View className="rounded-3xl p-3.5" style={{ backgroundColor: 'rgba(98,240,182,0.10)', borderWidth: 1.5, borderColor: 'rgba(98,240,182,0.45)' }}>
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <IconBubble icon={Trophy} tone="gold" size={36} />
                    <View className="flex-1">
                      <Text className="text-[11.5px] font-bold text-muted-light dark:text-muted-dark">
                        {mine ? 'Creaste un desafío' : `${(n.author?.full_name ?? 'Alguien').split(' ')[0]} creó un desafío`}
                      </Text>
                      <Text className="text-[15px] font-extrabold text-text-light dark:text-text-dark" numberOfLines={1}>{n.text}</Text>
                      {live && (
                        <Text className="text-[12px] text-muted-light dark:text-muted-dark">
                          {RULE_LABEL[active.rule]}{active.stake > 0 ? ` · ${active.stake} Puntos cada uno` : ''} · {ch?.entries ?? 0} {plural(ch?.entries ?? 0, 'persona', 'personas')} adentro
                        </Text>
                      )}
                    </View>
                  </View>
                  {live && canJoin ? (
                    <Press accessibilityRole="button" onPress={joinActive} disabled={joinChallenge.isPending} className="bg-mint rounded-2xl py-2.5 items-center mt-2.5">
                      <Text className="text-mint-dark font-bold text-[13.5px]">Participar{active.stake > 0 ? ` · pones ${active.stake}` : ''}</Text>
                    </Press>
                  ) : (
                    <Text className="text-[12px] font-bold mt-2 text-center" style={{ color: accentText }}>
                      {live ? (ch?.joined ? '✓ Ya estás dentro' : 'Ya empezó: ya no se puede sumar') : 'Este desafío ya terminó'}
                    </Text>
                  )}
                </View>
              </Press>
            );
          }
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

      <View className="flex-row items-end gap-2.5 px-5 pt-2.5 border-t border-line-light dark:border-line-dark" style={{ paddingBottom: kbOpen ? 10 : Math.max(insets.bottom, 10) }}>
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
      <GroupDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        name={data.group.name}
        photoUrl={data.group.photo_url}
        background={data.group.background}
        bannerUrl={bannerUrl}
        onPickBanner={pickGroupBanner}
        onRemoveBanner={removeGroupBanner}
        memberCount={data.members.length}
        inviteCode={data.group.invite_code}
        goal={challengeTarget}
        isCreator={isCreator}
        busy={lookBusy}
        onInvite={() => { setDrawerOpen(false); setShareOpen(true); }}
        onEditGoal={() => { setDrawerOpen(false); setGoalInput(String(challengeTarget)); setEditingGoal(true); }}
        onPickPhoto={pickGroupPhoto}
        onPickBackground={pickGroupBackground}
        onRename={renameGroup}
        onLeave={() => { setDrawerOpen(false); confirmExit(false); }}
        onDelete={() => { setDrawerOpen(false); confirmExit(true); }}
      />
      <GroupShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} groupId={data.group.id} groupName={data.group.name} inviteCode={data.group.invite_code} progress={{ members: data.members.length, total: totalSteps, target: challengeTarget }} />
    </KeyboardSafe>
  );
}
