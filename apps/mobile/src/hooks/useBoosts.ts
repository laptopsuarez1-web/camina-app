// Pasos dobles (x2): lugares (shoppings, malls...) donde, dentro de la zona y entre las fechas, cada 1.000 pasos dan
// 1 Punto extra (con un tope por persona). Lo crea el equipo de Camina desde el admin (migración 0133).
// Sin ubicación "siempre": se mira la ubicación al tocar Empezar, cada vez que la app vuelve a abrirse y al tocar Terminar.
// Los pasos se leen de la fuente real del teléfono (Salud / Health Connect / contador) entre Empezar y la última vez adentro.
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { readHealthKitSteps, readHealthConnectSteps } from '@/lib/health-steps';
import { readSensorDaySteps } from '@/lib/sensor-steps';
import { boliviaDay } from '@/lib/bolivia';

export interface BoostPlace {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  starts_at: string;
  ends_at: string;
  max_points: number;
  steps_per_point: number;
  my_points: number;
}

export interface BoostSession {
  id: string;
  place_id: string;
  started_at: string;
  last_inside_at: string;
  ended_at: string | null;
  steps: number;
  points: number;
  place_points?: number;
}

// Misma tolerancia del GPS que el servidor (boost_gps_slack_m).
export const BOOST_GPS_SLACK_M = 40;

export function isBoostLive(p: Pick<BoostPlace, 'starts_at' | 'ends_at'>, now = Date.now()) {
  return new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() > now;
}

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function insideZone(p: Pick<BoostPlace, 'lat' | 'lng' | 'radius_m'>, pos: { latitude: number; longitude: number } | null) {
  return !!pos && metersBetween(p.lat, p.lng, pos.latitude, pos.longitude) <= p.radius_m + BOOST_GPS_SLACK_M;
}

export function useBoostPlaces() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['boost-places', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BoostPlace[]> => {
      const { data, error } = await supabase.rpc('boost_places_for_me');
      // Si la base todavía no tiene la función (app nueva con base vieja), el mapa sigue sin lugares x2.
      if (error) return [];
      return (data ?? []) as BoostPlace[];
    },
  });
}

export function useOpenBoost() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['boost-open', userId],
    enabled: !!userId,
    queryFn: async (): Promise<BoostSession | null> => {
      const { data, error } = await supabase
        .from('boost_sessions')
        .select('id, place_id, started_at, last_inside_at, ended_at, steps, points')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .maybeSingle();
      if (error) return null;
      return (data as BoostSession | null) ?? null;
    },
  });
}

// Ubicación de este momento (solo con permiso "mientras se usa"). null si no hay permiso o no se pudo.
export async function currentPosition(ask: boolean): Promise<{ latitude: number; longitude: number } | null> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted' && ask) status = (await Location.requestForegroundPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    const p = pos ?? (await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000 }));
    return p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : null;
  } catch {
    return null;
  }
}

// En Android sin Health Connect el contador del teléfono solo da el total del día: se guarda cuánto marcaba al Empezar.
const baseKey = (sessionId: string) => `camina_boost_base_${sessionId}`;

async function sensorBaseline(sessionId: string) {
  if (Platform.OS !== 'android') return;
  const now = await readSensorDaySteps(new Date()).catch(() => null);
  if (now != null) await AsyncStorage.setItem(baseKey(sessionId), JSON.stringify({ day: boliviaDay(), steps: now })).catch(() => {});
}

// Pasos reales entre dos momentos (sin los cargados a mano).
export async function readStepsBetween(sessionId: string, start: Date, end: Date): Promise<number> {
  if (end.getTime() <= start.getTime()) return 0;
  if (Platform.OS === 'ios') {
    const health = await readHealthKitSteps(start, end).catch(() => 0);
    const sensor = await Pedometer.getStepCountAsync(start, end).then((r) => r.steps).catch(() => 0);
    return Math.max(health, sensor);
  }
  if (Platform.OS === 'android') {
    const health = await readHealthConnectSteps(start, end).catch(() => 0);
    let sensor = 0;
    // El contador solo sirve si la sesión sigue en el mismo día y "hasta" es ahora (no se puede mirar hacia atrás).
    if (Date.now() - end.getTime() < 60_000) {
      const raw = await AsyncStorage.getItem(baseKey(sessionId)).catch(() => null);
      const base = raw ? (JSON.parse(raw) as { day: string; steps: number }) : null;
      if (base && base.day === boliviaDay()) {
        const now = await readSensorDaySteps(new Date()).catch(() => null);
        if (now != null) sensor = Math.max(0, now - base.steps);
      }
    }
    return Math.max(health, sensor);
  }
  return 0;
}

export type StartResult = { ok: true; session: BoostSession } | { ok: false; reason: string; distance_m?: number };

export function useStartBoost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (place: BoostPlace): Promise<StartResult> => {
      const pos = await currentPosition(true);
      if (!pos) return { ok: false, reason: 'sin_ubicacion' };
      const { data, error } = await supabase.rpc('boost_start', { p_place: place.id, p_lat: pos.latitude, p_lng: pos.longitude });
      if (error) throw error;
      const res = data as StartResult;
      if (res.ok) await sensorBaseline(res.session.id);
      return res;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['boost-open'] });
      qc.invalidateQueries({ queryKey: ['boost-places'] });
    },
  });
}

// Suma los pasos hechos adentro. Si ya no está adentro (o end), el servidor cierra la sesión.
export async function syncBoost(session: BoostSession, place: BoostPlace, end: boolean) {
  const pos = await currentPosition(false);
  const inside = insideZone(place, pos) && Date.now() < new Date(place.ends_at).getTime();
  const until = inside ? new Date() : new Date(session.last_inside_at);
  const steps = await readStepsBetween(session.id, new Date(session.started_at), until);
  const { data, error } = await supabase.rpc('boost_update', {
    p_session: session.id,
    p_lat: pos?.latitude ?? null,
    p_lng: pos?.longitude ?? null,
    p_steps: steps,
    p_end: end,
  });
  if (error) throw error;
  const res = data as { inside: boolean; session: BoostSession };
  if (res.session.ended_at) AsyncStorage.removeItem(baseKey(session.id)).catch(() => {});
  return res;
}

export function useSyncBoost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ session, place, end }: { session: BoostSession; place: BoostPlace; end: boolean }) => syncBoost(session, place, end),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['boost-open'] });
      qc.invalidateQueries({ queryKey: ['boost-places'] });
      qc.invalidateQueries({ queryKey: ['points-balance'] });
      qc.invalidateQueries({ queryKey: ['points-ledger'] });
      qc.invalidateQueries({ queryKey: ['movimientos'] });
    },
  });
}

// Cada vez que la app vuelve a primer plano (y al abrirla) con una sesión abierta: suma lo caminado adentro.
export function useBoostAutoSync() {
  const { data: session } = useOpenBoost();
  const { data: places } = useBoostPlaces();
  const sync = useSyncBoost();
  const busy = useRef(false);
  const latest = useRef({ session, places, sync });
  useEffect(() => {
    latest.current = { session, places, sync };
  });
  useEffect(() => {
    const run = () => {
      const { session: s, places: ps, sync: m } = latest.current;
      const place = s && ps?.find((p) => p.id === s.place_id);
      if (!s || !place || busy.current) return;
      busy.current = true;
      m.mutateAsync({ session: s, place, end: false }).catch(() => {}).finally(() => { busy.current = false; });
    };
    const t = setTimeout(run, 1500);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') run(); });
    return () => { clearTimeout(t); sub.remove(); };
  }, [session?.id, places?.length]);
}
