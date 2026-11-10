// Piezas de la pantalla de Canjes: utilidades (links, distancia, horarios), los pines del mapa y la tarjeta de vista previa.
// Se separaron de app/(tabs)/canjes/index.tsx para que la pantalla sea más corta y fácil de cambiar.
import { useLatest } from '@/hooks/useLatest';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { View, Animated, PanResponder, Image, Linking, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Marker } from 'react-native-maps';
import { MapPin, ChevronRight, X, Gift, Check } from '@/components/icons';
import { type BenefitWithBusiness } from '@/hooks/useBenefits';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import type { OnlineChannel } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { Glass } from '@/components/ui/Glass';
import { typo } from '@/theme/type';
import { GOLD, isFeatured, GoldBadge } from '@/components/ui/Featured';
import { Image as CachedImage } from 'expo-image';
import { Coin } from '@/components/ui/Coin';

export type BusinessT = BenefitWithBusiness['business'];

// Comercios del plan Paso Adelante: van primero, con marco y sello dorado.

// Mismo criterio que redeem_benefit en supabase/migrations (el servidor igual
// lo vuelve a validar; esto solo evita dejar apretar un botón que va a fallar).
// Acepta un link completo o solo el usuario ("@fripaps" / "fripaps").
export function socialUrl(value: string, base: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?(facebook|fb|tiktok|instagram)\./i.test(v)) return `https://${v}`;
  return base + v.replace(/^@/, '');
}

// WhatsApp del comercio: el panel lo guarda como "+591 7 000 0000"; wa.me pide solo dígitos.
export function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function websiteUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// Premios online (migración 0060): se cobran por WhatsApp / redes / web, sin horario y sin ir al local.
export const ONLINE_CHANNEL_LABEL: Record<OnlineChannel, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'su página web',
};

// Mensaje listo para pegar (o que ya llega escrito en WhatsApp) con el código de este canje.
export function onlineMessage(benefitName: string, code: string) {
  return `Hola, vengo de Camina 👋 Quiero canjear mi premio *${benefitName}*. Mi código es *${code}*.`;
}

// Link del canal que eligió el local, con el mensaje ya escrito cuando el canal lo permite (solo WhatsApp).
export function onlineContact(business: BusinessT, channel: OnlineChannel | null | undefined, message: string): { url: string; prefilled: boolean } | null {
  if (channel === 'whatsapp' && business.phone) return { url: `${whatsappUrl(business.phone)}?text=${encodeURIComponent(message)}`, prefilled: true };
  if (channel === 'instagram' && business.instagram) return { url: socialUrl(business.instagram, 'https://instagram.com/'), prefilled: false };
  if (channel === 'facebook' && business.facebook) return { url: socialUrl(business.facebook, 'https://facebook.com/'), prefilled: false };
  if (channel === 'tiktok' && business.tiktok) return { url: socialUrl(business.tiktok, 'https://tiktok.com/@'), prefilled: false };
  if (channel === 'web' && business.website) return { url: websiteUrl(business.website), prefilled: false };
  return null;
}

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function dayMonth(iso: string) {
  const d = new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function isBenefitAvailableNow(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number }) {
  const now = new Date();
  const dayBit = (now.getDay() + 6) % 7;
  if (!(b.valid_days_mask & (1 << dayBit))) return false;
  if (!b.valid_from || !b.valid_to) return true;
  const hhmm = now.toTimeString().slice(0, 5);
  const from = b.valid_from.slice(0, 5);
  const to = b.valid_to.slice(0, 5);
  return from <= to ? hhmm >= from && hhmm <= to : hhmm >= from || hhmm <= to;
}

export const DIAS_ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function benefitConditions(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number; dine_in_only: boolean; requires_booking?: boolean; booking_note?: string | null; online?: boolean }) {
  const lines: string[] = [];
  const activeDays = DIAS_ABREV.filter((_, i) => b.valid_days_mask & (1 << i));
  if (activeDays.length > 0 && activeDays.length < 7) lines.push(`Válido: ${activeDays.join(' ')}`);
  if (b.valid_from && b.valid_to) lines.push(`Horario: ${b.valid_from.slice(0, 5)} a ${b.valid_to.slice(0, 5)}`);
  if (b.dine_in_only) lines.push('Solo consumiendo en el local');
  if (b.requires_booking && !b.online) lines.push(b.booking_note ? `Requiere reserva por WhatsApp: ${b.booking_note}` : 'Requiere reserva: coordina por WhatsApp antes de ir');
  return lines;
}

