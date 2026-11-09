import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { useMyLastWeekRank } from '@/hooks/useGlobalRanking';
import { localDay } from '@/lib/format';
import { boliviaToday } from '@/lib/bolivia';
import { celebrate } from '@/store/useCelebrationStore';
import type { PodiumPerson } from '@/components/celebrations/MomentScenes';
import { STREAK_BONUS_DAYS, STREAK_BONUS_POINTS } from '@/constants/business-rules';

// 7 y 14 no van acá: cada semana completa tiene su propia escena (abajo).
const STREAK_MILESTONES = [3, 30, 60, 100];

async function once(key: string, fn: () => void) {
  try {
    if (await AsyncStorage.getItem(key)) return;
    await AsyncStorage.setItem(key, '1');
    fn();
  } catch {
    // sin almacenamiento: mejor no avisar que avisar de más
  }
}

// Momentos de Inicio que se celebran una sola vez: bienvenida, hitos de racha y amigos que se sumaron.
export function useHomeMoments(streak: number | undefined) {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: lastWeek } = useMyLastWeekRank();

  // Bienvenida: solo cuentas nuevas (creadas en los últimos 3 días), una vez.
  useEffect(() => {
    if (!profile || !userId) return;
    const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000;
    if (ageDays > 3) return;
    const first = (profile.full_name || '').trim().split(/\s+/)[0];
    once(`camina_welcomed_${userId}`, () =>
      celebrate({
        kind: 'sheet', sparks: false, cta: 'Empezar a caminar',
        title: first ? `¡Hola, ${first}!` : '¡Bienvenido a Camina!',
        body: 'Tu primer punto está a 1.000 pasos. Camina hoy y mira cómo se llena el aro.',
      }),
    );
  }, [profile?.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Racha: aviso corto al llegar a 3, 30, 60 y 100 días (solo el hito más alto alcanzado).
  useEffect(() => {
    if (!userId || !streak) return;
    const hit = [...STREAK_MILESTONES].reverse().find((m) => streak >= m);
    if (!hit) return;
    const key = `camina_streak_ms_${userId}`;
    AsyncStorage.getItem(key).then((saved) => {
      if (Number(saved ?? 0) >= hit) return;
      AsyncStorage.setItem(key, String(hit)).catch(() => {});
      // 30 y 100 días: pantalla completa con la llama; el resto, aviso corto.
      if (hit >= 30 && hit !== 60) celebrate({ kind: 'streak-milestone', days: hit });
      else celebrate({ kind: 'toast', icon: 'flame', title: `${hit} días de racha`, body: '¡Sigue así mañana!' });
    }).catch(() => {});
  }, [streak, userId]);

  // Semana de racha completa (7, 14, 21… días seguidos): escena con las 7 casillas y los +5 Puntos, una vez por semana lograda.
  useEffect(() => {
    if (!userId || !streak || streak % STREAK_BONUS_DAYS !== 0) return;
    const weeks = streak / STREAK_BONUS_DAYS;
    const key = `camina_streak_wk_${userId}`;
    AsyncStorage.getItem(key).then((saved) => {
      if (Number(saved ?? 0) >= weeks) return;
      AsyncStorage.setItem(key, String(weeks)).catch(() => {});
      celebrate({ kind: 'streak-week', weeks, points: STREAK_BONUS_POINTS });
    }).catch(() => {});
  }, [streak, userId]);

  // Resultado del ranking global de la semana que cerró: 1.º, podio, Top 10 o Top 100. Una vez por semana.
  useEffect(() => {
    if (!userId || !lastWeek || lastWeek.position > 100) return;
    const monday = boliviaToday();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = `camina_rank_wk_${userId}_${localDay(monday)}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() - 1);
      const start = new Date(monday);
      start.setDate(start.getDate() - 7);
      const mes = (d: Date) => d.toLocaleDateString('es-BO', { month: 'short' }).replace('.', '');
      const weekLabel = `${start.getDate()} ${mes(start)} al ${sunday.getDate()} ${mes(sunday)}`;
      const prof = useAuthStore.getState().profile;
      const show = (podium?: PodiumPerson[]) => celebrate({
        kind: 'ranking-result', position: lastWeek.position, steps: lastWeek.steps, weekLabel, podium,
        me: { id: userId, name: prof?.full_name || 'Tú', photoUrl: prof?.photo_url ?? null },
        onRanking: () => router.push('/(tabs)/ranking'),
      });
      if (lastWeek.position > 3) { show(); return; }
      // En el podio: se traen los otros dos para mostrar sus fotos (si falla, el podio sale igual).
      Promise.resolve(supabase.rpc('last_week_podium'))
        .then(({ data }) => show(((data ?? []) as { user_id: string; full_name: string | null; photo_url: string | null; total_steps: number | string }[])
          .map((r) => ({ id: r.user_id, name: r.full_name || 'Caminante', photoUrl: r.photo_url, steps: Number(r.total_steps) }))))
        .catch(() => show());
    }).catch(() => {});
  }, [lastWeek?.position, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cierre de la semana de cada grupo (lunes): podio del grupo con fotos y tu puesto. Una vez por grupo y por semana.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const monday = boliviaToday();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const start = new Date(monday);
        start.setDate(start.getDate() - 7);
        const week = localDay(start);
        const { data: mine } = await supabase.from('group_weekly_results').select('group_id, rank, steps').eq('user_id', userId).eq('week_start', week);
        if (!mine?.length) return;
        const fresh: typeof mine = [];
        for (const r of mine) {
          const key = `camina_gweek_${userId}_${r.group_id}_${week}`;
          if (await AsyncStorage.getItem(key)) continue;
          await AsyncStorage.setItem(key, '1');
          fresh.push(r);
        }
        if (!fresh.length) return;
        const ids = fresh.map((r) => r.group_id as string);
        const [{ data: rows }, { data: groups }] = await Promise.all([
          supabase.from('group_weekly_results').select('group_id, user_id, steps, rank').in('group_id', ids).eq('week_start', week).order('rank', { ascending: true }),
          supabase.from('groups').select('id, name').in('id', ids),
        ]);
        const people = Array.from(new Set((rows ?? []).filter((r) => (r.rank as number) <= 3).map((r) => r.user_id as string)));
        const { data: profs } = people.length ? await supabase.from('public_profiles').select('id, full_name, photo_url').in('id', people) : { data: [] };
        const prof = new Map((profs ?? []).map((q) => [q.id as string, q]));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() - 1);
        const mes = (d: Date) => d.toLocaleDateString('es-BO', { month: 'short' }).replace('.', '');
        const weekLabel = `${start.getDate()} ${mes(start)} al ${sunday.getDate()} ${mes(sunday)}`;
        for (const r of fresh) {
          const all = (rows ?? []).filter((x) => x.group_id === r.group_id);
          // Una semana en la que nadie caminó no se celebra.
          const total = all.reduce((a, x) => a + Number(x.steps ?? 0), 0);
          if (total <= 0 || all.length < 2) continue;
          const podium = all.filter((x) => (x.rank as number) <= 3).slice(0, 3).map((x) => {
            const q = prof.get(x.user_id as string);
            return { id: x.user_id as string, name: (q?.full_name as string) || 'Caminante', photoUrl: (q?.photo_url as string | null) ?? null, steps: Number(x.steps ?? 0) };
          });
          celebrate({
            kind: 'group-week',
            name: (groups ?? []).find((g) => g.id === r.group_id)?.name ?? 'Tu grupo',
            weekLabel, podium, meId: userId,
            myRank: Number(r.rank), mySteps: Number(r.steps ?? 0), members: all.length, total,
            onOpen: () => router.push({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: r.group_id as string } }),
          });
        }
      } catch {
        // si no se puede leer, no se muestra
      }
    })();
  }, [userId]);

  // Un amigo que invitaste ya caminó y te dio sus 5 Puntos. La primera vez solo se anotan los que ya había.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('referrals')
          .select('id, credited, referred:profiles!referrals_referred_user_id_fkey(full_name)')
          .eq('referrer_user_id', userId)
          .eq('credited', true);
        if (error || !data) return;
        const key = `camina_ref_seen_${userId}`;
        const raw = await AsyncStorage.getItem(key);
        const ids = data.map((r) => r.id as string);
        if (raw === null) {
          await AsyncStorage.setItem(key, JSON.stringify(ids));
          return;
        }
        const seen: string[] = JSON.parse(raw);
        const fresh = data.filter((r) => !seen.includes(r.id as string));
        if (!fresh.length) return;
        await AsyncStorage.setItem(key, JSON.stringify(ids));
        for (const r of fresh) {
          const ref = r.referred as unknown as { full_name?: string } | { full_name?: string }[] | null;
          const name = (Array.isArray(ref) ? ref[0]?.full_name : ref?.full_name)?.trim().split(/\s+/)[0];
          celebrate({ kind: 'toast', icon: 'gift', title: `¡${name || 'Tu amigo'} se sumó!`, body: 'Sumaste 5 Puntos por invitarlo.' });
        }
      } catch {
        // si no se puede leer, simplemente no se avisa
      }
    })();
  }, [userId]);
}
