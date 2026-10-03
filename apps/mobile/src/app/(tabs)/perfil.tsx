import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch, Alert, Share, ActivityIndicator, TextInput, Linking } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LogOut, Gift, Trash2, KeyRound, Pencil, IconBubble, Coffee, Food, Ticket, Barbell, ShoppingBag, Sparkle, DeviceMobile, Calendar, type IconProps } from '@/components/icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@/lib/avatar';
import { birthToISO, ageFromISO, MIN_AGE } from '@/lib/age';
import { clearCoarseLocation, shareCoarseLocation } from '@/lib/coarse-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';
import { INTERESTS_OPTIONS } from '@/constants/catalog';
import { referralLink } from '@/constants/sharing';
import { PlacePicker } from '@/components/PlacePicker';
import { useBlocks } from '@/hooks/useModeration';
import { SUPPORT_EMAIL } from '@/constants/contact';
import { useGlassStore, type GlassLevel } from '@/store/useGlassStore';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';

const INTEREST_ICON: Record<string, (p: IconProps) => React.ReactElement> = {
  Café: Coffee,
  Gastronomía: Food,
  Entretenimiento: Ticket,
  Fitness: Barbell,
  Compras: ShoppingBag,
  Belleza: Sparkle,
  Tecnología: DeviceMobile,
  Eventos: Calendar,
};

