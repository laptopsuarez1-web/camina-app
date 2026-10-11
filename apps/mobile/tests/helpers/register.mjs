// Se carga con `node --import ./tests/helpers/register.mjs`.
// Le enseña a Node dos cosas para poder probar el código REAL de la app sin cambiarlo:
//  1) el alias "@/..." (igual que tsconfig.json: "@/*" -> "./src/*");
//  2) qué módulos de React Native / Expo / Supabase se reemplazan por dobles de prueba (carpeta stubs/).
// También fija la zona horaria de los dispositivos de Camina (Bolivia) salvo que el entorno ya tenga TZ.
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

process.env.TZ ??= 'America/La_Paz';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../src');
const STUBS = path.resolve(HERE, 'stubs');

// especificador -> archivo de reemplazo en stubs/
const REPLACED = {
  '@tanstack/react-query': 'react-query.mts',
  '@/lib/supabase': 'supabase.mts',
  '@/store/useAuthStore': 'auth-store.mts',
  '@react-native-async-storage/async-storage': 'async-storage.mts',
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = REPLACED[specifier];
    if (stub) return { url: pathToFileURL(path.join(STUBS, stub)).href, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const base = path.join(SRC, specifier.slice(2));
      for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
