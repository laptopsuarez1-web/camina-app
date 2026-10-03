import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { consumePendingDeepLinks } from '@/lib/deep-links';
import { emailRedirectUrl } from '@/lib/auth-links';
import { colors } from '@/theme/tokens';
import { Google, googleClientIds, googleOAuthConfigured, completeGoogleSignIn, isAppleSignInAvailable, signInWithApple } from '@/lib/oauth';

// Porteado 1:1 de renderLogin() en camina-full.html: fondo plano --authBg
// (nada de gradiente ni glow), mismo logo, mismo orden de botones, mismo
// texto. La única diferencia real con el prototipo es que acá los botones
// hacen algo de verdad (auth de Supabase) en vez de saltar directo a la app.
type AuthKind = 'login' | 'signup';

export default function WelcomeScreen() {
  // Desde el onboarding: "Ya tengo cuenta" abre en iniciar sesión y "Continuar con Google" lanza Google al entrar.
  const { modo, via } = useLocalSearchParams<{ modo?: string; via?: string }>();
  const [authKind, setAuthKind] = useState<AuthKind>(modo === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(googleClientIds);
  const googleLaunched = useRef(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (via !== 'google' || !googleRequest || googleLaunched.current) return;
    googleLaunched.current = true;
    promptGoogleAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [via, googleRequest]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) return;
    (async () => {
      setOauthLoading(true);
      const { error } = await completeGoogleSignIn(idToken);
      setOauthLoading(false);
      if (error) {
        Alert.alert('No pudimos iniciar sesión con Google', error.message);
        return;
      }
      await afterAuth();
    })();
  }, [googleResponse]);

  async function handleGoogle() {
    if (!googleOAuthConfigured) {
      Alert.alert(
        'Google todavía no está configurado',
        'Faltan los Client ID de Google en las variables de entorno de la app — usá tu email por ahora.'
      );
      return;
    }
    await promptGoogleAsync();
  }

  async function handleApple() {
    setOauthLoading(true);
    try {
      await signInWithApple();
      await afterAuth();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Intentá de nuevo.';
      if (!message.includes('ERR_REQUEST_CANCELED')) {
        Alert.alert('No pudimos iniciar sesión con Apple', message);
      }
    } finally {
      setOauthLoading(false);
    }
  }

  async function afterAuth() {
    await useAuthStore.getState().refreshProfile();
    const profile = useAuthStore.getState().profile;
    if (!profile?.full_name?.trim()) {
      // El signup nuevo termina en /perfil, que consume las invitaciones
      // pendientes recién al final (ahí ya hay full_name).
      router.replace('/(auth)/perfil');
      return;
    }
    if (!profile.terms_accepted_at) {
      router.replace('/(auth)/terminos');
      return;
    }
    const { joinedGroupId } = await consumePendingDeepLinks();
    router.replace(joinedGroupId ? { pathname: '/(tabs)/grupos/[groupId]', params: { groupId: joinedGroupId } } : '/(tabs)');
  }

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Faltan datos', 'Ingresá tu correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error } =
      authKind === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: emailRedirectUrl() } });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setAwaitingConfirmation(email.trim());
        return;
      }
      Alert.alert(authKind === 'login' ? 'No pudimos iniciar sesión' : 'No pudimos crear tu cuenta', error.message);
      return;
    }
    if (authKind === 'signup' && !data.session) {
      setAwaitingConfirmation(email.trim());
      return;
    }
    await afterAuth();
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Falta tu correo', 'Escribí tu correo arriba primero.');
      return;
    }
    setRecovering(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: emailRedirectUrl(),
    });
    setRecovering(false);
    if (error) {
      Alert.alert('No pudimos mandar el correo', error.message);
      return;
    }
    setRecoverySent(true);
  }

  // Después de confirmar el correo, entra solo: probamos iniciar sesión cada
  // pocos segundos (y con el botón) sin importar por dónde se abrió el link.
  const [enteringNow, setEnteringNow] = useState(false);
  async function tryEnterAfterConfirmation(showError: boolean) {
    if (!awaitingConfirmation || !password) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email: awaitingConfirmation, password });
    if (error || !data.session) {
      if (showError) Alert.alert('Todavía no está confirmado', 'Abrí el link del correo y después tocá este botón de nuevo.');
      return;
    }
    setAwaitingConfirmation(null);
    await afterAuth();
  }
  useEffect(() => {
    if (!awaitingConfirmation) return;
    const id = setInterval(() => {
      tryEnterAfterConfirmation(false);
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingConfirmation, password]);

  async function resendConfirmation() {
    if (!awaitingConfirmation) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: awaitingConfirmation,
      options: { emailRedirectTo: emailRedirectUrl() },
    });
    setResending(false);
    if (error) Alert.alert('No pudimos reenviar el correo', error.message);
    else Alert.alert('Listo', 'Te mandamos el correo de nuevo.');
  }

  if (awaitingConfirmation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#241748', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Image source={require('@/../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 42 }} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 18, marginBottom: 10, textAlign: 'center' }}>
          Confirmá tu correo
        </Text>
        <Text style={{ color: '#C4B8E8', marginBottom: 28, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280 }}>
          Te mandamos un link a {awaitingConfirmation}. Abrilo desde el teléfono para activar tu cuenta y volvé a
          entrar acá.
        </Text>
        <Pressable
          onPress={async () => {
            setEnteringNow(true);
            await tryEnterAfterConfirmation(true);
            setEnteringNow(false);
          }}
          disabled={enteringNow}
          style={{ backgroundColor: colors.mint, borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', maxWidth: 320, marginBottom: 12 }}
        >
          {enteringNow ? (
            <ActivityIndicator color={colors.mintDark} />
          ) : (
            <Text style={{ color: colors.mintDark, fontWeight: '700', fontSize: 15 }}>Ya confirmé, entrar</Text>
          )}
        </Pressable>
        <Pressable
          onPress={resendConfirmation}
          disabled={resending}
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', maxWidth: 320, marginBottom: 12 }}
        >
          {resending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Reenviar correo</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setAwaitingConfirmation(null)}>
          <Text style={{ color: '#B3A6D6', fontSize: 12 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#3a2668', '#1c1030', '#120a1e']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <View style={{ width: 104, height: 104, borderRadius: 52, overflow: 'hidden' }}>
        <Image source={require('@/../assets/icon.png')} style={{ width: 104, height: 104 }} />
      </View>
      <Text
        style={{
          color: colors.mint,
          fontSize: 32,
          fontWeight: '900',
          letterSpacing: -1,
          marginTop: 16,
          textShadowColor: 'rgba(127,237,196,0.55)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        }}
      >
        CAMINA
      </Text>
      <Text style={{ color: '#C4B8E8', marginTop: 6, marginBottom: 30, textAlign: 'center', fontSize: 13.5, lineHeight: 19, maxWidth: 280 }}>
        Caminá, ganá Puntos y canjealos en tu ciudad.
      </Text>

      <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
        <Pressable
          onPress={handleGoogle}
          disabled={oauthLoading}
          style={{ backgroundColor: '#fff', borderColor: colors.light.line, borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center' }}
        >
          <Text style={{ color: '#1a1a1a', fontWeight: '500', fontSize: 14 }}>Continuar con Google</Text>
        </Pressable>

        {appleAvailable && (
          <Pressable
            onPress={handleApple}
            disabled={oauthLoading}
            style={{ backgroundColor: colors.mintDark, borderRadius: 12, padding: 13, alignItems: 'center' }}
          >
            <Text style={{ color: colors.mint, fontWeight: '500', fontSize: 14 }}>Continuar con Apple</Text>
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.authBgSoft }} />
          <Text style={{ color: '#B3A6D6', fontSize: 12 }}>o</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.authBgSoft }} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          placeholderTextColor="#6E6291"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 12, fontSize: 14 }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#6E6291"
          secureTextEntry
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 12, fontSize: 14 }}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{ backgroundColor: colors.mint, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 }}
        >
          {loading ? (
            <ActivityIndicator color={colors.mintDark} />
          ) : (
            <Text style={{ color: colors.mintDark, fontWeight: '600', fontSize: 15 }}>
              {authKind === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Text>
          )}
        </Pressable>

        {authKind === 'login' && (
          <Pressable onPress={handleForgotPassword} disabled={recovering} style={{ marginTop: 2 }}>
            <Text style={{ color: '#B3A6D6', fontSize: 12, textAlign: 'center' }}>
              {recovering ? 'Mandando…' : recoverySent ? 'Te mandamos un link — revisá tu correo' : '¿Olvidaste tu contraseña?'}
            </Text>
          </Pressable>
        )}

        <Pressable onPress={() => setAuthKind(authKind === 'login' ? 'signup' : 'login')} style={{ marginTop: 4 }}>
          <Text style={{ color: '#B3A6D6', fontSize: 12, textAlign: 'center' }}>
            {authKind === 'login' ? '¿Sos nuevo? Crear cuenta' : '¿Ya tenés cuenta? Iniciar sesión'}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
