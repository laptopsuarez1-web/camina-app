import { useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { View, Text, ScrollView, Pressable, Image, Switch, Alert, Share, Linking, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { getGrantedPermissions, getSdkStatus, initialize as initializeHealthConnect, requestPermission as requestHealthConnectPermission, openHealthConnectSettings, SdkAvailabilityStatus } from 'react-native-health-connect';
import { LogOut, Gift, Pencil, IconBubble, Bell, Heartbeat, MapPin } from '@/components/icons';
import { clearCoarseLocation, shareCoarseLocation } from '@/lib/coarse-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';
import { referralLink } from '@/constants/sharing';
import { useBlocks } from '@/hooks/useModeration';
import { SUPPORT_EMAIL } from '@/constants/contact';
import { useGlassStore, type GlassLevel } from '@/store/useGlassStore';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { unregisterPushToken, registerForPushNotificationsAsync } from '@/lib/push-notifications';

type Perm = 'granted' | 'denied' | 'unknown' | null;

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
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${on ? 'ajustes' : 'activar'}`} onPress={onPress} hitSlop={8} className={`px-3 py-2 rounded-full ${on ? 'bg-purple-light-light dark:bg-purple-light-dark' : 'bg-aqua-deep'}`}>
        <Text className={`text-[12px] font-semibold ${on ? '' : 'text-white'}`} style={on ? { color: colors.purple } : undefined}>{on ? 'Ajustes' : 'Activar'}</Text>
      </Pressable>
    </View>
  );
}

export default function PerfilScreen() {
  const tabSpace = useTabBarSpace();
  const profile = useAuthStore((s) => s.profile);
  const isDark = useColorScheme().colorScheme === 'dark';
  const { data: balance } = usePointsBalance();
  const blocks = useBlocks();
  const glassLevel = useGlassStore((s) => s.level);
  const setGlassLevel = useGlassStore((s) => s.setLevel);
  const [pushStatus, setPushStatus] = useState<Perm>(null);
  const [stepsStatus, setStepsStatus] = useState<Perm>(null);
  const [locationStatus, setLocationStatus] = useState<Perm>(null);

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
    } else {
      // iPhone no deja saber si se negó el acceso de lectura a Salud: solo se puede mandar a los ajustes.
      setStepsStatus('unknown');
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
    await registerForPushNotificationsAsync();
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
    Alert.alert('Pasos desde Salud', 'En Ajustes > Salud > Acceso a datos y dispositivos > Camina, activá "Pasos".', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
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

  async function toggleNearby(value: boolean) {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ nearby_alerts: value }).eq('id', profile.id);
    if (error) return;
    await useAuthStore.getState().refreshProfile();
    if (value) await shareCoarseLocation(true);
    else await clearCoarseLocation();
  }

  async function toggleRanking(value: boolean) {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ranking_visible: value })
      .eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function inviteFriends() {
    if (!profile) return;
    await Share.share({
      message: `Te invito a Camina — caminá y ganá Puntos para canjear en comercios adheridos. Sumate con mi link:\n${referralLink(profile.id)}`,
      url: referralLink(profile.id),
    });
  }

  async function handleLogout() {
    await unregisterPushToken();
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('No pudimos cerrar sesión', error.message);
    else router.replace('/(auth)/welcome');
  }

  const interestsText = (profile?.interests ?? []).length > 0 ? (profile?.interests ?? []).join(', ') : 'Todavía no elegiste ninguno';

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-5 pt-14" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <Text accessibilityRole="header" className="text-[21px] font-extrabold mb-4 text-text-light dark:text-text-dark">Perfil</Text>

      <Glass className="rounded-3xl p-4 mb-4">
        <View className="flex-row items-center gap-3.5">
          <View className="w-14 h-14 rounded-full bg-mint items-center justify-center overflow-hidden">
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} className="w-full h-full" />
            ) : (
              <Text className="font-bold text-mint-dark text-xl">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">{profile?.full_name}</Text>
            <Text className="text-muted-light dark:text-muted-dark text-[13px] mt-0.5">
              {profile?.zone ?? 'Barrio no definido'} · {profile?.city ?? 'Tarija'}
            </Text>
          </View>
        </View>
        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-3" numberOfLines={2}>Intereses: {interestsText}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/editar-perfil')} className="flex-row items-center justify-center gap-2 rounded-xl py-3 mt-3 bg-purple-light-light dark:bg-purple-light-dark">
          <Pencil size={14} color={colors.purple} />
          <Text className="text-[13.5px] font-semibold" style={{ color: colors.purple }}>Editar perfil</Text>
        </Pressable>
      </Glass>

      <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 flex-row items-center gap-3 mb-4">
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">{balance ?? 0} Puntos</Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs">Balance disponible</Text>
        </View>
      </View>

      <Pressable onPress={inviteFriends} className="flex-row items-center gap-3.5 bg-aqua-light-light dark:bg-aqua-light-dark rounded-3xl p-4 mb-4">
        <IconBubble icon={Gift} tone="aqua" size={46} />
        <View className="flex-1">
          <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">Invitá amigos</Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs mt-0.5">Ganá 5 Puntos cuando tu amigo empiece a caminar</Text>
        </View>
      </Pressable>

      <Text className="text-[12px] font-bold uppercase tracking-wide text-muted-light dark:text-muted-dark mb-2 ml-1">Permisos</Text>
      <Glass className="rounded-2xl overflow-hidden mb-4">
        <PermRow
          icon={Bell}
          title="Notificaciones"
          text={pushStatus === 'granted' ? 'Te avisamos de códigos por vencer, tu racha y retos.' : 'Sin esto no te avisamos de códigos por vencer ni de tu racha.'}
          status={pushStatus}
          onPress={pushStatus === 'granted' ? () => Linking.openSettings() : enablePush}
        />
        <PermRow
          icon={Heartbeat}
          title={Platform.OS === 'ios' ? 'Pasos (Salud)' : 'Pasos (Health Connect)'}
          text={stepsStatus === 'granted' ? 'Camina cuenta tus pasos desde Health Connect.' : 'Sin este permiso el podómetro no funciona y no sumás Puntos.'}
          status={Platform.OS === 'ios' ? 'denied' : stepsStatus}
          onPress={stepsAction}
        />
        <PermRow
          icon={MapPin}
          title="Ubicación"
          text={locationStatus === 'granted' ? 'La usamos para mostrarte comercios cerca.' : 'Para ver comercios cerca de vos en el mapa.'}
          status={locationStatus}
          onPress={locationAction}
          last
        />
      </Glass>

      <Glass className="rounded-md overflow-hidden mb-4">
        <View className="flex-row items-center justify-between p-3.5 border-b border-line-light dark:border-line-dark">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Aparecer en el ranking</Text>
          <Switch value={profile?.ranking_visible ?? true} onValueChange={toggleRanking} trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }} />
        </View>
        <View className="flex-row items-center justify-between p-3.5">
          <View className="flex-1 pr-3">
            <Text className="text-[14px] text-text-light dark:text-text-dark">Avisos de comercios cerca</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Usamos tu ubicación aproximada. Máximo 1 aviso por semana.</Text>
          </View>
          <Switch value={profile?.nearby_alerts ?? true} onValueChange={toggleNearby} trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }} />
        </View>
      </Glass>

      <Glass className="rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark mb-2">Personalización</Text>
        <View className="flex-row items-center justify-between py-1.5">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Modo oscuro</Text>
          <Switch
            value={profile?.dark_mode ?? false}
            onValueChange={toggleDarkMode}
            trackColor={{ true: colors.aqua, false: isDark ? colors.dark.line : colors.light.line }}
          />
        </View>
        <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-2 mb-2">Transparencia de las tarjetas</Text>
        <View className="flex-row rounded-full p-1" style={{ backgroundColor: isDark ? 'rgba(179,166,214,0.16)' : 'rgba(124,106,156,0.14)' }}>
          {([[0, 'Sólido'], [1, 'Equilibrado'], [2, 'Cristal']] as [GlassLevel, string][]).map(([lvl, label]) => (
            <Pressable
              key={lvl}
              accessibilityRole="button"
              accessibilityState={{ selected: glassLevel === lvl }}
              onPress={() => setGlassLevel(lvl)}
              className="flex-1 rounded-full py-2 items-center"
              style={{ backgroundColor: glassLevel === lvl ? colors.aquaDeep : 'transparent' }}
            >
              <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 12.5, fontWeight: '700', ...(glassLevel === lvl ? { color: '#fff' } : null) }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Glass>

      <Glass className="rounded-2xl px-4 py-3 mb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Soporte</Text>
          <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Camina`)} hitSlop={8}>
            <Text className="text-[12.5px] font-semibold text-aqua-deep dark:text-aqua">{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
        {blocks.list.length > 0 && (
          <View className="mt-3 pt-3 border-t border-line-light dark:border-line-dark">
            <Text className="text-[12px] font-bold text-muted-light dark:text-muted-dark mb-1.5">Personas que bloqueaste</Text>
            {blocks.list.map((b) => (
              <View key={b.id} className="flex-row items-center justify-between py-1.5">
                <Text className="text-[13.5px] text-text-light dark:text-text-dark">{b.name}</Text>
                <Pressable onPress={() => blocks.unblock.mutate(b.id)} hitSlop={8}>
                  <Text className="text-[12.5px] font-semibold text-aqua-deep dark:text-aqua">Desbloquear</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Glass>

      <Pressable accessibilityRole="link" onPress={() => router.push('/legal')} className="flex-row items-center justify-center py-3">
        <Text className="text-muted-light dark:text-muted-dark text-[13px] underline">Términos y política de privacidad</Text>
      </Pressable>

      <Pressable onPress={handleLogout} className="flex-row items-center justify-center gap-2 py-3.5">
        <LogOut size={15} color={colors.warn} />
        <Text className="text-warn font-semibold">Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
