import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(user_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
