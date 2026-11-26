import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Eventos vigentes para el mapa de Canjes. Van en el punto que marcó el comercio (0133) o, si no marcó, donde está su local.
// Consulta aparte de usePromotions: si algo falla acá, la pestaña Eventos sigue igual.
export interface MapEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  place_name: string | null;
  place_address: string | null;
  ticket_points: number | null;
  ticket_price: string | null;
  lat: number;
  lng: number;
  business: { name: string; logo_url: string | null } | null;
}

type Row = Omit<MapEvent, 'lat' | 'lng' | 'business'> & {
  place_lat: number | null;
  place_lng: number | null;
  business: { name: string; logo_url: string | null; lat: number | null; lng: number | null } | null;
};

export function useMapEvents() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['map-events', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MapEvent[]> => {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, title, starts_at, ends_at, place_name, place_address, place_lat, place_lng, ticket_points, ticket_price, business:businesses(name, logo_url, lat, lng)')
        .eq('kind', 'evento')
        .eq('status', 'approved')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at');
      if (error) return [];
      const out: MapEvent[] = [];
      for (const r of (data ?? []) as unknown as Row[]) {
        const lat = r.place_lat ?? r.business?.lat ?? null;
        const lng = r.place_lng ?? r.business?.lng ?? null;
        if (lat == null || lng == null) continue;
        out.push({
          id: r.id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, place_name: r.place_name, place_address: r.place_address,
          ticket_points: r.ticket_points, ticket_price: r.ticket_price, lat, lng,
          business: r.business ? { name: r.business.name, logo_url: r.business.logo_url } : null,
        });
      }
      return out;
    },
  });
}
