import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Spinner } from '@/components/ui/Spinner';
import { router } from 'expo-router';
import { SwipeSheet } from '@/components/ui/SwipeSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { LEVEL_LOOK, LocalBadge } from '@/components/badges/LocalBadge';
import { pickPhoto } from '@/lib/pick-photo';
import { friendlyServerError } from '@/lib/errors';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { LEVELS, levelLabel, nextLevel, useLevelHistory, useSetBadgeImage, type LevelEvent, type LocalBadgeT } from '@/hooks/useBadges';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const QUE: Record<LevelEvent['source'], string> = {
  canje: 'Canje confirmado',
  visita: 'Visita de la Ruta del mes',
  resena: 'Calificaste el local',
  historia: 'Historia aprobada',
};

// Detalle de la insignia de un local: en qué nivel vas, cuánto te falta y cómo fuiste sumando.
// `own` = es mi insignia (se ve el detalle de puntos); en la de otra persona solo el nivel.
export function BadgeSheet({ badge, own, onClose }: { badge: LocalBadgeT | null; own: boolean; onClose: () => void }) {
  const { data: history, isLoading } = useLevelHistory(badge?.business_id, own && !!badge);
  // La barra se llena sola al abrir: de 0 a tus puntos de nivel.
  const reduced = useReducedMotion();
  const fill = useSharedValue(0);
  const target = badge ? Math.max(4, Math.min(100, Math.round((badge.points / LEVELS[LEVELS.length - 1].from) * 100))) : 0;
  useEffect(() => {
    fill.value = reduced ? target : 0;
    if (!reduced) fill.value = withDelay(350, withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [target, reduced, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  const isAdmin = useIsAdmin();
  const setImage = useSetBadgeImage();
  if (!badge) return null;
  async function changeImage() {
    try {
      const r = await pickPhoto({ aspect: 1, max: 600, title: 'Acomoda la imagen de la insignia' });
      if (!r || !badge) return;
      const url = await setImage.mutateAsync({ businessId: badge.business_id, uri: r.uri });
      Alert.alert('Listo', 'La insignia ya tiene la imagen nueva.');
      void url;
    } catch (e) {
      Alert.alert('No se pudo cambiar la imagen', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }
  const next = nextLevel(badge.points);
  return (
    <SwipeSheet visible onClose={onClose}>
          <View style={{ padding: 20, paddingTop: 10 }}>
            <View className="items-center">
              <LocalBadge logoUrl={badge.logo_url} name={badge.name} level={badge.level} size={96} />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 14 }} numberOfLines={1}>{badge.name}</Text>
              <Text style={{ color: '#C4B8E8', fontSize: 13.5, marginTop: 2 }}>
                {own ? `Eres ${levelLabel(badge.level)} · ${badge.points} puntos de nivel` : `${levelLabel(badge.level)} de este local`}
              </Text>
            </View>

            {/* Camino de niveles: Visitante → Habitual → Fan. */}
            <View style={{ marginTop: 20 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Animated.View style={[{ height: '100%', borderRadius: 5, overflow: 'hidden' }, fillStyle]}>
                  <LinearGradient colors={['#8B4FD1', '#62F0B6', '#FFD166']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                </Animated.View>
              </View>
              <View className="flex-row justify-between" style={{ marginTop: 8 }}>
                {LEVELS.map((l) => {
                  const reached = badge.points >= l.from;
                  return (
                    <View key={l.key} className="items-center" style={{ width: 90 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: reached ? LEVEL_LOOK[l.key].ring[1] : 'rgba(255,255,255,0.15)', marginBottom: 4 }} />
                      <Text style={{ color: reached ? '#fff' : '#8E82AE', fontSize: 12.5, fontWeight: '700' }}>{l.label}</Text>
                      <Text style={{ color: '#8E82AE', fontSize: 11 }}>{l.from === 1 ? 'primer canje' : `${l.from} puntos`}</Text>
                    </View>
                  );
                })}
              </View>
              {own ? (
                <Text style={{ color: '#62F0B6', fontSize: 13.5, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>
                  {next ? `Te faltan ${next.missing} ${next.missing === 1 ? 'punto' : 'puntos'} para ${next.label}` : '¡Llegaste al nivel más alto!'}
                </Text>
              ) : null}
            </View>

            {own ? (
              <>
                <Text style={{ color: '#62F0B6', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginBottom: 8 }}>CÓMO SUMASTE</Text>
                <View style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14 }}>
                  {isLoading ? (
                    <Spinner color="#62F0B6" style={{ paddingVertical: 18 }} />
                  ) : !history?.length ? (
                    <Text style={{ color: '#C4B8E8', fontSize: 13, paddingVertical: 14, textAlign: 'center' }}>Todavía no hay movimientos en este local.</Text>
                  ) : (
                    history.map((h, i) => (
                      <View key={`${h.created_at}-${i}`} className="flex-row items-center" style={{ paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                        <View className="flex-1">
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{QUE[h.source] ?? 'Puntos de nivel'}</Text>
                          <Text style={{ color: '#8E82AE', fontSize: 12 }}>{fecha(h.created_at)}</Text>
                        </View>
                        <Text style={{ color: '#62F0B6', fontSize: 16, fontWeight: '900' }}>+{h.points}</Text>
                      </View>
                    ))
                  )}
                </View>
                <Text style={{ color: '#8E82AE', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 }}>
                  Canje o visita de la Ruta +2 · Calificar el local +1 · Historia aprobada +1
                </Text>
              </>
            ) : null}

            <Press accessibilityRole="button" onPress={() => { const id = badge.business_id; onClose(); setTimeout(() => router.push({ pathname: '/(tabs)/canjes', params: { negocio: id } }), 250); }} className="rounded-2xl items-center" style={{ marginTop: 18, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Ver perfil del local</Text>
            </Press>
            {isAdmin ? (
              <Press accessibilityRole="button" onPress={changeImage} disabled={setImage.isPending} className="rounded-2xl items-center" style={{ marginTop: 10, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                {setImage.isPending ? <Spinner color="#62F0B6" /> : <Text style={{ color: '#C4B8E8', fontWeight: '800', fontSize: 14 }}>Admin · Cambiar imagen de la insignia</Text>}
              </Press>
            ) : null}
            <Press accessibilityRole="button" onPress={onClose} className="rounded-2xl items-center" style={{ marginTop: 10, paddingVertical: 14, backgroundColor: '#1F7A66' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Listo</Text>
            </Press>
          </View>
    </SwipeSheet>
  );
}
