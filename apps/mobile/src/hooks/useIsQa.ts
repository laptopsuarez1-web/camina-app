import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Cuenta de prueba interna (tabla qa_accounts, solo editable desde Supabase).
// Si la tabla no existe todavía o falla, simplemente no es cuenta de prueba.
export function useIsQa() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data } = useQuery({
    queryKey: ['is-qa', userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('qa_accounts').select('user_id').eq('user_id', userId!).maybeSingle();
      return !error && !!data;
    },
  });
  return data === true;
}
