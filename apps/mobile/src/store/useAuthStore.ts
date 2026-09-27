import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      set({ profile: null });
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!error) set({ profile: data as Profile | null });
  },
}));

let initialized = false;

// Se llama una vez desde app/_layout.tsx para arrancar el listener de sesión.
export function initAuthListener() {
  if (initialized) return;
  initialized = true;

  supabase.auth.getSession().then(async ({ data }) => {
    useAuthStore.getState().setSession(data.session);
    await useAuthStore.getState().refreshProfile();
    useAuthStore.setState({ initializing: false });
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    useAuthStore.getState().setSession(session);
    await useAuthStore.getState().refreshProfile();
    useAuthStore.setState({ initializing: false });
  });
}
