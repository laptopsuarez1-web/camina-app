import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { pickPhoto as pickFromGallery } from '@/lib/pick-photo';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Camera, ChevronLeft, X } from '@/components/icons';
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
// Inclinación de cada foto del collage (como fotos pegadas a mano). Suave, para que se vean parejas.
const TILT = [-3, 2.5, -2];
// Cinta adhesiva de cada foto (como un álbum hecho a mano).
const TAPE = ['rgba(98,240,182,0.72)', 'rgba(196,160,255,0.72)', 'rgba(242,193,78,0.75)'];
const HUELLAS = require('@/../assets/ruta-huellas.png');
// Brillitos sueltos del fondo (posición en % de la pantalla y tamaño).
const SPARKS: [number, number, number][] = [[8, 22, 14], [88, 18, 10], [12, 54, 9], [92, 47, 13], [6, 78, 12], [90, 82, 9], [50, 96, 11]];

type Stop = MyRoute['stops'][number];

// Orden del álbum: primero los locales en el orden en que los visitaste (el primero que visitaste es el 1);
// después los que te faltan, en el orden de la ruta.
function albumOrder(stops: Stop[]): Stop[] {
  const seen = stops.filter((s) => s.visited_at).sort((x, y) => (x.visited_at! < y.visited_at! ? -1 : 1));
  return [...seen, ...stops.filter((s) => !s.visited_at)];
}

function fecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${rutaMonthName(`2000-${String(d.getMonth() + 1).padStart(2, '0')}-01`).slice(0, 3)}`;
}

// Una foto del collage: tu foto en el local (o su logo mientras no subas una), con el nombre y la fecha abajo.
function Polaroid({ stop, index, width, uploading, focus, onPhoto, onOpen }: {
  stop: Stop; index: number; width: number; uploading: boolean; focus: boolean; onPhoto: () => void; onOpen: () => void;
}) {
  const visited = !!stop.visited_at || !!stop.photo_path;
  const h = Math.round(width * 1.18);
  const tilt = TILT[index] ?? 0;
  // Cae desde arriba girada y se acomoda en su lugar, como una foto que pegas en el álbum.
  const t = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(250 + index * 260, withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 })));
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900 })), -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.6),
    transform: [{ translateY: (1 - t.value) * -90 }, { rotate: `${tilt + (1 - t.value) * tilt * 4}deg` }, { scale: 0.85 + t.value * 0.15 }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }], opacity: 0.75 + pulse.value * 0.25 }));
  // La foto que recién subiste brilla un momento, para que veas dónde quedó.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!focus) return;
    glow.set(withDelay(900, withSequence(withTiming(1, { duration: 450 }), withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 450 }), withTiming(0, { duration: 900 }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, stop.photo_path]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.04 }] }));
  return (
    <Animated.View style={anim}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: -7, borderRadius: 16, borderWidth: 3, borderColor: MINT, shadowColor: MINT, shadowOpacity: 0.9, shadowRadius: 16 }, glowStyle]} />
      {/* Cinta adhesiva arriba. */}
      <View pointerEvents="none" style={{ position: 'absolute', zIndex: 3, top: -9, alignSelf: 'center', width: width * 0.36, height: 20, borderRadius: 2, backgroundColor: TAPE[index] ?? TAPE[0], transform: [{ rotate: `${-tilt * 1.5}deg` }] }} />
      <Press accessibilityRole="button" disabled={!visited} onPress={stop.photo_path ? onOpen : onPhoto} haptic="light"
        accessibilityLabel={stop.photo_path ? `Ver tu foto en ${stop.name}` : visited ? `Subir tu foto en ${stop.name}` : `${stop.name}: todavía no lo visitaste`}
        style={{ width, padding: 8, paddingBottom: 12, borderRadius: 10, backgroundColor: '#FBF8FF', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <View style={{ height: h, borderRadius: 6, overflow: 'hidden', backgroundColor: visited ? '#2B1A5C' : '#241845', alignItems: 'center', justifyContent: 'center' }}>
          {stop.photo_path ? (
            <>
              <Image cachePolicy="memory-disk" source={{ uri: stop.photo_path, cacheKey: stop.photo_key ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
              {uploading ? <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20,11,46,0.55)', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={MINT} /></View> : null}
            </>
          ) : (
            <>
              {stop.logo_url ? (
                <Image cachePolicy="memory-disk" source={{ uri: stop.logo_url }} style={{ position: 'absolute', inset: 0, opacity: visited ? 0.35 : 0.14 }} contentFit="cover" blurRadius={visited ? 0 : 6} />
              ) : null}
              {uploading ? <ActivityIndicator color={MINT} /> : visited ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Animated.View style={[{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderStyle: 'dashed', borderColor: MINT, backgroundColor: 'rgba(98,240,182,0.12)', alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
                    <Camera size={26} color={MINT} />
                  </Animated.View>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Toca y sube</Text>
                  <Text style={{ color: MUTED, fontSize: 10.5 }}>la foto de tu visita</Text>
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
        {/* Número de parada, como sticker en la esquina. */}
        <View style={{ position: 'absolute', left: -8, top: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#200A52', borderWidth: 2, borderColor: '#FBF8FF', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
          <Text style={{ ...heavy(), color: MINT, fontSize: 13 }}>{index + 1}</Text>
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
  const { m, foco } = useLocalSearchParams<{ m?: string; foco?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const { data: route, isLoading } = useMyRoute(m);
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(foco ?? null);
  const month = m ? rutaMonthName(m) : '';

  async function addPhoto(businessId: string) {
    if (!userId || !m) return;
    const r = await pickFromGallery({ aspect: 4 / 5, max: 1280 });
    if (!r) return;
    setUploading(businessId);
    try {
      await uploadRoutePhoto(userId, m, businessId, r.uri, null);
      await qc.invalidateQueries({ queryKey: ['mi-ruta', userId, m] });
      setViewing(null);
      setFocus(businessId);
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
        {isLoading ? <ActivityIndicator color={MINT} /> : (
          <>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>No encontramos esta ruta.</Text>
            <Press accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/insignias'))}
              style={{ marginTop: 14, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Volver</Text>
            </Press>
          </>
        )}
      </View>
    );
  }
  const done = route.stops.filter((s) => s.visited_at).length;
  const photos = route.stops.filter((s) => s.photo_path).length;
  const ordered = albumOrder(route.stops);
  const [a, b, c] = ordered;
  const W = width - 40;
  // Las tres fotos del mismo tamaño, en zigzag como un camino: 1 arriba a la izquierda, 2 a la derecha, 3 abajo a la izquierda.
  const P = Math.min(172, Math.round((W - 14) / 2));
  const PH = Math.round(P * 1.18) + 20 + 42; // foto + marco + nombre
  const STEP_Y = Math.round(PH * 0.6);
  const spots = [0, 1, 2].map((i) => ({ x: i % 2 ? W - P : 0, y: i * STEP_Y }));
  const centers = spots.map((p) => ({ x: p.x + P / 2, y: p.y + PH / 2 }));
  const pathD = `M ${centers[0].x} ${centers[0].y} C ${centers[0].x} ${centers[0].y + STEP_Y}, ${centers[1].x} ${centers[1].y - STEP_Y * 0.6}, ${centers[1].x} ${centers[1].y} S ${centers[2].x} ${centers[2].y - STEP_Y * 0.6}, ${centers[2].x} ${centers[2].y}`;
  const withPhoto = ordered.filter((s) => s.photo_path);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={['#2B1263', '#1A0B40', BG]} locations={[0, 0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 40, alignSelf: 'center', backgroundColor: 'rgba(98,240,182,0.05)' }} />
      {SPARKS.map(([x, y, z], i) => (
        <Animated.Text key={i} entering={FadeIn.delay(600 + i * 120).duration(800)} pointerEvents="none"
          style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, fontSize: z, color: i % 2 ? 'rgba(242,193,78,0.55)' : 'rgba(98,240,182,0.55)' }}>✦</Animated.Text>
      ))}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/insignias'))}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Press>
        </View>

        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingHorizontal: 20, marginTop: -6 }}>
          <RutaRing size={84} done={done} month={rutaMonthShort(route.month)} themeMonth={done >= 3 ? route.month : null} />
          <View style={{ marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(98,240,182,0.14)', transform: [{ rotate: '-2deg' }] }}>
            <Text style={{ color: MINT, fontWeight: '900', letterSpacing: 2.4, fontSize: 10.5 }}>MI ÁLBUM</Text>
          </View>
          <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 2, fontSize: 11.5, marginTop: 8 }}>
            {route.completed_at ? `COMPLETADA · ${(fecha(route.completed_at) ?? '').toUpperCase()}` : `${done} DE 3 LOCALES`}
          </Text>
          <Text style={{ ...heavy(), color: '#fff', fontSize: 24, marginTop: 4, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>MI RUTA DE {month.toUpperCase()}</Text>
          {/* Lo que va del álbum, en chips. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            {[`${done} de 3 locales`, `${photos} ${photos === 1 ? 'foto' : 'fotos'}`, ...(route.ticket_no ? [`Boleto N.º ${route.ticket_no}`] : [])].map((t) => (
              <View key={t} style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ color: '#EDE6FF', fontSize: 12, fontWeight: '700' }}>{t}</Text>
              </View>
            ))}
          </View>
          {photos < done ? <Text style={{ color: MUTED, fontSize: 12.5, marginTop: 8, textAlign: 'center' }}>Toca una foto vacía y guarda el recuerdo de tu visita.</Text> : null}
        </Animated.View>

        {/* El collage: tres fotos iguales en zigzag, unidas por el camino de tus pasos. */}
        <View style={{ marginTop: 22, marginHorizontal: 20, height: spots[2].y + PH }}>
          {/* El camino aparece cuando las fotos ya cayeron en su lugar (antes se veía mal puesto y luego se acomodaba). */}
          <Animated.View entering={FadeIn.delay(1600).duration(500)} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: spots[2].y + PH }}>
            <Svg width={W} height={spots[2].y + PH}>
              <Path d={pathD} stroke="rgba(98,240,182,0.55)" strokeWidth={3} strokeDasharray="1 10" strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
          {ordered.slice(0, 3).map((st, i) => (
            <View key={st.business_id} style={{ position: 'absolute', left: spots[i].x, top: spots[i].y }}>
              <Polaroid stop={st} index={i} width={P} uploading={uploading === st.business_id} focus={focus === st.business_id}
                onPhoto={() => addPhoto(st.business_id)} onOpen={() => setViewing(st.business_id)} />
            </View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(900)} style={{ marginTop: 28, alignItems: 'center', paddingHorizontal: 30 }}>
          <Image source={HUELLAS} style={{ width: 26, height: 30, opacity: 0.8, marginBottom: 8 }} contentFit="contain" />
          <Text style={{ color: MUTED, fontSize: 12, textAlign: 'center' }}>
            {route.completed_at ? 'Tu insignia del mes ya es tuya. Toca una foto para verla o cambiarla.' : 'Cada local que visitas suma a tu anillo y a tu álbum. El orden es el de tus visitas: el primero que visitaste es el 1.'}
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

      {/* Ver tus fotos en grande (se desliza entre ellas) y cambiar la que quieras. */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={{ flex: 1, backgroundColor: '#0E0820' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            contentOffset={{ x: Math.max(0, withPhoto.findIndex((s) => s.business_id === viewing)) * width, y: 0 }}
            onMomentumScrollEnd={(e) => { // Al cerrar el visor su lista vuelve al inicio mientras se desvanece; ese salto no debe reabrirlo (antes la X no cerraba).
            if (!viewing) return; const s = withPhoto[Math.round(e.nativeEvent.contentOffset.x / width)]; if (s) setViewing(s.business_id); }}>
            {withPhoto.map((st) => (
              <View key={st.business_id} style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 }}>
                <View style={{ width: width - 44, padding: 10, paddingBottom: 14, borderRadius: 14, backgroundColor: '#FBF8FF' }}>
                  <Image cachePolicy="memory-disk" source={{ uri: st.photo_path!, cacheKey: st.photo_key ?? undefined }} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 8 }} contentFit="cover" />
                  <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 16, marginTop: 10 }} numberOfLines={1}>{ordered.indexOf(st) + 1}. {st.name}</Text>
                  <Text style={{ color: '#7C6A9C', fontSize: 12.5, fontWeight: '700' }}>{st.visited_at ? `Visitado el ${fecha(st.visited_at)}` : 'Visita por confirmar'}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', top: insets.top + 10, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
              {withPhoto.length > 1 ? `${Math.max(0, withPhoto.findIndex((s) => s.business_id === viewing)) + 1} de ${withPhoto.length} · desliza` : 'Tu foto'}
            </Text>
            <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setViewing(null)}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#fff" />
            </Press>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 18 }}>
            <Press accessibilityRole="button" onPress={() => viewing && addPhoto(viewing)} disabled={!!uploading} haptic="light"
              style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
              {uploading ? <ActivityIndicator color={MINT} /> : <><Camera size={18} color={MINT} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Cambiar esta foto</Text></>}
            </Press>
          </View>
        </View>
      </Modal>

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
            {/* Las tres fotos iguales, en zigzag como en el álbum. */}
            <View style={{ width: 300, height: 420, marginTop: 16 }}>
              {[a, b, c].map((st, i) => st ? (
                <View key={st.business_id} style={{ position: 'absolute', left: i % 2 ? 150 : 10, top: i * 128, transform: [{ rotate: `${TILT[i]}deg` }], padding: 5, paddingBottom: 8, borderRadius: 7, backgroundColor: '#FBF8FF' }}>
                  <View style={{ width: 130, height: 150, borderRadius: 4, overflow: 'hidden', backgroundColor: '#2F1E5C', alignItems: 'center', justifyContent: 'center' }}>
                    {st.photo_path ? <Image source={{ uri: st.photo_path }} style={{ width: '100%', height: '100%' }} />
                      : st.visited_at && st.logo_url ? <Image source={{ uri: st.logo_url }} style={{ width: '100%', height: '100%' }} />
                      : <Text style={{ ...heavy(), color: MINT, fontSize: 30 }}>?</Text>}
                  </View>
                  <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 11, marginTop: 4, width: 130 }} numberOfLines={1}>{st.visited_at || st.photo_path ? `${i + 1}. ${st.name}` : 'Sorpresa'}</Text>
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
