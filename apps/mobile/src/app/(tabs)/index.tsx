import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { View, ScrollView, Image, Linking, RefreshControl, Animated, Easing, Platform, AccessibilityInfo } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { PointsCounter, usePointsPulse } from '@/components/ui/PointsCounter';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BellButton } from '@/components/ui/BellButton';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { useTodaySteps } from '@/hooks/usePedometer';
import { useIsQa } from '@/hooks/useIsQa';
import { usePointsBalance, useSyncSteps, usePointsExpiringSoon } from '@/hooks/usePoints';
import { useHomeMoments } from '@/hooks/useMoments';
import { buzz } from '@/lib/haptics';
import { useBenefits, useMyRedemptions, useMyStoryShares } from '@/hooks/useBenefits';
import { useStoryFlow } from '@/components/story/StoryFlow';
import { storyStateFor } from '@/lib/story';
import { useGroups } from '@/hooks/useGroups';
import { useStreaks } from '@/hooks/useStreak';
import { StreaksSheet } from '@/components/StreaksSheet';
import { syncStreakReminders } from '@/lib/streak-reminders';
import { useWeeklyGoalReto } from '@/hooks/useRetos';
import { useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { useFriends, useFriendRequests } from '@/hooks/useFriends';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { colors } from '@/theme/tokens';
import { plural } from '@/lib/format';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT, MIN_DAILY_GOAL, DEFAULT_DAILY_GOAL, GOOD_DAILY_GOAL } from '@/constants/business-rules';
import { Flame, ChevronRight, Users, UserPlus, Trophy, Target, Activity, Check, IconBubble, type IconProps, Pencil } from '@/components/icons';
import { HomeAdBanner, HomePromoSections } from '@/components/home/HomePromos';
import { NearbyRow, MyRedemptionsSection, useHomePosition, type RedemptionRow } from '@/components/home/HomeSections';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { WORDMARK_FAMILY, brandFontsReady } from '@/theme/fonts';
import { CoinFlight, coinFlightPath, type CoinFlightPath } from '@/components/home/CoinFlight';
import { Coin } from '@/components/ui/Coin';

// Color de los Puntos del día: el aro fino, el chip "+N Puntos" y "Tope de hoy" usan este mismo verde.
const POINTS_COLOR = '#2CFFAE';

function localDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function greeting(name: string) {
  const h = new Date().getHours();
  const label = name.trim().split(/\s+/)[0] || 'caminante';
  if (h < 6) return `¿Todavía despierto, ${label}?`;
  if (h < 12) return `Buen día, ${label}`;
  if (h < 19) return `Buenas tardes, ${label}`;
  return `Buenas noches, ${label}`;
}

function LinkRow({
  icon, tone, title, value, onPress, last, alert,
}: { icon: (p: IconProps) => React.ReactElement; tone: 'aqua' | 'purple' | 'gold'; title: string; value: string; onPress: () => void; last?: boolean; alert?: boolean }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      onPress={onPress}
      className={`flex-row items-center justify-between p-4 ${last ? '' : 'border-b border-line-light dark:border-line-dark'}`}
    >
      <View className="flex-row items-center gap-2.5">
        <IconBubble icon={icon} tone={tone} size={34} />
        <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">{title}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        {alert && <View accessible={false} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dangerFill }} />}
        <Text className="text-xs text-muted-light dark:text-muted-dark">{value}</Text>
        <ChevronRight size={14} color={isDark ? colors.dark.muted : colors.light.muted} />
      </View>
    </Press>
  );
}

