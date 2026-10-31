import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { GoalSheet } from '@/components/GoalSheet';
import { MIN_DAILY_GOAL, DEFAULT_DAILY_GOAL } from '@/constants/business-rules';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, ChevronDown, Camera, Trash2, KeyRound, Eye, EyeSlash, Coffee, Food, Ticket, Barbell, ShoppingBag, Sparkle, DeviceMobile, Calendar, IconBubble, type IconProps } from '@/components/icons';
import { uploadAvatar } from '@/lib/avatar';
import { birthToISO, ageFromISO, MIN_AGE } from '@/lib/age';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { INTERESTS_OPTIONS } from '@/constants/catalog';
import { SUPPORT_EMAIL } from '@/constants/contact';
import { BarrioPicker } from '@/components/BarrioPicker';
import { usePlaces } from '@/hooks/usePlaces';
import { emailRedirectUrl } from '@/lib/auth-links';
import { BIO_MAX_LENGTH } from '@/constants/business-rules';
import { friendlyError } from '@/lib/errors';
import { Glass } from '@/components/ui/Glass';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { AccountEmailCard } from '@/components/AccountEmailCard';
import { getAppleAuthorizationCode } from '@/lib/oauth';

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

function PasswordField({ label, value, onChange, placeholder, autoComplete }: { label: string; value: string; onChange: (t: string) => void; placeholder?: string; autoComplete?: 'password' | 'new-password' }) {
  const [shown, setShown] = useState(false);
  const dark = useColorScheme().colorScheme === 'dark';
  const muted = dark ? colors.dark.muted : colors.light.muted;
  return (
    <View className="mb-3">
      <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1">{label}</Text>
      <View className="flex-row items-center bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl pl-3.5 pr-2">
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          placeholder={placeholder}
          placeholderTextColor={muted}
          accessibilityLabel={label}
          className="flex-1 py-3 text-[14px] text-text-light dark:text-text-dark"
          style={{ minWidth: 0 }}
        />
        <Press accessibilityRole="button" accessibilityLabel={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShown((v) => !v)} hitSlop={8} className="p-2">
          {shown ? <EyeSlash size={20} color={muted} /> : <Eye size={20} color={muted} />}
        </Press>
      </View>
    </View>
  );
}

