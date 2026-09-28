import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá con los datos de tu proyecto Supabase.'
  );
}

// Sin el genérico <Database>: la inferencia de tipos de supabase-js contra un
// Database escrito a mano choca con su cadena de tipos condicionales interna.
// Se tipa manualmente en cada hook con las interfaces de database.types.ts, y
// esto se reemplaza por el genérico real en cuanto exista un proyecto Supabase:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
//   y volver a pasar <Database> acá.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE en vez de implicit: el link de confirmación de email manda un
    // "code" en la URL en vez de tokens sueltos, y se intercambia a mano por
    // sesión en app/_layout.tsx (Linking) — más seguro y es lo recomendado
    // por Supabase para apps que no son navegador.
    flowType: 'pkce',
  },
});
