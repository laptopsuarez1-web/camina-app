import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, Platform, Linking, RefreshControl, Animated, Easing } from 'react-native';
import { GOLD, isFeatured, GoldBadge } from '@/components/ui/Featured';
import { PointsCounter, usePointsPulse } from '@/components/ui/PointsCounter';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BellButton } from '@/components/ui/BellButton';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { useTodaySteps } from '@/hooks/usePedometer';
import { useIsQa } from '@/hooks/useIsQa';
import { usePointsBalance, useSyncSteps, usePointsExpiringSoon } from '@/hooks/usePoints';
import { useHomeMoments } from '@/hooks/useMoments';
import { buzz } from '@/lib/haptics';
import { useBenefits } from '@/hooks/useBenefits';
import { useGroups } from '@/hooks/useGroups';
import { useStreak } from '@/hooks/useStreak';
import { useWeeklyGoalReto } from '@/hooks/useRetos';
import { useGlobalRanking } from '@/hooks/useGlobalRanking';
import { useMyGroupRanking } from '@/hooks/useGroupRanking';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { colors } from '@/theme/tokens';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT, MIN_DAILY_GOAL, GOOD_DAILY_GOAL } from '@/constants/business-rules';
import { Flame, Trophy, ChevronRight, Activity, Users, Check, IconBubble } from '@/components/icons';
import { Glass } from '@/components/ui/Glass';

// Color de los Puntos del día: el aro fino, el chip "+N Puntos" y el "faltan …" usan este mismo verde.
const POINTS_COLOR = '#2CFFAE';

function greeting(name: string) {
  const h = new Date().getHours();
  const label = name || 'caminante';
  if (h < 6) return `¿Todavía despierto, ${label}?`;
  if (h < 12) return `Buen día, ${label}`;
  if (h < 19) return `Buenas tardes, ${label}`;
  return `Buenas noches, ${label}`;
}