export default function HomeScreen() {
  const isDark = useColorScheme().colorScheme === 'dark';
  const tabSpace = useTabBarSpace();
  // Debajo de la barra de estado (hora, batería): en Android el contenido llega hasta el borde de la pantalla.
  const topInset = useSafeAreaInsets().top;
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { steps: deviceSteps, available: deviceAvailable, healthConnectStatus: hcStatus, live: deviceLive, source: stepSource, refresh: refreshSteps } = useTodaySteps();
  // Cuenta de prueba: siempre tiene pasos de sobra para poder probar canjes.
  const isQa = useIsQa();
  const steps = isQa ? Math.max(deviceSteps, 15000) : deviceSteps;
  const live = isQa ? true : deviceLive;
  const available = isQa ? true : deviceAvailable;
  const healthConnectStatus = isQa ? 'ok' : hcStatus;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshSteps(), queryClient.invalidateQueries()]);
    setRefreshing(false);
  }
  const { data: balance, isError: balanceError } = usePointsBalance();
  const pointsPulse = usePointsPulse(balance);
  const { data: benefits, isLoading: benefitsLoading } = useBenefits();
  const { data: redemptions, isLoading: redemptionsLoading } = useMyRedemptions();
  const { data: storyShares } = useMyStoryShares();
  const story = useStoryFlow();
  const pos = useHomePosition();
  const { data: groups } = useGroups();
  const { data: streaks } = useStreaks();
  const streak = streaks?.racha;
  const [streaksOpen, setStreaksOpen] = useState(false);
  useHomeMoments(streak);
  const { data: expiring } = usePointsExpiringSoon(14);
  const { data: reto } = useWeeklyGoalReto();
  const { data: myRank } = useMyWeeklyRank();
  const { data: friends } = useFriends();
  const { data: friendRequests } = useFriendRequests();
  const syncSteps = useSyncSteps();
  const lastSynced = useRef(0);
  // Reintento del envío de pasos: valor que se reintenta, cuántas veces y el temporizador pendiente.
  const retryFor = useRef({ steps: 0, tries: 0 });
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    if (live && steps > 0 && steps !== lastSynced.current) {
      lastSynced.current = steps;
      if (retryFor.current.steps !== steps) retryFor.current = { steps, tries: 0 };
      syncSteps.mutate(steps, {
        onError: (error) => {
          // Ese valor no quedó sincronizado: se reintenta con la próxima lectura o, si los pasos no cambian, a los ~15 s (hasta 3 veces).
          if (lastSynced.current === steps) lastSynced.current = 0;
          if (/No autorizado|Fecha de sincronización inválida/.test(error.message)) return;
          if (retryFor.current.steps !== steps || retryFor.current.tries >= 3) return;
          retryFor.current.tries += 1;
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => setRetryTick((t) => t + 1), 15_000);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, live, retryTick]);
  // Al salir de Inicio no queda ningún reintento pendiente.
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, []);

  const goal = Math.max(profile?.daily_goal ?? DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL);
  const pct = goal > 0 ? steps / goal : 0;
  const goalMet = steps >= goal;
  // Avisos de racha de día y de noche (los programa el teléfono): se reemplazan cuando cambia la racha, la meta o si ya se cumplió hoy.
  useEffect(() => {
    if (streak === undefined) return;
    syncStreakReminders({ streak, stepsToday: steps, goal });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los pasos sueltos no reprograman: solo cuenta si ya llegó a la meta.
  }, [streak, goal, goalMet]);
  const pointsToday = Math.min(Math.floor(steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP);
  // Celebraciones suaves (una sola vez por Punto nuevo y por meta del día):
  // - cada Punto nuevo: el chip "+N Puntos" late;
  // - al llegar a la meta del día: dos ondas verdes salen del aro y aparece "Meta cumplida".
  // Moneda que viaja: cada Punto nuevo sale del chip "+N Puntos" del aro, cruza la pantalla y entra en la moneda del saldo de arriba.
  // Al llegar, el saldo late y sale un aro. Con "reducir movimiento" no vuela (queda el latido del chip).
  const rootRef = useRef<View>(null);
  const chipRef = useRef<View>(null);
  const pillRef = useRef<View>(null);
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion.current = v; }).catch(() => {});
  }, []);
  const [pillBump] = useState(() => new Animated.Value(0));
  const [flight, setFlight] = useState<CoinFlightPath | null>(null);
  const flying = useRef(false);
  // Puntos que se ganaron mientras otra moneda iba volando: cada uno sale después, uno por uno.
  const pendingCoins = useRef(0);
  const flyingSince = useRef(0);
  function launchCoin() {
    if (reduceMotion.current) return;
    // Si una moneda quedó trabada (p. ej. se cortó al cambiar de pestaña), no bloquea las siguientes.
    if (flying.current && Date.now() - flyingSince.current < 6000) { pendingCoins.current += 1; return; }
    const root = rootRef.current, chip = chipRef.current, pill = pillRef.current;
    if (!root || !chip || !pill) return;
    flying.current = true;
    flyingSince.current = Date.now();
    root.measureInWindow((ox, oy) => {
      chip.measureInWindow((cx, cy, cw, ch) => {
        pill.measureInWindow((px, py, pw, ph) => {
          if (!pw || !cw) { flying.current = false; return; }
          // Desde el centro del chip hasta el centro de la moneda del saldo (pl-1.5 = 6 px y moneda de 18 px).
          const x0 = cx + cw / 2 - ox, y0 = cy + ch / 2 - oy;
          const x1 = px + 6 + 9 - ox, y1 = py + ph / 2 - oy;
          setFlight(coinFlightPath(x0, y0, x1, y1));
        });
      });
    });
  }
  const bumpScale = pillBump.interpolate({ inputRange: [0, 0.22, 1], outputRange: [1, 1.14, 1] });
  const chipPop = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const goalIn = useRef(new Animated.Value(goalMet ? 1 : 0)).current;
  // Lo que ya se celebró hoy (Puntos del día y meta) queda guardado en el teléfono: cada Punto nuevo y la meta se
  // celebran una sola vez, aunque se haya ganado con la app cerrada, y no se repiten cada vez que se vuelve a entrar.
  const celebrating = useRef(false);
  const seen = useRef<{ day: string; points: number; goal: boolean } | null>(null);
  const [seenReady, setSeenReady] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSeenReady(false);
    AsyncStorage.getItem(`camina_home_seen_${userId}`)
      .then((raw) => { seen.current = raw ? JSON.parse(raw) : null; })
      .catch(() => { seen.current = null; })
      .finally(() => { if (!cancelled) setSeenReady(true); });
    return () => { cancelled = true; };
  }, [userId]);
  useEffect(() => {
    if (!live || !seenReady || !userId) return;
    const day = localDayKey();
    const before = seen.current?.day === day ? seen.current : { day, points: 0, goal: false };
    const newPoint = pointsToday > before.points;
    const newGoal = goalMet && !before.goal;
    if (!newPoint && !newGoal) return;
    seen.current = { day, points: Math.max(before.points, pointsToday), goal: before.goal || goalMet };
    AsyncStorage.setItem(`camina_home_seen_${userId}`, JSON.stringify(seen.current)).catch(() => {});
    if (newPoint) {
      buzz.light();
      // Una moneda por cada Punto nuevo (si de golpe se ganaron 3, salen 3 una tras otra).
      for (let i = 0; i < Math.min(pointsToday - before.points, 5); i++) launchCoin();
      chipPop.setValue(0);
      Animated.timing(chipPop, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    if (newGoal) {
      [wave1, wave2].forEach((w) => w.setValue(0));
      celebrating.current = true;
      buzz.success();
      goalIn.setValue(0);
      Animated.parallel([
        Animated.timing(wave1, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(wave2, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.spring(goalIn, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      ], { stopTogether: false }).start(() => { celebrating.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsToday, goalMet, live, seenReady, userId]);
  useEffect(() => { if (goalMet && !celebrating.current) goalIn.setValue(1); }, [goalMet, goalIn]);
  const waveStyle = (w: Animated.Value) => ({
    opacity: w.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.65, 0] }),
    transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.22] }) }],
  });
  const chipScale = chipPop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.22, 1] });

  const stepsText = steps.toLocaleString('es-BO');
  const stepsFontSize = stepsText.length <= 5 ? 46 : 36;
  // Los grupos de la persona: se puede estar en más de uno.
  const myGroups = (groups ?? []).filter((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const groupsValue = myGroups.length === 0 ? 'Ninguno' : myGroups.length === 1 ? '1 activo' : `${myGroups.length} activos`;

  const goalDraft = parseInt(goalInput, 10) || 0;
  const goalHint =
    goalDraft < MIN_DAILY_GOAL
      ? `La meta mínima es ${MIN_DAILY_GOAL.toLocaleString('es-BO')} pasos`
      : goalDraft >= GOOD_DAILY_GOAL
        ? '¡Muy bien! Una meta que suma'
        : '¡Tú puedes más!';
  // iOS ignora accessibilityLiveRegion: cuando el aviso cambia mientras se edita la meta, se anuncia a mano.
  const lastGoalHint = useRef('');
  useEffect(() => {
    const prev = lastGoalHint.current;
    lastGoalHint.current = editingGoal ? goalHint : '';
    if (editingGoal && prev && prev !== goalHint && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(goalHint);
  }, [editingGoal, goalHint]);

  // Aviso de Puntos por vencer: el mismo texto se ve y se lee.
  const expiringMsg =
    expiring && expiring.amount > 0
      ? `${expiring.amount} ${plural(expiring.amount, 'Punto vence', 'Puntos vencen')} ${expiring.days <= 0 ? 'hoy' : `en ${expiring.days} ${plural(expiring.days, 'día', 'días')}`}`
      : '';
  const expiringHint = expiring?.amount === 1 ? 'Canjéalo antes de perderlo' : 'Canjéalos antes de perderlos';

  async function saveGoal() {
    const n = parseInt(goalInput, 10);
    if (n < MIN_DAILY_GOAL) return; // el aviso de meta mínima ya se ve debajo
    if (profile && n > 0) {
      await supabase.from('profiles').update({ daily_goal: n }).eq('id', profile.id);
      await useAuthStore.getState().refreshProfile();
    }
    setEditingGoal(false);
  }

  return (
    <View ref={rootRef} className="flex-1">
    <ScrollView showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: tabSpace }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint} colors={[colors.aqua]} progressBackgroundColor={colors.authBgSoft} />}
    >
      <LinearGradient
        colors={colors.headerGradient}
        start={{ x: 0.15, y: -0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={{ borderRadius: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingBottom: 22, overflow: 'hidden' }}
      >
        <View style={{ paddingTop: Platform.OS === 'android' ? topInset + 28 : Math.max(topInset, 24) + 14 }}>
        <View className="px-5" style={{ position: 'relative' }}>
          <View className="flex-row justify-between items-center" style={{ height: 32 }}>
            <Animated.View ref={pillRef} style={{ transform: [{ scale: pointsPulse.scale }, { scale: bumpScale }] }}>
            <Press
              accessibilityRole="button"
              accessibilityLabel={balanceError && balance === undefined ? 'Puntos, ver detalle' : `${balance ?? 0} Puntos, ver detalle`}
              hitSlop={6}
              onPress={() => router.push('/(tabs)/puntos')}
              className="flex-row items-center gap-1.5 bg-white/10 rounded-full pl-1.5 pr-3"
              style={{ height: 32 }}
            >
              <PointsCounter shown={balanceError && balance === undefined ? null : pointsPulse.shown} coinSize={18} textStyle={{ color: '#fff', fontWeight: '600', fontSize: 13 }} />
            </Press>
            </Animated.View>
            {/* Nombre centrado entre los Puntos y la campana: letras gruesas (Montserrat Black), sin brillo. */}
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                allowFontScaling={false}
                style={{
                  color: colors.mint,
                  lineHeight: 28,
                  includeFontPadding: false,
                  fontSize: 23,
                  // Montserrat Black: grueso y pegado para que se lea de un vistazo; sin brillo ni letras muy separadas.
                  ...(brandFontsReady() ? { fontFamily: WORDMARK_FAMILY, fontWeight: 'normal' as const } : { fontWeight: '900' as const }),
                  letterSpacing: 1,
                  paddingLeft: 1,
                }}
              >
                CAMINA
              </Text>
            </View>
            <View className="flex-row items-center gap-2.5">
              <BellButton dark color={colors.authMuted} />
              <Press
                accessibilityRole="button"
                accessibilityLabel="Tu perfil"
                hitSlop={6}
                onPress={() => router.push('/(tabs)/perfil')}
                className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
              >
                <AvatarImage
                  uri={profile?.photo_url}
                  style={{ width: '100%', height: '100%' }}
                  fallback={<Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>}
                />
              </Press>
            </View>
          </View>
        </View>
        </View>

        <Text className="text-auth-muted px-5" style={{ paddingTop: 12, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>
          {greeting(profile?.full_name ?? '')}
        </Text>

        <View className="items-center justify-center" style={{ marginTop: 16 }}>
          {[wave1, wave2].map((w, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[{ position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 3, borderColor: POINTS_COLOR }, waveStyle(w)]}
            />
          ))}
          <ProgressRing
            size={250}
            strokeWidth={26}
            radius={108}
            progress={pct}
            innerProgress={pointsToday >= DAILY_POINTS_CAP ? 1 : (steps % POINTS_PER_STEP_UNIT) / POINTS_PER_STEP_UNIT}
            innerColor={POINTS_COLOR}
          >
            <View className="items-center">
              {/* El número se achica según los dígitos para que nunca toque el aro fino de Puntos. */}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{
                  color: '#fff',
                  fontSize: stepsFontSize,
                  fontWeight: '900',
                  letterSpacing: -1.4,
                  lineHeight: stepsFontSize + 2,
                  fontVariant: ['tabular-nums'],
                  width: 128,
                  textAlign: 'center',
                }}
              >
                {stepsText}
              </Text>
              <Text className="text-auth-muted text-[13px] mt-1">pasos hoy</Text>
              <Animated.View
                ref={chipRef}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: 6, paddingRight: 12, paddingVertical: 4,
                  borderRadius: 999, backgroundColor: 'rgba(44,255,174,0.15)', transform: [{ scale: chipScale }],
                }}
              >
                <Coin size={14} />
                <Text style={{ color: POINTS_COLOR, fontSize: 12, fontWeight: '700' }}>+{pointsToday} {plural(pointsToday, 'Punto', 'Puntos')}</Text>
              </Animated.View>
              {pointsToday >= DAILY_POINTS_CAP && (
                <Text style={{ color: POINTS_COLOR, fontSize: 12, fontWeight: '600', marginTop: 5 }}>Tope de hoy</Text>
              )}
            </View>
          </ProgressRing>
        </View>

        <View className="flex-row items-center justify-center gap-2 flex-wrap" style={{ marginTop: 22 }}>
          {(streak ?? 0) > 0 && (
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. Ver tus rachas`}
              onPress={() => setStreaksOpen(true)}
              className="flex-row items-center rounded-full"
              style={{ gap: 4, backgroundColor: 'rgba(127,237,196,0.1)', paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Flame size={11} color={colors.mint} />
              <Text style={{ color: colors.mint, fontSize: 12, fontWeight: '600' }}>{streak} {streak === 1 ? 'día' : 'días'} de racha</Text>
            </Press>
          )}
          {goalMet && (
            <Animated.View
              style={{
                flexDirection: 'row', alignItems: 'center', borderRadius: 999,
                gap: 4, backgroundColor: 'rgba(127,237,196,0.16)', paddingHorizontal: 10, paddingVertical: 4,
                opacity: goalIn, transform: [{ scale: goalIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              }}
            >
              <Check size={11} color={colors.mint} />
              <Text style={{ color: colors.mint, fontSize: 12, fontWeight: '700' }}>¡Meta cumplida!</Text>
            </Animated.View>
          )}
          {editingGoal ? (
            <View className="flex-row items-center gap-1.5">
              <TextInput
                accessibilityLabel="Meta diaria de pasos"
                value={goalInput}
                onChangeText={(v) => setGoalInput(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                autoFocus
                style={{
                  width: 80,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: colors.authBgSoft,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  color: '#fff',
                  fontSize: 12,
                }}
              />
              <Press accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 4, right: 8 }} onPress={saveGoal} className="bg-mint rounded-lg px-2.5 py-1">
                <Text className="text-mint-dark font-bold text-[12px]">Listo</Text>
              </Press>
            </View>
          ) : (
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Cambiar meta diaria, ${goal.toLocaleString('es-BO')} pasos`}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              onPress={() => {
                setGoalInput(String(goal));
                setEditingGoal(true);
              }}
              className="rounded-full"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Text style={{ color: colors.authMuted, fontSize: 12 }}>meta {goal.toLocaleString('es-BO')}</Text>
                <Pencil size={14} color={colors.authMuted} />
              </View>
            </Press>
          )}
        </View>
        {editingGoal && (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityLabel={goalHint}
            style={{
              color: goalDraft < MIN_DAILY_GOAL ? '#FFB27A' : colors.mint,
              fontSize: 12,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {goalHint}
          </Text>
        )}

        {healthConnectStatus && healthConnectStatus !== 'ok' && healthConnectStatus !== 'checking' ? (
          <View className="mx-5 mt-4 rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <View className="flex-row items-center" style={{ gap: 12, marginBottom: 10 }}>
              <Image accessible={false} source={require('@/../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 20 }} />
              <View className="flex-1">
                <Text className="text-white font-bold text-[14px]">
                  {healthConnectStatus === 'unavailable' ? 'Instala Health Connect' : healthConnectStatus === 'error' ? 'No pudimos leer tus pasos' : 'El podómetro no funciona sin este permiso'}
                </Text>
                <Text className="text-auth-muted text-[12px] leading-4 mt-0.5">
                  {healthConnectStatus === 'unavailable'
                    ? 'Es la app de Android que le pasa tus pasos a Camina.'
                    : healthConnectStatus === 'error'
                      ? 'Fue un problema pasajero. Toca Reintentar.'
                      : 'Activa el permiso de Pasos para Camina en Health Connect y vuelve a abrir la app: sin eso no sumas Puntos.'}
                </Text>
              </View>
            </View>
            <Press
              accessibilityRole="button"
              onPress={() => {
                if (healthConnectStatus === 'unavailable') {
                  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')
                  );
                } else if (healthConnectStatus === 'error') {
                  refreshSteps();
                } else {
                  openHealthConnectSettings();
                }
              }}
              className="bg-mint rounded-xl py-2.5 items-center"
            >
              <Text className="text-mint-dark font-bold text-[13px]">
                {healthConnectStatus === 'unavailable' ? 'Instalar Health Connect' : healthConnectStatus === 'error' ? 'Reintentar' : 'Activar permiso'}
              </Text>
            </Press>
          </View>
        ) : Platform.OS === 'ios' && deviceSteps === 0 && new Date().getHours() >= 9 ? (
          // Recién pasada la medianoche los pasos de hoy son 0 de verdad: el aviso aparece desde las 9.
          // El permiso de Salud no está en los Ajustes de la app sino dentro de la app Salud, así que el botón abre Salud.
          <Press
            accessibilityRole="button"
            onPress={() => Linking.openURL('x-apple-health://').catch(() => Linking.openSettings())}
            className="mx-5 mt-4 rounded-2xl p-3.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text className="text-white font-bold text-[13px]">¿No ves tus pasos?</Text>
            <Text className="text-auth-muted text-[12px] leading-4 mt-0.5">
              Toca aquí para abrir Salud. Ahí toca tu foto (arriba a la derecha) &gt; Apps &gt; Camina y activa Pasos.
            </Text>
          </Press>
        ) : available === false ? (
          <Text className="text-auth-muted text-center text-[12px] mt-3 px-8">
            Este dispositivo no tiene podómetro disponible.
          </Text>
        ) : null}
      </LinearGradient>

      <View className="pt-5 pb-2">
        {expiring && expiring.amount > 0 && expiring.days <= 14 ? (
          <Press
            accessibilityRole="button"
            accessibilityLabel={`${expiringMsg}. ${expiringHint}. Ver detalle`}
            hitSlop={6}
            onPress={() => router.push('/(tabs)/puntos')}
            className="flex-row items-center mx-5 mb-4 rounded-2xl px-3.5 py-3"
            style={{ gap: 10, backgroundColor: isDark ? 'rgba(245,198,69,0.14)' : '#FFF3D1', borderWidth: 1, borderColor: isDark ? 'rgba(245,198,69,0.35)' : '#F3D9A0' }}
          >
            <Coin size={22} />
            <View className="flex-1">
              <Text className="text-[13px] font-bold" style={{ color: isDark ? '#F5D77A' : '#7A5206' }}>
                {expiringMsg}
              </Text>
              <Text className="text-[12px]" style={{ color: isDark ? '#E0BC63' : colors.goldInk }}>{expiringHint}</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#E0BC63' : '#9A6A08'} />
          </Press>
        ) : null}
        <HomeAdBanner />
        <NearbyRow benefits={benefits ?? []} pos={pos} loading={benefitsLoading} />
        <HomePromoSections />

        <Glass className="rounded-3xl mx-5 mt-4 overflow-hidden" style={{ shadowColor: colors.light.text, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
          <LinkRow
            icon={Target}
            tone="aqua"
            title="Retos"
            value={reto ? `${reto.met} de ${reto.target}` : 'Ver retos'}
            onPress={() => router.push({ pathname: '/(tabs)/eventos', params: { tab: 'desafios' } })}
          />
          <LinkRow
            icon={Trophy}
            tone="gold"
            title="Ranking semanal"
            value={myRank ? `Vas ${myRank.position}.º` : 'Ver'}
            onPress={() => router.push('/(tabs)/ranking')}
          />
          <LinkRow
            icon={UserPlus}
            tone="purple"
            title="Amigos"
            value={(friendRequests ?? []).length > 0 ? `${friendRequests!.length} ${friendRequests!.length === 1 ? 'solicitud' : 'solicitudes'}` : (friends ?? []).length > 0 ? `${friends!.length}` : 'Invita'}
            alert={(friendRequests ?? []).length > 0}
            onPress={() => router.push('/(tabs)/amigos')}
          />
          <LinkRow
            icon={Users}
            tone="purple"
            title="Tus grupos"
            value={groupsValue}
            onPress={() => router.push('/(tabs)/grupos')}
            last
          />
        </Glass>


        <Press
          accessibilityRole="button"
          accessibilityLabel="Ver toda tu actividad"
          onPress={() => router.push('/(tabs)/actividad')}
          className="mx-5"
          style={{ marginTop: 14 }}
        >
          <Glass className="rounded-3xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <IconBubble icon={Activity} tone="aqua" size={42} />
              <View>
                <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Ver toda tu actividad</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">Gráfico, calendario e historial</Text>
              </View>
            </View>
            <ChevronRight size={16} color={isDark ? colors.dark.muted : colors.light.muted} />
          </Glass>
        </Press>

        {/* Sin canjes también se muestra: es el estado vacío con el Baifo. Si falló la carga, no. */}
        {(redemptions !== undefined || redemptionsLoading) && (
          <View style={{ marginTop: 28 }}>
            <MyRedemptionsSection
              redemptions={redemptions as unknown as RedemptionRow[] | undefined}
              loading={redemptionsLoading}
              storyFor={(r) => (storyShares ? storyStateFor(r, storyShares[r.id]) : null)}
              onStory={(r) => story.start({ redemptionId: r.id, businessName: r.business?.name ?? 'el local', benefitName: r.benefit?.name ?? 'Tu canje' })}
            />
          </View>
        )}
        {story.element}

      </View>
    </ScrollView>
    <StreaksSheet visible={streaksOpen} racha={streaks?.racha ?? 0} meta={streaks?.meta ?? 0} goal={goal} isDark={isDark} onClose={() => setStreaksOpen(false)} />
    {flight && <CoinFlight path={flight} bump={pillBump} onDone={() => {
      flying.current = false;
      setFlight(null);
      if (pendingCoins.current > 0) { pendingCoins.current -= 1; setTimeout(launchCoin, 150); }
    }} />}
    </View>
  );
}