export default function PerfilScreen() {
  const tabSpace = useTabBarSpace();
  const profile = useAuthStore((s) => s.profile);
  const isDark = useColorScheme().colorScheme === 'dark';
  const { data: balance } = usePointsBalance();
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const blocks = useBlocks();
  const glassLevel = useGlassStore((s) => s.level);
  const setGlassLevel = useGlassStore((s) => s.setLevel);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [zoneInput, setZoneInput] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState('Tarija');
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  function startEditing() {
    setNameInput(profile?.full_name ?? '');
    setZoneInput(profile?.zone ?? null);
    setCityInput(profile?.city ?? 'Tarija');
    const b = profile?.birth_date;
    setBYear(b ? b.slice(0, 4) : '');
    setBMonth(b ? String(parseInt(b.slice(5, 7), 10)) : '');
    setBDay(b ? String(parseInt(b.slice(8, 10), 10)) : '');
    setPhotoUri(null);
    setEditing(true);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function saveProfile() {
    if (!profile) return;
    if (!nameInput.trim()) {
      Alert.alert('Falta tu nombre', 'Escribí cómo te llamás.');
      return;
    }
    let birth: string | null | undefined;
    if (bDay || bMonth || bYear) {
      birth = birthToISO(bDay, bMonth, bYear);
      if (!birth) {
        Alert.alert('Fecha no válida', 'Ingresá día, mes y año (por ejemplo 15 / 04 / 1998).');
        return;
      }
      if (ageFromISO(birth) < MIN_AGE) {
        Alert.alert('Camina es para mayores de 13 años', 'Revisá la fecha de nacimiento.');
        return;
      }
    }
    setSavingProfile(true);
    try {
      const photoUrl = photoUri ? await uploadAvatar(profile.id, photoUri) : undefined;
      const update = {
        full_name: nameInput.trim(),
        zone: zoneInput,
        city: cityInput,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      };
      let { error } = await supabase.from('profiles').update({ ...update, ...(birth ? { birth_date: birth } : {}) }).eq('id', profile.id);
      if (error && /birth_date|city/i.test(error.message)) {
        // Si la base todavía no tiene alguna columna nueva, se guarda igual lo demás.
        const { city: _city, ...rest } = update;
        ({ error } = await supabase.from('profiles').update(rest).eq('id', profile.id));
      }
      if (error) throw error;
      await useAuthStore.getState().refreshProfile();
      setEditing(false);
    } catch (e) {
      Alert.alert('No pudimos guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Contraseña muy corta', 'Necesita al menos 6 caracteres.');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      Alert.alert('No pudimos cambiarla', error.message);
      return;
    }
    setNewPassword('');
    setChangingPassword(false);
    Alert.alert('Listo', 'Tu contraseña se actualizó.');
  }

  async function toggleInterest(name: string) {
    if (!profile) return;
    const current = new Set(profile.interests ?? []);
    if (current.has(name)) current.delete(name);
    else current.add(name);
    const { error } = await supabase.from('profiles').update({ interests: [...current] }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
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
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('No pudimos cerrar sesión', error.message);
    else router.replace('/(auth)/welcome');
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Eliminar tu cuenta',
      'Se borran tu perfil, tus Puntos, tu historial de canjes y todo lo demás. Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: deleteAccount },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleting(false);
      Alert.alert('No pudimos eliminar tu cuenta', error.message);
      return;
    }
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <Text className="text-[21px] font-extrabold mb-4 text-text-light dark:text-text-dark">
        Perfil
      </Text>

      <Glass className="flex-row items-center gap-3.5 rounded-md p-4 mb-4">
        <View className="w-14 h-14 rounded-full bg-mint items-center justify-center overflow-hidden">
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} className="w-full h-full" />
          ) : (
            <Text className="font-bold text-mint-dark text-xl">
              {(profile?.full_name || 'C')[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">
            {profile?.full_name}
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-[13px] mt-0.5">
            {profile?.zone ?? 'Zona no definida'} · {profile?.city ?? 'Tarija'}
          </Text>
        </View>
        <Pressable onPress={editing ? () => setEditing(false) : startEditing} hitSlop={8} className="flex-row items-center gap-1.5 rounded-full px-3 py-2 bg-purple-light-light dark:bg-purple-light-dark">
          <Pencil size={13} color={colors.purple} />
          <Text className="text-[12px] font-semibold" style={{ color: colors.purple }}>{editing ? 'Cerrar' : 'Editar'}</Text>
          </Pressable>
      </Glass>

      {editing && (
        <Glass className="rounded-3xl p-4 mb-4">
          <Pressable onPress={pickPhoto} className="self-center mb-4 items-center">
            <View className="w-20 h-20 rounded-full bg-mint items-center justify-center overflow-hidden">
              {photoUri || profile?.photo_url ? (
                <Image source={{ uri: photoUri ?? profile!.photo_url! }} className="w-full h-full" />
              ) : (
                <Text className="font-bold text-mint-dark text-2xl">{(nameInput || 'C')[0]?.toUpperCase()}</Text>
              )}
            </View>
            <Text className="text-[12px] font-semibold mt-1.5" style={{ color: colors.purple }}>Cambiar foto</Text>
          </Pressable>
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1">Nombre</Text>
          <TextInput value={nameInput} onChangeText={setNameInput}
            className="bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3.5 py-3 text-[14px] text-text-light dark:text-text-dark mb-3" />
          <PlacePicker city={cityInput} zone={zoneInput} onChange={(c, z) => { setCityInput(c); setZoneInput(z); }} />
          <View className="mb-2" />
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1">Fecha de nacimiento</Text>
          <View className="flex-row gap-2 mb-1">
            <TextInput value={bDay} onChangeText={(t) => setBDay(t.replace(/\D/g, '').slice(0, 2))} placeholder="Día" keyboardType="number-pad"
              placeholderTextColor={colors.light.muted}
              className="flex-1 bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3 py-3 text-[14px] text-center text-text-light dark:text-text-dark" />
            <TextInput value={bMonth} onChangeText={(t) => setBMonth(t.replace(/\D/g, '').slice(0, 2))} placeholder="Mes" keyboardType="number-pad"
              placeholderTextColor={colors.light.muted}
              className="flex-1 bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3 py-3 text-[14px] text-center text-text-light dark:text-text-dark" />
            <TextInput value={bYear} onChangeText={(t) => setBYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Año" keyboardType="number-pad"
              placeholderTextColor={colors.light.muted}
              className="flex-[1.4] bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3 py-3 text-[14px] text-center text-text-light dark:text-text-dark" />
          </View>
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-4">Solo para confirmar que tenés 13 años o más. No se muestra a nadie.</Text>
          <Pressable onPress={saveProfile} disabled={savingProfile} className="bg-aqua-deep rounded-xl py-3 items-center">
            {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold text-[13.5px]">Guardar cambios</Text>}
          </Pressable>
          <Pressable onPress={confirmDeleteAccount} disabled={deleting} className="flex-row items-center justify-center gap-2 pt-4 mt-4 border-t border-line-light dark:border-line-dark">
            {deleting ? (
              <ActivityIndicator color={colors.warn} size="small" />
            ) : (
              <>
                <Trash2 size={15} color={colors.warn} />
                <Text className="text-warn font-semibold">Eliminar cuenta</Text>
              </>
            )}
          </Pressable>
        </Glass>
      )}

      <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 flex-row items-center gap-3 mb-4">
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">
            {balance ?? 0} Puntos
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs">Balance disponible</Text>
        </View>
      </View>

      <Pressable
        onPress={inviteFriends}
        className="flex-row items-center gap-3.5 bg-aqua-light-light dark:bg-aqua-light-dark rounded-3xl p-4 mb-4"
      >
        <IconBubble icon={Gift} tone="aqua" size={46} />
        <View className="flex-1">
          <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">Invitá amigos</Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs mt-0.5">
            Ganá 5 Puntos cuando tu amigo empiece a caminar
          </Text>
        </View>
      </Pressable>

      <Glass className="rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[15px] mb-1 text-text-light dark:text-text-dark">Tus intereses</Text>
        <Text className="text-muted-light dark:text-muted-dark text-xs mb-3">Opcional — nos ayuda a mostrarte mejores beneficios.</Text>
        <View className="flex-row flex-wrap gap-2">
          {INTERESTS_OPTIONS.map(([name]) => {
            const active = (profile?.interests ?? []).includes(name);
            const Icon = INTEREST_ICON[name] ?? Sparkle;
            return (
              <Pressable
                key={name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggleInterest(name)}
                className={`flex-row items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-2 border ${
                  active ? 'bg-aqua-light-light dark:bg-aqua-light-dark' : 'border-line-light dark:border-line-dark'
                }`}
                style={active ? { borderColor: colors.aqua } : undefined}
              >
                <Icon size={16} color={active ? (isDark ? colors.mint : colors.aquaDeep) : isDark ? colors.dark.muted : colors.light.muted} weight={active ? 'fill' : 'regular'} />
                <Text
                  className={`text-xs font-semibold ${active ? 'text-aqua-deep dark:text-mint' : 'text-muted-light dark:text-muted-dark'}`}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Glass>

      <Glass className="rounded-md overflow-hidden mb-6">
        <View className="flex-row items-center justify-between p-3.5 border-b border-line-light dark:border-line-dark">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Aparecer en el ranking</Text>
          <Switch
            value={profile?.ranking_visible ?? true}
            onValueChange={toggleRanking}
            trackColor={{ true: colors.aqua, false: colors.light.line }}
          />
        </View>
        <View className="flex-row items-center justify-between p-3.5 border-b border-line-light dark:border-line-dark">
          <View className="flex-1 pr-3">
            <Text className="text-[14px] text-text-light dark:text-text-dark">Avisos de comercios cerca</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">
              Usamos tu ubicación aproximada. Máximo 1 aviso por semana.
            </Text>
          </View>
          <Switch
            value={profile?.nearby_alerts ?? true}
            onValueChange={toggleNearby}
            trackColor={{ true: colors.aqua, false: colors.light.line }}
          />
        </View>
      </Glass>

      <Glass className="rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark mb-2">Personalización</Text>
        <View className="flex-row items-center justify-between py-1.5">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Modo oscuro</Text>
          <Switch
            value={profile?.dark_mode ?? false}
            onValueChange={toggleDarkMode}
            trackColor={{ true: colors.aqua, false: colors.light.line }}
          />
        </View>
        <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-2 mb-2">Transparencia de las tarjetas</Text>
        <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(124,106,156,0.14)' }}>
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

      <Glass className="rounded-3xl p-4 mb-4">
        {!changingPassword ? (
          <Pressable onPress={() => setChangingPassword(true)} className="flex-row items-center gap-3">
            <IconBubble icon={KeyRound} tone="purple" size={38} />
            <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">Cambiar contraseña</Text>
          </Pressable>
        ) : (
          <View>
            <Text className="font-bold text-[14.5px] mb-2.5 text-text-light dark:text-text-dark">Nueva contraseña</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.light.muted}
              className="bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3.5 py-3 text-[14px] text-text-light dark:text-text-dark mb-3"
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={savePassword}
                disabled={savingPassword}
                className="flex-1 bg-aqua-deep rounded-xl py-3 items-center"
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-[13.5px]">Guardar</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setChangingPassword(false);
                  setNewPassword('');
                }}
                className="flex-1 border border-line-light dark:border-line-dark rounded-xl py-3 items-center"
              >
                <Text className="text-muted-light dark:text-muted-dark font-semibold text-[13.5px]">Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Glass>

      <Pressable onPress={handleLogout} className="flex-row items-center justify-center gap-2 py-3.5">
        <LogOut size={15} color={colors.warn} />
        <Text className="text-warn font-semibold">Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
