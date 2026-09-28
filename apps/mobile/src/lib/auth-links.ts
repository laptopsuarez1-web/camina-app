import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// El link que Supabase manda por correo para confirmar la cuenta (o para
// "olvidé mi contraseña") abre camina://auth-callback?code=... — con flowType
// 'pkce' (ver lib/supabase.ts) ese "code" se canjea a mano por una sesión acá,
// porque detectSessionInUrl no existe fuera de un browser.
let listening = false;

async function tryExchange(url: string | null) {
  if (!url || !url.includes('code=')) return;
  try {
    await supabase.auth.exchangeCodeForSession(url);
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
