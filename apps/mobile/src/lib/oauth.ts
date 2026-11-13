import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Necesario para que el navegador de auth (Google) se cierre solo al volver
// a la app con el resultado — sin esto, promptAsync() nunca resuelve.
WebBrowser.maybeCompleteAuthSession();

export { Google };

const rawGoogleClientIds = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

// Cada plataforma usa su propio Client ID: con solo el de Android cargado, en iPhone Google abría su página
// con un id inválido. Por eso se mira el de la plataforma actual y, si falta, el botón no se muestra.
const platformGoogleClientId = Platform.select({
  ios: rawGoogleClientIds.iosClientId,
  android: rawGoogleClientIds.androidClientId,
  default: rawGoogleClientIds.webClientId,
});

// En Android el login con Google va por el navegador y Supabase (ver signInWithGoogleWeb), que no necesita el
// Client ID ni la huella SHA-1 de la app; por eso en Android el botón se muestra siempre.
export const googleOAuthConfigured = Platform.OS === 'android' ? true : !!platformGoogleClientId;

// useIdTokenAuthRequest tira un error al renderizar si falta el id de la plataforma actual; en la web sin
// configurar eso dejaba la pantalla de login en blanco. Con un valor de relleno la pantalla abre igual, y
// handleGoogle avisa que Google no está disponible (googleOAuthConfigured sigue en falso).
export const googleClientIds = {
  iosClientId: rawGoogleClientIds.iosClientId ?? 'sin-configurar',
  androidClientId: rawGoogleClientIds.androidClientId ?? 'sin-configurar',
  webClientId: rawGoogleClientIds.webClientId ?? 'sin-configurar',
};

// Login con Google en Android por el navegador (flujo web de Supabase). El flujo nativo exige que Google
// conozca la huella SHA-1 de la firma con la que se instaló la app (distinta en Play que en EAS) y falla
// antes de llegar a Supabase si no coincide. Este no depende de eso: Google vuelve a Supabase y Supabase
// devuelve un código a camina://auth-callback, que se canjea por la sesión (PKCE).
// Devuelve 'ok', 'cancelado', o tira un error con el motivo.
export async function signInWithGoogleWeb(): Promise<'ok' | 'cancelado'> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw error ?? new Error('Supabase no devolvió la dirección de Google.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelado';
  const url = new URL(result.url);
  const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (authError) throw new Error(authError);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Google no devolvió el código de acceso.');
  // El escuchador global de enlaces (lib/auth-links.ts) puede canjear el mismo código primero: si ya hay sesión, listo.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw exchangeError;
  }
  return 'ok';
}

export async function completeGoogleSignIn(idToken: string) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
}

// Agrega Google a una cuenta que ya existe (la sesión actual). Si ese Google ya está en otra cuenta, Supabase
// devuelve un error y no junta nada. Requiere "Allow manual linking" activo en Supabase Auth.
export async function linkGoogleIdentity(idToken: string) {
  return supabase.auth.linkIdentity({ provider: 'google', token: idToken });
}

export async function isAppleSignInAvailable() {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

// El nonce se manda hasheado (SHA-256) a Apple en el pedido; Supabase recibe
// el nonce sin hashear y hace la verificación cruzada contra el identityToken.
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple no devolvió un identityToken.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // El nombre completo solo viene la primera vez que el usuario autoriza a
  // esta app — si está, lo guardamos ya en el perfil para no pedirlo de nuevo
  // en la pantalla de signup.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
  if (fullName && data.user) {
    // upsert (no update): la primera vez que este usuario entra todavía no
    // existe su fila en profiles — se crea recién en /(auth)/perfil, pero aquí
    // ya tenemos el nombre real de Apple, así que se la ahorramos.
    await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName });
  }

  return data;
}

// Para borrar una cuenta creada con Apple hay que avisarle a Apple (revocar el permiso), y para eso el
// servidor necesita un código de autorización recién emitido. Se lo pide de nuevo a Apple con Face ID,
// sin pedir nombre ni correo. Devuelve null fuera de iPhone; si la persona cancela, tira el error de Apple.
export async function getAppleAuthorizationCode() {
  if (!(await isAppleSignInAvailable())) return null;
  const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
  return credential.authorizationCode ?? null;
}
