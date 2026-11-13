import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { View, ScrollView, Image, Linking, RefreshControl, Animated, Easing, Platform, AccessibilityInfo } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { PointsCounter, usePointsPulse } from '@/components/ui/PointsCounter';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GoalSheet } from '@/components/GoalSheet';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { PushPromptCard } from '@/components/home/PushPromptCard';
import { BellButton } from '@/components/ui/BellButton';
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
import { useNotificationPrefs } from '@/store/useNotificationPrefs';
import { syncStreakReminders } from '@/lib/streak-reminders';
import { useWeeklyGoalReto } from '@/hooks/useRetos';
import { useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { useFriendRequests } from '@/hooks/useFriends';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { colors } from '@/theme/tokens';
import { plural } from '@/lib/format';
import { boliviaDay, boliviaHour } from '@/lib/bolivia';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT, MIN_DAILY_GOAL, DEFAULT_DAILY_GOAL } from '@/constants/business-rules';
import { ChevronRight, Users, UserPlus, Trophy, Target, Gift, Check, IconBubble, type IconProps } from '@/components/icons';
import { HomeAdBanner, HomePromoSections } from '@/components/home/HomePromos';
import { useRutaDoneCelebration } from '@/components/ruta/useRutaDoneCelebration';
import { RutaHomeCard } from '@/components/ruta/RutaEventCard';
import { useRuta } from '@/hooks/useRuta';
import { NearbyRow, MyRedemptionsSection, SectionHeader, useHomePosition, type RedemptionRow } from '@/components/home/HomeSections';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { WORDMARK_FAMILY, brandFontsReady } from '@/theme/fonts';
import { CoinFlight, coinFlightPath, type CoinFlightPath } from '@/components/home/CoinFlight';
import { Coin } from '@/components/ui/Coin';

// Color de los Puntos del día: el aro fino, el chip "+N Puntos" y "Tope de hoy" usan este mismo verde.
const POINTS_COLOR = '#2CFFAE';

function localDayKey() {
  return boliviaDay();
}

