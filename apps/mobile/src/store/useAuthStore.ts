import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
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

let initialized = false;
// Id de la última persona con sesión: sirve para vaciar la caché al cambiar de cuenta.
let lastUserId: string | null = null;

// Se llama una vez desde app/_layout.tsx para arrancar el listener de sesión.
export function initAuthListener() {
  if (initialized) return;
  initialized = true;

  supabase.auth
    .getSession()
    .then(async ({ data }) => {
      if (lastUserId === null) lastUserId = data.session?.user.id ?? null;
      await publishSession(data.session);
    })
    .catch(() => {
      // Si falla la lectura local seguimos sin sesión, en vez de dejar el spinner para siempre.
    })
    .finally(() => useAuthStore.setState({ initializing: false }));

  supabase.auth.onAuthStateChange(async (event, session) => {
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
    if (event === 'SIGNED_OUT') useAuthStore.setState({ passwordRecovery: false });

    await publishSession(session);
  });
}
