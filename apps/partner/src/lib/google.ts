'use client';

import { supabase } from '@/lib/supabase';

// Entrar o registrarse con Google. Vuelve a /login, que decide a dónde mandar a la persona.
export async function entrarConGoogle(): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` },
  });
  return error ? 'No pudimos abrir Google. Intenta de nuevo.' : null;
}
