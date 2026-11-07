import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { uploadRoutePhoto, useBadgesReady } from '@/hooks/useBadges';
import { useAuthStore } from '@/store/useAuthStore';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { LocalCodeSheet } from '@/components/LocalCodeSheet';
import { RutaRing } from '@/components/ruta/RutaRing';
import { GOLD, RutaPin } from '@/components/ruta/RutaPin';
import { RutaMiniMap, WebCityMap } from '@/components/ruta/RutaMiniMap';
import { RutaPrizeCard } from '@/components/ruta/RutaPrizeCard';
import { RutaStopSheet } from '@/components/ruta/RutaStopSheet';
import { RouteLine, RouteLineWeb, sideBySide } from '@/components/ruta/RouteLine';
import { RutaShareCard, SHARE_SIZE } from '@/components/ruta/RutaShareCard';
import { shareCard } from '@/lib/share-image';
import { useRutaDoneCelebration, useRutaStopCelebration } from '@/components/ruta/useRutaDoneCelebration';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { friendlyServerError } from '@/lib/errors';
import { celebrate } from '@/store/useCelebrationStore';
import {
  participationLabel, rutaDone, rutaMonthName, rutaMonthShort, useJoinRuta, useMarkRutaVisit, usePickDoubleDay, useLastRutaWinners, useRuta, useRutaParticipation, useRutaPrize,
  useRutaSwapOptions, useSwapRuta, useWalkingPath,
  type RutaStop,
} from '@/hooks/useRuta';

