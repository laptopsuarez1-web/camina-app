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
  useMyGroupsWeek(my, userId);
  useGroupInvites();
  useFriendRequests();
  useFriends();
  // Eventos
  usePromotions();
  useRetos();
  const { data: ruta } = useRuta();
  useLastRutaWinners(ruta?.month);
  // Canjes
  useBenefits();
  useApprovedBusinesses();
  useBenefitsRemainingToday();
  useOnlineRedeemed();
  useRedeemCounts();
  useFavorites();
  // Perfil
  useMyBadges();
  return null;
}