export function openFullMap(lat: number, lng: number, label: string) {
  const query = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps:0,0?q=${query}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${query})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  })!;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  });
}

// Google Maps (la app si está instalada; si no, la web) centrado en ese punto.
export function openGoogleMaps(lat: number, lng: number, latitudeDelta: number) {
  const zoom = Math.max(3, Math.min(20, Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0005)))));
  const web = `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
  const app = Platform.OS === 'ios' ? `comgooglemaps://?center=${lat},${lng}&zoom=${zoom}` : web;
  Linking.openURL(app).catch(() => Linking.openURL(web));
}

export function distanceMeters(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Más de 100 km no es "cerca" (por ejemplo, el teléfono está en otra ciudad): no se muestra la distancia.
export const MAX_SHOWN_DISTANCE_M = 100_000;
export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : m < 10_000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 1000)} km`;
}

// El link de reseñas lo escribe el comercio a mano: solo se abre si es https y de Google; si no, se ignora.
export const GOOGLE_REVIEW_HOSTS = ['google.com', 'g.page', 'maps.app.goo.gl'];
export function safeReviewUrl(raw?: string | null): string | null {
  const url = raw?.trim();
  if (!url || /\s/.test(url)) return null;
  const host = url.match(/^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i)?.[1].toLowerCase();
  if (!host) return null;
  if (!GOOGLE_REVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  // Los links que comparte Google Maps en iPhone traen "?g_st=ic" y la app de Google Maps los rechaza
  // ("El vínculo no es compatible"): se quita ese parámetro.
  return url.replace(/([?&])g_st=[^&#]*&?/, '$1').replace(/[?&]$/, '');
}

export function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    function tick() {
      setRemainingMs(Math.max(0, new Date(expiresAt!).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remainingMs;
}

export function businessIcon(_name: string, size: number, logoUrl?: string | null, category?: string | null, featured?: boolean) {
  return <BusinessAvatar logoUrl={logoUrl} category={category} size={size} featured={featured} />;
}

// Pin tipo gota (como Pasito): cabeza redonda con borde blanco, logo adentro y una punta abajo.
// El borde de los destacados es dorado; el resto va en blanco. Sin logo (o si falla) muestra la inicial.
export const PIN_PAD = 8; // margen para que la sombra no se corte al convertir el pin en imagen
export const PIN_TIP = 9;
export function pinSize(featured?: boolean) {
  const head = featured ? 50 : 42;
  return { head, w: head + PIN_PAD * 2, h: head + PIN_TIP + PIN_PAD * 2 };
}

export function MapMarker({ name, logoUrl, featured, onLoaded }: { name: string; logoUrl?: string | null; featured?: boolean; onLoaded?: () => void }) {
  const { head, w, h } = pinSize(featured);
  const [failed, setFailed] = useState(false);
  const border = featured ? 4 : 3;
  const ring = featured ? GOLD : '#fff';
  const showLogo = !!logoUrl && !failed;
  const initial = (name.trim()[0] ?? '·').toUpperCase();
  return (
    <View style={{ width: w, height: h, alignItems: 'center', paddingTop: PIN_PAD }}>
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head * 0.28,
          backgroundColor: ring,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View
          style={{
            width: head - border * 2,
            height: head - border * 2,
            borderRadius: (head - border * 2) * 0.28,
            backgroundColor: showLogo ? '#fff' : colors.aquaDeep,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {showLogo ? (
            <Image
              source={{ uri: logoUrl! }}
              resizeMode="cover"
              // Sin fundido: en Android el pin se "fotografía" y un fundido de 300 ms lo capturaba con el logo todavía invisible (círculo blanco).
              fadeDuration={0}
              onLoad={onLoaded}
              onError={() => setFailed(true)}
              style={{ width: head - border * 2, height: head - border * 2 }}
            />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: featured ? 20 : 17 }}>{initial}</Text>
          )}
        </View>
      </View>
      {/* Punta: triángulo del mismo color del borde, pegado a la cabeza */}
      <View
        style={{
          marginTop: -2,
          width: 0,
          height: 0,
          borderLeftWidth: 7,
          borderRightWidth: 7,
          borderTopWidth: PIN_TIP,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: ring,
        }}
      />
      {featured && (
        // Moneda dorada sola, sin círculo blanco atrás (se veía como un marco blanco alrededor).
        <View style={{ position: 'absolute', top: PIN_PAD - 5, right: PIN_PAD - 7, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 7, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
          <Coin size={24} gold />
        </View>
      )}
    </View>
  );
}

// Los pines se "fotografían" (Android siempre, y iPhone con el mapa de Google), así que el logo tiene que estar en caché
// ANTES de dibujarlos: se precarga y el marcador recién se monta cuando la precarga terminó (o pasó el tope).
// La precarga solo calienta la caché: aunque diga que falló, el pin intenta igual mostrar el logo, y la inicial
// queda solo para cuando la imagen misma no carga. Ya montado se deja actualizar hasta que el logo se pintó y después se congela.
export const LOGO_WAIT_MS = 7000;
export function useLogoReady(logoUrl?: string | null) {
  const [state, setState] = useState<'wait' | 'ok'>('wait');
  useEffect(() => {
    if (!logoUrl) return;
    let alive = true;
    const done = () => alive && setState('ok');
    const cap = setTimeout(done, LOGO_WAIT_MS);
    Image.prefetch(logoUrl).then(done, done);
    return () => {
      alive = false;
      clearTimeout(cap);
    };
  }, [logoUrl]);
  return logoUrl ? state : 'none';
}

// Pines que caerían encimados (locales en la misma cuadra) se separan apenas, en ronda alrededor de su punto medio:
// quedan pegados y medio superpuestos (como en Pasito), sin desparramarse. Se recalcula con el zoom: al acercarse
// vuelven a su lugar real.
export const PIN_GAP_PX = 34; // solo se separan los que están MUY juntos en pantalla
export const PIN_SPACE_PX = 40; // separación al acomodarlos: se ve casi todo el logo de cada uno
export const MAX_SPREAD_DELTA = 0.06; // zoom máximo (latitudeDelta) hasta donde se separan pines encimados
export const MAX_RING = 5; // grupos más grandes no se abren en ronda: quedan en su lugar real
export type LatLng = { latitude: number; longitude: number };
export function spreadPins(items: { id: string; lat: number; lng: number }[], latitudeDelta: number, mapHeightPx: number) {
  const out = new Map<string, LatLng>();
  if (!items.length || !mapHeightPx) {
    for (const b of items) out.set(b.id, { latitude: b.lat, longitude: b.lng });
    return out;
  }
  // De lejos los pines quedan juntos como en cualquier mapa; separarlos en ronda los dejaba "abiertos" y fuera de su lugar al volver a acercar.
  if (latitudeDelta > MAX_SPREAD_DELTA) {
    for (const b of items) out.set(b.id, { latitude: b.lat, longitude: b.lng });
    return out;
  }
  const degPerPx = latitudeDelta / mapHeightPx;
  const cos = Math.cos((items[0].lat * Math.PI) / 180) || 1;
  // Grupos: dos pines están en el mismo grupo si quedan a menos de PIN_GAP_PX en pantalla (cadena simple).
  const groups: (typeof items)[] = [];
  const seen = new Set<string>();
  for (const b of items) {
    if (seen.has(b.id)) continue;
    const group = [b];
    seen.add(b.id);
    for (let i = 0; i < group.length; i++) {
      for (const o of items) {
        if (seen.has(o.id)) continue;
        const dy = (o.lat - group[i].lat) / degPerPx;
        const dx = ((o.lng - group[i].lng) * cos) / degPerPx;
        if (Math.hypot(dx, dy) < PIN_GAP_PX) {
          group.push(o);
          seen.add(o.id);
        }
      }
    }
    groups.push(group);
  }
  for (const group of groups) {
    if (group.length === 1 || group.length > MAX_RING) {
      for (const g of group) out.set(g.id, { latitude: g.lat, longitude: g.lng });
      continue;
    }
    const lat = group.reduce((a, b) => a + b.lat, 0) / group.length;
    const lng = group.reduce((a, b) => a + b.lng, 0) / group.length;
    // 2 o 3 pines: lado a lado (uno arriba del otro, la punta del de arriba tapaba la cabeza del de abajo, y un
    // destacado grande tapaba casi entero al otro). Se ordenan de oeste a este para que cada uno quede de su lado.
    if (group.length <= 3) {
      const row = [...group].sort((a, b) => a.lng - b.lng || a.id.localeCompare(b.id));
      row.forEach((b, i) => {
        const dxPx = (i - (row.length - 1) / 2) * PIN_SPACE_PX;
        out.set(b.id, { latitude: lat, longitude: lng + (dxPx * degPerPx) / cos });
      });
      continue;
    }
    // 4 o 5: en ronda, a PIN_SPACE_PX entre vecinos.
    const rPx = PIN_SPACE_PX / (2 * Math.sin(Math.PI / group.length));
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((b, i) => {
      const ang = (2 * Math.PI * i) / sorted.length - Math.PI / 2;
      out.set(b.id, {
        latitude: lat + rPx * Math.sin(ang) * degPerPx * -1,
        longitude: lng + (rPx * Math.cos(ang) * degPerPx) / cos,
      });
    });
  }
  return out;
}

// Ancho del borde de la tarjeta del comercio: 2 en dorado para los destacados, 1 para el resto.
// Píldora de vidrio de la ficha (redes, favorito): velo blanco translúcido y canto de luz.
export const glassChip = (dark: boolean) => ({ backgroundColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.62)', borderColor: dark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.95)' });
export const cardBorder = (b: BusinessT) => (isFeatured(b) ? 2 : 1);

// Vista previa al tocar un local en el mapa: tarjeta corta que se desliza. Hacia arriba (o tocarla) abre la ficha completa; hacia abajo la cierra.
export function MapPreviewCard({
  business, benefits, openNow, distance, bottomInset, onOpen, onClose,
}: {
  business: BusinessT; benefits: { id: string; name: string; cost_points: number; image_url?: string | null }[]; openNow: boolean; distance: number | null; bottomInset: number; onOpen: () => void; onClose: () => void;
}) {
  const isDarkCard = useColorScheme().colorScheme === 'dark';
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
  const shown = benefits.slice(0, 3);
  const featured = isFeatured(business);
  const km = distance != null && distance < MAX_SHOWN_DISTANCE_M ? formatDistance(distance) : null;
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{ position: 'absolute', left: 12, right: 12, bottom: 12 + bottomInset, transform: [{ translateY: dy }] }}
    >
      {/* Vidrio líquido: se ve el mapa a través, con un velo suficiente para que el texto se lea bien. */}
      <Glass
        className="rounded-[28px]"
        style={{ overflow: 'hidden', backgroundColor: isDarkCard ? 'rgba(22,16,31,0.55)' : 'rgba(255,255,255,0.55)', ...(featured ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD } : {}) }}
      >
        <Press
          accessibilityRole="button"
          accessibilityLabel={`${business.name}. Toca para ver el detalle completo`}
          accessibilityHint="Desliza hacia abajo para cerrar"
          onPress={onOpen}
          className="px-4 pt-2.5 pb-4"
        >
          <View className="self-center rounded-full bg-line-light dark:bg-line-dark" style={{ width: 38, height: 5, marginBottom: 12 }} />
          <View className="flex-row items-center" style={{ gap: 14, paddingRight: 30 }}>
            {businessIcon(business.name, 72, business.logo_url, business.category, featured)}
            <View className="flex-1">
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-text-light dark:text-text-dark shrink" style={typo.section} numberOfLines={1}>{business.name}</Text>
                {featured ? <GoldBadge size={20} /> : null}
              </View>
              <Text className="text-muted-light dark:text-muted-dark mt-0.5" style={typo.support} numberOfLines={1}>
                {business.category}{km ? ` · ${km}` : ''}
              </Text>
              {business.address ? (
                <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                  <MapPin size={12} color={isDarkCard ? colors.mint : colors.aquaDeep} />
                  <Text className="text-aqua-ink dark:text-mint shrink" style={typo.support} numberOfLines={1}>{business.address}</Text>
                </View>
              ) : null}
              {benefits.length > 0 ? (
                <Text className="mt-1 font-bold" style={[typo.support, { color: openNow ? (isDarkCard ? colors.mint : colors.aquaDeep) : (isDarkCard ? '#CDC2EA' : '#55447A') }]}>
                  {openNow ? 'Abierto ahora' : 'Fuera de horario'}
                </Text>
              ) : null}
            </View>
          </View>
          {shown.length > 0 ? (
            <View className="mt-3.5" style={{ gap: 8 }}>
              {shown.map((b) => (
                <View key={b.id} className="flex-row items-center rounded-2xl bg-aqua-light-light dark:bg-aqua-light-dark px-2.5 py-2" style={{ gap: 10 }}>
                  {b.image_url ? (
                    <CachedImage source={{ uri: b.image_url }} cachePolicy="memory-disk" accessibilityIgnoresInvertColors style={{ width: 40, height: 40, borderRadius: 12 }} />
                  ) : (
                    <View className="items-center justify-center bg-purple-light-light dark:bg-purple-light-dark" style={{ width: 40, height: 40, borderRadius: 12 }}>
                      <Gift size={18} color={colors.purple} />
                    </View>
                  )}
                  <Text className="flex-1 text-[14px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>{b.name}</Text>
                  <Image source={require('@/../assets/camina-coin.png')} accessible={false} style={{ width: 16, height: 16, borderRadius: 8 }} />
                  <Text className="text-[14px] font-extrabold text-text-light dark:text-text-dark" style={{ fontVariant: ['tabular-nums'] }}>{b.cost_points}</Text>
                </View>
              ))}
              {benefits.length > shown.length ? <Text className="text-muted-light dark:text-muted-dark text-center" style={typo.support}>+{benefits.length - shown.length} premios más</Text> : null}
            </View>
          ) : null}
          <View className="flex-row items-center justify-center mt-3.5 rounded-full" style={{ gap: 4, paddingVertical: 12, backgroundColor: colors.aquaDeep }}>
            <Text className="text-white text-[14.5px] font-bold">Ver local y premios</Text>
            <ChevronRight size={16} color="#fff" />
          </View>
        </Press>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={onClose} hitSlop={8} className="absolute rounded-full items-center justify-center bg-line-light dark:bg-line-dark" style={{ top: 14, right: 14, width: 30, height: 30, zIndex: 2 }}>
          <X size={14} color={isDarkCard ? colors.dark.text : colors.light.text} />
        </Press>
      </Glass>
    </Animated.View>
  );
}

export function BusinessMarker({ business, coordinate, onPress }: { business: BusinessT; coordinate?: LatLng; onPress?: () => void }) {
  const [tracking, setTracking] = useState(true);
  const [painted, setPainted] = useState(false);
  const featured = isFeatured(business);
  const { w, h } = pinSize(featured);
  const logo = useLogoReady(business.logo_url);
  useEffect(() => {
    if (logo === 'wait') return;
    // El pin se congela recién cuando el logo avisó que ya se pintó (más un respiro); sin logo, enseguida.
    // Tope de seguridad corto: en iPhone cada pin que se sigue actualizando redibuja el mapa de Google en cada
    // cuadro, y con varios pines (y varios mapas montados) eso trababa la pantalla. El logo ya viene precargado.
    const t = setTimeout(() => setTracking(false), logo === 'ok' ? (painted ? 500 : 2500) : 600);
    return () => clearTimeout(t);
  }, [logo, painted]);
  if (logo === 'wait') return null;
  return (
    <Marker
      coordinate={coordinate ?? { latitude: business.lat!, longitude: business.lng! }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: (h - PIN_PAD) / h }}
      // Los destacados quedan arriba si igual llegan a tocarse.
      zIndex={featured ? 2 : 1}
      // El toque del pin sube (burbujea) hasta el MapView y dispara su onPress, que cerraba la vista previa al instante.
      stopPropagation
      onPress={onPress}
    >
      <View style={{ width: w, height: h }}>
        <MapMarker name={business.name} logoUrl={logo === 'ok' ? business.logo_url : null} featured={featured} onLoaded={() => setPainted(true)} />
      </View>
    </Marker>
  );
}

export function CoinPrice({ cost, was, dim }: { cost: number; was?: number; dim?: boolean }) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ gap: 5, backgroundColor: dim ? colors.light.line : colors.aquaDeep, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 }}
    >
      <Coin size={20} />
      <Text style={{ color: dim ? colors.light.muted : '#fff', fontSize: 13, fontWeight: '700' }}>{cost}</Text>
      {was != null ? <Text style={{ color: dim ? colors.light.muted : '#D9F3EC', fontSize: 12, textDecorationLine: 'line-through' }}>{was}</Text> : null}
    </View>
  );
}

export type SortBy = 'cerca' | 'destacados';
export const SORT_LABEL: Record<SortBy, string> = { cerca: 'Más cercanos', destacados: 'Recomendados' };

// Fila de las hojas de Categoría y Ordenar por: texto a la izquierda y tilde en la opción elegida.
export function OptionRow({ label, selected, onPress, isDark }: { label: string; selected: boolean; onPress: () => void; isDark: boolean }) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="flex-row items-center rounded-xl px-3"
      style={{ minHeight: 48, gap: 10, backgroundColor: selected ? (isDark ? colors.dark.purpleLight : colors.light.purpleLight) : 'transparent' }}
    >
      <View style={{ width: 18 }}>{selected ? <Check size={16} color={isDark ? colors.mint : colors.aquaDeep} weight="bold" /> : null}</View>
      <Text className="text-[15px] text-text-light dark:text-text-dark" style={{ fontWeight: selected ? '800' : '500' }}>{label}</Text>
    </Press>
  );
}

