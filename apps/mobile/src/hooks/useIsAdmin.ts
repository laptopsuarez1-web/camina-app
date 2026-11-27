import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Modo admin: la bandera vive en la base (tabla app_admins) y el servidor la vuelve a validar en cada acción.
// Esto solo decide si se muestran los botones extra; si la pregunta falla, no es admin.
export function useIsAdmin() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data } = useQuery({
    queryKey: ['is-admin', userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      return !error && data === true;
    },
  });
  return data === true;
}
