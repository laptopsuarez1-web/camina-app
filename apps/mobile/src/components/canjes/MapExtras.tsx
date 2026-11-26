// Eventos y lugares de Pasos dobles (x2) en el mapa de Canjes (0133).
// Evento: pin REDONDO lila con el Baifo festejando (los comercios siguen con su pin cuadrado).
// Lugar x2: el mismo pin de logo que los comercios, con borde menta, etiqueta "x2" y la zona dibujada.
import { useEffect, useState } from 'react';
import { View, Image, Animated, PanResponder } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronRight, X, Ticket, MapPin } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useLatest } from '@/hooks/useLatest';
import { MapMarker, PIN_PAD, pinSize, useLogoReady, formatDistance, MAX_SHOWN_DISTANCE_M, type LatLng } from '@/components/canjes/parts';
import { boliviaDate, boliviaTime, MONTHS } from '@/lib/promo';
import type { MapEvent } from '@/hooks/useMapEvents';
import type { BoostPlace } from '@/hooks/useBoosts';

export const EVENT_LILAC = colors.purpleSoft;
const BAIFO = require('@/../assets/baifo/festeja.webp');

// ---------- Pin de evento ----------
const EV_HEAD = 44;
const EV_W = EV_HEAD + PIN_PAD * 2;
const EV_H = EV_HEAD + 9 + PIN_PAD * 2;