export default function EditarPerfilScreen() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  // ?nueva=1: llegó con el link de "olvidé mi contraseña" (ver app/(tabs)/_layout.tsx).
  const { nueva } = useLocalSearchParams<{ nueva?: string }>();
  const recovering = nueva === '1';
  const isDark = useColorScheme().colorScheme === 'dark';
  const { data: places } = usePlaces();
  const b = profile?.birth_date;
  const [nameInput, setNameInput] = useState(profile?.full_name ?? '');
  const [bioInput, setBioInput] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? 'Tarija');
  const [zone, setZone] = useState<string | null>(profile?.zone ?? null);
  const [bYear, setBYear] = useState(b ? b.slice(0, 4) : '');
  const [bMonth, setBMonth] = useState(b ? String(parseInt(b.slice(5, 7), 10)) : '');
  const [bDay, setBDay] = useState(b ? String(parseInt(b.slice(8, 10), 10)) : '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const goal = Math.max(profile?.daily_goal ?? DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const email = session?.user.email ?? '';
  // Las cuentas de Google o Apple no tienen contraseña propia hasta que crean una aquí (queda marcado en has_password).
  const hasPassword = session?.user.user_metadata?.has_password === true || (session?.user.app_metadata?.provider ?? 'email') === 'email';
  const linkedProvider = ((session?.user.app_metadata?.providers as string[] | undefined) ?? []).includes('apple') ? 'Apple' : 'Google';
  // Con el link del correo ya se comprobó que es la persona: no se pide la actual.
  const askCurrent = hasPassword && !recovering;
  const passwordTitle = recovering ? 'Elegir contraseña nueva' : hasPassword ? 'Cambiar contraseña' : 'Crear contraseña';

  const passwordFormOpen = changingPassword || recovering;

  useEffect(() => {
    if (recovering) useAuthStore.setState({ passwordRecovery: false });
  }, [recovering]);
  const field = 'bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3 py-3 text-[14px] text-center text-text-light dark:text-text-dark';
  const placeholder = isDark ? colors.dark.muted : colors.light.muted;

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1], base64: true });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoB64(result.assets[0].base64 ?? null);
    }
  }

  async function save() {
    if (!profile) return;
    if (!nameInput.trim()) {
      Alert.alert('Falta tu nombre', 'Escribe cómo te llamas.');
      return;
    }
    let birth: string | null | undefined;
    if (bDay || bMonth || bYear) {
      birth = birthToISO(bDay, bMonth, bYear);
      if (!birth) {
        Alert.alert('Fecha no válida', 'Ingresa día, mes y año (por ejemplo 15 / 04 / 1998).');
        return;
      }
      if (ageFromISO(birth) < MIN_AGE) {
        Alert.alert('Camina es para personas de 13 años o más', 'Revisa la fecha de nacimiento.');
        return;
      }
    }
    setSaving(true);
    try {
      const photoUrl = photoUri ? await uploadAvatar(profile.id, photoUri, photoB64) : undefined;
      // La descripción se manda solo si cambió: así guardar el perfil sigue andando aunque la base todavía no tenga la columna (migración 0056).
      const bioChanged = bioInput.trim() !== (profile.bio ?? '');
      const update = { full_name: nameInput.trim(), zone, city, interests, ...(photoUrl ? { photo_url: photoUrl } : {}), ...(bioChanged ? { bio: bioInput.trim() || null } : {}) };
      let { error } = await supabase.from('profiles').update({ ...update, ...(birth ? { birth_date: birth } : {}) }).eq('id', profile.id);
      if (error && /birth_date|city/i.test(error.message)) {
        const { city: _city, ...rest } = update;
        ({ error } = await supabase.from('profiles').update(rest).eq('id', profile.id));
      }
      if (error) throw error;
      await useAuthStore.getState().refreshProfile();
      // La pantalla sigue montada: sin esto el próximo guardado volvería a subir la misma foto.
      setPhotoUri(null);
      setPhotoB64(null);
      router.back();
    } catch (e) {
      Alert.alert('No pudimos guardar', friendlyError(e, 'Intenta de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (askCurrent && !currentPassword) {
      Alert.alert('Falta tu contraseña actual', 'Escríbela para confirmar que eres tú.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Contraseña muy corta', 'La nueva necesita al menos 6 caracteres.');
      return;
    }
    if (newPassword !== repeatPassword) {
      Alert.alert('No coinciden', 'La nueva contraseña y su repetición tienen que ser iguales.');
      return;
    }
    if (askCurrent && newPassword === currentPassword) {
      Alert.alert('Es la misma contraseña', 'Elige una distinta a la actual.');
      return;
    }
    setSavingPassword(true);
    // Primero se confirma la contraseña actual con el correo de la cuenta.
    if (askCurrent) {
      const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (check.error) {
        setSavingPassword(false);
        Alert.alert('Contraseña actual incorrecta', 'Revísala o toca "¿Olvidaste tu contraseña?" para elegir una nueva con el correo.');
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword, data: { has_password: true } });
    setSavingPassword(false);
    if (error) {
      Alert.alert('No pudimos cambiarla', friendlyError(error, 'Intenta de nuevo.'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setRepeatPassword('');
    setChangingPassword(false);
    Alert.alert('Listo', hasPassword ? 'Tu contraseña se actualizó.' : `Ya puedes entrar con ${email} y tu contraseña, además de ${linkedProvider}.`);
    if (recovering) router.setParams({ nueva: undefined });
  }

  // Si no se acuerda de la actual: se manda un link al correo de la cuenta y desde ahí elige una nueva.
  const [recoverySent, setRecoverySent] = useState(false);
  async function forgotPassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectUrl() });
    if (error) {
      Alert.alert('No pudimos mandar el correo', friendlyError(error, 'Intenta de nuevo.'));
      return;
    }
    setRecoverySent(true);
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar tu cuenta',
      'Se borran tu perfil, tu foto, tus Puntos, tus pasos y tu historial de canjes. Los resultados semanales de grupo ya cerrados se conservan, sin tu foto. Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: deleteAccount },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    // Cuenta creada con Apple: Apple pide que al borrarla se revoque su permiso. Se confirma con Apple
    // para obtener el código que el servidor usa para revocarlo. Si la persona cancela, no se borra nada.
    let appleAuthorizationCode: string | null = null;
    if (((session?.user.app_metadata?.providers as string[] | undefined) ?? []).includes('apple')) {
      try {
        appleAuthorizationCode = await getAppleAuthorizationCode();
      } catch (e) {
        setDeleting(false);
        const message = e instanceof Error ? e.message : '';
        if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED' || message.includes('ERR_REQUEST_CANCELED')) return;
        Alert.alert('No pudimos confirmar con Apple', 'Intenta de nuevo para eliminar tu cuenta.');
        return;
      }
    }
    const { error } = await supabase.functions.invoke('delete-account', {
      body: appleAuthorizationCode ? { appleAuthorizationCode } : {},
    });
    if (error) {
      setDeleting(false);
      Alert.alert('No pudimos eliminar tu cuenta', `Intenta de nuevo en un rato o escríbenos a ${SUPPORT_EMAIL}.`);
      return;
    }
    await supabase.auth.signOut();
    // La cuenta ya no existe: la bienvenida abre en "Crear cuenta", no en "Iniciar sesión".
    router.replace('/(auth)/welcome');
  }

  const photo = photoUri ?? profile?.photo_url ?? null;

  return (
    <KeyboardSafe className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="bg-auth-bg pt-14 pb-5 px-5" style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <View className="flex-row items-center gap-3">
            <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <ChevronLeft size={16} color="#fff" />
            </Press>
            <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Editar perfil</Text>
          </View>
        </View>

        <View className="px-5 pt-5">
          <Press accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" onPress={pickPhoto} className="self-center mb-5 items-center">
            <View className="w-24 h-24 rounded-full bg-mint items-center justify-center">
              <View className="w-full h-full rounded-full overflow-hidden items-center justify-center">
                <AvatarImage
                  uri={photo}
                  style={{ width: '100%', height: '100%' }}
                  fallback={<Text className="font-bold text-mint-dark text-3xl">{(nameInput || 'C')[0]?.toUpperCase()}</Text>}
                />
              </View>
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-aqua-deep items-center justify-center border-2 border-bg-light dark:border-bg-dark">
                <Camera size={15} color="#fff" weight="fill" />
              </View>
            </View>
            <Text className="text-[12.5px] font-semibold mt-2 text-purple-ink dark:text-purple-soft">Cambiar foto</Text>
          </Press>

          <Glass className="rounded-3xl p-4 mb-4">
            <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1">Nombre</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              accessibilityLabel="Nombre"
              className="bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3.5 py-3 text-[14px] text-text-light dark:text-text-dark mb-4"
            />

            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-muted-light dark:text-muted-dark text-[12px]">Sobre mí (opcional)</Text>
              <Text className="text-muted-light dark:text-muted-dark text-[12px]" style={{ fontVariant: ['tabular-nums'] }}>{bioInput.length}/{BIO_MAX_LENGTH}</Text>
            </View>
            <TextInput
              value={bioInput}
              onChangeText={(t) => setBioInput(t.replace(/\n/g, ' ').slice(0, BIO_MAX_LENGTH))}
              maxLength={BIO_MAX_LENGTH}
              placeholder="Camino los domingos al Prado"
              placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
              accessibilityLabel="Sobre mí, hasta 80 caracteres"
              accessibilityHint="Lo ven tus amigos y quienes comparten un grupo contigo"
              className="bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3.5 py-3 text-[14px] text-text-light dark:text-text-dark mb-1"
            />
            <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-4">Lo ven tus amigos y quienes comparten un grupo contigo.</Text>

            <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1.5">Ciudad</Text>
            <View className="flex-row flex-wrap mb-2">
              {(places?.cities ?? [city]).map((c) => (
                <Press
                  key={c}
                  accessibilityRole="button"
                  accessibilityState={{ selected: c === city }}
                  aria-pressed={c === city}
                  onPress={() => { if (c !== city) { setCity(c); setZone(null); } }}
                  className={`rounded-full px-3.5 py-2 mr-2 mb-2 border ${c === city ? 'bg-mint border-mint' : 'border-line-light dark:border-line-dark'}`}
                  style={{ minHeight: 40, justifyContent: 'center' }}
                >
                  <Text style={{ color: c === city ? colors.mintInk : isDark ? colors.dark.muted : colors.light.muted, fontWeight: c === city ? '700' : '500', fontSize: 13 }}>{c}</Text>
                </Press>
              ))}
            </View>
            <BarrioPicker city={city} zone={zone} onChange={setZone} />

            <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-4 mb-1">Fecha de nacimiento</Text>
            <View className="flex-row gap-2 mb-1">
              <TextInput value={bDay} onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 2); setBDay(v); if (v.length === 2) monthRef.current?.focus(); }} placeholder="Día" accessibilityLabel="Día de nacimiento" keyboardType="number-pad" placeholderTextColor={placeholder} style={{ minWidth: 0 }} className={`flex-1 ${field}`} />
              <TextInput ref={monthRef} value={bMonth} onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 2); setBMonth(v); if (v.length === 2) yearRef.current?.focus(); }} placeholder="Mes" accessibilityLabel="Mes de nacimiento" keyboardType="number-pad" placeholderTextColor={placeholder} style={{ minWidth: 0 }} className={`flex-1 ${field}`} />
              <TextInput ref={yearRef} value={bYear} onChangeText={(t) => setBYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Año" accessibilityLabel="Año de nacimiento" keyboardType="number-pad" placeholderTextColor={placeholder} style={{ minWidth: 0 }} className={`flex-[1.4] ${field}`} />
            </View>
            <Text className="text-muted-light dark:text-muted-dark text-[12px]">Solo para confirmar que tienes 13 años o más. No se muestra a nadie.</Text>

            <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-4 mb-1">Tu meta diaria</Text>
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Tu meta diaria, ${goal.toLocaleString('es-BO')} pasos. Cambiar`}
              onPress={() => setGoalOpen(true)}
              className={`flex-row items-center justify-between ${field}`}
            >
              <Text className="text-text-light dark:text-text-dark text-[15px]">{goal.toLocaleString('es-BO')} pasos</Text>
              <ChevronDown size={16} color={isDark ? colors.dark.muted : colors.light.muted} />
            </Press>
            <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-1">Todos tus pasos suman, llegues o no a la meta.</Text>
          </Glass>

          <Glass className="rounded-3xl p-4 mb-4">
            <Text className="font-bold text-[15px] mb-1 text-text-light dark:text-text-dark">Tus intereses</Text>
            <Text className="text-muted-light dark:text-muted-dark text-xs mb-3">Opcional. Nos ayuda a mostrarte mejores beneficios.</Text>
            <View className="flex-row flex-wrap gap-2">
              {INTERESTS_OPTIONS.map(([name]) => {
                const active = interests.includes(name);
                const Icon = INTEREST_ICON[name] ?? Sparkle;
                return (
                  <Press
                    key={name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    aria-checked={active}
                    hitSlop={4}
                    onPress={() => setInterests((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]))}
                    className={`flex-row items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-2 border ${active ? 'bg-aqua-light-light dark:bg-aqua-light-dark' : 'border-line-light dark:border-line-dark'}`}
                    style={{ minHeight: 40, ...(active ? { borderColor: colors.aqua } : null) }}
                  >
                    <Icon size={16} color={active ? (isDark ? colors.mint : colors.aquaDeep) : isDark ? colors.dark.muted : colors.light.muted} weight={active ? 'fill' : 'regular'} />
                    <Text className={`text-xs font-semibold ${active ? 'text-aqua-ink dark:text-mint' : 'text-muted-light dark:text-muted-dark'}`}>{name}</Text>
                  </Press>
                );
              })}
            </View>
          </Glass>

          <Press accessibilityRole="button" onPress={save} disabled={saving} className="bg-aqua-deep rounded-2xl py-4 items-center mb-6">
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Guardar cambios</Text>}
          </Press>

          {!!email && (
            <Glass className="rounded-3xl p-4 mb-4">
              {!passwordFormOpen ? (
                <Press accessibilityRole="button" onPress={() => setChangingPassword(true)} className="flex-row items-center gap-3">
                  <IconBubble icon={KeyRound} tone="purple" size={38} />
                  <View className="flex-1">
                    <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">{passwordTitle}</Text>
                    {!hasPassword && (
                      <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-0.5">Opcional: para entrar también con tu correo, no solo con {linkedProvider}.</Text>
                    )}
                  </View>
                </Press>
              ) : (
                <View>
                  <Text className="font-bold text-[14.5px] mb-1 text-text-light dark:text-text-dark">{passwordTitle}</Text>
                  <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mb-3">Cuenta: {email}</Text>
                  {askCurrent && <PasswordField label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} autoComplete="password" />}
                  <PasswordField label="Contraseña nueva" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                  <PasswordField label="Repite la contraseña nueva" value={repeatPassword} onChange={setRepeatPassword} autoComplete="new-password" />
                  {askCurrent && (
                    <Press accessibilityRole="button" onPress={forgotPassword} className="self-start mb-3">
                      <Text className="text-aqua-ink dark:text-mint text-[13px] font-semibold underline">
                        {recoverySent ? `Te mandamos un link a ${email}. Ábrelo en este teléfono para elegir una nueva.` : '¿Olvidaste tu contraseña? Cambiarla con el correo'}
                      </Text>
                    </Press>
                  )}
                  <View className="flex-row gap-2">
                    <Press accessibilityRole="button" onPress={savePassword} disabled={savingPassword} className="flex-1 bg-aqua-deep rounded-xl py-3 items-center">
                      {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold text-[13.5px]">{hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}</Text>}
                    </Press>
                    <Press
                      accessibilityRole="button"
                      onPress={() => { setChangingPassword(false); if (recovering) router.setParams({ nueva: undefined }); setCurrentPassword(''); setNewPassword(''); setRepeatPassword(''); }}
                      className="border border-line-light dark:border-line-dark rounded-xl px-4 py-3 items-center"
                    >
                      <Text className="text-muted-light dark:text-muted-dark font-semibold text-[13.5px]">Cancelar</Text>
                    </Press>
                  </View>
                </View>
              )}
            </Glass>
          )}

          <AccountEmailCard />

          <Press accessibilityRole="button" onPress={confirmDelete} disabled={deleting} className="flex-row items-center justify-center gap-2 py-4">
            {deleting ? (
              <ActivityIndicator color={isDark ? colors.warn : colors.warnDeep} size="small" />
            ) : (
              <>
                <Trash2 size={15} color={isDark ? colors.warn : colors.warnDeep} />
                <Text className="text-warn-deep dark:text-warn font-semibold">Eliminar cuenta</Text>
              </>
            )}
          </Press>
        </View>
      </ScrollView>
      <GoalSheet visible={goalOpen} goal={goal} isDark={isDark} onClose={() => setGoalOpen(false)} />
    </KeyboardSafe>
  );
}
