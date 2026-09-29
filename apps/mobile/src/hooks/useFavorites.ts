import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Comercios favoritos del usuario. Si la tabla todavía no existe o falla la
// consulta, la lista queda vacía y el resto de la app sigue igual.
export function useFavorites() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['favorites', userId];

  const { data } = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('favorite_businesses').select('business_id').eq('user_id', userId!);
      if (error) return [] as string[];
      return data.map((r) => r.business_id as string);
    },
  });
  const ids = data ?? [];

  const toggle = useMutation({
    mutationFn: async (businessId: string) => {
      const isFav = ids.includes(businessId);
      const { error } = isFav
        ? await supabase.from('favorite_businesses').delete().eq('user_id', userId!).eq('business_id', businessId)
        : await supabase.from('favorite_businesses').insert({ user_id: userId!, business_id: businessId });
      if (error) throw error;
    },
    onMutate: async (businessId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, prev.includes(businessId) ? prev.filter((i) => i !== businessId) : [...prev, businessId]);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle: (id: string) => toggle.mutate(id) };
}
