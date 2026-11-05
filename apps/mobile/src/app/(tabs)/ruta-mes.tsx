import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { RutaRing } from '@/components/ruta/RutaRing';
import { RutaMiniMap } from '@/components/ruta/RutaMiniMap';
import { heavy } from '@/components/ruta/heavy';
import { rutaMonthName, rutaMonthShort } from '@/hooks/useRuta';
import { uploadRoutePhoto, useMyRoute } from '@/hooks/useBadges';
import { useAuthStore } from '@/store/useAuthStore';
import { shareCard } from '@/lib/share-image';
import { friendlyError } from '@/lib/errors';

const MINT = '#62F0B6';
const MUTED = '#C4B8E8';
const BG = '#16111f';
const STORY = { width: 360, height: 640 };
const LOGO = require('@/../assets/logo-mint.png');

function fecha(iso: string | null) {
  if (!iso) return 'Pendiente';
  const d = new Date(iso);
  return `${d.getDate()} ${rutaMonthName(`2000-${String(d.getMonth() + 1).padStart(2, '0')}-01`).slice(0, 3)}`;
}

// Detalle de la insignia de una Ruta: el mapa, cada local con su fecha y tu foto, y compartirla en una historia.
export default function RutaMesScreen() {
  const insets = useSafeAreaInsets();
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
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 5], base64: true });
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

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <View style={{ height: 230 + insets.top }}>
          <RutaMiniMap places={route.stops} pinSize={34} route padBottom={40} />
          <LinearGradient pointerEvents="none" colors={['rgba(22,17,31,0.4)', 'rgba(22,17,31,0)', 'rgba(22,17,31,0.75)', BG]} locations={[0, 0.3, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/insignias'))}
            style={{ position: 'absolute', left: 20, top: insets.top + 8, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Press>
        </View>
        <View style={{ alignItems: 'center', marginTop: -70, paddingHorizontal: 20 }}>
          <RutaRing size={120} done={done} month={rutaMonthShort(route.month)} />
          <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.5, fontSize: 11.5, marginTop: 12 }}>
            {route.completed_at ? `COMPLETADA · ${fecha(route.completed_at).toUpperCase()}` : `${done} DE 3 LOCALES`}
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24, marginTop: 2 }}>Ruta de {month}</Text>
          {!!route.ticket_no && <Text style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>Boleto del sorteo N.º {route.ticket_no}</Text>}
        </View>
        <View style={{ marginHorizontal: 20, marginTop: 18, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', paddingHorizontal: 14 }}>
          {route.stops.map((s, i) => (
            <View key={s.business_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
                {s.logo_url ? <Image cachePolicy="memory-disk" source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }} numberOfLines={1}>{s.name}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>{fecha(s.visited_at)}</Text>
              </View>
              {s.photo_path ? (
                <Press onPress={() => addPhoto(s.business_id)} accessibilityLabel={`Cambiar la foto de ${s.name}`}>
                  <Image cachePolicy="memory-disk" source={{ uri: s.photo_path }} style={{ width: 60, height: 60, borderRadius: 14, borderWidth: 2.5, borderColor: '#fff' }} />
                </Press>
              ) : s.visited_at ? (
                <Press onPress={() => addPhoto(s.business_id)} style={{ width: 60, height: 60, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(98,240,182,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                  {uploading === s.business_id ? <ActivityIndicator color={MINT} /> : <Text style={{ color: MINT, fontWeight: '800', fontSize: 11, textAlign: 'center' }}>+ Foto</Text>}
                </Press>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {route.completed_at && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
          <Press accessibilityRole="button" onPress={share} disabled={sharing} haptic="light" style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: '#1F7A66' }}>
            {sharing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Compartir mi ruta</Text>}
          </Press>
        </View>
      )}

      {/* Historia para compartir (fuera de pantalla): se "fotografía" al tocar Compartir. */}
      <View style={{ position: 'absolute', left: -2000, top: 0 }} pointerEvents="none">
        <View ref={card} collapsable={false} style={{ width: STORY.width, height: STORY.height, overflow: 'hidden' }}>
          <LinearGradient colors={['#3B2577', '#200A52']} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ alignItems: 'center', paddingTop: 44 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={LOGO} style={{ width: 26, height: 26 }} />
              <Text style={{ color: MINT, ...heavy(), fontSize: 16, letterSpacing: 1 }}>CAMINA</Text>
            </View>
            <View style={{ marginTop: 26 }}><RutaRing size={140} done={3} month={rutaMonthShort(route.month)} /></View>
            <Text style={{ color: '#fff', ...heavy(), fontSize: 27, textAlign: 'center', marginTop: 20, lineHeight: 30 }}>
              COMPLETÉ MI{'\n'}<Text style={{ color: MINT, ...heavy(), fontSize: 27 }}>RUTA DE {month.toUpperCase()}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 28 }}>
              {route.stops.map((s, i) => (
                <View key={s.business_id} style={{ transform: [{ rotate: `${[-6, 3, -2][i] ?? 0}deg` }], marginTop: i === 1 ? 16 : 0 }}>
                  <View style={{ width: 92, height: 116, borderRadius: 16, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#2F1E5C' }}>
                    {s.photo_path ? <Image cachePolicy="memory-disk" source={{ uri: s.photo_path }} style={{ width: '100%', height: '100%' }} /> : s.logo_url ? <Image cachePolicy="memory-disk" source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
                  </View>
                  <View style={{ position: 'absolute', right: -8, bottom: -8, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: MINT, overflow: 'hidden', backgroundColor: '#fff' }}>
                    {s.logo_url ? <Image cachePolicy="memory-disk" source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 26 }}>{route.stops.map((s) => s.name).join(' · ')}</Text>
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Caminando por mi ciudad</Text>
          </View>
          <Text style={{ position: 'absolute', bottom: 26, width: '100%', textAlign: 'center', color: MUTED, fontSize: 12 }}>@caminaapp</Text>
        </View>
      </View>
    </View>
  );
}
