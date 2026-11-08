import { useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { View, ScrollView, Switch, Alert, Linking, Platform, Modal } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { isHealthDataAvailable, getRequestStatusForAuthorization, requestAuthorization as requestHealthKitAuthorization, queryStatisticsForQuantity } from '@kingstinct/react-native-healthkit';
import { getGrantedPermissions, getSdkStatus, initialize as initializeHealthConnect, requestPermission as requestHealthConnectPermission, openHealthConnectSettings, SdkAvailabilityStatus } from 'react-native-health-connect';
import { LogOut, UserPlus, Pencil, Bell, Heartbeat, MapPin, ChevronRight, Target } from '@/components/icons';
import { DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL } from '@/constants/business-rules';
import { supabase } from '@/lib/supabase';
import { useAuthStore, signOutUser } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';
import { useFriendRequests, useFriends } from '@/hooks/useFriends';
import { useBlocks } from '@/hooks/useModeration';
import { SUPPORT_EMAIL } from '@/constants/contact';
import { useGlassStore } from '@/store/useGlassStore';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { buzz } from '@/lib/haptics';
import { Glass } from '@/components/ui/Glass';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { plural } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { useNotificationPrefs } from '@/store/useNotificationPrefs';
import { NotificationPrefs } from '@/components/NotificationPrefs';
import { unregisterPushToken, registerForPushNotificationsAsync } from '@/lib/push-notifications';
import { Coin } from '@/components/ui/Coin';
import { BadgesCard } from '@/components/badges/BadgesCard';
import { ProfileBanner } from '@/components/profile/ProfileBanner';
import { useMyBadges } from '@/hooks/useBadges';

type Perm = 'granted' | 'denied' | 'unknown' | null;

const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount';
// AuthorizationRequestStatus.shouldRequest: todavía no se le mostró a la persona la hoja de permisos de Salud.
const HK_SHOULD_REQUEST = 1;

// iPhone no deja saber si se negó la lectura de Salud. Lo que sí se sabe: si ya se pidió el permiso, y si Salud
// devuelve pasos de los últimos 7 días (entonces seguro está dado). Se mira una semana y no solo hoy porque
// recién pasada la medianoche hoy todavía no hay pasos.
async function healthKitStepsStatus(): Promise<Perm> {
  if (!isHealthDataAvailable()) return 'denied';
  const request = await getRequestStatusForAuthorization({ toRead: [STEP_COUNT_IDENTIFIER] });
  if (request === HK_SHOULD_REQUEST) return 'denied';
  const weekAgo = new Date();
  weekAgo.setHours(0, 0, 0, 0);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const stats = await queryStatisticsForQuantity(STEP_COUNT_IDENTIFIER, ['cumulativeSum'], {
    filter: { date: { startDate: weekAgo, endDate: new Date() } },
    unit: 'count',
  });
  return (stats.sumQuantity?.quantity ?? 0) > 0 ? 'granted' : 'unknown';
}

function PermRow({ icon, title, text, status, onPress, last }: { icon: (p: { size?: number; color?: string }) => React.ReactElement; title: string; text: string; status: Perm; onPress: () => void; last?: boolean }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const Icon = icon;
  const on = status === 'granted';
  return (
    <View className={`flex-row items-center p-3.5 ${last ? '' : 'border-b border-line-light dark:border-line-dark'}`} style={{ gap: 12 }}>
      <Icon size={22} color={on ? (dark ? colors.mint : colors.aquaDeep) : dark ? colors.dark.muted : colors.light.muted} />
      <View className="flex-1">
        <Text className="text-[14px] text-text-light dark:text-text-dark">{title}</Text>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">{text}</Text>
      </View>
      <Press accessibilityRole="button" accessibilityLabel={`${title}: ${on ? 'ajustes' : 'activar'}`} onPress={onPress} hitSlop={8} className={`px-3 py-2 rounded-full ${on ? 'bg-purple-light-light dark:bg-purple-light-dark' : 'bg-aqua-deep'}`}>
        <Text className={`text-[12px] font-semibold ${on ? 'text-purple-ink dark:text-purple-soft' : 'text-white'}`}>{on ? 'Ajustes' : 'Activar'}</Text>
      </Press>
    </View>
  );
}

// Título de cada grupo de ajustes.
function SectionLabel({ children }: { children: string }) {
  return <Text className="text-[11.5px] font-bold text-muted-light dark:text-muted-dark mb-1.5 ml-1" style={{ letterSpacing: 1.1 }}>{children.toUpperCase()}</Text>;
}

// Una fila de ajustes: título, una línea de ayuda y lo de la derecha (flecha, estado).
function Row({ label, hint, onPress, right, last }: { label: string; hint?: string; onPress: () => void; right?: React.ReactNode; last?: boolean }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={hint ? `${label}. ${hint}` : label} onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${last ? '' : 'border-b border-line-light dark:border-line-dark'}`} style={{ gap: 10 }}>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-text-light dark:text-text-dark">{label}</Text>
        {hint ? <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5" numberOfLines={1}>{hint}</Text> : null}
      </View>
      {right}
    </Press>
  );
}

export default function PerfilScreen() {
  const tabSpace = useTabBarSpace();
  const profile = useAuthStore((s) => s.profile);
  const isDark = useColorScheme().colorScheme === 'dark';
  const { data: badges } = useMyBadges();
  const { data: balance } = usePointsBalance();
  const { data: friendRequests } = useFriendRequests();
  const { data: friends } = useFriends();
  const blocks = useBlocks();
  const glassAmount = useGlassStore((s) => s.amount);
  const setGlassAmount = useGlassStore((s) => s.setAmount);
  const persistGlass = useGlassStore((s) => s.persist);
  const [pushStatus, setPushStatus] = useState<Perm>(null);
  const [stepsStatus, setStepsStatus] = useState<Perm>(null);
  const [locationStatus, setLocationStatus] = useState<Perm>(null);
  const [permsOpen, setPermsOpen] = useState(false);
  // Cambiar la meta diaria desde el perfil (la misma que se cambia en Inicio).
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  async function saveGoal() {
    const n = parseInt(goalInput, 10);
    if (!profile || !(n >= MIN_DAILY_GOAL)) return;
    const { error } = await supabase.from('profiles').update({ daily_goal: n }).eq('id', profile.id);
    if (error) { Alert.alert('No se pudo cambiar la meta', friendlyError(error, 'Intenta de nuevo.')); return; }
    await useAuthStore.getState().refreshProfile();
    setGoalOpen(false);
  }
  // En iPhone "unknown" es: ya se pidió pero Salud no devolvió pasos esta semana; se muestra como activo (iOS no
  // deja saber si se negó) y el botón lleva a la app Salud para revisarlo.
  const stepsShown: Perm = Platform.OS === 'ios' && stepsStatus === 'unknown' ? 'granted' : stepsStatus;
  const pendingPerms = [pushStatus, stepsShown, locationStatus].filter((x) => x !== 'granted').length;

  // Los permisos se vuelven a leer cada vez que se entra a la pantalla (por si se cambiaron en los ajustes).
  const loadPermissions = useCallback(async () => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setPushStatus(p.status === 'granted' ? 'granted' : 'denied');
    } catch {
      setPushStatus('unknown');
    }
    if (Platform.OS === 'android') {
      try {
        if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) {
          setStepsStatus('denied');
        } else {
          await initializeHealthConnect();
          const granted = await getGrantedPermissions();
          setStepsStatus(granted.some((g) => 'recordType' in g && g.recordType === 'Steps') ? 'granted' : 'denied');
        }
      } catch {
        setStepsStatus('unknown');
      }
    } else if (Platform.OS === 'ios') {
      try {
        setStepsStatus(await healthKitStepsStatus());
      } catch {
        setStepsStatus('unknown');
      }
    }
    try {
      const Location = await import('expo-location');
      setLocationStatus((await Location.getForegroundPermissionsAsync()).granted ? 'granted' : 'denied');
    } catch {
      setLocationStatus('unknown');
    }
  }, []);
  useFocusEffect(useCallback(() => { loadPermissions(); }, [loadPermissions]));

  async function enablePush() {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'denied' && !current.canAskAgain) {
      Linking.openSettings();
      return;
    }
    await registerForPushNotificationsAsync({ userInitiated: true });
    // Al aceptar las notificaciones todos los avisos arrancan activos (después cada uno se puede apagar).
    if ((await Notifications.getPermissionsAsync()).status === 'granted') {
      useNotificationPrefs.getState().set('aliento', true);
      useNotificationPrefs.getState().set('racha', true);
      if (profile) await supabase.from('profiles').update({ push_servicio: true }).eq('id', profile.id);
    }
    await loadPermissions();
  }

  async function stepsAction() {
    if (Platform.OS === 'android') {
      if (stepsStatus === 'granted') {
        openHealthConnectSettings();
        return;
      }
      try {
        await initializeHealthConnect();
        await requestHealthConnectPermission([{ accessType: 'read', recordType: 'Steps' }]);
      } catch {
        openHealthConnectSettings();
      }
      await loadPermissions();
      return;
    }
    if (stepsStatus === 'denied') {
      try {
        if (!isHealthDataAvailable()) {
          Alert.alert('Salud no está disponible', 'Este teléfono no tiene la app Salud, así que Camina cuenta tus pasos con el sensor del teléfono.');
          return;
        }
        // La primera vez esto abre la hoja de Salud para activar "Pasos"; después iOS ya no la vuelve a mostrar.
        if ((await getRequestStatusForAuthorization({ toRead: [STEP_COUNT_IDENTIFIER] })) === HK_SHOULD_REQUEST) {
          await requestHealthKitAuthorization({ toRead: [STEP_COUNT_IDENTIFIER] });
          await loadPermissions();
          return;
        }
      } catch (e) {
        // Se muestra el detalle: si falla aquí suele ser un problema del build (permiso de Salud del App ID).
        Alert.alert('No pudimos abrir Salud', `Intenta de nuevo. Detalle: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }
    // Ya se pidió una vez: iPhone solo deja cambiarlo desde la app Salud (no aparece en Ajustes > Camina).
    Alert.alert('Pasos desde Salud', 'Abre la app Salud, toca tu foto (arriba a la derecha) > Apps > Camina y activa "Pasos".', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir Salud', onPress: () => Linking.openURL('x-apple-health://').catch(() => Linking.openSettings()) },
    ]);
  }

  async function locationAction() {
    if (locationStatus === 'granted') {
      Linking.openSettings();
      return;
    }
    const Location = await import('expo-location');
    const r = await Location.requestForegroundPermissionsAsync();
    if (!r.granted && !r.canAskAgain) Linking.openSettings();
    await loadPermissions();
  }

  async function toggleDarkMode(value: boolean) {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ dark_mode: value }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function toggleRanking(value: boolean) {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ranking_visible: value })
      .eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function handleLogout() {
    await unregisterPushToken();
    // Solo en este teléfono: el cierre global también sacaba a la persona de la web y de sus otros teléfonos.
    const { error } = await signOutUser('local');
    // Sin red, signOut devuelve error aunque la sesión local ya se cerró: ahí no hay nada que avisar.
    if (error && (await supabase.auth.getSession()).data.session) {
      Alert.alert('No pudimos cerrar sesión', friendlyError(error, 'Intenta de nuevo.'));
      return;
    }
    router.replace('/(auth)/welcome?modo=login');
  }

  const interestsText = (profile?.interests ?? []).length > 0 ? (profile?.interests ?? []).join(', ') : 'Todavía no elegiste ninguno';

  const dailyGoal = Math.max(profile?.daily_goal ?? DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL);
  const friendCount = (friends ?? []).length;
  const requests = (friendRequests ?? []).length;
  const chev = <ChevronRight size={14} color={isDark ? colors.dark.muted : colors.light.muted} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: tabSpace }}>
      {/* 1) Tu portada: el fondo que elegiste (o tu foto), tu foto, nombre, zona y lo que escribiste de ti. */}
      <ProfileBanner bg={profile?.profile_bg} photoUrl={profile?.profile_banner_url} style={{ paddingBottom: 22 }} artPad={24}>
        <Text accessibilityRole="header" className="text-white text-[15px] font-bold mb-4" style={{ opacity: 0.85 }}>Perfil</Text>
        <Press accessibilityRole="button" accessibilityLabel={`${profile?.full_name ?? 'Tu perfil'}, editar tu perfil`} onPress={() => router.push('/(tabs)/editar-perfil')} className="flex-row items-center" style={{ gap: 14 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', overflow: 'hidden', backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
            <AvatarImage
              uri={profile?.photo_url}
              style={{ width: '100%', height: '100%' }}
              fallback={<Text className="font-bold text-mint-dark text-[28px]">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>}
            />
          </View>
          <View className="flex-1">
            <Text className="text-white font-extrabold text-[21px]" numberOfLines={1}>{profile?.full_name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 1 }} numberOfLines={1}>{profile?.zone ?? 'Zona no definida'} · {profile?.city ?? 'Tarija'}</Text>
            <View className="flex-row items-center self-start mt-2 rounded-full px-3 py-1.5" style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <Pencil size={12} color="#fff" />
              <Text className="text-white text-[12px] font-bold">Editar perfil</Text>
            </View>
          </View>
        </Press>
        {profile?.bio ? <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, lineHeight: 19, marginTop: 12 }}>{profile.bio}</Text> : null}
      </ProfileBanner>

      <View className="px-5 pt-4">
        {/* 2) Tus números: cada uno lleva a su pantalla. */}
        <View className="flex-row mb-3" style={{ gap: 10 }}>
          <Press accessibilityRole="button" accessibilityLabel={`${balance ?? 0} ${plural(balance ?? 0, 'Punto', 'Puntos')}, ver detalle`} onPress={() => router.push('/(tabs)/puntos')} className="flex-1">
            <Glass className="rounded-2xl p-3 items-center">
              <Coin size={24} />
              <Text className="text-[18px] font-extrabold text-text-light dark:text-text-dark mt-1">{balance ?? 0}</Text>
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark">{plural(balance ?? 0, 'Punto', 'Puntos')}</Text>
            </Glass>
          </Press>
          <Press accessibilityRole="button" accessibilityLabel={`Amigos${requests > 0 ? `, ${requests} ${requests === 1 ? 'solicitud' : 'solicitudes'}` : ''}`} onPress={() => router.push('/(tabs)/amigos')} className="flex-1">
            <Glass className="rounded-2xl p-3 items-center">
              <UserPlus size={24} color={isDark ? colors.mint : colors.aquaDeep} />
              <Text className="text-[18px] font-extrabold text-text-light dark:text-text-dark mt-1">{friendCount}</Text>
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark">{plural(friendCount, 'amigo', 'amigos')}</Text>
              {requests > 0 ? (
                <View className="absolute rounded-full items-center justify-center" style={{ top: 8, right: 8, minWidth: 20, height: 20, paddingHorizontal: 5, backgroundColor: colors.dangerFill }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{requests}</Text>
                </View>
              ) : null}
            </Glass>
          </Press>
          <Press accessibilityRole="button" accessibilityLabel={`Meta diaria: ${dailyGoal.toLocaleString('es-BO')} pasos. Cambiarla`} onPress={() => { setGoalInput(String(dailyGoal)); setGoalOpen(true); }} className="flex-1">
            <Glass className="rounded-2xl p-3 items-center">
              <Target size={24} color={isDark ? colors.mint : colors.aquaDeep} />
              <Text className="text-[18px] font-extrabold text-text-light dark:text-text-dark mt-1">{dailyGoal.toLocaleString('es-BO')}</Text>
              <Text className="text-[11.5px] text-muted-light dark:text-muted-dark">meta diaria</Text>
            </Glass>
          </Press>
        </View>

        {/* 3) Tus insignias, como siempre. */}
        <BadgesCard badges={badges} />

        {/* 4) Ajustes, ordenados por tema. */}
        <SectionLabel>Tu cuenta</SectionLabel>
        <Glass className="rounded-2xl overflow-hidden mb-4">
          <Row label="Editar perfil" hint="Foto, portada, nombre, zona y bio" onPress={() => router.push('/(tabs)/editar-perfil')} right={chev} />
          <Row label="Intereses" hint={interestsText} onPress={() => router.push('/(tabs)/editar-perfil')} right={chev} />
          <Row label="Invitar amigos" hint="Ganas 5 Puntos por cada amigo que se suma" onPress={() => router.push('/(tabs)/amigos')} right={chev} last />
        </Glass>

        <SectionLabel>Permisos y avisos</SectionLabel>
        <Glass className="rounded-2xl overflow-hidden mb-4">
          <Row
            label="Permisos"
            hint="Pasos, notificaciones, ubicación y ranking"
            onPress={() => setPermsOpen(true)}
            right={
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-[12px] font-semibold" style={{ color: pendingPerms === 0 ? (isDark ? colors.mint : colors.aquaInk) : isDark ? colors.warnSoft : colors.warnDeep }}>
                  {pendingPerms === 0 ? 'Todo activo' : `${pendingPerms} sin activar`}
                </Text>
                {chev}
              </View>
            }
            last
          />
        </Glass>

      <Modal visible={permsOpen} transparent animationType="slide" onRequestClose={() => setPermsOpen(false)}>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar permisos" style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.45)' }} onPress={() => setPermsOpen(false)} />
        <View style={{ backgroundColor: isDark ? '#1B1530' : '#F4F0FF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text accessibilityRole="header" className="font-bold text-[17px] text-text-light dark:text-text-dark ml-1">Permisos</Text>
            <Press accessibilityRole="button" hitSlop={10} onPress={() => setPermsOpen(false)}>
              <Text className="text-[14px] font-semibold text-aqua-ink dark:text-aqua">Listo</Text>
            </Press>
          </View>
          <Glass className="rounded-2xl overflow-hidden">
        <PermRow
          icon={Bell}
          title="Notificaciones"
          text={pushStatus === 'granted' ? 'Te avisamos de códigos por vencer, tu racha y retos.' : 'Sin esto no te avisamos de códigos por vencer ni de tu racha.'}
          status={pushStatus}
          onPress={pushStatus === 'granted' ? () => Linking.openSettings() : enablePush}
        />
        {pushStatus === 'granted' && <NotificationPrefs />}
        <PermRow
          icon={Heartbeat}
          title={Platform.OS === 'ios' ? 'Pasos (Salud)' : 'Pasos (Health Connect)'}
          text={
            stepsStatus === 'granted'
              ? `Camina cuenta tus pasos desde ${Platform.OS === 'ios' ? 'Salud' : 'Health Connect'}.`
              : Platform.OS === 'ios' && stepsStatus === 'unknown'
                ? 'Si no ves tus pasos, revisa en la app Salud que Camina pueda leer "Pasos".'
                : 'Sin este permiso el podómetro no funciona y no sumas Puntos.'
          }
          status={stepsShown}
          onPress={stepsAction}
        />
        <PermRow
          icon={MapPin}
          title="Ubicación"
          text={locationStatus === 'granted' ? 'La usamos para mostrarte comercios cerca.' : 'Para ver comercios cerca de ti en el mapa.'}
          status={locationStatus}
          onPress={locationAction}
          last
        />
        <View className="flex-row items-center justify-between p-3.5 border-t border-line-light dark:border-line-dark" style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className="text-[14px] text-text-light dark:text-text-dark">Aparecer en el ranking</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Que otros vean tu nombre y tus pasos en el ranking.</Text>
          </View>
          <Switch accessibilityLabel="Aparecer en el ranking" value={profile?.ranking_visible ?? true} onValueChange={(v) => { buzz.selection(); toggleRanking(v); }} trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }} />
        </View>
          </Glass>
        </View>
      </Modal>

        <Modal visible={goalOpen} transparent animationType="fade" onRequestClose={() => setGoalOpen(false)}>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setGoalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.55)', justifyContent: 'center', padding: 24 }}>
            <Press feedback="none" onPress={() => {}} style={{ borderRadius: 24, padding: 20, backgroundColor: isDark ? '#1B1530' : '#F4F0FF' }}>
              <Text accessibilityRole="header" className="text-[17px] font-bold text-text-light dark:text-text-dark">Tu meta diaria</Text>
              <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-1">Pasos por día. Mínimo {MIN_DAILY_GOAL.toLocaleString('es-BO')}.</Text>
              <TextInput
                value={goalInput}
                onChangeText={(v) => setGoalInput(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                accessibilityLabel="Meta diaria de pasos"
                className="mt-3 rounded-2xl px-4 py-3 text-[20px] font-extrabold text-text-light dark:text-text-dark bg-card-light dark:bg-card-dark"
              />
              <View className="flex-row mt-4" style={{ gap: 10 }}>
                <Press accessibilityRole="button" onPress={() => setGoalOpen(false)} className="flex-1 rounded-2xl py-3 items-center bg-card-light dark:bg-card-dark">
                  <Text className="font-semibold text-text-light dark:text-text-dark">Cancelar</Text>
                </Press>
                <Press accessibilityRole="button" onPress={saveGoal} disabled={!(parseInt(goalInput, 10) >= MIN_DAILY_GOAL)} className="flex-1 rounded-2xl py-3 items-center bg-aqua-deep" style={{ opacity: parseInt(goalInput, 10) >= MIN_DAILY_GOAL ? 1 : 0.5 }}>
                  <Text className="font-bold text-white">Guardar</Text>
                </Press>
              </View>
            </Press>
          </Press>
        </Modal>

        <SectionLabel>Apariencia</SectionLabel>
        <Glass className="rounded-2xl px-4 py-3 mb-4">
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-[14px] text-text-light dark:text-text-dark">Modo oscuro</Text>
            <Switch
              accessibilityLabel="Modo oscuro"
              value={profile?.dark_mode ?? false}
              onValueChange={(v) => { buzz.selection(); toggleDarkMode(v); }}
              trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }}
            />
          </View>
          <Text className="text-[13px] text-text-light dark:text-text-dark mt-2">Vidrio de las tarjetas y la barra</Text>
          <GlassSlider label="Vidrio de las tarjetas y la barra" value={glassAmount} onChange={setGlassAmount} onDone={persistGlass} />
          <View className="flex-row justify-between">
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">Sólido</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">Cristal</Text>
          </View>
        </Glass>

        <SectionLabel>Ayuda</SectionLabel>
        <Glass className="rounded-2xl overflow-hidden mb-4">
          <Row label="Escribir a soporte" hint={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Camina`)} right={chev} />
          <Row label="Términos y privacidad" onPress={() => router.push('/legal')} right={chev} last={blocks.list.length === 0} />
          {blocks.list.length > 0 && (
            <View className="px-4 py-3 border-t border-line-light dark:border-line-dark">
              <Text className="text-[12px] font-bold text-muted-light dark:text-muted-dark mb-1.5">Personas que bloqueaste</Text>
              {blocks.list.map((b) => (
                <View key={b.id} className="flex-row items-center justify-between" style={{ minHeight: 44 }}>
                  <Text className="text-[13.5px] text-text-light dark:text-text-dark">{b.name}</Text>
                  <Press accessibilityRole="button" onPress={() => blocks.unblock.mutate(b.id)} hitSlop={{ left: 12, right: 12 }} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text className="text-[12.5px] font-semibold text-aqua-ink dark:text-aqua">Desbloquear</Text>
                  </Press>
                </View>
              ))}
            </View>
          )}
        </Glass>

        <Press accessibilityRole="button" onPress={handleLogout} className="flex-row items-center justify-center gap-2 py-3.5 mb-2">
          <LogOut size={15} color={isDark ? colors.warn : colors.warnDeep} />
          <Text className="text-warn-deep dark:text-warn font-semibold">Cerrar sesión</Text>
        </Press>
      </View>
    </ScrollView>
  );
}
