import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { celebrate } from '@/store/useCelebrationStore';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

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
        body: 'Tu primer punto está a 1.000 pasos. Caminá hoy y mirá cómo se llena el aro.',
      }),
    );
  }, [profile?.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Racha: aviso corto al llegar a 3, 7, 14, 30, 60 y 100 días (solo el hito más alto alcanzado).
  useEffect(() => {
    if (!userId || !streak) return;
    const hit = [...STREAK_MILESTONES].reverse().find((m) => streak >= m);
    if (!hit) return;
    const key = `camina_streak_ms_${userId}`;
    AsyncStorage.getItem(key).then((saved) => {
      if (Number(saved ?? 0) >= hit) return;
      AsyncStorage.setItem(key, String(hit)).catch(() => {});
      celebrate({ kind: 'toast', icon: 'flame', title: `${hit} días de racha`, body: '¡Seguí así mañana!' });
    }).catch(() => {});
  }, [streak, userId]);

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
          celebrate({ kind: 'toast', icon: 'gift', title: `¡${name || 'Tu amigo'} se sumó!`, body: 'Sumaste 5 puntos por invitarlo.' });
        }
      } catch {
        // si no se puede leer, simplemente no se avisa
      }
    })();
  }, [userId]);
}