export function EventPin() {
  return (
    <View style={{ width: EV_W, height: EV_H, alignItems: 'center', paddingTop: PIN_PAD }}>
      <View style={{ width: EV_HEAD, height: EV_HEAD, borderRadius: EV_HEAD / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
        <View style={{ width: EV_HEAD - 6, height: EV_HEAD - 6, borderRadius: (EV_HEAD - 6) / 2, backgroundColor: EVENT_LILAC, overflow: 'hidden', alignItems: 'center' }}>
          <Image source={BAIFO} fadeDuration={0} resizeMode="contain" style={{ width: 30, height: 44, marginTop: 1 }} />
        </View>
      </View>
      <View style={{ marginTop: -2, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' }} />
    </View>
  );
}

export function EventMarker({ event, coordinate, onPress }: { event: MapEvent; coordinate?: LatLng; onPress?: () => void }) {
  // La imagen es local: se deja actualizar un momento para que el Baifo quede "fotografiado" y después se congela.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker
      coordinate={coordinate ?? { latitude: event.lat, longitude: event.lng }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: (EV_H - PIN_PAD) / EV_H }}
      zIndex={3}
      stopPropagation
      onPress={onPress}
      accessibilityLabel={`Evento: ${event.title}`}
    >
      <EventPin />
    </Marker>
  );
}

// ---------- Lugar x2 ----------
export function BoostMarker({ place, coordinate, onPress }: { place: BoostPlace; coordinate?: LatLng; onPress?: () => void }) {
  const [tracking, setTracking] = useState(true);
  const [painted, setPainted] = useState(false);
  const { w, h } = pinSize(true);
  const logo = useLogoReady(place.logo_url);
  useEffect(() => {
    if (logo === 'wait') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mismo criterio que BusinessMarker: se vuelve a "fotografiar" el pin cuando cambia el logo
    setTracking(true);
    const t = setTimeout(() => setTracking(false), logo === 'ok' ? (painted ? 500 : 20000) : 600);
    return () => clearTimeout(t);
  }, [logo, painted]);
  if (place.logo_url && logo === 'wait') return null;
  return (
    <Marker
      coordinate={coordinate ?? { latitude: place.lat, longitude: place.lng }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: (h - PIN_PAD) / h }}
      zIndex={4}
      stopPropagation
      onPress={onPress}
      accessibilityLabel={`${place.name}: pasos dobles`}
    >
      <View style={{ width: w, height: h }}>
        <MapMarker name={place.name} category="Compras" logoUrl={logo === 'ok' ? place.logo_url : null} featured ringColor={colors.mint} badge="x2" onLoaded={() => setPainted(true)} />
      </View>
    </Marker>
  );
}

export function BoostZone({ place }: { place: BoostPlace }) {
  return (
    <Circle
      center={{ latitude: place.lat, longitude: place.lng }}
      radius={place.radius_m}
      strokeColor="rgba(98,240,182,0.75)"
      fillColor="rgba(98,240,182,0.13)"
      strokeWidth={2}
      lineDashPattern={[8, 6]}
      zIndex={0}
    />
  );
}

// "Sáb 14 dic · 18:00"
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export function eventWhen(iso: string) {
  const d = boliviaDate(iso);
  const wd = new Date(new Date(iso).getTime() - 4 * 3600000).getUTCDay();
  return `${WEEKDAYS[wd]} ${d.day} ${MONTHS[d.month]} · ${boliviaTime(iso)}`;
}

// ---------- Vista previa al tocar un evento (misma tarjeta de vidrio que los locales) ----------
export function EventPreviewCard({ event, distance, bottomInset, onOpen, onClose }: { event: MapEvent; distance: number | null; bottomInset: number; onOpen: () => void; onClose: () => void }) {
  const [dy] = useState(() => new Animated.Value(0));
  const cb = useLatest({ onOpen, onClose });
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => dy.setValue(Math.max(-40, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -40 || g.vy < -0.6) {
          Animated.spring(dy, { toValue: 0, useNativeDriver: true }).start();
          cb.current.onOpen();
        } else if (g.dy > 60 || g.vy > 0.8) {
          Animated.timing(dy, { toValue: 320, duration: 160, useNativeDriver: true }).start(() => cb.current.onClose());
        } else {
          Animated.spring(dy, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  );
  const km = distance != null && distance < MAX_SHOWN_DISTANCE_M ? formatDistance(distance) : null;
  const where = event.place_name ?? event.business?.name ?? null;
  const [openedAt] = useState(() => Date.now());
  const live = new Date(event.starts_at).getTime() <= openedAt;
  const ticket = event.ticket_points != null ? `Entrada: ${event.ticket_points} Puntos` : event.ticket_price ? `Entradas desde ${event.ticket_price}` : 'Entrada libre';
  return (
    <Animated.View {...pan.panHandlers} style={{ position: 'absolute', left: 12, right: 12, bottom: 12 + bottomInset, transform: [{ translateY: dy }] }}>
      <Glass className="rounded-[28px]" style={{ overflow: 'hidden', backgroundColor: 'rgba(22,16,31,0.72)' }}>
        <Press accessibilityRole="button" accessibilityLabel={`${event.title}. Toca para ver el evento`} accessibilityHint="Desliza hacia abajo para cerrar" onPress={onOpen} className="px-4 pt-4 pb-4">
          <View className="flex-row items-center" style={{ gap: 14, paddingRight: 30 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: EVENT_LILAC, overflow: 'hidden', alignItems: 'center' }}>
              <Image source={BAIFO} resizeMode="contain" style={{ width: 50, height: 74, marginTop: 4 }} />
            </View>
            <View className="flex-1">
              <Text className="text-text-dark" style={typo.section} numberOfLines={2}>{event.title}</Text>
              <Text className="text-muted-dark mt-0.5" style={typo.support} numberOfLines={1}>
                {['Evento', where, km].filter(Boolean).join(' · ')}
              </Text>
              <Text className="mt-1 font-bold" style={[typo.support, { color: colors.mint }]}>
                {live ? `¡Es ahora! Hasta ${boliviaTime(event.ends_at)}` : eventWhen(event.starts_at)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mt-3.5 rounded-2xl bg-aqua-light-dark px-3 py-2.5" style={{ gap: 10 }}>
            <Ticket size={18} color={colors.mint} />
            <Text className="flex-1 text-[14px] font-bold text-text-dark" numberOfLines={1}>{ticket}</Text>
          </View>
          {event.place_address ? (
            <View className="flex-row items-center mt-2" style={{ gap: 6, paddingHorizontal: 4 }}>
              <MapPin size={13} color={colors.mint} />
              <Text className="text-mint shrink" style={typo.support} numberOfLines={1}>{event.place_address}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-center mt-3.5 rounded-full" style={{ gap: 4, paddingVertical: 12, backgroundColor: colors.purpleDeep }}>
            <Text className="text-white text-[14.5px] font-bold">Ver evento</Text>
            <ChevronRight size={16} color="#fff" />
          </View>
        </Press>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={onClose} hitSlop={8} className="absolute rounded-full items-center justify-center bg-line-dark" style={{ top: 14, right: 14, width: 30, height: 30, zIndex: 2 }}>
          <X size={14} color={colors.dark.text} />
        </Press>
      </Glass>
    </Animated.View>
  );
}
