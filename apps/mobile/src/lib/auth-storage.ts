import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Dónde guarda Supabase la sesión del teléfono. Antes era solo AsyncStorage: si esa lectura venía vacía (arranque en
// frío, app despertada en segundo plano, archivo dañado) la app creía que no había sesión y mostraba el login, aunque
// el servidor la tenía viva. Ahora se guarda en dos lugares (Llavero de iOS / Keystore de Android y AsyncStorage) y se
// lee del que responda: si uno falla, el otro la devuelve y se repara el que faltaba.
// El Llavero admite valores chicos (~2 KB) y la sesión pesa más, así que se parte en pedazos.
const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

// El contador guarda "generación:cantidad". Cada escritura usa una generación nueva para sus pedazos y mueve el
// contador al final: una lectura que coincide con una escritura ve la versión vieja completa o la nueva completa,
// nunca pedazos de las dos mezclados (eso daba un JSON roto, supabase lo tomaba como "sin sesión" y salía el login).
const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, gen: string, i: number) => `${key}.${gen}.${i}`;

function parseCount(raw: string | null): { gen: string; n: number } | null {
  if (!raw) return null;
  const [gen, count] = raw.split(':');
  const n = Number(count);
  return gen && Number.isInteger(n) && n >= 1 ? { gen, n } : null;
}

// Lecturas y escrituras de una misma clave van una detrás de otra, para que no se pisen.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

const isJson = (v: string | null): v is string => {
  if (!v) return false;
  try {
    JSON.parse(v);
    return true;
  } catch {
    return false;
  }
};

async function secureGet(key: string): Promise<string | null> {
  try {
    const c = parseCount(await SecureStore.getItemAsync(countKey(key), OPTIONS));
    if (!c) return null;
    const parts = await Promise.all(Array.from({ length: c.n }, (_, i) => SecureStore.getItemAsync(chunkKey(key, c.gen, i), OPTIONS)));
    return parts.every((p) => p !== null) ? parts.join('') : null;
  } catch {
    return null;
  }
}

async function secureRemove(key: string) {
  try {
    const c = parseCount(await SecureStore.getItemAsync(countKey(key), OPTIONS));
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    for (let i = 0; c && i < c.n; i++) await SecureStore.deleteItemAsync(chunkKey(key, c.gen, i), OPTIONS);
  } catch {
    // el otro almacén sigue
  }
}

async function secureSet(key: string, value: string) {
  try {
    const old = parseCount(await SecureStore.getItemAsync(countKey(key), OPTIONS).catch(() => null));
    const gen = Date.now().toString(36);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [value];
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(chunkKey(key, gen, i), parts[i], OPTIONS);
    await SecureStore.setItemAsync(countKey(key), `${gen}:${parts.length}`, OPTIONS);
    // Recién con el contador nuevo puesto se borran los pedazos de la versión anterior.
    for (let i = 0; old && old.gen !== gen && i < old.n; i++) await SecureStore.deleteItemAsync(chunkKey(key, old.gen, i), OPTIONS).catch(() => {});
  } catch {
    // el otro almacén sigue
  }
}

async function asyncGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export const authStorage = {
  getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return serial(async () => {
      const [secureRaw, plainRaw] = await Promise.all([secureGet(key), asyncGet(key)]);
      // Solo vale lo que es un JSON entero: un texto roto en uno de los dos no tapa al que está bien.
      const secure = isJson(secureRaw) ? secureRaw : null;
      const plain = isJson(plainRaw) ? plainRaw : null;
      const value = secure ?? plain;
      if (value === null) return null;
      // Se repara el almacén que estaba vacío o roto (y así también se migran las sesiones que ya estaban en AsyncStorage).
      if (secure === null) await secureSet(key, value);
      if (plain === null) await AsyncStorage.setItem(key, value).catch(() => {});
      return value;
    });
  },
  setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return serial(async () => {
      await Promise.all([secureSet(key, value), AsyncStorage.setItem(key, value).catch(() => {})]);
    });
  },
  removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return serial(async () => {
      await Promise.all([secureRemove(key), AsyncStorage.removeItem(key).catch(() => {})]);
    });
  },
};
