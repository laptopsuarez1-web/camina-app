import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { uploadRoutePhoto } from '@/hooks/useBadges';
import { useAuthStore } from '@/store/useAuthStore';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { LocalCodeSheet } from '@/components/LocalCodeSheet';
import { RutaRing } from '@/components/ruta/RutaRing';
import { RutaBadge, RutaPin } from '@/components/ruta/RutaPin';
import { RutaMiniMap } from '@/components/ruta/RutaMiniMap';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { friendlyServerError } from '@/lib/errors';
import { celebrate } from '@/store/useCelebrationStore';
import {
  rutaDone, rutaMonthName, rutaMonthShort, useJoinRuta, useMarkRutaVisit, usePickDoubleDay, useRuta, useRutaSwapOptions, useSwapRuta,
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
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ nueva?: string }>();
  const { data: state, isLoading, isError, refetch } = useRuta();
  const userId = useAuthStore((st) => st.session?.user.id);
  const join = useJoinRuta();
  const swap = useSwapRuta();
  const mark = useMarkRutaVisit();
  const pickDay = usePickDoubleDay();
  const [showRules, setShowRules] = useState(false);
  const [visitFor, setVisitFor] = useState<RutaStop | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapOut, setSwapOut] = useState<string | null>(null);
  const [swapIn, setSwapIn] = useState<string | null>(null);
  const options = useRutaSwapOptions(swapOpen);
  const mapRef = useRef<MapView>(null);
  // Animación de llegada: la cámara va a cada local, cae su pin y al final se ven los 3 unidos.
  const [shown, setShown] = useState(params.nueva ? 0 : 3);
  const [lineOn, setLineOn] = useState(!params.nueva);
  const [tracks, setTracks] = useState(true);
  const [drop, setDrop] = useState<{ stop: RutaStop; x: number; y: number; key: number } | null>(null);

  const stops = useMemo(() => state?.stops ?? [], [state]);
  const done = rutaDone(state);
  const month = state ? rutaMonthName(state.month) : '';
  const ordered = useMemo(() => lineOrder(stops), [stops]);

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, [shown, stops.length]);

  function fitAll(animated = true) {
    const coords = stops.filter((s) => s.lat != null).map((s) => ({ latitude: s.lat!, longitude: s.lng! }));
    if (coords.length) mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 140, right: 60, bottom: 60, left: 60 }, animated });
  }

  // Línea de la ruta que se va dibujando (cantidad de puntos visibles del recorrido).
  const [linePts, setLinePts] = useState<{ latitude: number; longitude: number }[] | null>(null);
  function drawLine() {
    const pts = ordered.map((s) => ({ latitude: s.lat!, longitude: s.lng! }));
    if (pts.length < 2) return;
    // Se interpola cada tramo en pasos chicos para que la línea "crezca" de un local al otro.
    const dense: { latitude: number; longitude: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < 12; k++) {
        const t = k / 12;
        dense.push({ latitude: pts[i].latitude + (pts[i + 1].latitude - pts[i].latitude) * t, longitude: pts[i].longitude + (pts[i + 1].longitude - pts[i].longitude) * t });
      }
    }
    dense.push(pts[pts.length - 1]);
    let n = 2;
    setLinePts(dense.slice(0, n));
    const id = setInterval(() => {
      n += 1;
      setLinePts(dense.slice(0, n));
      if (n >= dense.length) { clearInterval(id); setLinePts(null); setLineOn(true); }
    }, 45);
  }

  function runIntro() {
    if (!stops.length) return;
    const steps = stops.filter((s) => s.lat != null);
    const STEP = 2300;
    steps.forEach((s, i) => {
      setTimeout(() => {
        mapRef.current?.animateCamera({ center: { latitude: s.lat!, longitude: s.lng! }, zoom: 17 }, { duration: 900 });
        setTimeout(async () => {
          const pt = await mapRef.current?.pointForCoordinate({ latitude: s.lat!, longitude: s.lng! });
          if (pt) setDrop({ stop: s, x: pt.x, y: pt.y, key: i });
          setTimeout(() => { setShown(i + 1); setTracks(true); }, 650);
          setTimeout(() => setDrop(null), 1700);
        }, 950);
      }, 300 + i * STEP);
    });
    setTimeout(() => {
      fitAll();
      setTimeout(drawLine, 700);
      router.setParams({ nueva: undefined });
    }, 300 + steps.length * STEP);
  }

  async function participate() {
    try {
      await join.mutateAsync(undefined as never);
      setShown(0);
      setLineOn(false);
      router.setParams({ nueva: '1' });
    } catch (e) {
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
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 5], base64: true });
    if (r.canceled) return;
    try {
      await uploadRoutePhoto(userId, state.month, businessId, r.assets[0].uri, r.assets[0].base64);
      celebrate({ kind: 'toast', icon: 'check', title: 'Foto guardada en tu ruta' });
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
      <Section title="CÓMO CUENTA UNA VISITA" items={['Compra lo que quieras en el local. No necesitas Puntos ni descuentos.', 'Al pagar, escribe el código del local. El local confirma tu compra.', '1 visita por local, en el orden que quieras.']} />
      <Section title="PLAZO Y PREMIOS" items={[`Tienes hasta el ${Number(state.ends_on.slice(8, 10))} de ${month}.`, 'Al completar los 3: Día doble y 2 cambios el mes que viene, insignia exclusiva y boleto del sorteo.']} />
    </>
  );

  // ---------- Antes de participar: detalle, premios y condiciones ----------
  if (!state.joined) {
    const few = state.eligible_count < 3;
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ height: 250 + insets.top }}>
            <RutaMiniMap places={state.locales} pinSize={30} padBottom={60} />
            <LinearGradient pointerEvents="none" colors={['rgba(22,17,31,0.35)', 'rgba(22,17,31,0)', 'rgba(22,17,31,0.7)', BG]} locations={[0, 0.3, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
            <View style={{ position: 'absolute', left: 20, top: insets.top + 8 }}><Back /></View>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: -40 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <RutaRing size={64} done={3} month={rutaMonthShort(state.month)} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.4, fontSize: 11 }}>EVENTO DEL MES · HASTA EL {Number(state.ends_on.slice(8, 10))}</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 23, lineHeight: 27 }}>Tu Ruta de {month}</Text>
            </View>
          </View>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 12 }}>Te tocan 3 locales de tu ciudad al azar. Visítalos, compra lo que quieras y gana:</Text>
          <Premio icon={<Bubble><Text style={{ color: MINT, ...heavy(), fontSize: 16 }}>x2</Text></Bubble>} title="Día doble" body="Eliges un día del mes que viene y tus pasos valen el doble: hasta 40 Puntos ese día." />
          <Premio icon={<RutaRing size={46} done={3} month={rutaMonthShort(state.month)} glow={false} />} title={`Insignia de ${month}`} body="Exclusiva: solo la tiene quien completa esta ruta." />
          <Premio icon={<Bubble><Svg width={28} height={20} viewBox="0 0 28 20"><Path d="M3 1h22a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6V3a2 2 0 0 1 2-2z" fill="none" stroke={MINT} strokeWidth={2} /><Path d="M19 4v12" stroke={MINT} strokeWidth={1.6} strokeDasharray="2 2" /></Svg></Bubble>} title="Boleto del sorteo" body="Entras al sorteo del mes. El premio se anuncia en Eventos." />
          <Premio icon={<Bubble><Text style={{ color: MINT, ...heavy(), fontSize: 17 }}>↻2</Text></Bubble>} title="2 cambios de local" body="El mes que viene puedes cambiar 2 de tus 3 locales, en vez de 1." />
          {showRules ? rules : (
            <Press onPress={() => setShowRules(true)} style={[CARD, { padding: 14, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Condiciones del evento</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Cómo cuenta una visita, plazos y cambios</Text>
              </View>
              <Text style={{ color: MINT, fontWeight: '800' }}>Ver ›</Text>
            </Press>
          )}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
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
  const linePath = linePts ?? (lineOn ? ordered.map((s) => ({ latitude: s.lat!, longitude: s.lng! })) : []);
  const canSwap = state.swaps_left > 0 && !state.completed_at && stops.some((s) => !s.visit);
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ position: 'absolute', inset: 0 }}>
        {first ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            customMapStyle={DARK_MAP_STYLE}
            initialRegion={{ latitude: first.lat!, longitude: first.lng!, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
            onMapReady={() => (params.nueva ? runIntro() : fitAll(false))}
            toolbarEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {linePath.length > 1 && <Polyline coordinates={linePath} strokeColor={MINT} strokeWidth={5} />}
            {stops.slice(0, shown).filter((s) => s.lat != null).map((s) => (
              <Marker key={s.business_id} coordinate={{ latitude: s.lat!, longitude: s.lng! }} tracksViewChanges={tracks} anchor={{ x: 0.5, y: 1 }}
                onPress={() => !s.visit && setVisitFor(s)}>
                <RutaPin name={s.name} logoUrl={s.logo_url} size={46} />
              </Marker>
            ))}
          </MapView>
        ) : <View style={{ flex: 1, backgroundColor: '#1d1b2e' }} />}
        {drop && <DropPin key={drop.key} stop={drop.stop} x={drop.x} y={drop.y} />}
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: 'rgba(22,17,31,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Back />
        <RutaRing size={46} done={done} month={rutaMonthShort(state.month)} glow={false} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.3, fontSize: 10.5 }}>TU RUTA DE {month.toUpperCase()}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{state.completed_at ? '¡Ruta completada!' : `${done} de 3 locales`}</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, maxHeight: height * 0.55, borderRadius: 26, backgroundColor: 'rgba(26,20,38,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' }}>
        <ScrollView contentContainerStyle={{ padding: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {stops.map((s) => {
              const st = s.visit === 'confirmed' ? 'ok' : s.visit === 'pending' ? 'wait' : 'go';
              return (
                <Press key={s.business_id} accessibilityRole="button" disabled={st !== 'go'} onPress={() => setVisitFor(s)} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 13, borderWidth: 2.5, borderColor: st === 'ok' ? MINT : st === 'wait' ? MUTED : 'rgba(255,255,255,0.25)', overflow: 'hidden', backgroundColor: '#fff' }}>
                    {s.logo_url ? <Image source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} /> : null}
                  </View>
                  <RutaBadge size={20} style={{ top: -4, right: '50%', marginRight: -32 }} />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 6 }} numberOfLines={1}>{s.name}</Text>
                  <Text style={{ color: st === 'ok' ? MINT : st === 'wait' ? MUTED : MINT, fontWeight: '800', fontSize: 10.5, marginTop: 1 }}>
                    {st === 'ok' ? '✓ Visitado' : st === 'wait' ? 'Por confirmar' : 'Marcar visita ›'}
                  </Text>
                </Press>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <Chip>En el orden que quieras</Chip>
            <Chip>Sin Puntos ni descuentos</Chip>
          </View>
          {canSwap && (
            <Press onPress={() => setSwapOpen(true)} style={{ alignItems: 'center', paddingTop: 12 }}>
              <Text style={{ color: MINT, fontWeight: '800', fontSize: 13 }}>↻ Cambiar un local · {state.swaps_left === 1 ? 'te queda 1 cambio' : `te quedan ${state.swaps_left} cambios`}</Text>
            </Press>
          )}

          {state.completed_at && (
            <View style={[CARD, { padding: 16, marginTop: 12, alignItems: 'center' }]}>
              <RutaRing size={84} done={3} month={rutaMonthShort(state.month)} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginTop: 10 }}>¡Completaste tu Ruta de {month}!</Text>
              <Text style={{ color: MUTED, fontSize: 12.5, textAlign: 'center', marginTop: 4 }}>
                Ganaste tu insignia{state.ticket_no ? ` y el boleto N.º ${state.ticket_no} del sorteo` : ''}. El mes que viene eliges tu Día doble y tienes 2 cambios de local.
              </Text>
            </View>
          )}

          {state.prev_completed && <DoubleDayPicker value={state.double_day} busy={pickDay.isPending} onPick={async (d) => {
            try { await pickDay.mutateAsync(d); celebrate({ kind: 'sheet', title: '¡Día doble elegido!', body: 'Ese día tus pasos valen el doble.' }); }
            catch (e) { Alert.alert('No se pudo elegir', friendlyServerError(e, 'Intenta de nuevo.')); }
          }} />}

          {showRules ? rules : (
            <Press onPress={() => setShowRules(true)} style={{ paddingTop: 12, alignItems: 'center' }}>
              <Text style={{ color: MUTED, fontWeight: '800', fontSize: 12.5 }}>Condiciones del evento ›</Text>
            </Press>
          )}
        </ScrollView>
      </View>

      <LocalCodeSheet
        visible={!!visitFor}
        businessName={visitFor?.name ?? ''}
        logoUrl={visitFor?.logo_url}
        category={visitFor?.category}
        benefitName={`Ruta de ${month}`}
        costPoints={0}
        free
        copy={{ tag: 'Sin Puntos', title: 'Pídele al local su código', body: 'Compra lo que quieras y escribe los 4 números. El local confirma tu compra y tu visita cuenta.', action: 'Marcar mi visita', done: '¡Visita marcada!' }}
        onClose={() => setVisitFor(null)}
        onSubmit={submitVisit}
        onSuccess={() => {
          const stop = visitFor;
          setVisitFor(null);
          // Foto de la visita (opcional): se ve al tocar tu insignia de la ruta en el perfil.
          setTimeout(() => {
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                {(options.data ?? []).map((o) => (
                  <View key={o.business_id} style={{ width: 104 }}>
                    <Choice name={o.name} logo={o.logo_url} on={swapIn === o.business_id} onPress={() => setSwapIn(o.business_id)} />
                  </View>
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

function Choice({ name, logo, on, onPress }: { name: string; logo: string | null; on: boolean; onPress: () => void }) {
  return (
    <Press accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} haptic="selection"
      style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, borderColor: on ? MINT : 'transparent', backgroundColor: on ? 'rgba(98,240,182,0.12)' : 'rgba(255,255,255,0.05)' }}>
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

// Pin que cae desde arriba con rebote, deja una onda en el piso y muestra "Te tocó …". Después lo reemplaza el pin del mapa.
function DropPin({ stop, x, y }: { stop: RutaStop; x: number; y: number }) {
  const fall = useSharedValue(-520);
  const ring = useSharedValue(0);
  const label = useSharedValue(0);
  useEffect(() => {
    fall.value = withSpring(0, { damping: 9, stiffness: 140, mass: 0.9 });
    ring.value = withDelay(330, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    label.value = withDelay(450, withSequence(withTiming(1, { duration: 260 }), withDelay(800, withTiming(0, { duration: 220 }))));
  }, [fall, ring, label]);
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: fall.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.9, transform: [{ scale: 0.5 + ring.value * 1.8 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: label.value, transform: [{ translateY: (1 - label.value) * 10 }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
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
