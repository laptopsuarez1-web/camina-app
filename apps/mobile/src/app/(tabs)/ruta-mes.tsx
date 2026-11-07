import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { RutaRing } from '@/components/ruta/RutaRing';
import { heavy } from '@/components/ruta/heavy';
import { rutaMonthName, rutaMonthShort } from '@/hooks/useRuta';
import { uploadRoutePhoto, useMyRoute, type MyRoute } from '@/hooks/useBadges';
import { useAuthStore } from '@/store/useAuthStore';
import { shareCard } from '@/lib/share-image';
import { friendlyError } from '@/lib/errors';

const MINT = '#62F0B6';
const MUTED = '#C4B8E8';
const BG = '#140b2e';
const STORY = { width: 360, height: 640 };
const LOGO = require('@/../assets/logo-mint.png');
// Inclinación de cada foto del collage (como fotos pegadas a mano).
const TILT = [-4, 3.5, -2.5];

type Stop = MyRoute['stops'][number];

function fecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${rutaMonthName(`2000-${String(d.getMonth() + 1).padStart(2, '0')}-01`).slice(0, 3)}`;
}

// Una foto del collage: tu foto en el local (o su logo mientras no subas una), con el nombre y la fecha abajo.
function Polaroid({ stop, index, width, uploading, onPhoto }: {
  stop: Stop; index: number; width: number; uploading: boolean; onPhoto: () => void;
}) {
  const visited = !!stop.visited_at || !!stop.photo_path;
  const h = Math.round(width * 1.18);
  return (
    <Animated.View entering={ZoomIn.delay(250 + index * 220).springify().damping(13)} style={{ transform: [{ rotate: `${TILT[index] ?? 0}deg` }] }}>
      <Press accessibilityRole="button" disabled={!visited} onPress={onPhoto} haptic="light"
        accessibilityLabel={stop.photo_path ? `Cambiar tu foto en ${stop.name}` : visited ? `Subir tu foto en ${stop.name}` : `${stop.name}: todavía no lo visitaste`}
        style={{ width, padding: 8, paddingBottom: 12, borderRadius: 10, backgroundColor: '#FBF8FF', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <View style={{ height: h, borderRadius: 6, overflow: 'hidden', backgroundColor: visited ? '#2B1A5C' : '#241845', alignItems: 'center', justifyContent: 'center' }}>
          {stop.photo_path ? (
            <Image cachePolicy="memory-disk" source={{ uri: stop.photo_path }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <>
              {stop.logo_url ? (
                <Image cachePolicy="memory-disk" source={{ uri: stop.logo_url }} style={{ position: 'absolute', inset: 0, opacity: visited ? 0.35 : 0.14 }} contentFit="cover" blurRadius={visited ? 0 : 6} />
              ) : null}
              {uploading ? <ActivityIndicator color={MINT} /> : visited ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderStyle: 'dashed', borderColor: MINT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: MINT, fontSize: 24, fontWeight: '800', marginTop: -2 }}>+</Text>
                  </View>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Sube tu foto</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...heavy(), color: 'rgba(255,255,255,0.55)', fontSize: 34 }}>?</Text>
                  <Text style={{ color: MUTED, fontWeight: '700', fontSize: 11.5 }}>Te falta visitarlo</Text>
                </View>
              )}
            </>
          )}
          {stop.visited_at ? (
            <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#14093a', fontWeight: '900', fontSize: 14 }}>✓</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, overflow: 'hidden', backgroundColor: '#EDE6FF' }}>
            {stop.logo_url ? <Image cachePolicy="memory-disk" source={{ uri: stop.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 13 }} numberOfLines={1}>{stop.name}</Text>
            <Text style={{ color: '#7C6A9C', fontSize: 10.5, fontWeight: '700' }}>{fecha(stop.visited_at) ?? (visited ? 'Por confirmar' : 'Pendiente')}</Text>
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

// Tu Ruta del mes como un álbum: las 3 fotos de tus visitas pegadas en collage, unidas por tus pasos.
// Se abre al tocar la insignia de la Ruta (perfil e insignias) o el anillo en el mapa de la Ruta.
export default function RutaMesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { m } = useLocalSearchParams<{ m?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const { data: route, isLoading } = useMyRoute(m);
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const month = m ? rutaMonthName(m) : '';

  async function addPhoto(businessId: string) {
    if (!userId || !m) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 5] });
    if (r.canceled) return;
    setUploading(businessId);
    try {
      await uploadRoutePhoto(userId, m, businessId, r.assets[0].uri, r.assets[0].base64);
      await qc.invalidateQueries({ queryKey: ['mi-ruta', userId, m] });
    } catch (e) {
      Alert.alert('No se pudo subir la foto', friendlyError(e, 'Intenta de nuevo.'));
    } finally {
      setUploading(null);
    }
  }

  async function share() {
    setSharing(true);
    try {
      await shareCard(card, STORY, `ruta-${m}`, 'Comparte tu ruta');
    } catch (e) {
      Alert.alert('No se pudo compartir', friendlyError(e, 'Intenta de nuevo.'));
    } finally {
      setSharing(false);
    }
  }

  if (isLoading || !route) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? <ActivityIndicator color={MINT} /> : <Text style={{ color: '#fff' }}>No encontramos esta ruta.</Text>}
      </View>
    );
  }
  const done = route.stops.filter((s) => s.visited_at).length;
  const photos = route.stops.filter((s) => s.photo_path).length;
  const [a, b, c] = route.stops;
  const W = width - 40;
  const big = Math.min(230, width * 0.54);
  const bigH = big * 1.18 + 52; // alto de la foto grande con su marco y el nombre
  const small = Math.min(165, (W - 22) / 2);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={['#2B1263', '#1A0B40', BG]} locations={[0, 0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 40, alignSelf: 'center', backgroundColor: 'rgba(98,240,182,0.05)' }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/insignias'))}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Press>
        </View>

        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingHorizontal: 20, marginTop: -6 }}>
          <RutaRing size={84} done={done} month={rutaMonthShort(route.month)} themeMonth={done >= 3 ? route.month : null} />
          <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 2, fontSize: 11.5, marginTop: 10 }}>
            {route.completed_at ? `COMPLETADA · ${(fecha(route.completed_at) ?? '').toUpperCase()}` : `${done} DE 3 LOCALES`}
          </Text>
          <Text style={{ ...heavy(), color: '#fff', fontSize: 24, marginTop: 4, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>MI RUTA DE {month.toUpperCase()}</Text>
          <Text style={{ color: MUTED, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            {photos === 0 ? 'Sube una foto en cada local que visitaste y arma tu álbum.' : `${photos} de 3 fotos en tu álbum`}
            {route.ticket_no ? ` · Boleto N.º ${route.ticket_no}` : ''}
          </Text>
        </Animated.View>

        {/* El collage: una foto grande arriba y dos abajo, unidas por un camino de pasos. */}
        <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
          {/* Camino de pasos que une las fotos (de la grande a cada una de abajo). */}
          <Svg pointerEvents="none" width={W} height={bigH + 90} style={{ position: 'absolute', left: 20, top: 0 }}>
            <Path d={`M ${W / 2 - big * 0.18} ${bigH - 6} C ${W / 2 - big * 0.3} ${bigH + 40}, ${small * 0.6} ${bigH + 10}, ${small * 0.5} ${bigH + 40}`}
              stroke="rgba(98,240,182,0.6)" strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" fill="none" />
            <Path d={`M ${W / 2 + big * 0.18} ${bigH - 6} C ${W / 2 + big * 0.3} ${bigH + 40}, ${W - small * 0.6} ${bigH + 30}, ${W - small * 0.5} ${bigH + 74}`}
              stroke="rgba(98,240,182,0.6)" strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" fill="none" />
          </Svg>
          {a ? (
            <View style={{ alignItems: 'center' }}>
              <Polaroid stop={a} index={0} width={big} uploading={uploading === a.business_id} onPhoto={() => addPhoto(a.business_id)} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 }}>
            {b ? <Polaroid stop={b} index={1} width={small} uploading={uploading === b.business_id} onPhoto={() => addPhoto(b.business_id)} /> : <View />}
            {c ? <View style={{ marginTop: 34 }}><Polaroid stop={c} index={2} width={small} uploading={uploading === c.business_id} onPhoto={() => addPhoto(c.business_id)} /></View> : <View />}
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(900)} style={{ marginTop: 28, alignItems: 'center', paddingHorizontal: 30 }}>
          <Text style={{ color: MUTED, fontSize: 12, textAlign: 'center' }}>
            {route.completed_at ? 'Tu insignia del mes ya es tuya. Toca una foto para cambiarla.' : 'Cada local que visitas suma a tu anillo y a tu álbum. Toca una foto para cambiarla.'}
          </Text>
        </Animated.View>
      </ScrollView>

      {(route.completed_at || photos > 0) && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
          <Press accessibilityRole="button" onPress={share} disabled={sharing} haptic="light" style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: MINT }}>
            {sharing ? <ActivityIndicator color="#14093a" /> : <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>Compartir mi álbum en historias</Text>}
          </Press>
        </View>
      )}

      {/* Historia para compartir (fuera de pantalla): se "fotografía" al tocar Compartir. */}
      <View style={{ position: 'absolute', left: -2000, top: 0 }} pointerEvents="none">
        <View ref={card} collapsable={false} style={{ width: STORY.width, height: STORY.height, overflow: 'hidden' }}>
          <LinearGradient colors={['#2B1263', '#1A0B40', '#0F0726']} locations={[0, 0.55, 1]} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={LOGO} style={{ width: 24, height: 24 }} />
              <Text style={{ color: MINT, ...heavy(), fontSize: 15, letterSpacing: 1 }}>CAMINA</Text>
            </View>
            <Text style={{ color: '#fff', ...heavy(), fontSize: 26, textAlign: 'center', marginTop: 14, lineHeight: 29 }}>
              {route.completed_at ? 'COMPLETÉ MI' : `MI RUTA ${done}/3`}{'\n'}<Text style={{ color: MINT, ...heavy(), fontSize: 26 }}>RUTA DE {month.toUpperCase()}</Text>
            </Text>
            <View style={{ marginTop: 18, transform: [{ rotate: '-4deg' }], padding: 6, paddingBottom: 9, borderRadius: 8, backgroundColor: '#FBF8FF' }}>
              <View style={{ width: 170, height: 200, borderRadius: 5, overflow: 'hidden', backgroundColor: '#2F1E5C' }}>
                {a?.photo_path ? <Image source={{ uri: a.photo_path }} style={{ width: '100%', height: '100%' }} /> : a?.logo_url ? <Image source={{ uri: a.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
              </View>
              <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 12, marginTop: 5 }} numberOfLines={1}>{a?.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
              {[b, c].map((s, i) => s ? (
                <View key={s.business_id} style={{ transform: [{ rotate: `${i ? -3 : 4}deg` }], marginTop: i ? 14 : 0, padding: 5, paddingBottom: 8, borderRadius: 7, backgroundColor: '#FBF8FF' }}>
                  <View style={{ width: 118, height: 136, borderRadius: 4, overflow: 'hidden', backgroundColor: '#2F1E5C', alignItems: 'center', justifyContent: 'center' }}>
                    {s.photo_path ? <Image source={{ uri: s.photo_path }} style={{ width: '100%', height: '100%' }} />
                      : s.visited_at && s.logo_url ? <Image source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} />
                      : <Text style={{ ...heavy(), color: MINT, fontSize: 30 }}>?</Text>}
                  </View>
                  <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 11, marginTop: 4, width: 118 }} numberOfLines={1}>{s.visited_at || s.photo_path ? s.name : 'Sorpresa'}</Text>
                </View>
              ) : null)}
            </View>
          </View>
          <Text style={{ position: 'absolute', bottom: 24, width: '100%', textAlign: 'center', color: MUTED, fontSize: 12 }}>Súmate a la Ruta del mes · caminaapp.com</Text>
        </View>
      </View>
    </View>
  );
}
