import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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

export const googleOAuthConfigured = !!platformGoogleClientId;

// useIdTokenAuthRequest tira un error al renderizar si falta el id de la plataforma actual; en la web sin
// configurar eso dejaba la pantalla de login en blanco. Con un valor de relleno la pantalla abre igual, y
// handleGoogle avisa que Google no está disponible (googleOAuthConfigured sigue en falso).
export const googleClientIds = {
  iosClientId: rawGoogleClientIds.iosClientId ?? 'sin-configurar',
  androidClientId: rawGoogleClientIds.androidClientId ?? 'sin-configurar',
  webClientId: rawGoogleClientIds.webClientId ?? 'sin-configurar',
};

export async function completeGoogleSignIn(idToken: string) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
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
    // existe su fila en profiles — se crea recién en /(auth)/perfil, pero acá
    // ya tenemos el nombre real de Apple, así que se la ahorramos.
    await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName });
  }

  return data;
}
