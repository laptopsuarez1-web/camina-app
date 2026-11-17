import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// El link que Supabase manda por correo para confirmar la cuenta (o para
// "olvidé mi contraseña") abre camina://auth-callback?code=... — con flowType
// 'pkce' (ver lib/supabase.ts) ese "code" se canjea a mano por una sesión aquí,
// porque detectSessionInUrl no existe fuera de un browser.
let listening = false;

// Un mismo código solo se puede canjear una vez. En Android el login con Google lo recibe a la vez el escuchador
// de enlaces (abajo) y signInWithGoogleWeb (lib/oauth.ts): la segunda llamada fallaba con "flow state not found"
// y la app mostraba un error aunque la sesión ya estaba abierta. Aquí ambos comparten la misma llamada.
const exchanges = new Map<string, ReturnType<typeof supabase.auth.exchangeCodeForSession>>();
export function exchangeCodeOnce(code: string) {
  let pending = exchanges.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code);
    exchanges.set(code, pending);
  }
  return pending;
}

async function tryExchange(url: string | null) {
  if (!url || !url.includes('code=')) return;
  try {
    // exchangeCodeForSession pide el "code" suelto, no la URL entera.
    const code = new URL(url).searchParams.get('code');
    if (!code) return;
    await exchangeCodeOnce(code);
  } catch {
    // link vencido o ya usado — el usuario simplemente vuelve a intentar
  }
}

export function startAuthLinkListener() {
  if (listening) return;
  listening = true;

  Linking.getInitialURL().then(tryExchange);
  Linking.addEventListener('url', ({ url }) => {
    tryExchange(url);
  });
}

export function emailRedirectUrl() {
  return Linking.createURL('auth-callback');
}