// "CAMINA" con el cuerpo grueso del original. En nativo no existe
// -webkit-text-stroke, así que el trazo se simula con copias desplazadas
// menos de 1px alrededor del texto (en web se usa el trazo real).
const WORDMARK_STYLE = {
  color: colors.mint,
  fontSize: 21,
  fontWeight: '900' as const,
  letterSpacing: -0.6,
};
const STROKE_OFFSETS: [number, number][] = [
  [0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8], [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6],
];
function Wordmark() {
  return (
    <View>
      {Platform.OS !== 'web' &&
        STROKE_OFFSETS.map(([x, y], i) => (
          <Text key={i} style={[WORDMARK_STYLE, { position: 'absolute', left: x, top: y }]}>
            CAMINA
          </Text>
        ))}
      <Text
        style={[
          WORDMARK_STYLE,
          {
            textShadowColor: 'rgba(127,237,196,0.6)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          },
          Platform.OS === 'web' ? ({ WebkitTextStroke: '0.8px #7FEDC4' } as object) : null,
        ]}
      >
        CAMINA
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { steps: deviceSteps, available: deviceAvailable, healthConnectStatus: hcStatus, live: deviceLive, refresh: refreshSteps } = useTodaySteps();
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
  const { data: balance } = usePointsBalance();
  const pointsPulse = usePointsPulse(balance);
  const { data: benefits, isLoading: benefitsLoading } = useBenefits();
  const { data: groups } = useGroups();
  const { data: streak } = useStreak();
  useHomeMoments(streak);
  const { data: expiring } = usePointsExpiringSoon(14);
  const { data: reto } = useWeeklyGoalReto();
  const { data: globalRanking } = useGlobalRanking();
  const { data: groupRanking } = useMyGroupRanking();
  const topGroupMate = groupRanking?.ranked.find((r) => r.total > 0);
  const myGlobalPosition = (globalRanking ?? []).findIndex((r: { user_id: string }) => r.user_id === userId) + 1;
  const syncSteps = useSyncSteps();
  const lastSynced = useRef(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    if (live && steps > 0 && steps !== lastSynced.current) {
      lastSynced.current = steps;
      syncSteps.mutate(steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, live]);

  const goal = Math.max(profile?.daily_goal ?? 6000, MIN_DAILY_GOAL);
  const pct = goal > 0 ? steps / goal : 0;
  const goalMet = steps >= goal;
  const pointsToday = Math.min(Math.floor(steps / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP);
  // Celebraciones suaves (solo cuando ocurren estando en pantalla, nunca al abrir la app):
  // - cada Punto nuevo: el chip "+N Puntos" late;
  // - al llegar a la meta del día: dos ondas verdes salen del aro y aparece "Meta cumplida".
  const chipPop = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const goalIn = useRef(new Animated.Value(goalMet ? 1 : 0)).current;
  const prevSteps = useRef<number | null>(null);
  const celebrating = useRef(false);
  useEffect(() => {
    if (!live) return;
    const before = prevSteps.current;
    prevSteps.current = steps;
    if (before === null || steps <= before) return;
    if (Math.floor(steps / POINTS_PER_STEP_UNIT) > Math.floor(before / POINTS_PER_STEP_UNIT) && pointsToday <= DAILY_POINTS_CAP) {
      buzz.light();
      chipPop.setValue(0);
      Animated.timing(chipPop, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    if (before < goal && steps >= goal) {
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
  }, [steps, live]);
  useEffect(() => { if (goalMet && !celebrating.current) goalIn.setValue(1); }, [goalMet, goalIn]);
  const waveStyle = (w: Animated.Value) => ({
    opacity: w.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.65, 0] }),
    transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.22] }) }],
  });
  const chipScale = chipPop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.22, 1] });
  const stepsText = steps.toLocaleString('es-BO');
  const stepsFontSize = stepsText.length <= 5 ? 46 : 36;
  const nearby = (() => {
    const map = new Map<string, { business: NonNullable<typeof benefits>[number]['business']; items: NonNullable<typeof benefits> }>();
    for (const b of benefits ?? []) {
      if (!map.has(b.business.id)) map.set(b.business.id, { business: b.business, items: [] });
      map.get(b.business.id)!.items.push(b);
    }
    // Los destacados (plan Paso Adelante) van primero.
    return [...map.values()]
      .sort((a, b) => Number(isFeatured(b.business)) - Number(isFeatured(a.business)))
      .slice(0, 3);
  })();
  const myGroup = (groups ?? []).find((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));

  const goalDraft = parseInt(goalInput, 10) || 0;
  const goalHint =
    goalDraft < MIN_DAILY_GOAL
      ? `La meta mínima es ${MIN_DAILY_GOAL.toLocaleString('es-BO')} pasos`
      : goalDraft >= GOOD_DAILY_GOAL
        ? '¡Muy bien! Una meta que suma 💪'
        : '¡Vos podés más!';

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
    <ScrollView
      className="flex-1 bg-bg-light dark:bg-bg-dark"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7FEDC4" colors={['#4FC3A8']} progressBackgroundColor="#2F1E5C" />}
    >
      <LinearGradient
        colors={['#3a2668', '#1c1030', '#120a1e']}
        start={{ x: 0.15, y: -0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={{ borderRadius: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingBottom: 22, overflow: 'hidden' }}
      >
        <View style={{ paddingTop: 18 }}>
        <View className="px-5" style={{ position: 'relative' }}>
          <View className="flex-row justify-between items-center" style={{ height: 32 }}>
            <Animated.View style={{ transform: [{ scale: pointsPulse.scale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tus Puntos, ver detalle"
              hitSlop={6}
              onPress={() => router.push('/(tabs)/puntos')}
              className="flex-row items-center gap-1.5 bg-white/10 rounded-full pl-1.5 pr-3"
              style={{ height: 32 }}
            >
              <PointsCounter shown={pointsPulse.shown} coinSize={18} textStyle={{ color: '#fff', fontWeight: '600', fontSize: 13 }} />
            </Pressable>
            </Animated.View>
            <View className="flex-row items-center gap-2.5">
              <BellButton dark color="#C4B8E8" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tu perfil"
                hitSlop={6}
                onPress={() => router.push('/(tabs)/perfil')}
                className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
              >
                {profile?.photo_url ? (
                  <Image source={{ uri: profile.photo_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>
                )}
              </Pressable>
            </View>
          </View>
          {/* Posición absoluta a todo el ancho para que quede centrado de verdad
              respecto a la pantalla (y al aro de abajo), sin importar que el
              chip de puntos y los botones de la derecha tengan anchos distintos.
              El contenedor "relative" no tiene padding propio — así este overlay
              (top:0/bottom:0) mide exactamente la altura de la fila de arriba,
              en vez de la altura completa con el padding incluido (que la
              corría más arriba que el chip de puntos y el avatar). */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
          >
            <Wordmark />
          </View>
        </View>
        </View>

        <Text className="text-auth-muted px-5 font-semibold text-[14px]" style={{ paddingTop: 16 }}>
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
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: 6, paddingRight: 12, paddingVertical: 4,
                  borderRadius: 999, backgroundColor: 'rgba(44,255,174,0.15)', transform: [{ scale: chipScale }],
                }}
              >
                <Image source={require('@/../assets/camina-coin.png')} style={{ width: 14, height: 14, borderRadius: 7 }} />
                <Text style={{ color: POINTS_COLOR, fontSize: 12, fontWeight: '700' }}>+{pointsToday} Puntos</Text>
              </Animated.View>
              <Text style={{ color: POINTS_COLOR, fontSize: 12, fontWeight: '600', marginTop: 5 }}>
                {pointsToday >= DAILY_POINTS_CAP
                  ? 'Tope de hoy'
                  : (() => { const n = POINTS_PER_STEP_UNIT - (steps % POINTS_PER_STEP_UNIT); return n === 1 ? 'falta 1 paso' : `faltan ${n} pasos`; })()}
              </Text>
            </View>
          </ProgressRing>
        </View>

        <View className="flex-row items-center justify-center gap-2 flex-wrap" style={{ marginTop: 22 }}>
          {(streak ?? 0) > 0 && (
            <View
              className="flex-row items-center rounded-full"
              style={{ gap: 4, backgroundColor: 'rgba(127,237,196,0.1)', paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Flame size={11} color={colors.mint} />
              <Text style={{ color: colors.mint, fontSize: 12, fontWeight: '600' }}>{streak} días de racha</Text>
            </View>
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
              <Pressable onPress={saveGoal} className="bg-mint rounded-lg px-2.5 py-1">
                <Text className="text-mint-dark font-bold text-[12px]">OK</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setGoalInput(String(goal));
                setEditingGoal(true);
              }}
              className="rounded-full"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: '#B3A6D6', fontSize: 12 }}>meta {goal} ✎</Text>
            </Pressable>
          )}
        </View>
        {editingGoal && (
          <Text
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
              <Image source={require('@/../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 20 }} />
              <View className="flex-1">
                <Text className="text-white font-bold text-[14px]">
                  {healthConnectStatus === 'unavailable' ? 'Instalá Health Connect' : 'Activá el conteo de pasos'}
                </Text>
                <Text className="text-auth-muted text-[12px] leading-4 mt-0.5">
                  {healthConnectStatus === 'unavailable'
                    ? 'Es la app de Android que le pasa tus pasos a Camina.'
                    : 'Sin este permiso no podemos sumar tus puntos.'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (healthConnectStatus === 'unavailable') {
                  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')
                  );
                } else {
                  openHealthConnectSettings();
                }
              }}
              className="bg-mint rounded-xl py-2.5 items-center"
            >
              <Text className="text-mint-dark font-bold text-[13px]">
                {healthConnectStatus === 'unavailable' ? 'Instalar Health Connect' : 'Activar'}
              </Text>
            </Pressable>
          </View>
        ) : available === false ? (
          <Text className="text-auth-muted text-center text-[12px] mt-3 px-8">
            Este dispositivo no tiene podómetro disponible.
          </Text>
        ) : null}
      </LinearGradient>

      <View className="pt-5 pb-2">
        {expiring && expiring.amount > 0 && expiring.days <= 14 ? (
          <Pressable
            accessibilityRole="button"
              accessibilityLabel="Tus Puntos, ver detalle"
              hitSlop={6}
              onPress={() => router.push('/(tabs)/puntos')}
            className="flex-row items-center mx-5 mb-4 rounded-2xl px-3.5 py-3"
            style={{ gap: 10, backgroundColor: '#FFF3D1', borderWidth: 1, borderColor: '#F3D9A0' }}
          >
            <Image source={require('@/../assets/camina-coin.png')} style={{ width: 22, height: 22, borderRadius: 11 }} />
            <View className="flex-1">
              <Text className="text-[13px] font-bold" style={{ color: '#7A5206' }}>
                {expiring.amount} {expiring.amount === 1 ? 'punto vence' : 'puntos vencen'} {expiring.days <= 0 ? 'hoy' : `en ${expiring.days} día${expiring.days === 1 ? '' : 's'}`}
              </Text>
              <Text className="text-[12px]" style={{ color: '#9A6A08' }}>Canjealos antes de perderlos</Text>
            </View>
            <ChevronRight size={16} color="#9A6A08" />
          </Pressable>
        ) : null}
        <View className="flex-row items-center justify-between px-5 mb-3">
          <Text className="font-bold text-base text-text-light dark:text-text-dark">Beneficios cerca tuyo</Text>
          <Pressable onPress={() => router.push('/(tabs)/canjes?view=lista')}>
            <Text className="text-aqua-deep dark:text-aqua text-xs font-semibold">Ver todo</Text>
          </Pressable>
        </View>

        <View className="px-5 gap-2.5">
          {nearby.map((g) => (
            <Pressable
              key={g.business.id}
              onPress={() => router.push('/(tabs)/canjes')}
              className="flex-row items-center gap-3.5 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-3xl p-3.5"
              style={{
                shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1,
                ...(isFeatured(g.business) ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.25 } : {}),
              }}
            >
              <BusinessAvatar logoUrl={g.business.logo_url} category={g.business.category} size={58} />
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center" style={{ gap: 5 }}>
                  <Text className="text-[14px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>
                    {g.business.name}
                  </Text>
                  {isFeatured(g.business) && <GoldBadge size={16} />}
                </View>
                <Text className="text-xs text-muted-light dark:text-muted-dark mt-0.5 mb-1.5" numberOfLines={1}>
                  {g.items.length === 1 ? g.items[0].name : `${g.items.length} premios disponibles`}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-semibold text-aqua-deep dark:text-aqua">{g.business.category}</Text>
                  <View className="flex-row items-center bg-aqua-deep rounded-full" style={{ gap: 4, paddingVertical: 3, paddingLeft: 3, paddingRight: 9 }}>
                    <Image source={require('@/../assets/camina-coin.png')} style={{ width: 16, height: 16, borderRadius: 8 }} />
                    <Text className="text-white text-[12px] font-bold">
                      {g.items.length > 1 ? `desde ${Math.min(...g.items.map((i) => i.cost_points))}` : g.items[0].cost_points}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}

          {myGroup && (
            <Pressable
              onPress={() => router.push('/(tabs)/grupos')}
              className="flex-row items-center gap-3.5 bg-auth-bg rounded-3xl p-3.5"
              style={{ shadowColor: '#291C47', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
            >
              <View className="w-[58px] h-[58px] rounded-2xl bg-white/10 items-center justify-center">
                <Users size={22} color={colors.mint} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[14px] font-bold text-white" numberOfLines={1}>
                  {myGroup.name}
                </Text>
                <Text className="text-xs text-auth-muted mt-0.5">
                  {myGroup.group_members.length} miembro{myGroup.group_members.length === 1 ? '' : 's'}
                </Text>
              </View>
            </Pressable>
          )}

          {nearby.length === 0 && !benefitsLoading && !myGroup && (
            <Pressable
              onPress={() => router.push('/(tabs)/canjes?view=lista')}
              className="bg-card-light dark:bg-card-dark rounded-3xl p-4"
            >
              <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-1">Explorá beneficios</Text>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Todavía no hay nada cerca — mirá qué se puede canjear.</Text>
            </Pressable>
          )}
        </View>

        {topGroupMate && (
          <Glass
            className="flex-row items-center gap-3 rounded-3xl p-4 mx-5 mt-4"
            style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
          >
            <View className="w-9 h-9 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
              <Text className="text-purple font-bold text-xs">{topGroupMate.name[0]?.toUpperCase()}</Text>
            </View>
            <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark leading-relaxed">
              <Text className="font-bold">{topGroupMate.name}</Text> caminó {topGroupMate.total.toLocaleString('es-BO')} pasos
              esta semana en {groupRanking?.group.name}
            </Text>
          </Glass>
        )}

        {reto && (
          <Pressable
            onPress={() => router.push('/(tabs)/eventos')}
            className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mx-5 mt-4"
            style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
          >
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-2.5">
                <IconBubble icon={Flame} tone="orange" size={34} />
                <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark">
                  {reto.met}/{reto.target} · {reto.title}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 bg-mint/15 px-2.5 py-1 rounded-full">
                <Image source={require('@/../assets/camina-coin.png')} style={{ width: 13, height: 13, borderRadius: 6.5 }} />
                <Text className="text-mint-dark dark:text-mint text-[12px] font-bold">+{reto.reward_points}</Text>
              </View>
            </View>
            <View className="h-1.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
              <View className="h-full bg-aqua rounded-full" style={{ width: `${reto.pct}%` }} />
            </View>
          </Pressable>
        )}

        <Glass className="rounded-3xl mx-5 mt-4 overflow-hidden" style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/grupos', params: { view: 'ranking' } })}
            className="flex-row items-center justify-between p-4 border-b border-line-light dark:border-line-dark"
          >
            <View className="flex-row items-center gap-2.5">
              <IconBubble icon={Trophy} tone="purple" size={34} />
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">Ranking semanal</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-muted-light dark:text-muted-dark">
                {profile?.ranking_visible === false
                  ? 'Activalo en Perfil'
                  : myGlobalPosition > 0
                    ? `Vas ${myGlobalPosition}°`
                    : 'Fuera del top 20'}
              </Text>
              <ChevronRight size={14} color={colors.light.muted} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/grupos')} className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-2.5">
              <IconBubble icon={Users} tone="purple" size={34} />
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">Tus grupos</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-muted-light dark:text-muted-dark">{myGroup ? '1 activo' : 'Ninguno'}</Text>
              <ChevronRight size={14} color={colors.light.muted} />
            </View>
          </Pressable>
        </Glass>

        <Pressable
          onPress={() => router.push('/(tabs)/actividad')}
          className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mx-5 mt-4 flex-row items-center justify-between"
          style={{ shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <View className="flex-row items-center gap-2.5">
            <IconBubble icon={Activity} tone="aqua" size={34} />
            <View>
              <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">Ver toda tu actividad</Text>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Gráfico, calendario e historial</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.light.muted} />
        </Pressable>

      </View>
    </ScrollView>
  );
}
