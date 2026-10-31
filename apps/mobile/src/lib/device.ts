import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Un celular, una cuenta. Los pasos salen del teléfono (Salud / Health Connect), así que si dos cuentas entran desde el
// mismo celular las dos verían los mismos pasos. El servidor deja el celular a la primera cuenta que lo usó y a las
// demás no les suma pasos ni Puntos desde ahí. No se guarda nada personal: es un código propio de la instalación.
export type DeviceStatus = 'ok' | 'blocked' | 'unknown';

const FALLBACK_KEY = 'camina_install_id';

async function deviceId(): Promise<string | null> {
  let id: string | null = null;
  if (Platform.OS === 'android') id = Application.getAndroidId();
  else if (Platform.OS === 'ios') id = await Application.getIosIdForVendorAsync();
  if (id) return id;
  // Sin identificador del sistema: uno propio de esta instalación.
  let own = await AsyncStorage.getItem(FALLBACK_KEY);
  if (!own) {
    own = `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(FALLBACK_KEY, own);
  }
  return own;
}

let current: { userId: string; promise: Promise<DeviceStatus> } | null = null;

// Registra el celular para esta cuenta (una sola vez por inicio de sesión). Si no hay conexión devuelve 'unknown'
// y se reintenta la próxima vez.
export function registerDevice(userId: string): Promise<DeviceStatus> {
  if (current?.userId === userId) return current.promise;
  const promise = (async (): Promise<DeviceStatus> => {
    try {
      const id = await deviceId();
      if (!id) return 'unknown';
      const { data, error } = await supabase.rpc('register_device', { p_device_id: id });
      if (error) throw error;
      return data === 'blocked' ? 'blocked' : 'ok';
    } catch {
      if (current?.promise === promise) current = null;
      return 'unknown';
    }
  })();
  current = { userId, promise };
  return promise;
}
