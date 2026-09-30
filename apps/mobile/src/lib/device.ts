import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '@/lib/supabase';

// Registra el identificador de este celular para que el equipo pueda detectar varias cuentas en un mismo
// teléfono. No se guarda nada personal: es un código propio de la instalación del sistema.
export async function registerDevice() {
  try {
    let id: string | null = null;
    if (Platform.OS === 'android') id = Application.getAndroidId();
    else if (Platform.OS === 'ios') id = await Application.getIosIdForVendorAsync();
    if (!id) return;
    await supabase.rpc('register_device', { p_device_id: id });
  } catch {
    // sin conexión o sin la función todavía: se reintenta en el próximo inicio
  }
}
