import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { shrinkToBase64 } from '@/lib/avatar';
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

// Insignias elegidas para el perfil (0088): hasta 5, separadas por coma, en el orden elegido.
export const MAX_PROFILE_BADGES = 5;
export function chosenKeys(featured: string | null | undefined): string[] {
  return (featured ?? '').split(',').map((k) => k.trim()).filter(Boolean);
}
export type ProfileBadge = { kind: 'ruta'; key: string; month: string } | { kind: 'local'; key: string; local: LocalBadgeT };
// Lo que se ve en el perfil: las elegidas (las que todavía existen) o, si no eligió ninguna, las 2 rutas más
// recientes y los locales con más puntos, hasta 5.
export function profileBadges(b: UserBadges | undefined): ProfileBadge[] {
  if (!b) return [];
  const all: ProfileBadge[] = [
    ...(b.routes ?? []).map((r) => ({ kind: 'ruta' as const, key: `ruta:${r.month}`, month: r.month })),
    ...(b.locals ?? []).map((l) => ({ kind: 'local' as const, key: `local:${l.business_id}`, local: l })),
  ];
  const chosen = chosenKeys(b.featured).map((k) => all.find((x) => x.key === k)).filter((x): x is ProfileBadge => !!x);
  if (chosen.length) return chosen.slice(0, MAX_PROFILE_BADGES);
  const routes = all.filter((x) => x.kind === 'ruta').slice(0, 2);
  const locals = all.filter((x) => x.kind === 'local').slice(0, MAX_PROFILE_BADGES - routes.length);
  return [...routes, ...locals];
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
  // Achicada a 1280 px antes de subir (una foto del celular pesa varios MB).
  const data = await shrinkToBase64(uri, base64, 1280);
  const path = `${userId}/${month}-${businessId}.jpg`;
  const { error } = await supabase.storage.from('route-photos').upload(path, decode(data), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { error: e2 } = await supabase.rpc('set_route_photo', { p_month: month, p_business: businessId, p_path: path });
  if (e2) throw e2;
}

// Cómo fue sumando la persona en un local (cada canje, reseña, historia o visita de la Ruta). Solo las propias:
// la base deja leer únicamente tus filas.
export type LevelEvent = { source: 'canje' | 'visita' | 'resena' | 'historia'; points: number; created_at: string };
export function useLevelHistory(businessId: string | null | undefined, enabled = true) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['level-history', userId, businessId],
    enabled: !!userId && !!businessId && enabled,
    queryFn: async (): Promise<LevelEvent[]> => {
      const { data, error } = await supabase
        .from('business_level_points')
        .select('source, points, created_at')
        .eq('user_id', userId!)
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LevelEvent[];
    },
  });
}