function greeting(name: string) {
  const h = boliviaHour();
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

const PROFILE_HINT_KEY = 'camina_profile_hint_seen';

export default function HomeScreen() {
  const isDark = useColorScheme().colorScheme === 'dark';
  const tabSpace = useTabBarSpace();
  // Debajo de la barra de estado (hora, batería): en Android el contenido llega hasta el borde de la pantalla.
  const topInset = useSafeAreaInsets().top;
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { steps: deviceSteps, available: deviceAvailable, healthConnectStatus: hcStatus, errorDetail: hcErrorDetail, errorKind: hcErrorKind, live: deviceLive, refresh: refreshSteps } = useTodaySteps();
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
  const { data: friendRequests } = useFriendRequests();
  const syncSteps = useSyncSteps();
  const lastSynced = useRef(0);
  // Reintento del envío de pasos: valor que se reintenta, cuántas veces y el temporizador pendiente.
  const retryFor = useRef({ steps: 0, tries: 0 });
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [goalOpen, setGoalOpen] = useState(false);
  // Globito "Tu perfil está aquí": se muestra una sola vez.
  const [profileHint, setProfileHint] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_HINT_KEY).then((v) => { if (!v) setProfileHint(true); }).catch(() => {});
  }, []);
  const hideProfileHint = () => {
    setProfileHint(false);
    AsyncStorage.setItem(PROFILE_HINT_KEY, '1').catch(() => {});
  };

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
  const prefRacha = useNotificationPrefs((s) => s.racha);
  const prefAliento = useNotificationPrefs((s) => s.aliento);
  // Avisos de racha de día y de noche (los programa el teléfono): se reemplazan cuando cambia la racha, la meta o si ya se cumplió hoy.
  useEffect(() => {
    if (streak === undefined) return;
    syncStreakReminders({ streak, stepsToday: steps, goal, racha: prefRacha, aliento: prefAliento });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los pasos reprograman de a 250 para que el "te faltan" no quede viejo.
  }, [streak, goal, goalMet, Math.floor(steps / 250), prefRacha, prefAliento]);
  const pointsToday = Math.min(Math.floor(steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP);
  const { data: ruta } = useRuta();
  useRutaDoneCelebration(ruta);
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
  const [chipPop] = useState(() => new Animated.Value(0));
  const [wave1] = useState(() => new Animated.Value(0));
  const [wave2] = useState(() => new Animated.Value(0));
  const [goalIn] = useState(() => new Animated.Value(goalMet ? 1 : 0));
  // Lo que ya se celebró hoy (Puntos del día y meta) queda guardado en el teléfono: cada Punto nuevo y la meta se
  // celebran una sola vez, aunque se haya ganado con la app cerrada, y no se repiten cada vez que se vuelve a entrar.
  const celebrating = useRef(false);
  const seen = useRef<{ day: string; points: number; goal: boolean } | null>(null);
  const [seenReady, setSeenReady] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se reinicia el estado al cambiar el dato de entrada (no es un bucle)
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

  // Premios: para cuántos alcanza con los Puntos de hoy (todos, sin empujar a ninguno). Si no alcanza para ninguno, desde cuántos Puntos hay.
  const activeBenefits = benefits ?? [];
  const affordable = balance === undefined ? 0 : activeBenefits.filter((b) => b.cost_points <= balance).length;
  const cheapest = activeBenefits.length > 0 ? Math.min(...activeBenefits.map((b) => b.cost_points)) : null;
  const prizesValue = activeBenefits.length === 0 || balance === undefined
    ? ''
    : affordable > 0
      ? `Te alcanza para ${affordable}`
      : `Desde ${cheapest} ${plural(cheapest ?? 0, 'Punto', 'Puntos')}`;

  // Aviso de Puntos por vencer: el mismo texto se ve y se lee.
  const expiringMsg =
    expiring && expiring.amount > 0
      ? `${expiring.amount} ${plural(expiring.amount, 'Punto vence', 'Puntos vencen')} ${expiring.days <= 0 ? 'hoy' : `en ${expiring.days} ${plural(expiring.days, 'día', 'días')}`}`
      : '';
  const expiringHint = expiring?.amount === 1 ? 'Canjéalo antes de perderlo' : 'Canjéalos antes de perderlos';

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
              <View>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel={profile?.photo_url ? 'Tu perfil' : 'Tu perfil. Todavía no tiene foto'}
                  hitSlop={6}
                  onPress={() => { hideProfileHint(); router.push('/(tabs)/perfil'); }}
                  className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
                >
                  <AvatarImage
                    uri={profile?.photo_url}
                    style={{ width: '100%', height: '100%' }}
                    fallback={<Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>}
                  />
                </Press>
                {/* Sin foto, un puntito invita a completar el perfil (y a encontrarlo). */}
                {!profile?.photo_url ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: -2, right: -2, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.mint, borderWidth: 2, borderColor: '#2a1a4d' }} />
                ) : null}
              </View>
            </View>
          </View>
        </View>
        </View>

        {/* La primera vez: un globito que señala la foto de arriba ("ahí está tu perfil"). Se va al tocarlo o al abrir el perfil. */}
        {profileHint ? (
          <Press accessibilityRole="button" accessibilityLabel="Tu perfil, tus canjes e insignias están en tu foto de arriba. Entendido" onPress={hideProfileHint}
            style={{ position: 'absolute', right: 14, top: Platform.OS === 'android' ? topInset + 66 : Math.max(topInset, 24) + 52, zIndex: 20, alignItems: 'flex-end' }}>
            <View style={{ width: 0, height: 0, marginRight: 14, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.mint }} />
            <View style={{ backgroundColor: colors.mint, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 230 }}>
              <Text style={{ color: colors.mintDark, fontSize: 12.5, fontWeight: '800' }}>Tu perfil está aquí</Text>
              <Text style={{ color: colors.mintDark, fontSize: 11.5, lineHeight: 15 }}>Tus Puntos, insignias y amigos. Toca para cerrar.</Text>
            </View>
          </Press>
        ) : null}
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


        {/* Debajo del aro: la racha y la meta como dos cifras separadas por una línea (sin pastillas ni lápiz).
            Tocar la racha abre "Tu racha"; tocar la meta abre la ruedita para cambiarla. */}
        <View className="flex-row items-stretch px-8" style={{ marginTop: 18 }}>
          <Press
            accessibilityRole="button"
            accessibilityLabel={`Racha de ${streak ?? 0} ${streak === 1 ? 'día' : 'días'}. Ver tu racha`}
            haptic="light"
            onPress={() => setStreaksOpen(true)}
            className="flex-1 items-center"
            style={{ paddingVertical: 4 }}
          >
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <View style={{ opacity: (streak ?? 0) > 0 ? 1 : 0.45 }}><IllArt kind="flame" size={17} /></View>
              <Text style={{ color: '#fff', fontSize: 17, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{streak ?? 0}</Text>
            </View>
            <Text style={{ color: colors.authMuted, fontSize: 12, lineHeight: 16 }}>{streak === 1 ? 'día de racha' : 'días de racha'}</Text>
          </Press>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 4 }} />
          <Press
            accessibilityRole="button"
            accessibilityLabel={`${goalMet ? 'Meta cumplida. ' : ''}Tu meta diaria es de ${goal.toLocaleString('es-BO')} pasos. Cambiarla`}
            haptic="light"
            onPress={() => setGoalOpen(true)}
            className="flex-1 items-center"
            style={{ paddingVertical: 4 }}
          >
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Text style={{ color: '#fff', fontSize: 17, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{goal.toLocaleString('es-BO')}</Text>
              {goalMet ? (
                <Animated.View style={{ opacity: goalIn, transform: [{ scale: goalIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
                  <Check size={14} color={colors.mint} weight="bold" />
                </Animated.View>
              ) : null}
            </View>
            <Text style={{ color: goalMet ? colors.mint : colors.authMuted, fontSize: 12, lineHeight: 16, fontWeight: goalMet ? '700' : '400' }}>{goalMet ? 'meta cumplida' : 'meta diaria'}</Text>
          </Press>
        </View>

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
                      ? hcErrorKind === 'service'
                        ? 'Tu celular está apagando Health Connect, la app que guarda tus pasos. Deja Health Connect y Camina «sin restricciones» en los ajustes de batería, activa su inicio automático y actualiza Health Connect en la Play Store. Luego toca Reintentar.'
                        : 'Health Connect no le respondió a Camina. Toca Reintentar; si sigue, abre sus ajustes y revisa que esté actualizado y que Camina tenga el permiso de Pasos.'
                      : 'Activa el permiso de Pasos para Camina en Health Connect y vuelve a abrir la app: sin eso no sumas Puntos.'}
                </Text>
                {healthConnectStatus === 'error' && hcErrorDetail ? (
                  <Text className="text-auth-muted text-[11px] leading-4 mt-1" selectable>Detalle: {hcErrorDetail}</Text>
                ) : null}
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
            {healthConnectStatus === 'error' ? (
              <>
                {hcErrorKind === 'service' ? (
                  <Press
                    accessibilityRole="button"
                    onPress={() => {
                      // Lista de apps con la batería restringida: ahí se pone Health Connect y Camina en «sin restricciones».
                      Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings());
                    }}
                    className="pt-3 items-center"
                  >
                    <Text className="text-auth-muted text-[12.5px]">Abrir ajustes de batería</Text>
                  </Press>
                ) : null}
                <Press accessibilityRole="button" onPress={() => openHealthConnectSettings()} className="pt-3 items-center">
                  <Text className="text-auth-muted text-[12.5px]">Abrir ajustes de Health Connect</Text>
                </Press>
              </>
            ) : null}
          </View>
        ) : Platform.OS === 'ios' && deviceSteps === 0 && boliviaHour() >= 9 ? (
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
        ) : Platform.OS === 'android' && healthConnectStatus === 'ok' && deviceSteps === 0 && new Date().getHours() >= 9 ? (
          // Health Connect solo guarda los pasos que le pasa otra app (Google Fit, Samsung Health...). Si no hay ninguna, lee 0 sin error.
          <Press
            accessibilityRole="button"
            onPress={() => openHealthConnectSettings()}
            className="mx-5 mt-4 rounded-2xl p-3.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text className="text-white font-bold text-[13px]">¿No ves tus pasos?</Text>
            <Text className="text-auth-muted text-[12px] leading-4 mt-0.5">
              Camina los lee de Health Connect, que los recibe de una app que los cuente (Google Fit o Samsung Health). Toca aquí para revisar que Camina tenga permiso y que haya una app guardando tus pasos.
            </Text>
          </Press>
        ) : available === false ? (
          <Text className="text-auth-muted text-center text-[12px] mt-3 px-8">
            Este dispositivo no tiene podómetro disponible.
          </Text>
        ) : null}
      </LinearGradient>

      <View className="pt-5 pb-2">
        <PushPromptCard earnedSomething={pointsToday > 0 || goalMet || (streak ?? 0) > 0} />
        {/* El evento del mes, siempre a mano en Inicio. */}
        {ruta && ruta.eligible_count >= 3 ? <RutaHomeCard state={ruta} onOpen={() => router.push('/(tabs)/ruta')} onParticipate={() => router.push({ pathname: '/(tabs)/ruta', params: { unirme: '1' } })} /> : null}
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

        {/* Tu semana: lo que tienes en marcha, con el dato a la vista. Amigos solo aparece si hay solicitudes (su lugar es Comunidad). */}
        <View style={{ marginTop: 22 }}>
          <SectionHeader title="Tu semana" />
        </View>
        <Glass className="rounded-3xl mx-5 overflow-hidden" style={{ shadowColor: colors.light.text, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
          {prizesValue ? (
            <LinkRow
              icon={Gift}
              tone="aqua"
              title="Premios"
              value={prizesValue}
              onPress={() => router.push('/(tabs)/canjes')}
            />
          ) : null}
          <LinkRow
            icon={Target}
            tone="aqua"
            title="Desafíos"
            value={reto ? (reto.claimed ? 'Completado' : `${reto.met} de ${reto.target}`) : 'Ver desafíos'}
            onPress={() => router.push({ pathname: '/(tabs)/eventos', params: { tab: 'desafios' } })}
          />
          <LinkRow
            icon={Trophy}
            tone="gold"
            title="Ranking semanal"
            value={myRank ? `Vas ${myRank.position}.º` : 'Ver'}
            onPress={() => router.push({ pathname: '/(tabs)/grupos', params: { ver: 'ranking' } })}
          />
          {(friendRequests ?? []).length > 0 ? (
            <LinkRow
              icon={UserPlus}
              tone="purple"
              title="Amigos"
              value={`${friendRequests!.length} ${friendRequests!.length === 1 ? 'solicitud' : 'solicitudes'}`}
              alert
              onPress={() => router.push({ pathname: '/(tabs)/grupos', params: { ver: 'amigos' } })}
            />
          ) : null}
          <LinkRow
            icon={Users}
            tone="purple"
            title="Tus grupos"
            value={groupsValue}
            onPress={() => router.push('/(tabs)/grupos')}
            last
          />
        </Glass>

        {/* Sin canjes también se muestra: es el estado vacío con el Baifo. Si falló la carga, no. */}
        {(redemptions !== undefined || redemptionsLoading) && (
          <View style={{ marginTop: 28 }}>
            <MyRedemptionsSection
              redemptions={redemptions as unknown as RedemptionRow[] | undefined}
              loading={redemptionsLoading}
              onSeeAll={() => router.push('/(tabs)/mis-canjes')}
              storyFor={(r) => (storyShares ? storyStateFor(r, storyShares[r.id]) : null)}
              onStory={(r) => story.start({ redemptionId: r.id, businessName: r.business?.name ?? 'el local', benefitName: r.benefit?.name ?? 'Tu canje' })}
            />
          </View>
        )}
        {story.element}

      </View>
    </ScrollView>
    <GoalSheet visible={goalOpen} goal={goal} isDark={isDark} onClose={() => setGoalOpen(false)} />
    <StreaksSheet visible={streaksOpen} racha={streaks?.racha ?? 0} meta={streaks?.meta ?? 0} week={streaks?.week} stepsToday={steps} goal={goal} isDark={isDark} onClose={() => setStreaksOpen(false)} />
    {flight && <CoinFlight path={flight} bump={pillBump} onDone={() => {
      flying.current = false;
      setFlight(null);
      if (pendingCoins.current > 0) { pendingCoins.current -= 1; setTimeout(launchCoin, 150); }
    }} />}
    </View>
  );
}
