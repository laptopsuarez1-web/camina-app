import { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { IconBubble, Mail, GoogleIcon, AppleIcon, CheckCircle2 } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { emailRedirectUrl } from '@/lib/auth-links';
import { friendlyError } from '@/lib/errors';
import { Google, googleClientIds, googleOAuthConfigured, linkGoogleIdentity } from '@/lib/oauth';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

const PROVIDER_NAME: Record<string, string> = { google: 'Google', apple: 'Apple' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Correo con el que la persona entra a Camina. Si entró con Google o Apple el correo lo maneja esa cuenta y aquí
// solo se avisa que está vinculada; si entró con correo y contraseña puede cambiarlo (Supabase manda un link
// para confirmar el correo nuevo y hasta que no se abre se sigue entrando con el actual).
export function AccountEmailCard() {
  const user = useAuthStore((s) => s.session?.user);
  const dark = useColorScheme().colorScheme === 'dark';
  const muted = dark ? colors.dark.muted : colors.light.muted;
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(googleClientIds);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) return;
    (async () => {
      setLinking(true);
      const { error } = await linkGoogleIdentity(idToken);
      if (error) {
        const taken = /already|exists|linked/i.test(error.message ?? '');
        Alert.alert(
          'No pudimos vincular Google',
          taken ? 'Esa cuenta de Google ya está usada en otra cuenta de Camina. Prueba con otra cuenta de Google.' : friendlyError(error, 'Intenta de nuevo.'),
        );
      } else {
        await supabase.auth.refreshSession();
      }
      setLinking(false);
    })();
  }, [googleResponse]);

  async function linkGoogle() {
    if (!googleOAuthConfigured) {
      Alert.alert('Google no está disponible ahora', 'Intenta más tarde.');
      return;
    }
    await promptGoogleAsync();
  }

  if (!user) return null;
  const email = user.email ?? '';
  const providers: string[] = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider ?? 'email'];
  const linked = providers.find((p) => PROVIDER_NAME[p]);
  // Cambio pedido y todavía sin confirmar (puede venir de antes de abrir esta pantalla).
  const pending = sentTo ?? user.new_email ?? null;

  async function save() {
    const next = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) {
      Alert.alert('Revisa el correo', 'Escríbelo completo, por ejemplo nombre@gmail.com.');
      return;
    }
    if (next === email.toLowerCase()) {
      Alert.alert('Es el mismo correo', 'Escribe un correo distinto al actual.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: emailRedirectUrl() });
    setSaving(false);
    if (error) {
      Alert.alert('No pudimos cambiar el correo', friendlyError(error, 'Intenta de nuevo.'));
      return;
    }
    setSentTo(next);
    setNewEmail('');
    setEditing(false);
  }

  if (linked) {
    const Logo = linked === 'apple' ? AppleIcon : GoogleIcon;
    return (
      <Glass className="rounded-3xl p-4 mb-4">
        <View className="flex-row items-center gap-3">
          <IconBubble icon={Logo} tone="aqua" size={38} />
          <View className="flex-1">
            <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">Cuenta vinculada con {PROVIDER_NAME[linked]}</Text>
            {!!email && <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-0.5" numberOfLines={1}>{email}</Text>}
          </View>
          <CheckCircle2 size={20} color={dark ? colors.mint : colors.aquaInk} weight="fill" />
        </View>
      </Glass>
    );
  }

  return (
    <Glass className="rounded-3xl p-4 mb-4">
      <View className="flex-row items-center gap-3">
        <IconBubble icon={Mail} tone="aqua" size={38} />
        <View className="flex-1">
          <Text className="text-muted-light dark:text-muted-dark text-[12px]">Correo de la cuenta</Text>
          <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark" numberOfLines={1}>{email}</Text>
        </View>
        {!editing && (
          <Press accessibilityRole="button" accessibilityLabel="Cambiar correo" onPress={() => setEditing(true)} hitSlop={8} className="px-2 py-2">
            <Text className="text-aqua-ink dark:text-mint text-[13px] font-semibold">Cambiar</Text>
          </Press>
        )}
      </View>

      {!editing && googleOAuthConfigured && (
        <View className="mt-3">
          <Press
            accessibilityRole="button"
            accessibilityLabel="Vincular con Google"
            onPress={linkGoogle}
            disabled={linking}
            className="flex-row items-center justify-center gap-2 border border-line-light dark:border-line-dark rounded-xl py-3"
          >
            {linking ? <ActivityIndicator size="small" color={muted} /> : <GoogleIcon size={18} />}
            <Text className="font-semibold text-[13.5px] text-text-light dark:text-text-dark">Vincular con Google</Text>
          </Press>
          <Text className="text-muted-light dark:text-muted-dark text-[11.5px] mt-1.5 text-center">
            Para entrar sin contraseña y no perder tus pasos o puntos
          </Text>
        </View>
      )}

      {pending && !editing && (
        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-3">
          Te mandamos un link a {pending}. Ábrelo para confirmar el cambio; hasta entonces sigues entrando con {email}.
        </Text>
      )}

      {editing && (
        <View className="mt-3">
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1">Correo nuevo</Text>
          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="nombre@gmail.com"
            placeholderTextColor={muted}
            accessibilityLabel="Correo nuevo"
            className="bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3.5 py-3 text-[14px] text-text-light dark:text-text-dark mb-2"
          />
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-3">Te vamos a mandar un link para confirmar que el correo nuevo es tuyo.</Text>
          <View className="flex-row gap-2">
            <Press accessibilityRole="button" onPress={save} disabled={saving} className="flex-1 bg-aqua-deep rounded-xl py-3 items-center">
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold text-[13.5px]">Cambiar correo</Text>}
            </Press>
            <Press
              accessibilityRole="button"
              onPress={() => { setEditing(false); setNewEmail(''); }}
              className="border border-line-light dark:border-line-dark rounded-xl px-4 py-3 items-center"
            >
              <Text className="text-muted-light dark:text-muted-dark font-semibold text-[13.5px]">Cancelar</Text>
            </Press>
          </View>
        </View>
      )}
    </Glass>
  );
}
