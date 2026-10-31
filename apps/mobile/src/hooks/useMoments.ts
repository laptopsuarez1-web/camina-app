import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { useMyLastWeekRank } from '@/hooks/useGlobalRanking';
import { localDay } from '@/lib/format';
import { celebrate } from '@/store/useCelebrationStore';
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
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = `camina_rank_wk_${userId}_${localDay(monday)}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(key, '1').catch(() => {});
      celebrate({ kind: 'ranking-result', position: lastWeek.position, steps: lastWeek.steps, onRanking: () => router.push('/(tabs)/ranking') });
    }).catch(() => {});
  }, [lastWeek?.position, userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
