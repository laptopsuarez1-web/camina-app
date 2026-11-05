import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { toBase64 } from '@/lib/avatar';
import { useAuthStore } from '@/store/useAuthStore';

// Insignias (migración 0083). Las insignias de una persona son públicas: las ve cualquiera en su perfil.
export type LocalLevel = 'visitante' | 'habitual' | 'fan';
export type LocalBadgeT = { business_id: string; name: string; logo_url: string | null; category: string | null; points: number; level: LocalLevel };
export type UserBadges = {
  featured: string | null;
  banner_url: string | null;
  routes: { month: string; completed_at: string }[];
  locals: LocalBadgeT[];
};

export const LEVELS: { key: LocalLevel; label: string; from: number }[] = [
  { key: 'visitante', label: 'Visitante', from: 1 },
  { key: 'habitual', label: 'Habitual', from: 10 },
  { key: 'fan', label: 'Fan', from: 20 },
];
export function levelLabel(l: LocalLevel | null | undefined) {
  return LEVELS.find((x) => x.key === l)?.label ?? '';
}
// Cuántos puntos faltan para el siguiente nivel (null si ya es Fan).
export function nextLevel(points: number) {
  const next = LEVELS.find((x) => points < x.from && x.key !== 'visitante');
  return next ? { label: next.label, missing: next.from - points, target: next.from } : null;
}

export function useUserBadges(userId?: string | null) {
  return useQuery({
    queryKey: ['badges', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserBadges> => {
      const { data, error } = await supabase.rpc('user_badges', { p_user: userId });
      if (error) throw error;
      return data as UserBadges;
    },
  });
}

export function useMyBadges() {
  return useUserBadges(useAuthStore((s) => s.session?.user.id));
}

// true cuando el servidor ya tiene la migración 0083 (insignias, foto de banner, fotos de la ruta). Mientras no esté,
// esas opciones no se muestran: así la app se puede publicar antes de aplicar la migración sin que nada falle.
export function useBadgesReady() {
  return useMyBadges().isSuccess;
}

export function useSetFeaturedBadge() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (badge: string | null) => {
      const { error } = await supabase.rpc('set_featured_badge', { p_badge: badge });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badges', userId] }),
  });
}

export function useMyLevel(businessId?: string | null) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['level', userId, businessId],
    enabled: !!userId && !!businessId,
    queryFn: async (): Promise<{ points: number; level: LocalLevel | null }> => {
      const { data, error } = await supabase.rpc('my_level', { p_business: businessId });
      if (error) throw error;
      return data as { points: number; level: LocalLevel | null };
    },
  });
}

// "Dejar reseña" después de un canje: +1 a tu nivel en ese local (una vez por canje).
export async function rewardReview(redemptionId: string) {
  await supabase.rpc('level_review', { p_redemption: redemptionId });
}

export type MyRoute = {
  month: string;
  completed_at: string | null;
  ticket_no: number | null;
  stops: { business_id: string; name: string; category: string | null; logo_url: string | null; lat: number | null; lng: number | null; visited_at: string | null; photo_path: string | null }[];
};

export function useMyRoute(month?: string | null) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['mi-ruta', userId, month],
    enabled: !!userId && !!month,
    queryFn: async (): Promise<MyRoute | null> => {
      const { data, error } = await supabase.rpc('my_route', { p_month: month });
      if (error) throw error;
      const r = data as MyRoute | null;
      if (!r) return null;
      // Las fotos están en un bucket privado: se piden enlaces firmados por una hora.
      const paths = r.stops.map((s) => s.photo_path).filter((p): p is string => !!p);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('route-photos').createSignedUrls(paths, 3600);
        const byPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
        r.stops = r.stops.map((s) => ({ ...s, photo_path: s.photo_path ? byPath.get(s.photo_path) ?? null : null }));
      }
      return r;
    },
  });
}

// Sube la foto de una visita de la Ruta (una por local; la nueva reemplaza a la anterior).
export async function uploadRoutePhoto(userId: string, month: string, businessId: string, uri: string, base64?: string | null) {
  const data = await toBase64(uri, base64);
  const path = `${userId}/${month}-${businessId}.jpg`;
  const { error } = await supabase.storage.from('route-photos').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { error: e2 } = await supabase.rpc('set_route_photo', { p_month: month, p_business: businessId, p_path: path });
  if (e2) throw e2;
}
