import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { Sentry } from '@/lib/monitoring';
import { authStorage } from '@/lib/auth-storage';
import type { Profile } from '@/lib/database.types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  // true si no se pudo LEER el perfil (sin red o error del servidor): distinto de "todavía no existe".
  profileError: boolean;
  initializing: boolean;
  // true al entrar con el link de "olvidé mi contraseña": la app lleva a elegir una nueva (ver app/index.tsx).
  passwordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  // Vuelve a leer la sesión guardada en el teléfono y la publica (si la app la había perdido de vista).
  refreshFromStorage: () => Promise<void>;
}

type ProfileRead = { ok: true; profile: Profile | null } | { ok: false };

async function readProfile(userId: string): Promise<ProfileRead> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return error ? { ok: false } : { ok: true, profile: data as Profile | null };
  } catch {
    return { ok: false };
  }
}

// Resultado de leer el perfil de `userId`. Con error NO se pisa el perfil de esa misma persona: así un usuario
// existente no cae al alta de cuenta nueva; pero el perfil de OTRA cuenta no se deja nunca (foto y nombre ajenos).
function profilePatch(read: ProfileRead, userId: string, current: Profile | null): Partial<AuthState> {
  if (read.ok) return { profile: read.profile, profileError: false };
  return { profileError: true, profile: current?.id === userId ? current : null };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  profileError: false,
  initializing: true,
  passwordRecovery: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      set({ profile: null, profileError: false });
      return;
    }
    const read = await readProfile(userId);
    // Si mientras tanto se cerró la sesión o entró otra persona, este resultado ya es viejo y se descarta.
    if (get().session?.user.id !== userId) return;
    set(profilePatch(read, userId, get().profile));
  },
  refreshFromStorage: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await publishSession(data.session);
  },
}));

// Cuenta cuántas veces cambió la sesión: una respuesta lenta de una lectura anterior no pisa a la más nueva.
let sessionSeq = 0;

// Publica sesión y perfil JUNTOS. Si se publicara la sesión primero, hay un instante con sesión y sin perfil en que
// la app creería que la persona es nueva y la mandaría al alta de cuenta (que pisa nombre, ciudad y zona).
async function publishSession(session: Session | null) {
  const seq = ++sessionSeq;
  if (!session) {
    useAuthStore.setState({ session: null, profile: null, profileError: false, initializing: false });
    return;
  }
  const userId = session.user.id;
  const read = await readProfile(userId);
  if (seq !== sessionSeq) return;
  useAuthStore.setState({ session, ...profilePatch(read, userId, useAuthStore.getState().profile), initializing: false });
}


// ── Red de seguridad contra "me sacó de la sesión" ───────────────────────────────────────────────────────────────────
// Regla: solo se muestra el login si la persona toca "Cerrar sesión" (signOutUser) o si el servidor rechaza de verdad la
// renovación. Cualquier otro "sin sesión" (storage que responde mal, evento SIGNED_OUT inesperado) se intenta recuperar
// con una copia aparte de la última sesión buena. Los logs de Supabase (2/11) mostraron una sesión viva, renovada y con
// el perfil leído, y aun así la app mostró el login: lo que pasa dentro del teléfono no dejaba rastro, ahora sí.
const BACKUP_KEY = 'camina.auth.backup';
let backup: { access_token: string; refresh_token: string } | null = null;
let intentionalSignOut = false;
let recovering = false;
// Últimos eventos de sesión (con hora), para mandarlos a Sentry si la sesión se pierde sola.
const authLog: string[] = [];
function logAuth(msg: string) {
  authLog.push(`${new Date().toISOString().slice(11, 19)}Z ${msg}`);
  if (authLog.length > 30) authLog.shift();
}

function saveBackup(session: Session) {
  if (!session.access_token || !session.refresh_token) return;
  backup = { access_token: session.access_token, refresh_token: session.refresh_token };
  authStorage.setItem(BACKUP_KEY, JSON.stringify(backup)).catch(() => {});
}

async function readBackup(): Promise<typeof backup> {
  if (backup) return backup;
  try {
    const raw = await authStorage.getItem(BACKUP_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v?.access_token && v?.refresh_token) backup = { access_token: v.access_token, refresh_token: v.refresh_token };
  } catch {
    // sin copia
  }
  return backup;
}

function clearBackup() {
  backup = null;
  return authStorage.removeItem(BACKUP_KEY).catch(() => {});
}

// Única forma de cerrar sesión a propósito. Marca la salida como intencional (si no, se tomaría por una pérdida y se
// recuperaría) y borra la copia de respaldo.
export async function signOutUser(scope: 'local' | 'global' = 'local') {
  intentionalSignOut = true;
  await clearBackup();
  try {
    return await supabase.auth.signOut({ scope });
  } finally {
    setTimeout(() => {
      intentionalSignOut = false;
    }, 3000);
  }
}

type Recovery = 'recovered' | 'rejected' | 'offline' | 'none';

