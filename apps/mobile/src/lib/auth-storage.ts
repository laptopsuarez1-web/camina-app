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

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function secureGet(key: string): Promise<string | null> {
  try {
    const n = Number(await SecureStore.getItemAsync(countKey(key), OPTIONS));
    if (!Number.isInteger(n) || n < 1) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i), OPTIONS)));
    return parts.every((p) => p !== null) ? parts.join('') : null;
  } catch {
    return null;
  }
}

async function secureRemove(key: string) {
  try {
    const n = Number(await SecureStore.getItemAsync(countKey(key), OPTIONS));
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    for (let i = 0; Number.isInteger(n) && i < n; i++) await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
  } catch {
    // el otro almacén sigue
  }
}

async function secureSet(key: string, value: string) {
  try {
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [value];
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(chunkKey(key, i), parts[i], OPTIONS);
    // El contador va al final: si se corta a mitad, se lee la versión anterior completa y no una mezcla.
    await SecureStore.setItemAsync(countKey(key), String(parts.length), OPTIONS);
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
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const [secure, plain] = await Promise.all([secureGet(key), asyncGet(key)]);
    const value = secure ?? plain;
    if (value === null) return null;
    // Se repara el almacén que estaba vacío (y así también se migran las sesiones que ya estaban en AsyncStorage).
    if (secure === null) void secureSet(key, value);
    if (plain === null) AsyncStorage.setItem(key, value).catch(() => {});
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    await Promise.all([secureSet(key, value), AsyncStorage.setItem(key, value).catch(() => {})]);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    await Promise.all([secureRemove(key), AsyncStorage.removeItem(key).catch(() => {})]);
  },
};
