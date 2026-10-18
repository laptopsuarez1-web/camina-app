import { useEffect, useRef, useState } from 'react';
import { View, Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { consumePendingDeepLinks } from '@/lib/deep-links';
import { emailRedirectUrl } from '@/lib/auth-links';
import { friendlyError } from '@/lib/errors';
import { Eye, EyeSlash } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { Google, googleClientIds, googleOAuthConfigured, completeGoogleSignIn, isAppleSignInAvailable, signInWithApple } from '@/lib/oauth';

// Porteado 1:1 de renderLogin() en camina-full.html: fondo plano --authBg
// (nada de gradiente ni glow), mismo logo, mismo orden de botones, mismo
// texto. La única diferencia real con el prototipo es que acá los botones
// hacen algo de verdad (auth de Supabase) en vez de saltar directo a la app.
type AuthKind = 'login' | 'signup';

export default function WelcomeScreen() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const [authKind, setAuthKind] = useState<AuthKind>(modo === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(googleClientIds);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) return;
    (async () => {
      setOauthLoading(true);
      setOauthProvider('google');
      try {
        const { error } = await completeGoogleSignIn(idToken);
        if (error) {
          Alert.alert('No pudimos iniciar sesión con Google', friendlyError(error));
          return;
        }
        await afterAuth();
      } finally {
        setOauthLoading(false);
      }
    })();
  }, [googleResponse]);

  async function handleGoogle() {
    if (!googleOAuthConfigured) {
      Alert.alert('Google no está disponible ahora', 'Usá tu correo para continuar.');
      return;
    }
    await promptGoogleAsync();
  }

  async function handleApple() {
    setOauthLoading(true);
    setOauthProvider('apple');
    try {
      await signInWithApple();
      await afterAuth();
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (!message.includes('ERR_REQUEST_CANCELED')) {
        Alert.alert('No pudimos iniciar sesión con Apple', friendlyError(e, 'Intentá de nuevo.'));
      }
    } finally {
      setOauthLoading(false);
    }
  }

  async function afterAuth() {
    await useAuthStore.getState().refreshProfile();
    const { profile, profileError } = useAuthStore.getState();
    if (!profile && profileError) {
      // No pudimos LEER el perfil (mala señal): la raíz muestra el reintento en vez de mandar a un alta nueva.
      router.replace('/');
      return;
    }
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
      Alert.alert(authKind === 'login' ? 'No pudimos iniciar sesión' : 'No pudimos crear tu cuenta', friendlyError(error));
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
      Alert.alert('No pudimos mandar el correo', friendlyError(error));
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
    if (error) Alert.alert('No pudimos reenviar el correo', friendlyError(error));
    else Alert.alert('Listo', 'Te mandamos el correo de nuevo.');
  }

  if (awaitingConfirmation) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.authBg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }} showsVerticalScrollIndicator={false}>
          <Image source={require('@/../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 42 }} />
          <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 18, marginBottom: 10, textAlign: 'center' }}>
            Confirmá tu correo
          </Text>
          <Text style={{ color: colors.authMuted, marginBottom: 28, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280 }}>
            {Platform.OS === 'web'
              ? `Te mandamos un link a ${awaitingConfirmation}. Abrilo desde donde quieras para activar tu cuenta y dejá esta pestaña abierta: apenas se confirma, entrás solo.`
              : `Te mandamos un link a ${awaitingConfirmation}. Abrilo desde el teléfono para activar tu cuenta y volvé a entrar acá.`}
          </Text>
          <Press
            accessibilityRole="button"
            accessibilityLabel="Ya confirmé, entrar"
            accessibilityState={{ busy: enteringNow }}
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
          </Press>
          <Press
            accessibilityRole="button"
            accessibilityLabel="Reenviar correo"
            accessibilityState={{ busy: resending }}
            onPress={resendConfirmation}
            disabled={resending}
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', maxWidth: 320, marginBottom: 12 }}
          >
            {resending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Reenviar correo</Text>
            )}
          </Press>
          <Press accessibilityRole="button" onPress={() => setAwaitingConfirmation(null)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.authMuted, fontSize: 12 }}>Volver</Text>
          </Press>
        </ScrollView>
      </View>
    );
  }

  const googleBusy = oauthLoading && oauthProvider === 'google';
  const appleBusy = oauthLoading && oauthProvider === 'apple';

  return (
    <LinearGradient colors={colors.headerGradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <View style={{ width: 104, height: 104, borderRadius: 52, overflow: 'hidden' }}>
            <Image source={require('@/../assets/icon.png')} style={{ width: 104, height: 104 }} />
          </View>
          <Text
            accessibilityRole="header"
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
          <Text style={{ color: colors.authMuted, marginTop: 6, marginBottom: 30, textAlign: 'center', fontSize: 13.5, lineHeight: 19, maxWidth: 280 }}>
            Caminá, ganá Puntos y canjealos en tu ciudad.
          </Text>

          <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
            <Press
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
              accessibilityState={{ busy: googleBusy }}
              onPress={handleGoogle}
              disabled={oauthLoading}
              style={{ backgroundColor: '#fff', borderColor: colors.light.line, borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center', opacity: oauthLoading ? 0.6 : 1 }}
            >
              {googleBusy ? (
                <ActivityIndicator color="#1a1a1a" />
              ) : (
                <Text style={{ color: '#1a1a1a', fontWeight: '500', fontSize: 14 }}>Continuar con Google</Text>
              )}
            </Press>

            {appleAvailable && (
              <Press
                accessibilityRole="button"
                accessibilityLabel="Continuar con Apple"
                accessibilityState={{ busy: appleBusy }}
                onPress={handleApple}
                disabled={oauthLoading}
                style={{ backgroundColor: colors.mintDark, borderRadius: 12, padding: 13, alignItems: 'center', opacity: oauthLoading ? 0.6 : 1 }}
              >
                {appleBusy ? (
                  <ActivityIndicator color={colors.mint} />
                ) : (
                  <Text style={{ color: colors.mint, fontWeight: '500', fontSize: 14 }}>Continuar con Apple</Text>
                )}
              </Press>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.authBgSoft }} />
              <Text style={{ color: colors.authMuted, fontSize: 12 }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.authBgSoft }} />
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor="#6E6291"
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 44 }}
            />
            <View style={{ justifyContent: 'center' }}>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor="#6E6291"
                accessibilityLabel="Contraseña"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={authKind === 'login' ? 'current-password' : 'new-password'}
                textContentType={authKind === 'login' ? 'password' : 'newPassword'}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (!loading) handleSubmit();
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 12, paddingRight: 48, fontSize: 14, minHeight: 44 }}
              />
              <Press
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                style={{ position: 'absolute', right: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeSlash size={20} color="#6E6291" /> : <Eye size={20} color="#6E6291" />}
              </Press>
            </View>

            <Press
              accessibilityRole="button"
              accessibilityLabel={authKind === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              accessibilityState={{ busy: loading }}
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
            </Press>

            {authKind === 'login' && (
              <Press accessibilityRole="button" onPress={handleForgotPassword} disabled={recovering} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.authMuted, fontSize: 12, textAlign: 'center' }}>
                  {recovering ? 'Mandando…' : recoverySent ? 'Te mandamos un link — revisá tu correo' : '¿Olvidaste tu contraseña?'}
                </Text>
              </Press>
            )}

            <Press accessibilityRole="link" onPress={() => router.push('/legal')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.authMuted, fontSize: 12, textAlign: 'center', lineHeight: 16 }}>
                Al continuar aceptás los <Text style={{ textDecorationLine: 'underline' }}>Términos y la Política de privacidad</Text> de Camina.
              </Text>
            </Press>

            <Press accessibilityRole="button" onPress={() => setAuthKind(authKind === 'login' ? 'signup' : 'login')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.authMuted, fontSize: 12, textAlign: 'center' }}>
                {authKind === 'login' ? '¿Sos nuevo? Crear cuenta' : '¿Ya tenés cuenta? Iniciar sesión'}
              </Text>
            </Press>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