// Intenta volver a abrir la sesión con la copia de respaldo. 'offline': no hubo respuesta del servidor, no se cierra nada.
async function recoverSession(reason: string): Promise<Recovery> {
  if (intentionalSignOut || recovering) return 'none';
  const b = await readBackup();
  if (!b) return 'none';
  recovering = true;
  try {
    const { data, error } = await supabase.auth.setSession(b);
    if (data?.session) {
      logAuth(`recuperada (${reason})`);
      return 'recovered';
    }
    const status = (error as { status?: number } | null)?.status;
    const retryable = !error || (error as { name?: string }).name === 'AuthRetryableFetchError' || status === undefined || status >= 500;
    logAuth(`recuperación falló (${reason}): ${error?.message ?? 'sin detalle'} [${status ?? 'sin estado'}]`);
    return retryable ? 'offline' : 'rejected';
  } catch (e) {
    logAuth(`recuperación con error (${reason}): ${String(e)}`);
    return 'offline';
  } finally {
    recovering = false;
  }
}

function reportLostSession(reason: string, result: Recovery) {
  Sentry.captureMessage(`Sesión perdida sin que la persona cerrara sesión (${reason}) → ${result}`, {
    level: result === 'recovered' ? 'warning' : 'error',
    extra: { eventos: authLog.join('\n') },
  } as never);
}

let initialized = false;
// Id de la última persona con sesión: sirve para vaciar la caché al cambiar de cuenta.
let lastUserId: string | null = null;

// Se llama una vez desde app/_layout.tsx para arrancar el listener de sesión.
export function initAuthListener() {
  if (initialized) return;
  initialized = true;

  // Una lectura vacía puede ser pasajera (el almacén del teléfono no respondió a tiempo): se reintenta antes de
  // dar por hecho que no hay sesión y mostrar el login.
  async function readStoredSession(): Promise<Session | null> {
    for (let i = 0; i < 3; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  }

  readStoredSession()
    .then(async (read) => {
      let session = read;
      if (!session && (await readBackup())) {
        // El teléfono dice "sin sesión" pero hay copia de respaldo: no es un cierre a propósito.
        logAuth('arranque sin sesión pero con respaldo');
        const result = await recoverSession('arranque');
        reportLostSession('arranque', result);
        if (result === 'recovered') session = (await supabase.auth.getSession()).data.session;
      }
      if (lastUserId === null) lastUserId = session?.user.id ?? null;
      await publishSession(session);
    })
    .catch(() => {
      // Si falla la lectura local seguimos sin sesión, en vez de dejar el spinner para siempre.
    })
    .finally(() => useAuthStore.setState({ initializing: false }));

  supabase.auth.onAuthStateChange(async (event, session) => {
    // Rastro para Sentry: si la app vuelve a mostrar el login sola, queda qué pasó con la sesión justo antes.
    Sentry.addBreadcrumb({ category: 'auth', message: `${event}${session ? '' : ' (sin sesión)'}`, level: 'info' });
    logAuth(`${event}${session ? '' : ' (sin sesión)'}`);
    if (session) saveBackup(session);
    // Cualquier evento SIN sesión que la persona no pidió (SIGNED_OUT, pero también un INITIAL_SESSION vacío porque el
    // almacén del teléfono no respondió a tiempo) se trata como pérdida: antes solo se cubría SIGNED_OUT, y un
    // INITIAL_SESSION vacío publicaba "sin sesión" directo y mostraba el login con la sesión viva.
    const lostByItself = !session && !intentionalSignOut && (event !== 'SIGNED_OUT' || recovering || !!backup);
    if (lostByItself) {
      // No se muestra el login todavía. Se intenta recuperar fuera de este callback
      // (llamar a supabase.auth desde aquí puede dejarlo esperando a sí mismo).
      if (!recovering) {
        setTimeout(async () => {
          const result = await recoverSession(`${event} sin sesión`);
          if (result !== 'none') reportLostSession(`${event} sin sesión`, result);
          if (result === 'offline') return; // sin red: se conserva lo que hay y se reintenta al volver a la app
          if (result === 'rejected') {
            await clearBackup();
            await publishSession(null);
            return;
          }
          if (result === 'none') {
            // Sin copia de respaldo: se vuelve a leer el almacén una vez más antes de dar por hecho que no hay sesión.
            const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            if (data.session) logAuth(`${event} vacío, pero el almacén tenía sesión`);
            await publishSession(data.session);
          }
        }, 0);
      }
      return;
    }
    // Al cerrar sesión o entrar con otra cuenta se vacía la caché de datos, para no mostrar lo de la persona anterior.
    // No se limpia con INITIAL_SESSION ni TOKEN_REFRESHED de la misma persona: vaciaría todo cada vez que vuelve la app.
    const nextId = session?.user.id ?? null;
    if (event === 'SIGNED_OUT' || (lastUserId && nextId && nextId !== lastUserId)) {
      queryClient.cancelQueries();
      queryClient.clear();
    }
    lastUserId = nextId;
    // Se marca antes de publicar la sesión, así app/index.tsx ya sabe que tiene que pedir la contraseña nueva.
    if (event === 'PASSWORD_RECOVERY') useAuthStore.setState({ passwordRecovery: true });
    if (event === 'SIGNED_OUT') {
      useAuthStore.setState({ passwordRecovery: false });
      clearBackup();
    }

    await publishSession(session);
  });

  // Si la app quedó mostrando el login pero en el teléfono sigue guardada la sesión, al volver a primer plano se recupera.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data.session && !useAuthStore.getState().session) {
        await publishSession(data.session);
        return;
      }
      if (!data.session && (await readBackup())) {
        const result = await recoverSession('volver a la app');
        if (result === 'rejected') {
          await clearBackup();
          await publishSession(null);
        }
      }
    });
  }
}