const MINT = '#62F0B6';
const BG = '#16111f';
const CARD = { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', borderRadius: 22 } as const;
const MUTED = '#C4B8E8';

function Back() {
  return (
    <Press accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/eventos'))}
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      <ChevronLeft size={20} color="#fff" />
    </Press>
  );
}

function Premio({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={[CARD, { padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>{title}</Text>
        <Text style={{ color: MUTED, fontSize: 12.5, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
}
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(98,240,182,0.14)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.3, fontSize: 11, marginBottom: 6 }}>{title}</Text>
      <View style={[CARD, { paddingHorizontal: 14, paddingVertical: 2 }]}>
        {items.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: MINT, fontWeight: '800' }}>•</Text>
            <Text style={{ color: '#fff', fontSize: 13.5, lineHeight: 19, flex: 1 }}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Orden para dibujar la línea: del más al norte, siempre al más cercano. Es solo para el dibujo: se visitan en cualquier orden.
function lineOrder(stops: RutaStop[]) {
  const pts = stops.filter((s) => s.lat != null && s.lng != null);
  if (pts.length < 2) return pts;
  const rest = [...pts].sort((a, b) => b.lat! - a.lat!);
  const out = [rest.shift()!];
  while (rest.length) {
    const last = out[out.length - 1];
    rest.sort((a, b) => Math.hypot(a.lat! - last.lat!, a.lng! - last.lng!) - Math.hypot(b.lat! - last.lat!, b.lng! - last.lng!));
    out.push(rest.shift()!);
  }
  return out;
}

export default function RutaScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const params = useLocalSearchParams<{ nueva?: string }>();
  const { data: state, isLoading, isError, refetch } = useRuta();
  const { data: prize } = useRutaPrize(state?.month);
  const lastWinners = useLastRutaWinners(state?.month);
  const { data: participation } = useRutaParticipation(state?.month);
  useRutaDoneCelebration(state);
  useRutaStopCelebration(state, (id) => shareRoute(state?.stops.find((x) => x.business_id === id)), (id) => addVisitPhoto(id));
  const userId = useAuthStore((st) => st.session?.user.id);
  const photosReady = useBadgesReady();
  const join = useJoinRuta();
  const swap = useSwapRuta();
  const mark = useMarkRutaVisit();
  const pickDay = usePickDoubleDay();
  const [showRules, setShowRules] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [visitFor, setVisitFor] = useState<RutaStop | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapOut, setSwapOut] = useState<string | null>(null);
  const [swapIn, setSwapIn] = useState<string | null>(null);
  const options = useRutaSwapOptions(swapOpen);
  const mapRef = useRef<MapView>(null);
  // Animación de llegada: la cámara va a cada local, cae su pin y al final se ven los 3 unidos.
  // `intro` es local (no depende de que el parámetro de la URL llegue a tiempo): desde que se toca Participar,
  // no se muestra ningún local hasta que cae su pin en el mapa.
  const [intro, setIntro] = useState(!!params.nueva);
  const qc = useQueryClient();
  // Al tocar Participar: cartel con cuántas personas ya están en la Ruta (se va solo).
  const [welcome, setWelcome] = useState(false);
  const [shown, setShown] = useState(params.nueva ? 0 : 3);
  const [lineOn, setLineOn] = useState(!params.nueva);
  const [tracks, setTracks] = useState(true);
  const [drop, setDrop] = useState<{ stop: RutaStop; x: number; y: number; key: number } | null>(null);

  const stops = useMemo(() => state?.stops ?? [], [state]);
  const done = rutaDone(state);
  const month = state ? rutaMonthName(state.month) : '';
  const ordered = useMemo(() => lineOrder(stops), [stops]);
  // Cada pin va en la ubicación real del local. Si en pantalla dos se tocarían, se dibujan lado a lado (offs, en píxeles).
  const P = (s: RutaStop) => ({ latitude: s.lat!, longitude: s.lng! });
  const [offs, setOffs] = useState<Map<string, number>>(new Map());
  function placePins(r: Region) {
    const pts = stops.filter((s) => s.lat != null && s.lng != null).map((s) => ({
      id: s.business_id,
      x: ((s.lng! - r.longitude) / r.longitudeDelta) * width,
      y: (-(s.lat! - r.latitude) / r.latitudeDelta) * height,
    }));
    const next = sideBySide(pts);
    setOffs((prev) => (sameOffs(prev, next) ? prev : next));
  }
  // Recorrido a pie por las calles entre los locales (si no llega, la línea va recta).
  const straight = useMemo(() => ordered.map((s) => ({ latitude: s.lat!, longitude: s.lng! })), [ordered]);
  const walk = useWalkingPath(straight);
  const path = walk.data ?? straight;
  // Tarjeta para historias ("Mi Ruta 1/3 en Bloom"): se arma escondida y se comparte como imagen.
  const shareRef = useRef<View>(null);
  const [shareAt, setShareAt] = useState<RutaStop | null>(null);
  async function shareRoute(at?: RutaStop | null) {
    setShareAt(at ?? stops.find((x) => x.visit === 'confirmed') ?? stops.find((x) => x.visit === 'pending') ?? null);
    // Un cuadro para que la tarjeta escondida se dibuje con el local elegido.
    await new Promise((r) => setTimeout(r, 120));
    try {
      await shareCard(shareRef, SHARE_SIZE, `mi-ruta-${state?.month ?? ''}`, 'Comparte tu Ruta');
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Intenta de nuevo.');
    }
  }
  const [infoFor, setInfoFor] = useState<RutaStop | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, [shown, stops.length]);

  // Seguro: si el mapa no llega a cargar (sin red o sin coordenadas), los locales igual se muestran después de la animación.
  useEffect(() => {
    if (!intro || !stops.length) return;
    const t = setTimeout(() => { setShown(stops.length); setLineOn(true); setIntro(false); }, 300 + stops.length * 2300 + 4000);
    return () => clearTimeout(t);
  }, [intro, stops.length]);

  function fitAll(animated = true) {
    const coords = stops.filter((s) => s.lat != null).map(P);
    if (coords.length) mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 150, right: 60, bottom: 260, left: 60 }, animated });
  }

  function runIntro() {
    if (!stops.length) return;
    const steps = stops.filter((s) => s.lat != null);
    const STEP = 2300;
    steps.forEach((s, i) => {
      setTimeout(() => {
        mapRef.current?.animateCamera({ center: P(s), zoom: 17 }, { duration: 1000 });
        setTimeout(async () => {
          const pt = await mapRef.current?.pointForCoordinate(P(s));
          if (pt) setDrop({ stop: s, x: pt.x, y: pt.y, key: i });
          // El pin del mapa aparece justo debajo del que cae (mismo lugar), y recién después se va el animado: sin saltos.
          setTimeout(() => { setShown(i + 1); setTracks(true); }, 900);
          setTimeout(() => setDrop(null), 1900);
        }, 1000);
      }, 300 + i * STEP);
    });
    setTimeout(() => {
      fitAll();
      setTimeout(() => setLineOn(true), 800);
      setTimeout(() => { setShown(stops.length); setIntro(false); }, 900);
      router.setParams({ nueva: undefined });
    }, 300 + steps.length * STEP);
  }

  async function participate() {
    // Primero se esconden los locales y recién después llega la ruta del servidor: así nunca se ven antes de la animación.
    setIntro(true);
    setShown(0);
    setLineOn(false);
    try {
      await join.mutateAsync(undefined as never);
      router.setParams({ nueva: '1' });
      await qc.invalidateQueries({ queryKey: ['ruta-participation'] });
      setWelcome(true);
      setTimeout(() => setWelcome(false), 5200);
    } catch (e) {
      setIntro(false);
      setShown(3);
      setLineOn(true);
      Alert.alert('No pudimos anotarte', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  async function submitVisit(code: string): Promise<string | null> {
    if (!visitFor) return null;
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {
      // Sin GPS se avisa con "sin_ubicacion".
    }
    try {
      const r = await mark.mutateAsync({ businessId: visitFor.business_id, code, lat, lng });
      if (r.ok) return null;
      switch (r.reason) {
        case 'codigo_incorrecto': return 'Ese código no es. Revísalo con el local.';
        case 'codigo_de_canjes': return 'Ese es el código de canjes. Para la Ruta, pídele al local el código de la Ruta.';
        case 'lejos': return `Estás a ${r.distance_m ?? 'más de 300'} m del local. Acércate y vuelve a probar.`;
        case 'sin_ubicacion': return 'Necesitamos tu ubicación para confirmar que estás en el local. Actívala en los ajustes del teléfono.';
        case 'ya_marcada': return 'Ya marcaste tu visita en este local.';
        case 'demasiados_intentos': return 'Probaste muchas veces en este local. Escríbenos y lo revisamos.';
        default: return 'Este local todavía no puede confirmar visitas. Escríbenos y lo arreglamos.';
      }
    } catch (e) {
      return friendlyServerError(e, 'No se pudo marcar tu visita. Intenta de nuevo.');
    }
  }

  async function addVisitPhoto(businessId: string) {
    if (!userId || !state) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 5] });
    if (r.canceled) return;
    try {
      await uploadRoutePhoto(userId, state.month, businessId, r.assets[0].uri, r.assets[0].base64);
      qc.invalidateQueries({ queryKey: ['mi-ruta', userId, state.month] });
      celebrate({ kind: 'toast', icon: 'check', title: 'Foto guardada: mírala en "Mis fotos"' });
    } catch (e) {
      Alert.alert('No se pudo subir la foto', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  async function doSwap() {
    if (!swapOut || !swapIn) return;
    try {
      await swap.mutateAsync({ out: swapOut, in: swapIn });
      setSwapOpen(false);
      setSwapOut(null);
      setSwapIn(null);
      setTimeout(() => fitAll(), 400);
    } catch (e) {
      Alert.alert('No se pudo cambiar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  if (isLoading || !state) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {isError ? (
          <>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, textAlign: 'center' }}>No pudimos cargar tu ruta</Text>
            <Press onPress={() => refetch()} style={{ marginTop: 14, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: '#1F7A66' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Reintentar</Text>
            </Press>
          </>
        ) : <ActivityIndicator color={MINT} />}
      </View>
    );
  }

  const rules = (
    <>
      <Section title="CÓMO PARTICIPAR" items={['Toca Participar y abre tu mapa: te tocan 3 locales al azar.', 'Tu ruta es solo tuya. Puedes cambiar 1 local antes de visitarlo (2 si completaste la ruta del mes pasado).']} />
      <Section title="CÓMO CUENTA UNA VISITA" items={['Compra lo que quieras en el local. No necesitas Puntos ni descuentos.', 'Al pagar, pídele al local el código de la Ruta (es distinto del de canjes) y escríbelo. El local confirma tu compra.', '1 visita por local, en el orden que quieras.']} />
      <Section title="PLAZO Y PREMIOS" items={[`Tienes hasta el ${Number(state.ends_on.slice(8, 10))} de ${month}.`, 'Al completar los 3: Día doble y 2 cambios el mes que viene, insignia exclusiva y boleto del sorteo.']} />
    </>
  );

  // Cómo funciona: se abre con el "?" de arriba.
  const rulesModal = (
      <Modal visible={showRules} transparent animationType="slide" onRequestClose={() => setShowRules(false)}>
        <Press accessible={false} feedback="none" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,10,30,0.55)' }} onPress={() => setShowRules(false)}>
          <Press accessible={false} feedback="none" onPress={() => {}} style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: height * 0.85, paddingBottom: insets.bottom + 12 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center', marginTop: 10 }} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 19, textAlign: 'center' }}>Cómo funciona tu Ruta</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <Chip>En el orden que quieras</Chip>
                <Chip>Sin Puntos ni descuentos</Chip>
              </View>
              {rules}
              <Press accessibilityRole="button" onPress={() => setShowRules(false)} style={{ marginTop: 16, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1F7A66' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Entendido</Text>
              </Press>
            </ScrollView>
          </Press>
        </Press>
      </Modal>
  );

  // ---------- Antes de participar: detalle, premios y condiciones ----------
  if (!state.joined) {
    const few = state.eligible_count < 3;
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ height: 250 + insets.top }}>
            <RutaMiniMap places={state.locales} pinSize={30} padBottom={60} mystery />
            <LinearGradient pointerEvents="none" colors={['rgba(22,17,31,0.35)', 'rgba(22,17,31,0)', 'rgba(22,17,31,0.7)', BG]} locations={[0, 0.3, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
            <View style={{ position: 'absolute', left: 20, top: insets.top + 8 }}><Back /></View>
            <Press accessibilityRole="button" accessibilityLabel="Cómo funciona la Ruta" onPress={() => setShowRules(true)} hitSlop={8}
              style={{ position: 'absolute', right: 20, top: insets.top + 8, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,17,31,0.75)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
              <Text allowFontScaling={false} style={{ color: MINT, fontWeight: '900', fontSize: 18 }}>?</Text>
            </Press>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: -40 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <RutaRing size={64} done={3} month={rutaMonthShort(state.month)} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.4, fontSize: 11 }}>EVENTO DEL MES · HASTA EL {Number(state.ends_on.slice(8, 10))}</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 23, lineHeight: 27 }}>Tu Ruta de {month}</Text>
              {/* Arriba y chiquito: cuántas personas ya participan este mes (solo el número). */}
              {participation && participation.participants > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: MINT }} />
                  <Text style={{ color: MINT, fontSize: 12, fontWeight: '800' }}>{participationLabel(participation.participants)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 12 }}>Te tocan 3 locales de tu ciudad al azar. Visítalos, compra lo que quieras y gana:</Text>
          {lastWinners ? <RutaPrizeCard prize={lastWinners} compact /> : null}
          {prize ? <RutaPrizeCard prize={prize} /> : null}
          <Premio icon={<Bubble><Text style={{ color: MINT, ...heavy(), fontSize: 16 }}>x2</Text></Bubble>} title="Día doble" body="Eliges un día del mes que viene y tus pasos valen el doble: hasta 40 Puntos ese día." />
          {/* La insignia del mes es sorpresa: cada mes tiene otra temática y recién se ve al completar la ruta. */}
          <Premio icon={<RutaRing size={46} done={0} mystery glow={false} />} title="Insignia sorpresa del mes" body="Cada mes tiene una temática nueva. Se revela solo cuando completas la ruta." />
          <Premio icon={<Bubble><Svg width={28} height={20} viewBox="0 0 28 20"><Path d="M3 1h22a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6V3a2 2 0 0 1 2-2z" fill="none" stroke={MINT} strokeWidth={2} /><Path d="M19 4v12" stroke={MINT} strokeWidth={1.6} strokeDasharray="2 2" /></Svg></Bubble>} title="Boleto del sorteo" body={prize ? `Entras al sorteo de: ${prize.title}.` : 'Entras al sorteo del mes. El premio se anuncia en Eventos.'} />
          <Premio icon={<Bubble><Text style={{ color: MINT, ...heavy(), fontSize: 17 }}>↻2</Text></Bubble>} title="2 cambios de local" body="El mes que viene puedes cambiar 2 de tus 3 locales, en vez de 1." />
          <Press onPress={() => setShowRules(true)} style={[CARD, { padding: 14, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Cómo funciona</Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>Cómo cuenta una visita, plazos y cambios</Text>
            </View>
            <Text style={{ color: MINT, fontWeight: '800' }}>Ver ›</Text>
          </Press>
          </View>
        </ScrollView>
        {rulesModal}
        {/* El botón va en su propia barra al pie, debajo del contenido (nunca encima del texto). */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <Press accessibilityRole="button" disabled={few || join.isPending} onPress={participate} haptic="light"
            style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: MINT, opacity: few ? 0.5 : 1 }}>
            {join.isPending ? <ActivityIndicator color="#14093a" /> : (
              <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>{few ? 'Pronto: faltan locales' : 'Participar'}</Text>
            )}
          </Press>
        </View>
      </View>
    );
  }

  // ---------- Con ruta: mapa, mis 3 locales, visita y premios ----------
  const first = stops.find((s) => s.lat != null);
  const canSwap = state.swaps_left > 0 && !state.completed_at && stops.some((s) => !s.visit);
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ position: 'absolute', inset: 0 }}>
        {first && Platform.OS === 'web' ? (
          // Vista web: mismo mapa de la ciudad con teselas, los pines y la línea de la ruta.
          <WebCityMap
            {...webView(stops, width, height)}
            overlay={(project) => {
              const vis = stops.slice(0, shown).filter((s) => s.lat != null);
              const webOffs = sideBySide(vis.map((s) => ({ id: s.business_id, ...project(s.lat!, s.lng!) })));
              return (
                <>
                  <RouteLineWeb path={path} on={lineOn} project={project} />
                  {vis.map((s) => {
                    const q = project(P(s).latitude, P(s).longitude);
                    const dx = webOffs.get(s.business_id) ?? 0;
                    return (
                      <View key={s.business_id} style={{ position: 'absolute', left: 0, top: 0 }}>
                        {dx ? <View pointerEvents="none" style={{ position: 'absolute', left: q.x - 5, top: q.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: MINT, borderWidth: 2, borderColor: '#16111f' }} /> : null}
                        <Press accessibilityRole="button" accessibilityLabel={`Ver ${s.name}`} onPress={() => setInfoFor(s)} style={{ position: 'absolute', left: q.x - 31 + dx, top: q.y - 72 }}>
                          <RutaPin name={s.name} logoUrl={s.logo_url} size={46} star={prize?.sponsor?.id === s.business_id} />
                        </Press>
                      </View>
                    );
                  })}
                </>
              );
            }}
          />
        ) : first ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            customMapStyle={DARK_MAP_STYLE}
            initialRegion={{ latitude: first.lat!, longitude: first.lng!, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
            onMapReady={() => (intro ? runIntro() : fitAll(false))}
            onRegionChangeComplete={placePins}
            toolbarEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <RouteLine path={path} on={lineOn} />
            {stops.slice(0, shown).filter((s) => s.lat != null).map((s) => {
              const dx = offs.get(s.business_id) ?? 0;
              return [
                // Si el pin está corrido para no tapar al otro, un puntito marca el lugar exacto del local.
                dx ? (
                  <Marker key={`${s.business_id}-dot`} coordinate={P(s)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={4}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: MINT, borderWidth: 2, borderColor: '#16111f' }} />
                  </Marker>
                ) : null,
                <Marker key={s.business_id} coordinate={P(s)} tracksViewChanges={tracks} anchor={{ x: 0.5 - dx / 62, y: 1 }} zIndex={5}
                  onPress={() => setInfoFor(s)}>
                  <RutaPin name={s.name} logoUrl={s.logo_url} size={46} star={prize?.sponsor?.id === s.business_id} />
                </Marker>,
              ];
            })}
          </MapView>
        ) : <View style={{ flex: 1, backgroundColor: '#1d1b2e' }} />}
        {drop && <DropPin key={drop.key} stop={drop.stop} x={drop.x + (offs.get(drop.stop.business_id) ?? 0)} y={drop.y} />}
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: 'rgba(22,17,31,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Back />
        <Press accessibilityRole="button" accessibilityLabel="Ver mi ruta y mis fotos" onPress={() => router.push({ pathname: '/(tabs)/ruta-mes', params: { m: state.month } })} feedback="none">
          <RutaRing size={46} done={done} month={rutaMonthShort(state.month)} glow={false} themeMonth={state.completed_at ? state.month : null} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.3, fontSize: 10.5 }}>TU RUTA DE {month.toUpperCase()}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{state.completed_at ? '¡Ruta completada!' : `${done} de 3 locales`}</Text>
          {participation && participation.participants > 0 ? (
            <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
              {participation.participants === 1 ? 'Eres la primera persona en la Ruta' : `Tú y ${(participation.participants - 1).toLocaleString('es-BO')} ${participation.participants === 2 ? 'persona' : 'personas'} más en la Ruta`}
            </Text>
          ) : null}
        </View>
        <Press accessibilityRole="button" accessibilityLabel="Cómo funciona la Ruta" onPress={() => setShowRules(true)} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(98,240,182,0.14)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
          <Text allowFontScaling={false} style={{ color: MINT, fontWeight: '900', fontSize: 18 }}>?</Text>
        </Press>
      </View>

      {welcome && participation ? (
        <Animated.View entering={FadeInDown.springify().damping(14)} exiting={FadeOutUp.duration(260)} pointerEvents="none"
          style={{ position: 'absolute', left: 28, right: 28, top: insets.top + 86, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(26,20,38,0.95)', borderWidth: 1.5, borderColor: 'rgba(98,240,182,0.55)' }}>
            <Text style={{ ...heavy(), color: MINT, fontSize: 26 }}>{participation.participants.toLocaleString('es-BO')}</Text>
            <View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>¡Ya estás adentro!</Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>{participation.participants === 1 ? 'Eres la primera persona en la Ruta' : `personas en la Ruta de ${month}`}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Mientras caen los pines el panel no se muestra: el mapa queda libre para la animación. */}
      {!intro && (
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, maxHeight: height * 0.4, borderRadius: 26, backgroundColor: 'rgba(26,20,38,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', overflow: 'hidden' }}>
        {/* Se pliega tocando la barrita: así se ve todo el mapa. */}
        <Press accessibilityRole="button" accessibilityLabel={panelOpen ? 'Bajar el panel' : 'Subir el panel'} onPress={() => setPanelOpen((v) => !v)} feedback="none"
          style={{ alignItems: 'center', paddingTop: 8, paddingBottom: panelOpen ? 2 : 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80' }} />
          {!panelOpen ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5, marginTop: 8 }}>Tus 3 locales · {done} de 3 ▴</Text> : null}
        </Press>
        {panelOpen ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stops.map((s, i) => {
              // Mientras cae cada pin, los locales que todavía no salieron se ven como sorpresa.
              const hidden = i >= shown;
              const st = s.visit === 'confirmed' ? 'ok' : s.visit === 'pending' ? 'wait' : 'go';
              const ring = hidden ? 'rgba(255,255,255,0.2)' : st === 'ok' ? MINT : st === 'wait' ? '#C4B8E8' : 'rgba(255,255,255,0.18)';
              const star = !hidden && prize?.sponsor?.id === s.business_id;
              return (
                <View key={s.business_id} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 18, backgroundColor: st === 'ok' && !hidden ? 'rgba(98,240,182,0.09)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: st === 'ok' && !hidden ? 'rgba(98,240,182,0.35)' : 'rgba(255,255,255,0.07)' }}>
                  <Press accessibilityRole="button" accessibilityLabel={hidden ? 'Local por descubrir' : `Ver la ficha de ${s.name}`} disabled={hidden} onPress={() => setInfoFor(s)} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                    {/* Cuadrado redondeado, como los pines del mapa (no círculo). */}
                    <View style={{ width: 54, height: 54, borderRadius: 15, borderWidth: star ? 3 : 2.5, borderColor: star ? GOLD : ring, overflow: 'hidden', ...(star ? { shadowColor: GOLD, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : null), backgroundColor: hidden ? '#2F1E5C' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                      {hidden ? (
                        <Text allowFontScaling={false} style={{ color: MINT, fontWeight: '900', fontSize: 26 }}>?</Text>
                      ) : s.logo_url ? (
                        <Image cachePolicy="memory-disk" source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 22 }}>{s.name.trim()[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    {!hidden && st === 'ok' ? (
                      <View style={{ position: 'absolute', top: -5, right: '50%', marginRight: -34, width: 22, height: 22, borderRadius: 11, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1a1426' }}>
                        <Text style={{ color: '#14093a', fontWeight: '900', fontSize: 11 }}>✓</Text>
                      </View>
                    ) : null}
                    {star ? (
                      <View style={{ position: 'absolute', top: -5, left: '50%', marginLeft: -34, width: 22, height: 22, borderRadius: 11, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1a1426' }}>
                        <Text style={{ color: '#3a2a00', fontWeight: '900', fontSize: 11 }}>★</Text>
                      </View>
                    ) : null}
                    <Text style={{ color: hidden ? MUTED : '#fff', fontWeight: '800', fontSize: 12.5, marginTop: 6, maxWidth: '100%' }} numberOfLines={1}>{hidden ? 'Por descubrir' : s.name}</Text>
                  </Press>
                  {hidden ? (
                    <Text style={{ color: MUTED, fontWeight: '800', fontSize: 11, marginTop: 4 }}>...</Text>
                  ) : st === 'go' ? (
                    // Acción directa: estando en el local, se marca la visita sin abrir la ficha.
                    <Press accessibilityRole="button" accessibilityLabel={`Marcar visita en ${s.name}`} onPress={() => setVisitFor(s)} haptic="light" hitSlop={6}
                      style={{ marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: MINT }}>
                      <Text allowFontScaling={false} style={{ color: '#14093a', fontWeight: '800', fontSize: 11 }}>Marcar visita</Text>
                    </Press>
                  ) : (
                    <Text style={{ color: st === 'wait' ? '#C4B8E8' : MINT, fontWeight: '800', fontSize: 11, marginTop: 9 }}>{st === 'ok' ? '✓ Visitado' : 'Por confirmar'}</Text>
                  )}
                </View>
              );
            })}
          </View>
          {/* Compartir y cambiar, en una sola fila para que el panel no tape el mapa. */}
          {shown >= stops.length && (stops.some((x) => x.visit) || canSwap) ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {stops.some((x) => x.visit) ? (
                <Press accessibilityRole="button" onPress={() => shareRoute()} haptic="light"
                  style={{ flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(98,240,182,0.12)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
                  <Text style={{ color: MINT, fontWeight: '800', fontSize: 13 }}>Compartir</Text>
                </Press>
              ) : null}
              {stops.some((x) => x.visit) ? (
                <Press accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/ruta-mes', params: { m: state.month } })} haptic="light"
                  style={{ flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(98,240,182,0.12)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
                  <Text style={{ color: MINT, fontWeight: '800', fontSize: 13 }}>📷 Mis fotos</Text>
                </Press>
              ) : null}
              {canSwap ? (
                <Press accessibilityRole="button" onPress={() => setSwapOpen(true)}
                  style={{ flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} numberOfLines={1}>↻ Cambiar</Text>
                  <Text style={{ color: MUTED, fontSize: 10.5 }} numberOfLines={1}>{state.swaps_left === 1 ? 'te queda 1' : `te quedan ${state.swaps_left}`}</Text>
                </Press>
              ) : null}
            </View>
          ) : null}

          {state.completed_at && (
            <View style={[CARD, { padding: 16, marginTop: 12, alignItems: 'center' }]}>
              <RutaRing size={84} done={3} month={rutaMonthShort(state.month)} themeMonth={state.month} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginTop: 10 }}>¡Completaste tu Ruta de {month}!</Text>
              <Text style={{ color: MUTED, fontSize: 12.5, textAlign: 'center', marginTop: 4 }}>
                Ganaste tu insignia{state.ticket_no ? ` y el boleto N.º ${state.ticket_no} del sorteo` : ''}. El mes que viene eliges tu Día doble y tienes 2 cambios de local.
              </Text>
            </View>
          )}

          {prize ? <RutaPrizeCard prize={prize} compact /> : null}
          {lastWinners ? <RutaPrizeCard prize={lastWinners} compact /> : null}

          {state.prev_completed && <DoubleDayPicker value={state.double_day} busy={pickDay.isPending} onPick={async (d) => {
            try { await pickDay.mutateAsync(d); celebrate({ kind: 'sheet', title: '¡Día doble elegido!', body: 'Ese día tus pasos valen el doble.' }); }
            catch (e) { Alert.alert('No se pudo elegir', friendlyServerError(e, 'Intenta de nuevo.')); }
          }} />}
        </ScrollView>
        ) : null}
      </View>
      )}

      {rulesModal}

      <RutaStopSheet stop={infoFor} onClose={() => setInfoFor(null)} onMark={(st) => { setInfoFor(null); setVisitFor(st); }}
        protagonist={!!infoFor && prize?.sponsor?.id === infoFor.business_id} prizeTitle={prize?.title ?? null}
        onShare={(st) => { setInfoFor(null); setTimeout(() => shareRoute(st), 350); }}
        onPhoto={photosReady ? (st) => { setInfoFor(null); setTimeout(() => addVisitPhoto(st.business_id), 350); } : undefined} />

      {/* Tarjeta para historias, fuera de la pantalla (solo se usa para armar la imagen). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -SHARE_SIZE.width * 2, top: 0 }}>
        <View ref={shareRef} collapsable={false} testID="ruta-share-card" style={SHARE_SIZE}>
          <RutaShareCard month={month} monthShort={rutaMonthShort(state.month)} stops={stops} at={shareAt ?? stops.find((x) => x.visit === 'confirmed') ?? null} completed={!!state.completed_at} />
        </View>
      </View>

      <LocalCodeSheet
        visible={!!visitFor}
        businessName={visitFor?.name ?? ''}
        logoUrl={visitFor?.logo_url}
        category={visitFor?.category}
        benefitName={`Ruta de ${month}`}
        costPoints={0}
        free
        copy={{ tag: 'Sin Puntos', title: 'Pídele el código de la Ruta', body: 'Compra lo que quieras y escribe los 4 números del código de la Ruta (no el de canjes). El local confirma tu compra y tu visita cuenta.', action: 'Marcar mi visita', done: '¡Visita marcada!' }}
        onClose={() => setVisitFor(null)}
        onSubmit={submitVisit}
        onSuccess={() => {
          const stop = visitFor;
          setVisitFor(null);
          // Foto de la visita (opcional): se ve al tocar tu insignia de la ruta en el perfil.
          setTimeout(() => {
            if (!photosReady) {
              Alert.alert('¡Visita marcada!', 'Cuando el local confirme tu compra, se llena tu anillo.');
              return;
            }
            Alert.alert('¡Visita marcada!', 'Cuando el local confirme tu compra, se llena tu anillo. ¿Guardas una foto de tu visita?', [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Agregar foto', onPress: () => stop && addVisitPhoto(stop.business_id) },
            ]);
          }, 450);
        }}
      />

      <Modal visible={swapOpen} transparent animationType="slide" onRequestClose={() => setSwapOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <View style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center', marginBottom: 14 }} />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' }}>Cambiar un local</Text>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>{state.swaps_left === 1 ? 'Te queda 1 cambio este mes' : `Te quedan ${state.swaps_left} cambios este mes`}</Text>
            <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.2, fontSize: 11, marginTop: 16, textAlign: 'center' }}>¿CUÁL QUITAS?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {stops.filter((s) => !s.visit).map((s) => (
                <Choice key={s.business_id} name={s.name} logo={s.logo_url} on={swapOut === s.business_id} onPress={() => setSwapOut(s.business_id)} />
              ))}
            </View>
            <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.2, fontSize: 11, marginTop: 16, textAlign: 'center' }}>ELIGE EL NUEVO</Text>
            {options.isLoading ? <ActivityIndicator color={MINT} style={{ marginTop: 10 }} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {(options.data ?? []).map((o) => (
                  <Choice key={o.business_id} fill={false} name={o.name} logo={o.logo_url} on={swapIn === o.business_id} onPress={() => setSwapIn(o.business_id)} />
                ))}
                {(options.data ?? []).length === 0 && <Text style={{ color: MUTED, fontSize: 13 }}>No hay otros locales para elegir por ahora.</Text>}
              </ScrollView>
            )}
            <Press disabled={!swapOut || !swapIn || swap.isPending} onPress={doSwap}
              style={{ marginTop: 16, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1F7A66', opacity: !swapOut || !swapIn ? 0.5 : 1 }}>
              {swap.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Cambiar</Text>}
            </Press>
            <Text style={{ color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 10 }}>Los locales que ya visitaste no se pueden cambiar.</Text>
            <Press onPress={() => setSwapOpen(false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: MUTED, fontWeight: '800' }}>Ahora no</Text>
            </Press>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Choice({ name, logo, on, onPress, fill = true }: { name: string; logo: string | null; on: boolean; onPress: () => void; fill?: boolean }) {
  return (
    <Press accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} haptic="selection"
      style={{ ...(fill ? { flex: 1 } : { width: 104 }), alignItems: 'center', paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, borderColor: on ? MINT : 'transparent', backgroundColor: on ? 'rgba(98,240,182,0.12)' : 'rgba(255,255,255,0.05)' }}>
      <RutaPin name={name} logoUrl={logo} size={36} route={false} />
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11.5 }} numberOfLines={1}>{name}</Text>
    </Press>
  );
}

// Día doble: quien completó la ruta del mes pasado elige un día de este mes (hoy o después).
function DoubleDayPicker({ value, busy, onPick }: { value: string | null; busy: boolean; onPick: (day: string) => void }) {
  const [now] = useState(() => new Date(Date.now() - 4 * 3600e3)); // hora de Bolivia
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = now.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const [sel, setSel] = useState<number | null>(value ? Number(value.slice(8, 10)) : null);
  const locked = !!value && Number(value.slice(8, 10)) <= today;
  return (
    <View style={[CARD, { padding: 14, marginTop: 12 }]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Tu Día doble</Text>
      <Text style={{ color: MUTED, fontSize: 12.5, marginTop: 2 }}>
        {locked ? `Es el ${Number(value!.slice(8, 10))}: ese día tus pasos valen el doble.` : 'Ganaste un Día doble por completar tu ruta. Elige el día.'}
      </Text>
      {!locked && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {Array.from({ length: last - today + 1 }, (_, i) => today + i).map((d) => (
              <Press key={d} onPress={() => setSel(d)} haptic="selection"
                style={{ width: 40, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: sel === d ? MINT : 'rgba(255,255,255,0.06)' }}>
                <Text style={{ color: sel === d ? '#14093a' : '#fff', fontWeight: '800', fontSize: 13 }}>{d}</Text>
              </Press>
            ))}
          </View>
          <Press disabled={!sel || busy} onPress={() => sel && onPick(iso(sel))}
            style={{ marginTop: 12, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1F7A66', opacity: sel ? 1 : 0.5 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>{sel ? `Usar el ${sel}` : 'Elige un día'}</Text>}
          </Press>
        </>
      )}
    </View>
  );
}


function Chip({ children }: { children: string }) {
  return (
    <View style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(98,240,182,0.12)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
      <Text style={{ color: MINT, fontWeight: '800', fontSize: 11.5 }}>{children}</Text>
    </View>
  );
}

// Pin que cae desde arriba: entra con un fundido, acelera al caer, se aplasta un poco al tocar el piso y vuelve a su forma
// con un rebote corto. La sombra crece mientras se acerca y queda una onda en el piso. Después lo reemplaza el pin del mapa.
function DropPin({ stop, x, y }: { stop: RutaStop; x: number; y: number }) {
  const fall = useSharedValue(0);
  const squash = useSharedValue(0);
  const ring = useSharedValue(0);
  const label = useSharedValue(0);
  useEffect(() => {
    fall.value = withTiming(1, { duration: 560, easing: Easing.in(Easing.quad) });
    squash.value = withDelay(560, withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 13, stiffness: 220, mass: 0.7 }),
    ));
    ring.value = withDelay(560, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    label.value = withDelay(700, withSequence(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }), withDelay(820, withTiming(0, { duration: 240 }))));
  }, [fall, squash, ring, label]);
  const pinStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, fall.value * 4),
    transform: [
      { translateY: (1 - fall.value) * -240 },
      // Se aplasta desde la punta (el ancla está abajo).
      { translateY: squash.value * 6 },
      { scaleX: 1 + squash.value * 0.14 },
      { scaleY: 1 - squash.value * 0.16 },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: 0.15 + fall.value * 0.35, transform: [{ scaleX: 0.4 + fall.value * 0.6 + squash.value * 0.15 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value <= 0 ? 0 : (1 - ring.value) * 0.9, transform: [{ scale: 0.5 + ring.value * 1.8 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: label.value, transform: [{ translateY: (1 - label.value) * 10 }, { scale: 0.92 + label.value * 0.08 }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <Animated.View style={[{ position: 'absolute', left: x - 18, top: y - 5, width: 36, height: 10, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)' }, shadowStyle]} />
      <Animated.View style={[{ position: 'absolute', left: x - 30, top: y - 12, width: 60, height: 24, borderRadius: 30, borderWidth: 2, borderColor: MINT }, ringStyle]} />
      <Animated.View style={[{ position: 'absolute', left: x - 31, top: y - 72 }, pinStyle]}>
        <RutaPin name={stop.name} logoUrl={stop.logo_url} size={46} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: x - 90, width: 180, top: y + 16, alignItems: 'center' }, labelStyle]}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(26,20,38,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' }}>
          <Text style={{ color: MINT, fontWeight: '800', fontSize: 10.5, letterSpacing: 1.2 }}>TE TOCÓ</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{stop.name}</Text>
          {!!stop.category && <Text style={{ color: MUTED, fontSize: 11.5 }}>{stop.category}</Text>}
        </View>
      </Animated.View>
    </View>
  );
}

// Vista web: el mayor zoom en el que entran los 3 locales entre la barra de arriba y el panel de abajo.
function webView(stops: RutaStop[], w: number, h: number) {
  const pts = stops.filter((s) => s.lat != null && s.lng != null);
  const lats = pts.map((s) => s.lat!);
  const lngs = pts.map((s) => s.lng!);
  const top = 150, bottom = 330;
  const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  let zoom = 17;
  for (; zoom > 12; zoom--) {
    const scale = (256 * 2 ** zoom) / (2 * Math.PI);
    const dx = ((Math.max(...lngs) - Math.min(...lngs)) * Math.PI / 180) * scale;
    const dy = (merc(Math.max(...lats)) - merc(Math.min(...lats))) * scale;
    if (dx <= w - 120 && dy <= h - top - bottom - 70) break;
  }
  // El centro se corre hacia abajo para que los pines queden en el hueco libre del medio.
  const scale = (256 * 2 ** zoom) / (2 * Math.PI);
  const midY = (merc(Math.max(...lats)) + merc(Math.min(...lats))) / 2 - ((bottom - top) / 2) / scale;
  const lat = (2 * Math.atan(Math.exp(midY)) - Math.PI / 2) * 180 / Math.PI;
  return { zoom, center: { lat, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 } };
}

function sameOffs(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (Math.abs((b.get(k) ?? 0) - v) > 1) return false;
  return true;
}
