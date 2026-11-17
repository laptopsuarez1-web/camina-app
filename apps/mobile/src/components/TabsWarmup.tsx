import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStepsHistory } from '@/hooks/useStepsHistory';
import { useCommunityAverage, useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { useWrapped, wrappedMonthStart } from '@/hooks/useWrapped';
import { useWalkingLegend } from '@/components/LegendCard';
import { useGroups } from '@/hooks/useGroups';
import { useMyGroupsWeek } from '@/hooks/useMyGroupsWeek';
import { useFriendRequests, useFriends, useGroupInvites } from '@/hooks/useFriends';
import { usePromotions } from '@/hooks/usePromotions';
import { useRetos } from '@/hooks/useRetos';
import { useLastRutaWinners, useRuta } from '@/hooks/useRuta';
import { useApprovedBusinesses, useBenefits, useBenefitsRemainingToday, useOnlineRedeemed } from '@/hooks/useBenefits';
import { useRedeemCounts } from '@/hooks/useRedeemCounts';
import { useFavorites } from '@/hooks/useFavorites';
import { useMyBadges } from '@/hooks/useBadges';
import { Image } from 'expo-image';
import { loadPositionIfAllowed } from '@/lib/last-position';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useGroupChallenge } from '@/hooks/useChallenges';
import { useGroupCheers } from '@/hooks/useCheers';

// Precarga en segundo plano los datos de las pestañas (Actividad, Comunidad, Eventos, Canjes y Perfil).
// Sin esto, la primera vez que se toca una pestaña la pantalla se dibuja vacía y las tarjetas crecen y se
// corren cuando llegan los datos. Usa los mismos hooks que las pantallas, así comparten la misma caché.
// Arranca un momento después de Inicio para no competir con lo que se ve primero. No dibuja nada.
const DELAY_MS = 800;

export function TabsWarmup() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => setGo(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [userId]);
  return go && userId ? <Warm userId={userId} /> : null;
}

function Warm({ userId }: { userId: string }) {
  // Actividad
  useStepsHistory();
  useCommunityAverage();
  useMyWeeklyRank();
  useWrapped(useMemo(() => wrappedMonthStart(), []));
  useWalkingLegend();
  // Comunidad: los grupos y el resumen de la semana de cada uno (meta, caras, puesto).
  const { data: groups } = useGroups();
  const my = useMemo(() => (groups ?? []).filter((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId)), [groups, userId]);
  const { data: week } = useMyGroupsWeek(my, userId);
  // Fotos de la lista de Comunidad (foto y portada del grupo, caras de los miembros): así no aparecen de a una.
  useEffect(() => {
    const urls = new Set<string>();
    for (const g of my as { photo_url?: string | null; banner_url?: string | null }[]) {
      if (g.photo_url) urls.add(g.photo_url);
      if (g.banner_url) urls.add(g.banner_url);
    }
    for (const w of Object.values(week ?? {})) for (const a of w.avatars) if (a.photoUrl) urls.add(a.photoUrl);
    if (urls.size) Image.prefetch([...urls], 'memory-disk').catch(() => {});
  }, [my, week]);
  const firstGroups = my.slice(0, 4);
  useGroupInvites();
  useFriendRequests();
  useFriends();
  // Eventos
  usePromotions();
  useRetos();
  const { data: ruta } = useRuta();
  useLastRutaWinners(ruta?.month);
  // Canjes: la ubicación (para que la lista abra ya ordenada por cercanía) y las fotos de las tarjetas,
  // para que no aparezcan de a una al abrir la pestaña.
  useEffect(() => { loadPositionIfAllowed(); }, []);
  const { data: benefits } = useBenefits();
  useEffect(() => {
    const urls = new Set<string>();
    for (const b of benefits ?? []) {
      if (b.business.cover_url) urls.add(b.business.cover_url);
      if (b.business.logo_url) urls.add(b.business.logo_url);
    }
    if (urls.size) Image.prefetch([...urls], 'memory-disk').catch(() => {});
  }, [benefits]);
  useApprovedBusinesses();
  useBenefitsRemainingToday();
  useOnlineRedeemed();
  useRedeemCounts();
  useFavorites();
  // Perfil
  useMyBadges();
  // El detalle de los primeros grupos (podio, meta, reto), para que al entrar a un grupo no se vea en blanco.
  return <>{firstGroups.map((g) => <WarmGroup key={g.id} groupId={g.id} />)}</>;
}

// Sin el chat del grupo: ese abre una conexión en vivo y solo se carga al entrar.
function WarmGroup({ groupId }: { groupId: string }) {
  useGroupDetail(groupId);
  useGroupChallenge(groupId);
  useGroupCheers(groupId);
  return null;
}
