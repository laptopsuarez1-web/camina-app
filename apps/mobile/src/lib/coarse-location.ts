import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const KEY = 'camina_coarse_location_last';
const EVERY_MS = 6 * 60 * 60 * 1000; // como máximo una vez cada 6 horas

// Manda al servidor una ubicación APROXIMADA (el servidor la redondea a ~550 m) para poder avisarte
// de comercios cercanos. Solo si ya diste permiso de ubicación; nunca lo pide por su cuenta.
export async function shareCoarseLocation(force = false) {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return;
    if (!force) {
      const last = Number((await AsyncStorage.getItem(KEY)) ?? 0);
      if (Date.now() - last < EVERY_MS) return;
    }
    const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    if (!pos) return;
    const { error } = await supabase.rpc('save_coarse_location', { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude });
    if (!error) await AsyncStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sin conexión o sin la función todavía: no pasa nada, se reintenta la próxima vez
  }
}

// Borra la ubicación guardada (al apagar los avisos cercanos).
export async function clearCoarseLocation() {
  try {
    await supabase.rpc('save_coarse_location', { p_lat: null, p_lng: null });
    await AsyncStorage.removeItem(KEY);
  } catch {
    // se ignora
  }
}
