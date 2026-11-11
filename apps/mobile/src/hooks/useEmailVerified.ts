import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Quien entró con Google o Apple, o creó su cuenta antes de esto, no tiene fila de verificación y cuenta como verificado.
// Solo quien creó la cuenta con correo y contraseña desde la versión nueva queda "sin verificar" hasta poner su código.
export function useEmailVerified() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['email-verified', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_email_verified');
      if (error) return true; // ante la duda no se bloquea a nadie: el servidor manda
      return data !== false;
    },
  });
  return {
    // Mientras carga se asume verificado para no mostrar avisos de más.
    verified: q.data !== false,
    refresh: () => qc.invalidateQueries({ queryKey: ['email-verified', userId] }),
  };
}
