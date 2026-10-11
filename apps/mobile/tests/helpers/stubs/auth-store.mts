// Doble de useAuthStore: el estado lo controla la prueba con setAuth().
export const authState: { session: any; profile: any } = { session: null, profile: null };

export function setAuth(userId: string | null, profile: Record<string, unknown> | null = null) {
  authState.session = userId ? { user: { id: userId } } : null;
  authState.profile = profile;
}

export function useAuthStore<T>(selector: (s: typeof authState) => T): T {
  return selector(authState);
}
useAuthStore.getState = () => authState;
