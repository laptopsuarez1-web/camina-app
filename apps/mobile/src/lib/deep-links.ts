import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { PENDING_REFERRAL_KEY, PENDING_GROUP_JOIN_KEY } from '@/constants/sharing';

// Errores que no se arreglan reintentando (id con formato inválido, grupo borrado):
// la clave se descarta para no reintentarla en cada login ni unir a otra persona
// del mismo dispositivo a una invitación vieja.
const isPermanentError = (error: { code?: string } | null) =>
  error?.code === '22P02' || error?.code === '23503';

// Se llama una vez que hay sesión (después de login/signup, y de nuevo al
// terminar de completar el perfil) para aplicar una invitación que haya
// quedado guardada de un link camina://r/... o camina://join-group/...
// abierto antes de loguearse. Devuelve el groupId al que hay que navegar, si
// corresponde.
export async function consumePendingDeepLinks(): Promise<{ joinedGroupId: string | null }> {
  const [pendingRef, pendingGroup] = await Promise.all([
    AsyncStorage.getItem(PENDING_REFERRAL_KEY),
    AsyncStorage.getItem(PENDING_GROUP_JOIN_KEY),
  ]);

  if (pendingRef) {
    try {
      // supabase-js no lanza: devuelve { error }. La clave se borra solo si anduvo;
      // si falló (mala señal), queda guardada para reintentar la próxima vez.
      const { error } = await supabase.rpc('capture_referral', { p_referrer_id: pendingRef });
      if (!error || isPermanentError(error)) await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
    } catch {
      // error de red inesperado — no bloquea el login y la invitación queda pendiente
    }
  }

  let joinedGroupId: string | null = null;
  if (pendingGroup) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase
        .from('group_members')
        .upsert({ group_id: pendingGroup, user_id: userId }, { onConflict: 'group_id,user_id' });
      if (!error) joinedGroupId = pendingGroup;
      if (!error || isPermanentError(error)) await AsyncStorage.removeItem(PENDING_GROUP_JOIN_KEY);
    }
  }

  return { joinedGroupId };
}
