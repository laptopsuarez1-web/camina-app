import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Ciudades activas y sus barrios (los administra el equipo de Camina desde el panel).
export function usePlaces() {
  return useQuery({
    queryKey: ['places'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [{ data: cities, error }, { data: zones, error: zError }] = await Promise.all([
        supabase.from('cities').select('name, active, sort').eq('active', true).order('sort'),
        supabase.from('zones').select('id, city, name').order('name'),
      ]);
      if (error) throw error;
      if (zError) throw zError;
      return { cities: (cities ?? []).map((c) => c.name), zones: zones ?? [] };
    },
  });
}
