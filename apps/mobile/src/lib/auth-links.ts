import * as Linking from 'expo-linking';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// El link que Supabase manda por correo (confirmar cuenta, "olvidé mi contraseña", cambio de correo) abre
// /auth-callback con la prueba en la URL. Según cómo se pidió el link puede venir de varias formas:
//  - ?code=...            (PKCE; solo canjeable en el mismo aparato/navegador donde se pidió)
//  - #access_token=...&refresh_token=...&type=recovery   (flujo implícito)
//  - ?token_hash=...&type=recovery|signup|email_change   (plantilla de correo)
//  - #error=access_denied&error_code=otp_expired         (link vencido o ya usado)
// detectSessionInUrl no existe fuera de un browser, así que todo se resuelve a mano aquí y el resultado
// queda en useAuthLinkStatus, para que la pantalla auth-callback nunca se quede esperando en silencio.
export type AuthLinkStatus =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'done'; recovery: boolean }
  | { state: 'error'; message: string };

export const useAuthLinkStatus = create<{ status: AuthLinkStatus }>(() => ({ status: { state: 'idle' } }));
const setStatus = (status: AuthLinkStatus) => useAuthLinkStatus.setState({ status });

let listening = false;
let lastHandled = '';

function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (s: string) => {
    for (const [k, v] of new URLSearchParams(s)) out[k] = v;
  };
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');
  if (queryAt >= 0) add(url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined));
  if (hashAt >= 0) add(url.slice(hashAt + 1));
  return out;
}

function isAuthLink(url: string) {
  return /auth-callback/.test(url) || /[?#&](code|access_token|token_hash|error_code)=/.test(url);
}

function failureMessage(p: Record<string, string>) {
  if (p.error_code === 'otp_expired' || /expired/i.test(p.error_description ?? '')) {
    return 'Este link ya venció o ya se usó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".';
  }
  return 'No pudimos confirmar este link. Pide uno nuevo y ábrelo en el mismo celular o navegador donde lo pediste.';
}

export async function handleAuthUrl(url: string | null) {
  if (!url || !isAuthLink(url) || url === lastHandled) return;
  const p = parseParams(url);
  if (!p.code && !p.access_token && !p.token_hash && !p.error && !p.error_code) return;
  lastHandled = url;
  setStatus({ state: 'working' });
  try {
    if (p.error || p.error_code) {
      setStatus({ state: 'error', message: failureMessage(p) });
      return;
    }
    let recovery = p.type === 'recovery';
    if (p.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(p.code);
      if (error) throw error;
    } else if (p.access_token && p.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
      if (error) throw error;
    } else if (p.token_hash && p.type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: p.type as 'recovery' | 'signup' | 'email' | 'email_change' });
      if (error) throw error;
    } else {
      setStatus({ state: 'error', message: failureMessage(p) });
      return;
    }
    // El evento PASSWORD_RECOVERY no siempre llega (depende del flujo): se marca aquí también.
    if (recovery) useAuthStore.setState({ passwordRecovery: true });
    else recovery = useAuthStore.getState().passwordRecovery;
    setStatus({ state: 'done', recovery });
  } catch {
    setStatus({ state: 'error', message: failureMessage(p) });
  }
}

export function startAuthLinkListener() {
  if (listening) return;
  listening = true;

  Linking.getInitialURL().then(handleAuthUrl).catch(() => {});
  Linking.addEventListener('url', ({ url }) => {
    handleAuthUrl(url);
  });
}

export function emailRedirectUrl() {
  return Linking.createURL('auth-callback');
}
