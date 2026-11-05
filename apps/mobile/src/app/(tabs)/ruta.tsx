import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { ChevronLeft, Check } from '@/components/icons';
import { LocalCodeSheet } from '@/components/LocalCodeSheet';
import { RutaRing } from '@/components/ruta/RutaRing';
import { RutaPin } from '@/components/ruta/RutaPin';
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

  function runIntro() {
    if (!stops.length) return;
    const steps = stops.filter((s) => s.lat != null);
    steps.forEach((s, i) => {
      setTimeout(() => {
        mapRef.current?.animateCamera({ center: { latitude: s.lat!, longitude: s.lng! }, zoom: 17 }, { duration: 900 });
        setTimeout(() => { setShown(i + 1); setTracks(true); }, 700);
      }, 400 + i * 2200);
    });
    setTimeout(() => { fitAll(); setLineOn(true); router.setParams({ nueva: undefined }); }, 400 + steps.length * 2200);
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
      <Section title="CÓMO PARTICIPAR" items={['Toca Participar y abre tu mapa: te tocan 3 locales al azar.', 'Tu ruta es solo tuya. Puedes cambiar 1 local, antes de visitarlo.']} />
      <Section title="CÓMO CUENTA UNA VISITA" items={['Compra lo que quieras en el local. No necesitas Puntos ni descuentos.', 'Al pagar, escribe el código del local. El local confirma tu compra.', '1 visita por local, en el orden que quieras.']} />
      <Section title="PLAZO Y PREMIOS" items={[`Tienes hasta el ${Number(state.ends_on.slice(8, 10))} de ${month}.`, 'Al completar los 3: Día doble el mes que viene, insignia exclusiva y boleto del sorteo.']} />
    </>
  );

  // ---------- Antes de participar: detalle, premios y condiciones ----------
  if (!state.joined) {
    const few = state.eligible_count < 3;
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 120 }}>
          <Back />
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 16 }}>
            <RutaRing size={64} done={3} month={rutaMonthShort(state.month)} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.4, fontSize: 11 }}>EVENTO DEL MES · HASTA EL {Number(state.ends_on.slice(8, 10))}</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 23, lineHeight: 27 }}>Tu Ruta de {month}</Text>
            </View>
          </View>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 12 }}>Te tocan 3 locales de tu ciudad al azar. Visítalos, compra lo que quieras y gana:</Text>
          <Premio icon={<Bubble><Text style={{ color: MINT, ...heavy(), fontSize: 16 }}>x2</Text></Bubble>} title="Día doble" body="Eliges un día del mes que viene y tus pasos valen el doble: hasta 40 Puntos ese día." />
          <Premio icon={<RutaRing size={46} done={3} month={rutaMonthShort(state.month)} glow={false} />} title={`Insignia de ${month}`} body="Exclusiva: solo la tiene quien completa esta ruta." />
          <Premio icon={<Bubble><Text style={{ color: MINT, fontWeight: '800', fontSize: 11 }}>BOLETO</Text></Bubble>} title="Boleto del sorteo" body="Entras al sorteo del mes. El premio se anuncia en Eventos." />
          {showRules ? rules : (
            <Press onPress={() => setShowRules(true)} style={[CARD, { padding: 14, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Condiciones del evento</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Cómo cuenta una visita, plazos y cambios</Text>
              </View>
              <Text style={{ color: MINT, fontWeight: '800' }}>Ver ›</Text>
            </Press>
          )}
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
  const canSwap = state.swaps_left > 0 && !state.completed_at && stops.some((s) => !s.visit);
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ height: Math.round(height * 0.5) }}>
        {first ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            customMapStyle={DARK_MAP_STYLE}
            initialRegion={{ latitude: first.lat!, longitude: first.lng!, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            onMapReady={() => (params.nueva ? runIntro() : fitAll(false))}
            toolbarEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {lineOn && ordered.length > 1 && (
              <Polyline coordinates={ordered.map((s) => ({ latitude: s.lat!, longitude: s.lng! }))} strokeColor={MINT} strokeWidth={4} lineDashPattern={[2, 10]} />
            )}
            {stops.slice(0, shown).filter((s) => s.lat != null).map((s) => (
              <Marker key={s.business_id} coordinate={{ latitude: s.lat!, longitude: s.lng! }} tracksViewChanges={tracks} anchor={{ x: 0.5, y: 1 }}
                onPress={() => !s.visit && setVisitFor(s)}>
                <RutaPin name={s.name} logoUrl={s.logo_url} size={44} />
              </Marker>
            ))}
          </MapView>
        ) : <View style={{ flex: 1, backgroundColor: '#1d1b2e' }} />}
        <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: 'rgba(22,17,31,0.85)' }}>
          <Back />
          <RutaRing size={46} done={done} month={rutaMonthShort(state.month)} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 1.3, fontSize: 10.5 }}>TU RUTA DE {month.toUpperCase()}</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{state.completed_at ? '¡Ruta completada!' : `${done} de 3 locales`}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <View style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(98,240,182,0.12)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)', marginBottom: 12 }}>
          <Text style={{ color: MINT, fontWeight: '800', fontSize: 12.5 }}>Sin orden: visítalos como quieras</Text>
        </View>
        <View style={[CARD, { paddingHorizontal: 14, paddingVertical: 4 }]}>
          {stops.map((s, i) => (
            <View key={s.business_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <RutaPin name={s.name} logoUrl={s.logo_url} size={38} route={!!s.visit} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{s.name}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }} numberOfLines={1}>{s.address ?? s.category ?? ''}</Text>
              </View>
              {s.visit === 'confirmed' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={14} color={MINT} /><Text style={{ color: MINT, fontWeight: '800', fontSize: 12.5 }}>Visitado</Text></View>
              ) : s.visit === 'pending' ? (
                <Text style={{ color: MUTED, fontWeight: '800', fontSize: 12.5 }}>Por confirmar</Text>
              ) : (
                <Press accessibilityRole="button" onPress={() => setVisitFor(s)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1F7A66' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Marcar visita</Text>
                </Press>
              )}
            </View>
          ))}
        </View>
        {canSwap && (
          <Press onPress={() => setSwapOpen(true)} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: MINT, fontWeight: '800', fontSize: 13.5 }}>↻ Cambiar un local · te queda 1 cambio</Text>
          </Press>
        )}

        {state.completed_at && (
          <View style={[CARD, { padding: 16, marginTop: 12, alignItems: 'center' }]}>
            <RutaRing size={92} done={3} month={rutaMonthShort(state.month)} />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, marginTop: 10 }}>¡Completaste tu Ruta de {month}!</Text>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Ganaste tu insignia{state.ticket_no ? ` y el boleto N.º ${state.ticket_no} del sorteo` : ''}. El mes que viene eliges tu Día doble.
            </Text>
          </View>
        )}

        {state.prev_completed && <DoubleDayPicker value={state.double_day} busy={pickDay.isPending} onPick={async (d) => {
          try { await pickDay.mutateAsync(d); celebrate({ kind: 'sheet', title: '¡Día doble elegido!', body: 'Ese día tus pasos valen el doble.' }); }
          catch (e) { Alert.alert('No se pudo elegir', friendlyServerError(e, 'Intenta de nuevo.')); }
        }} />}

        {showRules ? rules : (
          <Press onPress={() => setShowRules(true)} style={[CARD, { padding: 14, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Condiciones del evento</Text>
            <Text style={{ color: MINT, fontWeight: '800' }}>Ver ›</Text>
          </Press>
        )}
      </ScrollView>

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
          setVisitFor(null);
          celebrate({ kind: 'sheet', title: '¡Visita marcada!', body: 'Cuando el local confirme tu compra, se llena tu anillo.' });
        }}
      />

      <Modal visible={swapOpen} transparent animationType="slide" onRequestClose={() => setSwapOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <View style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center', marginBottom: 14 }} />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' }}>Cambiar un local</Text>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>Tienes 1 cambio este mes</Text>
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

