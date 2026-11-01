import { BaifoMascot } from '@/components/ui/BaifoMascot';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { BenefitDetailOverlay } from '@/components/BenefitDetailOverlay';
import { View, ScrollView, Modal, Animated, PanResponder, ActivityIndicator, Alert, Image, Linking, Platform, RefreshControl, AccessibilityInfo } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Search, MapPin, ChevronRight, X, Gift, Instagram, FacebookIcon, TiktokIcon, WhatsappIcon, GlobeIcon, Locate, Navigation, MapIcon, Heart, Star, ChevronDown, Check } from '@/components/icons';
import {
  useBenefits,
  useApprovedBusinesses,
  useBenefitsRemainingToday,
  useOnlineRedeemed,
  useMyRedemptions,
  useRedeemBenefit,
  useRedeemWithLocalCode,
  useRegenerateCode,
  useCancelExpiredRedemption,
  type BenefitWithBusiness,
} from '@/hooks/useBenefits';
import { usePointsBalance } from '@/hooks/usePoints';
import { askForReviewOnce } from '@/lib/review';
import { FollowupQuestion, ReviewStep, StoryStep } from '@/components/story/StoryShare';
import { useStoryFlow } from '@/components/story/StoryFlow';
import { BellButton } from '@/components/ui/BellButton';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { BusinessHours } from '@/components/BusinessHours';
import { shareCoarseLocation } from '@/lib/coarse-location';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import type { Redemption, OnlineChannel } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { REDEMPTION_CODE_TTL_MINUTES, ONLINE_CODE_TTL_DAYS, BUSINESS_REDEMPTION_COOLDOWN_DAYS } from '@/constants/business-rules';
import { Glass } from '@/components/ui/Glass';
import { LocalCodeSheet } from '@/components/LocalCodeSheet';
import { SkeletonGroup, SkeletonBusinessCard } from '@/components/ui/Skeleton';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { GOLD, isFeatured, GoldBadge } from '@/components/ui/Featured';
import { useRedeemCounts } from '@/hooks/useRedeemCounts';
import { useLoyaltyCard, useNewPlaceBonus } from '@/hooks/useLoyalty';
import { LoyaltyCardView } from '@/components/LoyaltyCardView';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { friendlyError, friendlyServerError } from '@/lib/errors';
import { plural } from '@/lib/format';
import { useThemeColors } from '@/theme/useThemeColors';
import { Coin } from '@/components/ui/Coin';

type BusinessT = BenefitWithBusiness['business'];

// Comercios del plan Paso Adelante: van primero, con marco y sello dorado.

// Centro de Tarija (ciudad de lanzamiento) — último respaldo si no hay GPS ni comercios con ubicación.
const TARIJA_REGION = {
  latitude: -21.5355,
  longitude: -64.7296,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

// Mismo criterio que redeem_benefit en supabase/migrations (el servidor igual
// lo vuelve a validar; esto solo evita dejar apretar un botón que va a fallar).
// Acepta un link completo o solo el usuario ("@fripaps" / "fripaps").
function socialUrl(value: string, base: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?(facebook|fb|tiktok|instagram)\./i.test(v)) return `https://${v}`;
  return base + v.replace(/^@/, '');
}

// WhatsApp del comercio: el panel lo guarda como "+591 7 000 0000"; wa.me pide solo dígitos.
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function websiteUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// Premios online (migración 0060): se cobran por WhatsApp / redes / web, sin horario y sin ir al local.
const ONLINE_CHANNEL_LABEL: Record<OnlineChannel, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'su página web',
};

// Mensaje listo para pegar (o que ya llega escrito en WhatsApp) con el código de este canje.
function onlineMessage(benefitName: string, code: string) {
  return `Hola, vengo de Camina 👋 Quiero canjear mi premio *${benefitName}*. Mi código es *${code}*.`;
}

// Link del canal que eligió el local, con el mensaje ya escrito cuando el canal lo permite (solo WhatsApp).
function onlineContact(business: BusinessT, channel: OnlineChannel | null | undefined, message: string): { url: string; prefilled: boolean } | null {
  if (channel === 'whatsapp' && business.phone) return { url: `${whatsappUrl(business.phone)}?text=${encodeURIComponent(message)}`, prefilled: true };
  if (channel === 'instagram' && business.instagram) return { url: socialUrl(business.instagram, 'https://instagram.com/'), prefilled: false };
  if (channel === 'facebook' && business.facebook) return { url: socialUrl(business.facebook, 'https://facebook.com/'), prefilled: false };
  if (channel === 'tiktok' && business.tiktok) return { url: socialUrl(business.tiktok, 'https://tiktok.com/@'), prefilled: false };
  if (channel === 'web' && business.website) return { url: websiteUrl(business.website), prefilled: false };
  return null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function dayMonth(iso: string) {
  const d = new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function isBenefitAvailableNow(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number }) {
  const now = new Date();
  const dayBit = (now.getDay() + 6) % 7;
  if (!(b.valid_days_mask & (1 << dayBit))) return false;
  if (!b.valid_from || !b.valid_to) return true;
  const hhmm = now.toTimeString().slice(0, 5);
  const from = b.valid_from.slice(0, 5);
  const to = b.valid_to.slice(0, 5);
  return from <= to ? hhmm >= from && hhmm <= to : hhmm >= from || hhmm <= to;
}

const DIAS_ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function benefitConditions(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number; dine_in_only: boolean }) {
  const lines: string[] = [];
  const activeDays = DIAS_ABREV.filter((_, i) => b.valid_days_mask & (1 << i));
  if (activeDays.length > 0 && activeDays.length < 7) lines.push(`Válido: ${activeDays.join(' ')}`);
  if (b.valid_from && b.valid_to) lines.push(`Horario: ${b.valid_from.slice(0, 5)} a ${b.valid_to.slice(0, 5)}`);
  if (b.dine_in_only) lines.push('Solo consumiendo en el local');
  return lines;
}

function openFullMap(lat: number, lng: number, label: string) {
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
function openGoogleMaps(lat: number, lng: number, latitudeDelta: number) {
  const zoom = Math.max(3, Math.min(20, Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0005)))));
  const web = `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
  const app = Platform.OS === 'ios' ? `comgooglemaps://?center=${lat},${lng}&zoom=${zoom}` : web;
  Linking.openURL(app).catch(() => Linking.openURL(web));
}

function distanceMeters(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Más de 100 km no es "cerca" (por ejemplo, el teléfono está en otra ciudad): no se muestra la distancia.
const MAX_SHOWN_DISTANCE_M = 100_000;
function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : m < 10_000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 1000)} km`;
}

// El link de reseñas lo escribe el comercio a mano: solo se abre si es https y de Google; si no, se ignora.
const GOOGLE_REVIEW_HOSTS = ['google.com', 'g.page', 'maps.app.goo.gl'];
function safeReviewUrl(raw?: string | null): string | null {
  const url = raw?.trim();
  if (!url || /\s/.test(url)) return null;
  const host = url.match(/^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i)?.[1].toLowerCase();
  if (!host) return null;
  if (!GOOGLE_REVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  // Los links que comparte Google Maps en iPhone traen "?g_st=ic" y la app de Google Maps los rechaza
  // ("El vínculo no es compatible"): se quita ese parámetro.
  return url.replace(/([?&])g_st=[^&#]*&?/, '$1').replace(/[?&]$/, '');
}

function useCountdown(expiresAt: string | null) {
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

function businessIcon(_name: string, size: number, logoUrl?: string | null, category?: string | null, featured?: boolean) {
  return <BusinessAvatar logoUrl={logoUrl} category={category} size={size} featured={featured} />;
}

// Pin tipo gota (como Pasito): cabeza redonda con borde blanco, logo adentro y una punta abajo.
// El borde de los destacados es dorado; el resto va en blanco. Sin logo (o si falla) muestra la inicial.
const PIN_PAD = 8; // margen para que la sombra no se corte al convertir el pin en imagen
const PIN_TIP = 9;
function pinSize(featured?: boolean) {
  const head = featured ? 50 : 42;
  return { head, w: head + PIN_PAD * 2, h: head + PIN_TIP + PIN_PAD * 2 };
}

function MapMarker({ name, logoUrl, featured, onLoaded }: { name: string; logoUrl?: string | null; featured?: boolean; onLoaded?: () => void }) {
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
        <View style={{ position: 'absolute', top: PIN_PAD - 5, right: PIN_PAD - 7, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 7 }}>
          <Coin size={20} gold />
        </View>
      )}
    </View>
  );
}

// Los pines se "fotografían" (Android siempre, y iPhone con el mapa de Google), así que el logo tiene que estar en caché
// ANTES de dibujarlos: se precarga y el marcador recién se monta cuando la precarga terminó (o pasó el tope).
// La precarga solo calienta la caché: aunque diga que falló, el pin intenta igual mostrar el logo, y la inicial
// queda solo para cuando la imagen misma no carga. Ya montado se deja actualizar hasta que el logo se pintó y después se congela.
const LOGO_WAIT_MS = 7000;
function useLogoReady(logoUrl?: string | null) {
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
const PIN_GAP_PX = 30;
type LatLng = { latitude: number; longitude: number };
export function spreadPins(items: { id: string; lat: number; lng: number }[], latitudeDelta: number, mapHeightPx: number) {
  const out = new Map<string, LatLng>();
  if (!items.length || !mapHeightPx) {
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
    if (group.length === 1) {
      out.set(group[0].id, { latitude: group[0].lat, longitude: group[0].lng });
      continue;
    }
    const lat = group.reduce((a, b) => a + b.lat, 0) / group.length;
    const lng = group.reduce((a, b) => a + b.lng, 0) / group.length;
    // Radio para que pines vecinos en la ronda queden a PIN_GAP_PX entre sí.
    const rPx = PIN_GAP_PX / (2 * Math.sin(Math.PI / group.length));
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
const cardBorder = (b: BusinessT) => (isFeatured(b) ? 2 : 1);

// Vista previa al tocar un local en el mapa: tarjeta corta que se desliza. Hacia arriba (o tocarla) abre la ficha completa; hacia abajo la cierra.
export function MapPreviewCard({
  business, benefits, openNow, distance, bottomInset, onOpen, onClose,
}: {
  business: BusinessT; benefits: { id: string; name: string; cost_points: number; image_url?: string | null }[]; openNow: boolean; distance: number | null; bottomInset: number; onOpen: () => void; onClose: () => void;
}) {
  const isDarkCard = useColorScheme().colorScheme === 'dark';
  const dy = useRef(new Animated.Value(0)).current;
  const cb = useRef({ onOpen, onClose });
  cb.current = { onOpen, onClose };
  const pan = useRef(
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
  ).current;
  const shown = benefits.slice(0, 3);
  const featured = isFeatured(business);
  const km = distance != null && distance < MAX_SHOWN_DISTANCE_M ? formatDistance(distance) : null;
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{ position: 'absolute', left: 12, right: 12, bottom: 12 + bottomInset, transform: [{ translateY: dy }] }}
    >
      <Glass
        className="rounded-[28px]"
        // Vidrio líquido con un respaldo casi opaco: sobre el mapa (calles y nombres) el texto tiene que leerse sin esfuerzo.
        style={{ overflow: 'hidden', backgroundColor: isDarkCard ? 'rgba(22,16,31,0.80)' : 'rgba(255,255,255,0.84)', ...(featured ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD } : {}) }}
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
                    <Image source={{ uri: b.image_url }} accessibilityIgnoresInvertColors style={{ width: 40, height: 40, borderRadius: 12 }} />
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

function BusinessMarker({ business, coordinate, onPress }: { business: BusinessT; coordinate?: LatLng; onPress?: () => void }) {
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
      onPress={onPress}
    >
      <View style={{ width: w, height: h }}>
        <MapMarker name={business.name} logoUrl={logo === 'ok' ? business.logo_url : null} featured={featured} onLoaded={() => setPainted(true)} />
      </View>
    </Marker>
  );
}

function CoinPrice({ cost, was, dim }: { cost: number; was?: number; dim?: boolean }) {
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

type SortBy = 'cerca' | 'destacados' | 'precio';
const SORT_LABEL: Record<SortBy, string> = { cerca: 'Más cercanos', destacados: 'Recomendados', precio: 'Menor precio' };

// Fila de las hojas de Categoría y Ordenar por: texto a la izquierda y tilde en la opción elegida.
function OptionRow({ label, selected, onPress, isDark }: { label: string; selected: boolean; onPress: () => void; isDark: boolean }) {
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

export default function CanjesScreen() {
  const isDark = useColorScheme().colorScheme === 'dark';
  const { muted, favorite } = useThemeColors();
  const tabSpace = useTabBarSpace();
  const profile = useAuthStore((s) => s.profile);
  const { data: benefits, isLoading, isError, refetch } = useBenefits();
  // Locales aprobados que todavía no cargaron ningún premio: igual salen en la lista y en el mapa.
  const { data: approvedBusinesses } = useApprovedBusinesses();
  const sinPremios = useMemo(() => {
    const conPremios = new Set((benefits ?? []).map((b) => b.business.id));
    return (approvedBusinesses ?? []).filter((b) => !conPremios.has(b.id)) as BusinessT[];
  }, [benefits, approvedBusinesses]);
  const { data: remainingToday } = useBenefitsRemainingToday();
  const { data: onlineRedeemed } = useOnlineRedeemed();
  const { data: myRedemptions } = useMyRedemptions();
  const [copiedKey, setCopiedKey] = useState<'code' | 'msg' | null>(null);
  async function copyText(text: string, key: 'code' | 'msg') {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      Alert.alert('No pudimos copiar', 'Intenta de nuevo.');
    }
  }
  const { data: balance, isError: balanceError } = usePointsBalance();
  // Si el saldo no pudo cargarse se muestra "—": un 0 parecería real.
  const balanceText = balanceError && balance === undefined ? '—' : String(balance ?? 0);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const redeem = useRedeemBenefit();
  const redeemLocal = useRedeemWithLocalCode();
  const [localCodeFor, setLocalCodeFor] = useState<BenefitWithBusiness | null>(null);
  const localResult = useRef<{ benefit: BenefitWithBusiness; redemption: Redemption } | null>(null);
  const regenerate = useRegenerateCode();
  const cancelExpired = useCancelExpiredRedemption();

  const [category, setCategory] = useState('Todos');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('Todos');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('cerca');
  const [sortDraft, setSortDraft] = useState<SortBy>('cerca');
  const [searchOpen, setSearchOpen] = useState(false);
  const [onlyAfford, setOnlyAfford] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const favorites = useFavorites();
  const { data: redeemCounts } = useRedeemCounts();
  const favIds = favorites.ids;
  const [search, setSearch] = useState('');
  const [showZonePrompt, setShowZonePrompt] = useState(true);
  const [zoneInput, setZoneInput] = useState('');
  const [previewBizId, setPreviewBizId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [fullMapReady, setFullMapReady] = useState(false);
  // Cerrado el mapa completo, se vuelve a esperar a que el panel termine de abrirse la próxima vez.
  if (!mapOpen && fullMapReady) setFullMapReady(false);
  if (!mapOpen && previewBizId) setPreviewBizId(null);
  // Respaldo por si onShow no llega.
  useEffect(() => {
    if (!mapOpen) return;
    const t = setTimeout(() => setFullMapReady(true), 700);
    return () => clearTimeout(t);
  }, [mapOpen]);
  const topInset = useSafeAreaInsets().top;
  const [mapSearch, setMapSearch] = useState('');
  const fullMapRef = useRef<MapView>(null);
  const [profileBusinessId, setProfileBusinessId] = useState<string | null>(null);
  // Desde Inicio: /canjes?negocio=<id> abre directo la ficha de ese local.
  const { negocio } = useLocalSearchParams<{ negocio?: string }>();
  useEffect(() => {
    if (!negocio) return;
    setProfileBusinessId(negocio);
    router.setParams({ negocio: undefined });
  }, [negocio]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // En iPhone un panel (Modal) no puede abrirse mientras otro se está cerrando: si se intenta, no aparece
  // y la pantalla queda trabada sin responder. Por eso lo siguiente se abre recién en onDismiss del
  // panel que se cierra (solo existe en iOS); en Android alcanza con esperar la animación.
  const afterMapClose = useRef<(() => void) | null>(null);
  const afterProfileClose = useRef<(() => void) | null>(null);
  const afterCodeClose = useRef<(() => void) | null>(null);
  const afterLocalCodeClose = useRef<(() => void) | null>(null);
  // isOpen: si el panel ya estaba cerrado (por ejemplo, se cerró mientras se generaba el código) no habrá onDismiss.
  function runAfterClose(slot: { current: (() => void) | null }, isOpen: boolean, next: () => void) {
    if (!isOpen) next();
    else if (Platform.OS === 'ios') {
      slot.current = next;
      // Respaldo por si onDismiss no llega: lo que corra primero vacía el lugar y el otro no hace nada.
      setTimeout(() => slot.current === next && flushAfterClose(slot), 1200);
    } else setTimeout(next, 350);
  }
  function flushAfterClose(slot: { current: (() => void) | null }) {
    const next = slot.current;
    slot.current = null;
    next?.();
  }
  function closeProfile() {
    setGalleryOpen(false);
    setDetailBenefitId(null);
    setProfileBusinessId(null);
  }
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeRedemption, setActiveRedemption] = useState<Redemption | null>(null);
  const [activeBenefit, setActiveBenefit] = useState<BenefitWithBusiness | null>(null);
  const { data: activeLoyalty } = useLoyaltyCard(activeBenefit?.business.id);
  const [bonusById, setBonusById] = useState<Record<string, number>>({});

  // Seguimiento del canje: cuando el comercio confirma el código, se pregunta si compró algo más.
  const activeId = activeRedemption?.id ?? null;
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const confirmed = !!activeId && confirmedId === activeId;
  const answered = !!activeId && answeredId === activeId;
  // El final del canje va de a una pantalla: confirmado, compra extra, reseña y historia.
  type Paso = 'ok' | 'resena' | 'historia';
  const [pasoDe, setPasoDe] = useState<{ id: string | null; paso: Paso }>({ id: null, paso: 'ok' });
  const paso: Paso = pasoDe.id === activeId ? pasoDe.paso : 'ok';
  const setPaso = (p: Paso) => setPasoDe({ id: activeId, paso: p });
  useEffect(() => {
    if (!activeId) return;
    const check = async () => {
      const { data } = await supabase.from('redemptions').select('status, new_place_bonus').eq('id', activeId).maybeSingle();
      if (data?.status === 'confirmed') {
        setConfirmedId(activeId);
        if (data.new_place_bonus) setBonusById((m) => ({ ...m, [activeId]: data.new_place_bonus as number }));
        queryClient.invalidateQueries({ queryKey: ['new-place-bonus'] });
        // Los Puntos se descuentan al confirmar el local: se actualiza el saldo y los movimientos.
        for (const key of ['points-balance', 'points-ledger', 'points-expiring-soon', 'redemptions']) queryClient.invalidateQueries({ queryKey: [key] });
        for (const key of ['loyalty-card', 'loyalty-cards']) queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, [activeId, queryClient]);

  const [watching, setWatching] = useState<{ redemption: Redemption; benefit: BenefitWithBusiness } | null>(null);
  // En iPhone no se pueden abrir dos paneles a la vez: se reabre recién cuando no hay otro a la vista.
  const otherPanelOpen = useRef(false);
  useEffect(() => {
    otherPanelOpen.current = !!activeRedemption || mapOpen || !!profileBusinessId || galleryOpen;
  }, [activeRedemption, mapOpen, profileBusinessId, galleryOpen]);
  useEffect(() => {
    if (!watching) return;
    const { redemption, benefit } = watching;
    // Se deja de mirar cuando el código vence (más el margen de 1 hora en que el local todavía puede confirmarlo).
    const until = new Date(redemption.code_expires_at).getTime() + 60 * 60_000;
    let confirmedNow = false;
    const check = async () => {
      if (Date.now() > until) return setWatching(null);
      if (!confirmedNow) {
        const { data } = await supabase.from('redemptions').select('status').eq('id', redemption.id).maybeSingle();
        if (data && data.status !== 'pending' && data.status !== 'confirmed') return setWatching(null);
        confirmedNow = data?.status === 'confirmed';
      }
      if (confirmedNow && !otherPanelOpen.current) {
        setWatching(null);
        setActiveBenefit(benefit);
        setActiveRedemption(redemption);
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, [watching]);

  async function answerFollowup(extra: boolean) {
    if (!activeId) return;
    setAnsweredId(activeId);
    await supabase.rpc('answer_redemption_followup', { p_redemption_id: activeId, p_extra: extra });
  }

  const remainingMs = useCountdown(activeRedemption?.code_expires_at ?? null);
  const expired = !!activeRedemption && remainingMs <= 0;
  const ttlMs = REDEMPTION_CODE_TTL_MINUTES * 60_000;

  // Avisos para el lector de pantalla cuando el canje se confirma o el código vence. En Android y web
  // alcanza con la live region de los textos de estado; iOS la ignora y necesita el aviso explícito.
  const expiresAtMs = activeRedemption ? new Date(activeRedemption.code_expires_at).getTime() : 0;
  useEffect(() => {
    if (confirmed && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('¡Canje confirmado!');
  }, [confirmed]);
  useEffect(() => {
    // La cuenta regresiva arranca en 0 antes de su primer tick: se confirma con la hora real para no avisar de más.
    // Si el canje ya se confirmó, el vencimiento no importa (la pantalla muestra la confirmación).
    if (expired && !confirmed && Platform.OS === 'ios' && expiresAtMs <= Date.now()) AccessibilityInfo.announceForAccessibility('Código vencido');
  }, [expired, confirmed, expiresAtMs]);

  // El mapa se centra en la ubicación real del usuario (Camina no es solo de
  // Tarija), con Tarija de respaldo si no da permiso o falla el GPS.
  const [baseRegion, setMapRegion] = useState<typeof TARIJA_REGION | null>(null);
  const [hasGps, setHasGps] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMapRegion(TARIJA_REGION);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        shareCoarseLocation();
        setHasGps(true);
        setMapRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        });
      } catch {
        setMapRegion(TARIJA_REGION);
      }
    })();
  }, []);

  const businessesWithCoords = useMemo(() => {
    const map = new Map<string, BusinessT>();
    for (const b of benefits ?? []) {
      if (b.business.lat != null && b.business.lng != null) map.set(b.business.id, b.business);
    }
    for (const b of sinPremios) {
      if (b.lat != null && b.lng != null) map.set(b.id, b);
    }
    return [...map.values()];
  }, [benefits, sinPremios]);

  // "Disponibles ahora": en el mapa solo quedan los comercios con algún premio canjeable en este momento.
  const mapBusinesses = useMemo(() => {
    if (!onlyOpen) return businessesWithCoords;
    const open = new Set((benefits ?? []).filter(isBenefitAvailableNow).map((b) => b.business.id));
    return businessesWithCoords.filter((b) => open.has(b.id));
  }, [onlyOpen, benefits, businessesWithCoords]);

  // Sin GPS, el mapa se centra en donde están los comercios (sirve igual para
  // Tarija que para Santa Cruz o La Paz cuando se sumen).
  const mapRegion = useMemo(() => {
    if (hasGps || !businessesWithCoords.length) return baseRegion;
    const lat = businessesWithCoords.reduce((acc, b) => acc + b.lat!, 0) / businessesWithCoords.length;
    const lng = businessesWithCoords.reduce((acc, b) => acc + b.lng!, 0) / businessesWithCoords.length;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.045, longitudeDelta: 0.045 };
  }, [hasGps, businessesWithCoords, baseRegion]);

  // Reparto de pines encimados: la vista previa mide 250 de alto; el mapa completo sigue el zoom actual.
  const [fullMapHeight, setFullMapHeight] = useState(0);
  const [fullDelta, setFullDelta] = useState(0.045);
  useEffect(() => {
    if (mapRegion) setFullDelta(mapRegion.latitudeDelta);
  }, [mapRegion]);
  const pinItems = useMemo(() => mapBusinesses.map((b) => ({ id: b.id, lat: b.lat!, lng: b.lng! })), [mapBusinesses]);
  const previewPins = useMemo(() => spreadPins(pinItems, mapRegion?.latitudeDelta ?? 0.045, 250), [pinItems, mapRegion]);
  const fullPins = useMemo(() => spreadPins(pinItems, fullDelta, fullMapHeight), [pinItems, fullDelta, fullMapHeight]);

  // Buscador del mapa completo: busca en TODOS los comercios con ubicación (sin filtros de categoría).
  const mapResults = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (!q) return [];
    return businessesWithCoords
      .filter((b) => (b.name + ' ' + b.category + ' ' + (b.address ?? '')).toLowerCase().includes(q))
      .slice(0, 6);
  }, [mapSearch, businessesWithCoords]);

  // Lo que se está viendo en el mapa completo (para abrir Google Maps en la misma zona).
  const fullCenter = useRef<{ latitude: number; longitude: number; latitudeDelta: number } | null>(null);
  const bottomInset = useSafeAreaInsets().bottom;
  async function centerOnMe() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sin acceso a tu ubicación', 'Activa la ubicación para Camina en Ajustes para centrar el mapa en dónde estás.');
        return;
      }
      const last = await Location.getLastKnownPositionAsync();
      const pos = last ?? (await Location.getCurrentPositionAsync({}));
      setHasGps(true);
      fullMapRef.current?.animateToRegion(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        500
      );
    } catch {
      Alert.alert('No pudimos encontrarte', 'Intenta de nuevo en un momento.');
    }
  }

  function focusBusiness(b: BusinessT) {
    setMapSearch('');
    fullMapRef.current?.animateToRegion(
      { latitude: b.lat!, longitude: b.lng!, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      500
    );
  }

  const categories = useMemo(() => {
    const set = new Set([...(benefits ?? []).map((b) => b.business.category), ...sinPremios.map((b) => b.category)]);
    return ['Todos', ...set];
  }, [benefits, sinPremios]);

  const chip = (label: string, on: boolean, toggle: () => void, onColor: string = colors.aquaDeep, icon?: React.ReactNode) => (
    <Press
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      aria-pressed={on}
      haptic="selection"
      onPress={toggle}
      className="flex-row items-center rounded-full border px-3.5 bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
      style={{ gap: 5, minHeight: 40, ...(on ? { backgroundColor: onColor, borderColor: onColor === colors.aquaDeep ? colors.aqua : onColor } : null) }}
    >
      {icon}
      <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 12, fontWeight: '600', ...(on ? { color: '#fff' } : null) }}>{label}</Text>
    </Press>
  );
  const quickChips = [
    chip('Disponibles ahora', onlyOpen, () => setOnlyOpen((v) => !v)),
    chip('Te alcanza', onlyAfford, () => setOnlyAfford((v) => !v)),
    chip('Favoritos', onlyFavs, () => setOnlyFavs((v) => !v), colors.dangerFill, <Heart size={12} color={onlyFavs ? '#fff' : muted} fill={onlyFavs ? '#fff' : 'none'} />),
  ];

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, { business: BusinessT; benefits: BenefitWithBusiness[] }>();
    for (const b of benefits ?? []) {
      if (category !== 'Todos' && b.business.category !== category) continue;
      if (q && !(b.business.name + ' ' + b.name + ' ' + b.business.category + ' ' + (b.business.address ?? '')).toLowerCase().includes(q)) continue;
      if (!map.has(b.business.id)) map.set(b.business.id, { business: b.business, benefits: [] });
      map.get(b.business.id)!.benefits.push(b);
    }
    for (const b of sinPremios) {
      if (category !== 'Todos' && b.category !== category) continue;
      if (q && !(b.name + ' ' + b.category + ' ' + (b.address ?? '')).toLowerCase().includes(q)) continue;
      map.set(b.id, { business: b, benefits: [] });
    }
    let list = [...map.values()].map((g) => ({
      ...g,
      openNow: g.benefits.some(isBenefitAvailableNow),
      distance:
        hasGps && mapRegion && g.business.lat != null && g.business.lng != null
          ? distanceMeters(mapRegion, g.business.lat, g.business.lng)
          : null,
    }));
    if (onlyOpen) list = list.filter((g) => g.openNow);
    if (onlyFavs) list = list.filter((g) => favIds.includes(g.business.id));
    // "Te alcanza": el local tiene al menos un premio que se puede pagar con los Puntos de hoy.
    if (onlyAfford) list = list.filter((g) => g.benefits.some((b) => b.cost_points <= (balance ?? 0)));
    const cheapest = (g: (typeof list)[number]) => Math.min(...g.benefits.map((b) => b.cost_points), Infinity);
    // Destacados siempre primero (también dentro de cada categoría); después, según "Ordenar por".
    list.sort(
      (a, b) =>
        Number(isFeatured(b.business)) - Number(isFeatured(a.business)) ||
        (sortBy === 'precio' ? cheapest(a) - cheapest(b) || 0 : 0) ||
        (sortBy === 'cerca' ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0) ||
        a.business.name.localeCompare(b.business.name)
    );
    return list;
  }, [benefits, sinPremios, category, search, onlyOpen, onlyFavs, onlyAfford, balance, sortBy, favIds, hasGps, mapRegion]);
  const previewGroup = useMemo(() => (mapOpen && previewBizId ? groups.find((g) => g.business.id === previewBizId) ?? null : null), [mapOpen, previewBizId, groups]);

  const profileGroup = useMemo(() => {
    if (!profileBusinessId) return null;
    const list = (benefits ?? []).filter((b) => b.business.id === profileBusinessId);
    if (list.length) return { business: list[0].business, benefits: list };
    const sola = sinPremios.find((b) => b.id === profileBusinessId);
    return sola ? { business: sola, benefits: [] as BenefitWithBusiness[] } : null;
  }, [benefits, sinPremios, profileBusinessId]);
  const profileOpenRef = useRef(false);
  useEffect(() => {
    profileOpenRef.current = !!profileGroup;
  }, [profileGroup]);
  const [detailBenefitId, setDetailBenefitId] = useState<string | null>(null);
  const detailBenefit = profileGroup?.benefits.find((x) => x.id === detailBenefitId) ?? null;
  const { data: loyalty } = useLoyaltyCard(profileGroup?.business.id);
  const { data: newPlaceBonus } = useNewPlaceBonus(profileGroup?.business.id);

  // Portada primero y después las demás fotos del local.
  const galleryPhotos = profileGroup
    ? ([profileGroup.business.cover_url, ...(profileGroup.business.photos ?? [])].filter(Boolean) as string[])
    : [];

  // "Tu 1 Punto se descuenta" / "Tus 50 Puntos se descuentan".
  const pointsCharged = (n: number) =>
    n === 1 ? 'Tu 1 Punto se descuenta' : `Tus ${n} Puntos se descuentan`;

  // Antes de generar el código se confirma: el código vence en minutos y hay que estar en el local.
  function confirmRedeem(benefit: BenefitWithBusiness) {
    const free = loyalty?.benefit_id === benefit.id && loyalty.ready;
    if (benefit.online && benefit.online_channel === 'web') {
      Alert.alert(
        `¿Canjear ${benefit.name}?`,
        `Te damos un cupón de ${benefit.business.name} para pegar en el campo cupón al pagar en su página. ` +
          (free ? 'Es el premio de tu tarjeta: no se te descuentan Puntos.' : `${pointsCharged(benefit.cost_points)} ahora.`),
        [
          { text: 'Todavía no', style: 'cancel' },
          { text: 'Obtener cupón', onPress: () => handleRedeem(benefit.id, benefit) },
        ]
      );
      return;
    }
    if (benefit.online) {
      const via = benefit.online_channel ? ONLINE_CHANNEL_LABEL[benefit.online_channel] : 'sus redes';
      Alert.alert(
        `¿Canjear ${benefit.name}?`,
        `Te damos un código que dura ${ONLINE_CODE_TTL_DAYS} días y un mensaje listo para mandarle a ${benefit.business.name} por ${via}. ` +
          (free ? 'Es el premio de tu tarjeta: no se te descuentan Puntos.' : `${pointsCharged(benefit.cost_points)} cuando la tienda confirme el código.`),
        [
          { text: 'Todavía no', style: 'cancel' },
          { text: 'Generar código', onPress: () => handleRedeem(benefit.id, benefit) },
        ]
      );
      return;
    }
    // Local físico: se pide el código de 4 números que el local le dice a la persona. Antes se cierra la ficha
    // del comercio para que iOS no tenga dos paneles a la vez.
    runAfterClose(afterProfileClose, profileOpenRef.current, () => setLocalCodeFor(benefit));
    closeProfile();
  }

  // Devuelve el mensaje de error para la hoja, o null si el canje quedó confirmado.
  async function submitLocalCode(benefit: BenefitWithBusiness, code: string): Promise<string | null> {
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
      // Sin GPS se avisa abajo con "sin_ubicacion".
    }
    try {
      const result = await redeemLocal.mutateAsync({ benefitId: benefit.id, code, lat, lng });
      if (result.ok) {
        // La hoja muestra "¡Canjeado!" un momento y recién después (onSuccess) se abre el canje confirmado.
        localResult.current = { benefit, redemption: result.redemption };
        return null;
      }
      switch (result.reason) {
        case 'codigo_incorrecto':
          return 'Ese código no es. Revísalo con el local.';
        case 'lejos':
          return `Estás a ${result.distance_m ?? 'más de 300'} m del local. Acércate y vuelve a probar.`;
        case 'sin_ubicacion':
          return 'Necesitamos tu ubicación para confirmar que estás en el local. Actívala en los ajustes del teléfono.';
        default:
          return 'Este local todavía no puede canjear con código. Escríbenos y lo arreglamos.';
      }
    } catch (e) {
      return friendlyServerError(e, 'No se pudo canjear. Intenta de nuevo.');
    }
  }

  async function handleRedeem(benefitId: string, benefit: BenefitWithBusiness) {
    try {
      const result = await redeem.mutateAsync(benefitId);
      // Primero se cierra la ficha del comercio; el modal del código se abre
      // recién después para que iOS no intente mostrar dos modales a la vez.
      runAfterClose(afterProfileClose, profileOpenRef.current, () => {
        setActiveBenefit(benefit);
        setActiveRedemption(result);
      });
      closeProfile();
    } catch (e) {
      Alert.alert('No se pudo canjear', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  // Si falla (mala señal, por ejemplo) se avisa y el modal queda abierto para reintentar.
  async function handleRegenerate() {
    if (!activeRedemption) return;
    try {
      const result = await regenerate.mutateAsync(activeRedemption.id);
      setActiveRedemption(result);
    } catch (e) {
      Alert.alert('No pudimos generar el código', friendlyError(e, 'Intenta de nuevo en un momento.'));
    }
  }

  async function handleCancelExpired() {
    if (!activeRedemption) return;
    try {
      await cancelExpired.mutateAsync(activeRedemption.id);
      setActiveRedemption(null);
      setActiveBenefit(null);
    } catch (e) {
      Alert.alert('No pudimos cancelar el canje', friendlyError(e, 'Intenta de nuevo en un momento.'));
    }
  }

  async function saveZone(zone: string) {
    if (!profile) return;
    setShowZonePrompt(false);
    await supabase.from('profiles').update({ zone }).eq('id', profile.id);
    await useAuthStore.getState().refreshProfile();
  }

  function closeCode() {
    if (confirmed) askForReviewOnce();
    // "Ya lo mostré" cierra antes de que el local confirme: se sigue mirando ese canje y, cuando el local lo
    // confirma, se vuelve a abrir en "Canje confirmado" (compra extra, reseña en Google y historia).
    else if (activeRedemption && activeBenefit && !expired) setWatching({ redemption: activeRedemption, benefit: activeBenefit });
    setActiveRedemption(null);
    setActiveBenefit(null);
  }

  const reviewUrl = safeReviewUrl(activeBenefit?.business.google_review_url);

  // Desde la confirmación del canje: se cierra la hoja del código y arranca la historia de Instagram.
  const story = useStoryFlow();
  function startStoryFromCode() {
    if (!activeRedemption || !activeBenefit) return;
    const target = { redemptionId: activeRedemption.id, businessName: activeBenefit.business.name, benefitName: activeBenefit.name };
    // La hoja para elegir la foto es otro panel: se abre cuando el del código terminó de cerrarse.
    runAfterClose(afterCodeClose, true, () => story.start(target));
    setActiveRedemption(null);
    setActiveBenefit(null);
  }

  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: tabSpace }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await queryClient.invalidateQueries();
              setRefreshing(false);
            }}
            tintColor={colors.aqua}
          />
        }
      >
        {/* Tarjeta de mapa: vista previa que abre el mapa completo */}
        <View style={{ height: 250, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', backgroundColor: '#1d1b2e' }}>
          {/* Un solo mapa de Google vivo a la vez: en iPhone, un mapa tapado por un panel (mapa completo, ficha, fotos)
              sigue dibujando detrás y, con dos o tres a la vez, el mapa a la vista se traba. Tapado, se desmonta. */}
          {mapRegion && (mapOpen || profileGroup) ? null : mapRegion ? (
            <MapView
              key={`${mapRegion.latitude.toFixed(4)},${mapRegion.longitude.toFixed(4)}`}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              customMapStyle={DARK_MAP_STYLE}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              toolbarEnabled={false}
            >
              {mapBusinesses.map((b) => (
                <BusinessMarker key={b.id} business={b} coordinate={previewPins.get(b.id)} />
              ))}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.aqua} accessibilityLabel="Cargando" />
            </View>
          )}

          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: Platform.OS === 'android' ? topInset + 24 : 54, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Press
              accessibilityRole="button"
              accessibilityLabel={balanceError && balance === undefined ? 'Puntos, ver detalle' : `${balance ?? 0} Puntos, ver detalle`}
              hitSlop={6}
              onPress={() => router.push('/(tabs)/puntos')}
              className="flex-row items-center bg-card-light rounded-full pl-1.5 pr-3"
              style={{ height: 32, gap: 6 }}
            >
              <Coin size={20} />
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.light.text }}>{balanceText}</Text>
            </Press>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <BellButton color={colors.light.muted} bg="#fff" />
              <Press
                accessibilityRole="button"
                accessibilityLabel="Tu perfil"
                hitSlop={6}
                onPress={() => router.push('/(tabs)/perfil')}
                className="bg-mint rounded-full items-center justify-center overflow-hidden"
                style={{ width: 32, height: 32 }}
              >
                <AvatarImage
                  uri={profile?.photo_url}
                  style={{ width: '100%', height: '100%' }}
                  fallback={<Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>}
                />
              </Press>
            </View>
          </View>

          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
            <Press
              accessibilityRole="button"
              onPress={() => setMapOpen(true)}
              className="flex-row items-center bg-card-light rounded-full"
              style={{ gap: 8, paddingHorizontal: 18, paddingVertical: 11, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <MapIcon size={16} color={colors.aquaDeep} />
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.light.text }}>Explorar el mapa</Text>
            </Press>
          </View>
        </View>

        <View className="px-5 pt-5">
          <ScreenTitle>Canjear</ScreenTitle>
          <Text className="text-muted-light dark:text-muted-dark mb-4" style={typo.body}>{balanceText} {plural(balance ?? 0, 'Punto disponible', 'Puntos disponibles')}</Text>

          {!profile?.zone && showZonePrompt && (
            <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-3.5">
              <Text className="text-[13px] font-semibold mb-2.5 text-text-light dark:text-text-dark">¿Desde qué zona caminas?</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={zoneInput}
                  onChangeText={setZoneInput}
                  accessibilityLabel="¿Desde qué zona caminas?"
                  placeholder="Ej: Equipetrol, Centro, Los Pinos…"
                  placeholderTextColor={muted}
                  className="flex-1 bg-white dark:bg-card-dark rounded-full px-3.5 py-2 text-xs text-text-light dark:text-text-dark"
                  onSubmitEditing={() => zoneInput.trim() && saveZone(zoneInput.trim())}
                  returnKeyType="done"
                />
                <Press
                  accessibilityRole="button"
                  onPress={() => zoneInput.trim() && saveZone(zoneInput.trim())}
                  disabled={!zoneInput.trim()}
                  className="bg-purple-deep rounded-full px-3.5 py-2"
                >
                  <Text className="text-xs font-semibold text-white">Guardar</Text>
                </Press>
              </View>
              {/* hitSlop solo hacia abajo: arriba pisaría la fila del campo y "Guardar". */}
              <Press accessibilityRole="button" hitSlop={{ bottom: 16 }} onPress={() => setShowZonePrompt(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark mt-2">Ahora no</Text>
              </Press>
            </View>
          )}

          {/* Como en Pasito: una sola fila de filtros. La lupa abre la búsqueda en el mismo lugar, con atajos debajo. */}
          {searchOpen ? (
            <View className="mb-1">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Glass className="flex-1 flex-row items-center gap-2 rounded-2xl px-3.5" style={{ height: 46 }}>
                  <Search size={16} color={muted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                    returnKeyType="search"
                    accessibilityLabel="Buscar locales por nombre, categoría o dirección"
                    placeholder="Buscar en locales"
                    placeholderTextColor={muted}
                    className="flex-1 text-[14px] text-text-light dark:text-text-dark"
                  />
                </Glass>
                <Press accessibilityRole="button" accessibilityLabel="Cerrar búsqueda" hitSlop={10} onPress={() => { setSearch(''); setSearchOpen(false); }}>
                  <X size={20} color={isDark ? colors.mint : colors.aquaDeep} />
                </Press>
              </View>
              <View className="flex-row mt-3" style={{ gap: 8 }}>
                {quickChips}
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              <Press
                accessibilityRole="button"
                accessibilityLabel={search ? `Buscar: ${search}` : 'Buscar locales'}
                haptic="selection"
                onPress={() => setSearchOpen(true)}
                className="items-center justify-center rounded-full border bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
                style={{ width: 40, height: 40, ...(search ? { backgroundColor: colors.aquaDeep, borderColor: colors.aqua } : null) }}
              >
                <Search size={16} color={search ? '#fff' : muted} />
              </Press>
              <Press
                accessibilityRole="button"
                accessibilityLabel={`Categoría: ${category}`}
                aria-pressed={category !== 'Todos'}
                haptic="selection"
                onPress={() => { setCategoryDraft(category); setCategoryOpen(true); }}
                className="flex-row items-center rounded-full border px-3.5 bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
                style={{ gap: 5, minHeight: 40, ...(category !== 'Todos' ? { backgroundColor: colors.aquaDeep, borderColor: colors.aqua } : null) }}
              >
                <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 12, fontWeight: '600', ...(category !== 'Todos' ? { color: '#fff' } : null) }}>{category === 'Todos' ? 'Categoría' : category}</Text>
                <ChevronDown size={12} color={category !== 'Todos' ? '#fff' : muted} />
              </Press>
              <Press
                accessibilityRole="button"
                accessibilityLabel={`Ordenar por: ${SORT_LABEL[sortBy]}`}
                haptic="selection"
                onPress={() => { setSortDraft(sortBy); setSortOpen(true); }}
                className="flex-row items-center rounded-full border px-3.5 bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
                style={{ gap: 5, minHeight: 40 }}
              >
                <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 12, fontWeight: '600' }}>{SORT_LABEL[sortBy]}</Text>
                <ChevronDown size={12} color={muted} />
              </Press>
              {quickChips}
            </ScrollView>
          )}
        </View>

        <Modal visible={categoryOpen} transparent animationType="slide" onRequestClose={() => setCategoryOpen(false)}>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar categorías" style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.45)' }} onPress={() => setCategoryOpen(false)} />
          <View style={{ backgroundColor: isDark ? '#1B1530' : '#F4F0FF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32, maxHeight: '75%' }}>
            <View className="flex-row items-center justify-between mb-2 mx-1">
              <Text accessibilityRole="header" className="font-bold text-[17px] text-text-light dark:text-text-dark">Categoría</Text>
              <Press accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} onPress={() => setCategoryOpen(false)}>
                <X size={20} color={isDark ? colors.mint : colors.aquaDeep} />
              </Press>
            </View>
            <ScrollView>
              {categories.map((c) => (
                <OptionRow key={c} label={c === 'Todos' ? 'Todas' : c} selected={categoryDraft === c} onPress={() => setCategoryDraft(c)} isDark={isDark} />
              ))}
            </ScrollView>
            <View className="flex-row items-center mt-3" style={{ gap: 14 }}>
              <Press accessibilityRole="button" onPress={() => setCategoryDraft('Todos')} className="px-3 py-3">
                <Text className="font-bold text-[14px]" style={{ color: isDark ? colors.mint : colors.aquaInk }}>Limpiar filtros</Text>
              </Press>
              <Press accessibilityRole="button" onPress={() => { setCategory(categoryDraft); setCategoryOpen(false); }} className="flex-1 rounded-2xl items-center py-3.5" style={{ backgroundColor: colors.aquaDeep }}>
                <Text className="text-white font-bold text-[14.5px]">Aplicar</Text>
              </Press>
            </View>
          </View>
        </Modal>

        <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar orden" style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.45)' }} onPress={() => setSortOpen(false)} />
          <View style={{ backgroundColor: isDark ? '#1B1530' : '#F4F0FF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32 }}>
            <View className="flex-row items-center justify-between mb-2 mx-1">
              <Text accessibilityRole="header" className="font-bold text-[17px] text-text-light dark:text-text-dark">Ordenar por</Text>
              <Press accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} onPress={() => setSortOpen(false)}>
                <X size={20} color={isDark ? colors.mint : colors.aquaDeep} />
              </Press>
            </View>
            {(Object.keys(SORT_LABEL) as SortBy[]).map((k) => (
              <OptionRow key={k} label={SORT_LABEL[k]} selected={sortDraft === k} onPress={() => setSortDraft(k)} isDark={isDark} />
            ))}
            <Press accessibilityRole="button" onPress={() => { setSortBy(sortDraft); setSortOpen(false); }} className="rounded-2xl items-center py-3.5 mt-4" style={{ backgroundColor: colors.aquaDeep }}>
              <Text className="text-white font-bold text-[14.5px]">Aplicar</Text>
            </Press>
          </View>
        </Modal>

        <View className="px-5 pt-4" style={{ gap: 12 }}>
          {isLoading && (
            <SkeletonGroup style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => <SkeletonBusinessCard key={i} />)}
            </SkeletonGroup>
          )}

          {isError && !benefits && (
            <EmptyState mascot="confundido"
              title="No pudimos cargar"
              text="Revisa tu conexión e intenta de nuevo."
              actionLabel="Reintentar"
              onAction={() => refetch()}
            />
          )}

          {groups.map((g) => (
            <Press
              key={g.business.id}
              // En web el corazón de adentro ya es un botón y un <button> no puede ir dentro de otro <button>.
              accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
              accessibilityActions={[{ name: 'favorite', label: favorites.isFavorite(g.business.id) ? 'Quitar de favoritos' : 'Agregar a favoritos' }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'favorite') favorites.toggle(g.business.id);
              }}
              onPress={() => setProfileBusinessId(g.business.id)}
              className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-3xl p-4"
              style={{
                shadowColor: colors.light.text, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1,
                ...(isFeatured(g.business) ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.25 } : {}),
              }}
            >
              {/* La foto del local manda: si el comercio subió portada, la tarjeta abre con ella. */}
              {g.business.cover_url ? (
                <Image
                  source={{ uri: g.business.cover_url }}
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  style={{ height: 132, marginTop: -16, marginHorizontal: -16, marginBottom: 14, borderTopLeftRadius: 24 - cardBorder(g.business), borderTopRightRadius: 24 - cardBorder(g.business) }}
                />
              ) : null}
              {/* En iPhone la portada se dibuja encima del borde de la tarjeta y el dorado solo se veía de la foto para abajo:
                  el borde se repite por encima de todo, del mismo ancho y color. */}
              {g.business.cover_url ? (
                <View
                  pointerEvents="none"
                  className={isFeatured(g.business) ? undefined : 'border-line-light dark:border-line-dark'}
                  style={{
                    position: 'absolute', zIndex: 1, top: -cardBorder(g.business), left: -cardBorder(g.business), right: -cardBorder(g.business), bottom: -cardBorder(g.business),
                    borderRadius: 24, borderWidth: cardBorder(g.business), ...(isFeatured(g.business) ? { borderColor: GOLD } : {}),
                  }}
                />
              ) : null}
              <View className="flex-row items-start" style={{ gap: 14 }}>
                {businessIcon(g.business.name, 62, g.business.logo_url, g.business.category, isFeatured(g.business))}
                <View className="flex-1">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-[16px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>{g.business.name}</Text>
                    {isFeatured(g.business) && <GoldBadge size={18} />}
                  </View>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">{g.business.category}</Text>
                  {g.business.address ? (
                    <View className="flex-row items-center mt-1.5" style={{ gap: 5 }}>
                      <MapPin size={12} color={isDark ? colors.aqua : colors.aquaDeep} />
                      <Text className="flex-1 text-[12px] text-aqua-ink dark:text-aqua" numberOfLines={1}>{g.business.address}</Text>
                    </View>
                  ) : null}
                  <Text className={`text-[12px] font-semibold mt-1 ${g.openNow ? 'text-aqua-ink dark:text-aqua' : 'text-muted-light dark:text-muted-dark'}`}>
                    {g.benefits.length === 0 ? 'Todavía sin premios' : g.openNow ? 'Disponible ahora' : 'Fuera de horario'}
                    {g.distance != null && g.distance < MAX_SHOWN_DISTANCE_M ? ` · ${formatDistance(g.distance)}` : ''}
                  </Text>
                </View>
                <View className="items-center" style={{ gap: 10 }}>
                  <Press accessibilityRole="button" accessibilityLabel={favorites.isFavorite(g.business.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} onPress={() => favorites.toggle(g.business.id)} hitSlop={10}>
                    <Heart size={20} color={favorites.isFavorite(g.business.id) ? favorite : muted} fill={favorites.isFavorite(g.business.id) ? favorite : 'none'} />
                  </Press>
                  <ChevronRight size={18} color={muted} />
                </View>
              </View>

              {/* Cada premio en una pastilla con su precio adentro: el canje se hace en la ficha. */}
              {g.benefits.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
                {g.benefits.map((b) => (
                  <View
                    key={b.id}
                    accessible
                    accessibilityLabel={`${b.name}, ${b.cost_points} ${plural(b.cost_points, 'Punto', 'Puntos')}`}
                    className="flex-row items-center bg-aqua-deep rounded-full"
                    style={{ gap: 6, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, opacity: b.cost_points > (balance ?? 0) ? 0.55 : 1 }}
                  >
                    <Coin size={20} />
                    <Text className="text-[13px] font-extrabold text-white">{b.cost_points}</Text>
                    <Text className="text-[13px] font-semibold text-white">{b.name}</Text>
                  </View>
                ))}
              </ScrollView>
              )}
            </Press>
          ))}

          {!isLoading && !isError && groups.length === 0 && (
            <EmptyState
              title="No encontramos comercios aquí"
              text="Prueba con otra categoría o zona. Estamos sumando comercios de tu ciudad todas las semanas: mientras tanto, sigue juntando Puntos."
            />
          )}
        </View>
      </ScrollView>

      {/* Mapa completo */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
        onShow={() => setFullMapReady(true)}
        onDismiss={() => flushAfterClose(afterMapClose)}
      >
        <View style={{ flex: 1, backgroundColor: '#1d1b2e' }}>
          {/* El mapa de Google se crea recién cuando el panel terminó de abrirse: creado durante la animación,
              en iPhone a veces quedaba sin responder a los gestos (no se podía mover ni hacer zoom). */}
          {mapRegion && !fullMapReady ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.aqua} accessibilityLabel="Cargando el mapa" />
            </View>
          ) : null}
          {mapRegion && fullMapReady && (
            <MapView
              ref={fullMapRef}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              // Distinto del valor por defecto a propósito: obliga a iPhone a volver a activar los toques si esta vista
              // de mapa viene reciclada de un mapa que los tenía apagados (ver "Cómo llegar" en la ficha).
              pointerEvents={Platform.OS === 'ios' ? 'box-none' : undefined}
              initialRegion={mapRegion}
              customMapStyle={DARK_MAP_STYLE}
              showsUserLocation={hasGps}
              onLayout={(e) => setFullMapHeight(e.nativeEvent.layout.height)}
              onPress={() => setPreviewBizId(null)}
              onRegionChangeComplete={(r) => {
                fullCenter.current = r;
                setFullDelta((d) => (Math.abs(d - r.latitudeDelta) / d > 0.15 ? r.latitudeDelta : d));
              }}
            >
              {mapBusinesses.map((b) => (
                <BusinessMarker
                  key={b.id}
                  business={b}
                  coordinate={fullPins.get(b.id)}
                  onPress={() => {
                    // Primero una vista previa; la ficha completa se abre solo al tocarla o deslizarla hacia arriba.
                    setPreviewBizId(b.id);
                    fullMapRef.current?.animateToRegion(
                      { latitude: b.lat!, longitude: b.lng!, latitudeDelta: fullCenter.current?.latitudeDelta ?? 0.01, longitudeDelta: fullCenter.current?.latitudeDelta ?? 0.01 },
                      300
                    );
                  }}
                />
              ))}
            </MapView>
          )}
          {previewGroup ? (
            <MapPreviewCard
              key={previewGroup.business.id}
              business={previewGroup.business}
              benefits={previewGroup.benefits}
              openNow={previewGroup.openNow}
              distance={previewGroup.distance}
              bottomInset={bottomInset}
              onClose={() => setPreviewBizId(null)}
              onOpen={() => {
                const id = previewGroup.business.id;
                setPreviewBizId(null);
                runAfterClose(afterMapClose, true, () => setProfileBusinessId(id));
                setMapOpen(false);
              }}
            />
          ) : null}
          <Press
            accessibilityRole="button"
            accessibilityLabel="Cerrar mapa"
            onPress={() => setMapOpen(false)}
            className="absolute bg-card-light rounded-full items-center justify-center"
            style={{ top: 56, left: 20, width: 40, height: 40 }}
          >
            <X size={18} color={colors.light.text} />
          </Press>
          <View style={{ position: 'absolute', top: 56, left: 70, right: 20 }}>
            <View className="flex-row items-center bg-card-light rounded-full" style={{ height: 40, paddingHorizontal: 14, gap: 8 }}>
              <Search size={16} color={colors.light.muted} />
              <TextInput
                value={mapSearch}
                onChangeText={setMapSearch}
                accessibilityLabel="Buscar locales y premios"
                placeholder="Buscar locales y premios"
                placeholderTextColor={colors.light.muted}
                returnKeyType="search"
                onSubmitEditing={() => mapResults[0] && focusBusiness(mapResults[0])}
                style={{ flex: 1, fontSize: 13.5, color: colors.light.text }}
              />
              {!!mapSearch && (
                <Press accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setMapSearch('')} hitSlop={8}>
                  <X size={14} color={colors.light.muted} />
                </Press>
              )}
            </View>
            <Press
              accessibilityRole="button"
              accessibilityState={{ selected: onlyOpen }}
              aria-pressed={onlyOpen}
              haptic="selection"
              onPress={() => setOnlyOpen((v) => !v)}
              className="self-start rounded-full"
              style={{ marginTop: 8, paddingHorizontal: 14, height: 32, justifyContent: 'center', backgroundColor: onlyOpen ? colors.aquaDeep : '#fff' }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: onlyOpen ? '#fff' : colors.light.text }}>Disponibles ahora</Text>
            </Press>
            {mapResults.length > 0 && (
              <View className="bg-card-light" style={{ marginTop: 6, borderRadius: 20, overflow: 'hidden' }}>
                {mapResults.map((b) => (
                  <Press
                    key={b.id}
                    accessibilityRole="button"
                    onPress={() => focusBusiness(b)}
                    style={{ paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <MapPin size={15} color={colors.purple} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: colors.light.text }}>{b.name}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 12, color: colors.light.muted }}>{b.category}</Text>
                    </View>
                  </Press>
                ))}
              </View>
            )}
            {!!mapSearch.trim() && mapResults.length === 0 && (
              <View className="bg-card-light" style={{ marginTop: 6, borderRadius: 20, padding: 14 }}>
                <Text style={{ fontSize: 12.5, color: colors.light.muted }}>No encontramos “{mapSearch.trim()}” en el mapa.</Text>
              </View>
            )}
          </View>
          {/* Tocar el logo de Google (abajo a la izquierda) abre Google Maps en la zona que se está viendo. */}
          <Press
            accessibilityRole="link"
            accessibilityLabel="Abrir en Google Maps"
            onPress={() => {
              const c = fullCenter.current ?? mapRegion;
              if (c) openGoogleMaps(c.latitude, c.longitude, c.latitudeDelta);
            }}
            style={{ position: 'absolute', left: 0, bottom: 0, width: 130, height: 34 + bottomInset }}
          />
          <Press
            accessibilityRole="button"
            accessibilityLabel="Centrar el mapa en dónde estás"
            onPress={centerOnMe}
            className="absolute items-center justify-center rounded-full bg-card-light"
            style={{ bottom: previewGroup ? 360 + bottomInset : 44, right: 20, width: 48, height: 48, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
          >
            <Locate size={22} color={colors.aquaDeep} />
          </Press>
        </View>
      </Modal>

      {/* Ficha del comercio */}
      <Modal
        visible={!!profileGroup}
        animationType="slide"
        onRequestClose={() => (galleryOpen ? setGalleryOpen(false) : closeProfile())}
        onDismiss={() => flushAfterClose(afterProfileClose)}>
        {profileGroup && (
          <View className="flex-1 bg-bg-light dark:bg-bg-dark">
            <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
              <View style={{ height: 232, backgroundColor: colors.purple }}>
                {profileGroup.business.cover_url ? (
                  <Press
                    onPress={() => {
                      setGalleryIndex(0);
                      setGalleryOpen(true);
                    }}
                    style={{ width: '100%', height: '100%' }}
                    accessibilityLabel="Ver las fotos del local"
                  >
                    <Image source={{ uri: profileGroup.business.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </Press>
                ) : (
                  <View style={{ flex: 1, backgroundColor: colors.authBg }} />
                )}
                {galleryPhotos.length > 1 && (
                  <View
                    pointerEvents="none"
                    className="absolute flex-row items-center rounded-full"
                    style={{ right: 16, bottom: 46, gap: 5, backgroundColor: 'rgba(18,10,30,0.62)', paddingHorizontal: 11, paddingVertical: 6 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{galleryPhotos.length} fotos</Text>
                  </View>
                )}
                <Press
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={closeProfile}
                  className="absolute bg-card-light rounded-full items-center justify-center"
                  style={{ top: 54, left: 20, width: 40, height: 40 }}
                >
                  <X size={18} color={colors.light.text} />
                </Press>
              </View>

              <View className="px-5" style={{ marginTop: -36 }}>
                {businessIcon(profileGroup.business.name, 84, profileGroup.business.logo_url, profileGroup.business.category, isFeatured(profileGroup.business))}
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
                    <Text className="text-[24px] font-extrabold text-text-light dark:text-text-dark shrink" style={{ letterSpacing: -0.5 }}>
                      {profileGroup.business.name}
                    </Text>
                    {isFeatured(profileGroup.business) && <GoldBadge size={24} />}
                  </View>
                  <Press accessibilityRole="button" accessibilityLabel={favorites.isFavorite(profileGroup.business.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} onPress={() => favorites.toggle(profileGroup.business.id)} hitSlop={10} className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full items-center justify-center" style={{ width: 40, height: 40 }}>
                    <Heart size={19} color={favorites.isFavorite(profileGroup.business.id) ? favorite : muted} fill={favorites.isFavorite(profileGroup.business.id) ? favorite : 'none'} />
                  </Press>
                </View>

                <Text className="text-[13px] text-muted-light dark:text-muted-dark">{profileGroup.business.category}</Text>
                {(redeemCounts?.[profileGroup.business.id] ?? 0) >= 100 ? (
                  <Text className="text-[13px] font-semibold text-aqua-ink dark:text-aqua mt-1">
                    {redeemCounts![profileGroup.business.id].toLocaleString('es-BO')} {plural(redeemCounts![profileGroup.business.id], 'canje', 'canjes')} en este local
                  </Text>
                ) : null}

                {profileGroup.business.description ? (
                  <Text className="text-[14px] leading-5 text-muted-light dark:text-muted-dark mt-3">{profileGroup.business.description}</Text>
                ) : null}

                <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
                  {profileGroup.business.address ? (
                    <Press
                      accessibilityRole="link"
                      onPress={() =>
                        profileGroup.business.lat != null && profileGroup.business.lng != null
                          ? openFullMap(profileGroup.business.lat, profileGroup.business.lng, profileGroup.business.name)
                          : Linking.openURL(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profileGroup.business.name}, ${profileGroup.business.address}`)}`
                            )
                      }
                      className="flex-row items-center bg-aqua-light-light dark:bg-aqua-light-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <MapPin size={14} color={isDark ? colors.aqua : colors.aquaDeep} />
                      <Text className="text-[12.5px] font-semibold text-aqua-ink dark:text-aqua">{profileGroup.business.address}</Text>
                    </Press>
                  ) : null}
                  <BusinessHours openingHours={profileGroup.business.opening_hours} hoursText={profileGroup.business.hours_text} />
                  {profileGroup.business.instagram ? (
                    <Press
                      accessibilityRole="link"
                      accessibilityLabel={`Abrir el Instagram de ${profileGroup.business.name}`}
                      onPress={() => Linking.openURL(socialUrl(profileGroup.business.instagram!, 'https://instagram.com/'))}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <Instagram size={14} color={isDark ? colors.dark.text : colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">Instagram</Text>
                    </Press>
                  ) : null}
                  {profileGroup.business.facebook ? (
                    <Press
                      onPress={() => Linking.openURL(socialUrl(profileGroup.business.facebook!, 'https://facebook.com/'))}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <FacebookIcon size={14} color={isDark ? colors.dark.text : colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">Facebook</Text>
                    </Press>
                  ) : null}
                  {profileGroup.business.tiktok ? (
                    <Press
                      onPress={() => Linking.openURL(socialUrl(profileGroup.business.tiktok!, 'https://tiktok.com/@'))}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <TiktokIcon size={14} color={isDark ? colors.dark.text : colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">TikTok</Text>
                    </Press>
                  ) : null}
                  {profileGroup.business.phone && profileGroup.business.phone.replace(/\D/g, '').length >= 7 ? (
                    <Press
                      onPress={() => Linking.openURL(whatsappUrl(profileGroup.business.phone!))}
                      accessibilityRole="link"
                      accessibilityLabel={`Escribir por WhatsApp a ${profileGroup.business.name}`}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <WhatsappIcon size={14} color={isDark ? colors.dark.text : colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">WhatsApp</Text>
                    </Press>
                  ) : null}
                  {profileGroup.business.website ? (
                    <Press
                      onPress={() => Linking.openURL(websiteUrl(profileGroup.business.website!))}
                      accessibilityRole="link"
                      accessibilityLabel={`Abrir la página web de ${profileGroup.business.name}`}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <GlobeIcon size={14} color={isDark ? colors.dark.text : colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">Sitio web</Text>
                    </Press>
                  ) : null}
                </View>

                {newPlaceBonus ? (
                  <View className="mt-6 flex-row items-center rounded-2xl px-3.5 py-3 bg-aqua-light-light dark:bg-aqua-light-dark" style={{ gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>🎁</Text>
                    <View className="flex-1">
                      <Text className="text-aqua-ink dark:text-aqua font-extrabold text-[13.5px]">Primera vez aquí: +{newPlaceBonus} Puntos</Text>
                      <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-0.5">Se suman cuando el local confirme tu primer canje.</Text>
                    </View>
                  </View>
                ) : null}

                {loyalty ? (
                  <View className="mt-6">
                    <LoyaltyCardView card={loyalty} />
                  </View>
                ) : null}

                {profileGroup.benefits.length === 0 ? (
                  <Text className="text-[14px] leading-5 text-muted-light dark:text-muted-dark mt-7">
                    Este local todavía no tiene premios para canjear. Cuando los cargue, los vas a ver aquí.
                  </Text>
                ) : null}

                {(['gratis', 'descuento'] as const).map((type) => {
                  const list = profileGroup.benefits.filter((b) => b.type === type);
                  if (list.length === 0) return null;
                  return (
                    <View key={type} className="mt-7">
                      <Text className="text-text-light dark:text-text-dark mb-3" style={typo.section}>
                        {type === 'gratis' ? 'Premios disponibles' : 'Descuentos'}
                      </Text>
                      <View style={{ gap: 12 }}>
                        {list.map((b) => {
                          const available = isBenefitAvailableNow(b);
                          // Online: los cupos son totales (no por día). Sin dato todavía, se deja canjear y el servidor valida.
                          const isWeb = !!b.online && b.online_channel === 'web';
                          const onlineInfo = onlineRedeemed?.get(b.id);
                          const unlimited = isWeb ? onlineInfo?.codesLeft == null : b.online ? b.online_quota == null : b.daily_quota == null;
                          const remaining = isWeb
                            ? (onlineInfo?.codesLeft ?? Infinity)
                            : b.online
                              ? (b.online_quota == null ? Infinity : Math.max(0, b.online_quota - (onlineInfo?.redeemed ?? 0)))
                              : (b.daily_quota == null ? Infinity : Math.max(0, b.daily_quota - (remainingToday?.get(b.id) ?? 0)));
                          // Si ya canjeó este premio online y el código sigue vigente, el botón vuelve a mostrar el código.
                          // Con cupón propio de la tienda el canje sale confirmado y el cupón se puede volver a ver durante la espera de 7 días.
                          const myPending = b.online
                            ? (myRedemptions ?? []).find((r) => {
                                if (r.benefit_id !== b.id) return false;
                                if (isWeb) return r.status === 'confirmed' && Date.now() - new Date(r.created_at.replace(/(\.\d{3})\d+/, '$1')).getTime() < BUSINESS_REDEMPTION_COOLDOWN_DAYS * 86_400_000;
                                return r.status === 'pending' && new Date(r.code_expires_at.replace(/(\.\d{3})\d+/, '$1')).getTime() > Date.now();
                              })
                            : undefined;
                          const outOfStock = !unlimited && remaining <= 0;
                          // Con la tarjeta completa, el premio de fidelidad sale gratis (0 Puntos).
                          const isLoyaltyPrize = loyalty?.benefit_id === b.id;
                          const freeByCard = isLoyaltyPrize && loyalty!.ready;
                          const cost = freeByCard ? 0 : b.cost_points;
                          const canAfford = (balance ?? 0) >= cost;
                          const canRedeem = !!myPending || (canAfford && available && !outOfStock);
                          const redeeming = redeem.isPending && redeem.variables === b.id;
                          const note = myPending ? null : !available ? 'Fuera de horario' : outOfStock ? (b.online ? 'Sin cupos' : 'Sin cupones hoy') : !canAfford ? (balance === undefined ? (balanceError ? 'No pudimos ver tus Puntos' : 'Cargando tus Puntos…') : 'Te faltan Puntos') : null;
                          return (
                            <Glass
                              key={b.id}
                              className="rounded-3xl p-3.5"
                              style={{ opacity: available && !outOfStock ? 1 : 0.7 }}
                            >
                              <Press
                                accessibilityRole="button"
                                accessibilityLabel={`${b.name}. Ver detalle: horario, validez y condiciones`}
                                onPress={() => setDetailBenefitId(b.id)}
                                className="flex-row items-center"
                                style={{ gap: 14 }}
                              >
                                {b.image_url ? (
                                  <Image source={{ uri: b.image_url }} style={{ width: 84, height: 84, borderRadius: 18 }} />
                                ) : (
                                  <View className="bg-purple-light-light dark:bg-purple-light-dark items-center justify-center" style={{ width: 84, height: 84, borderRadius: 18 }}>
                                    <Gift size={28} color={colors.purple} />
                                  </View>
                                )}
                                <View className="flex-1">
                                  <Text className="text-[16px] font-bold text-text-light dark:text-text-dark" numberOfLines={2}>{b.name}</Text>
                                  {isLoyaltyPrize ? (
                                    <Text className="text-[12px] font-bold mt-0.5" style={{ color: '#8F6307' }}>Premio de tu tarjeta</Text>
                                  ) : null}
                                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5" numberOfLines={2}>
                                    {b.type === 'descuento' ? b.discount_detail ?? 'Descuento' : 'Gratis'}
                                  </Text>
                                  {b.online ? (
                                    <Text className="text-[12px] font-bold mt-0.5 text-aqua-ink dark:text-aqua">
                                      Online · por {b.online_channel ? ONLINE_CHANNEL_LABEL[b.online_channel] : 'redes'}
                                    </Text>
                                  ) : null}
                                  {b.description ? (
                                    <Text className="text-[12.5px] leading-[17px] text-muted-light dark:text-muted-dark mt-1" numberOfLines={3}>
                                      {b.description}
                                    </Text>
                                  ) : null}
                                  <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
                                    <CoinPrice cost={cost} was={freeByCard ? b.cost_points : undefined} dim={!canRedeem} />
                                    {!unlimited && !outOfStock && available && remaining <= 3 ? (
                                      <Text className="text-[12px] font-semibold text-muted-light dark:text-muted-dark">{plural(remaining, 'Queda', 'Quedan')} {remaining} {b.online ? plural(remaining, 'cupo', 'cupos') : 'hoy'}</Text>
                                    ) : null}
                                  </View>
                                </View>
                              </Press>
                              <Press
                                accessibilityRole="button"
                                accessibilityState={{ busy: redeeming }}
                                onPress={() => {
                                  if (myPending) {
                                    runAfterClose(afterProfileClose, profileOpenRef.current, () => {
                                      setActiveBenefit(b);
                                      setActiveRedemption(myPending as unknown as Redemption);
                                    });
                                    closeProfile();
                                    return;
                                  }
                                  confirmRedeem(b);
                                }}
                                haptic="light"
                                disabled={!canRedeem || redeem.isPending}
                                className={`rounded-2xl items-center justify-center flex-row mt-3 ${canRedeem ? 'bg-aqua-deep' : 'bg-line-light dark:bg-line-dark'}`}
                                style={{ paddingVertical: 11, gap: 8 }}
                              >
                                {redeeming && <ActivityIndicator size="small" color="#fff" />}
                                <Text className={canRedeem ? 'text-white' : 'text-muted-light dark:text-muted-dark'} style={{ fontWeight: '700', fontSize: 14 }}>
                                  {redeeming ? 'Canjeando…' : myPending ? (isWeb ? 'Ver mi cupón' : 'Ver mi código') : note ?? 'Canjear'}
                                </Text>
                              </Press>
                            </Glass>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {profileGroup.business.lat != null && profileGroup.business.lng != null ? (
                  <View className="mt-8">
                    <Text className="text-[17px] font-bold text-text-light dark:text-text-dark mb-3">Cómo llegar</Text>
                    <Press
                      onPress={() => openFullMap(profileGroup.business.lat!, profileGroup.business.lng!, profileGroup.business.name)}
                      style={{ height: 170, borderRadius: 22, overflow: 'hidden', backgroundColor: '#1d1b2e' }}
                      accessibilityLabel="Abrir la ubicación en el mapa"
                    >
                      {/* Con las fotos abiertas encima, este mapa se desmonta (ver la vista previa del mapa). */}
                      {galleryOpen ? null : (
                      <MapView
                        key={profileGroup.business.id}
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        initialRegion={{
                          latitude: profileGroup.business.lat,
                          longitude: profileGroup.business.lng,
                          latitudeDelta: 0.006,
                          longitudeDelta: 0.006,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        toolbarEnabled={false}
                      >
                        <BusinessMarker business={profileGroup.business} />
                      </MapView>
                      )}
                      {/* El toque lo toma esta capa y no pointerEvents="none" en el mapa: en iPhone el mapa de Google se recicla
                          (la próxima pantalla con mapa reusa la misma vista) y react-native-maps no le devuelve los toques al
                          reciclarla, así que el mapa completo quedaba sin poder moverse después de pasar por una ficha. */}
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                    </Press>
                    <Text className="text-[15px] font-bold text-text-light dark:text-text-dark mt-3">{profileGroup.business.name}</Text>
                    {profileGroup.business.address ? (
                      <Text className="text-[13px] leading-[18px] text-muted-light dark:text-muted-dark mt-0.5">{profileGroup.business.address}</Text>
                    ) : null}
                    <Press
                      onPress={() => openFullMap(profileGroup.business.lat!, profileGroup.business.lng!, profileGroup.business.name)}
                      className="rounded-2xl items-center justify-center flex-row mt-3 bg-purple-light-light dark:bg-purple-light-dark"
                      style={{ paddingVertical: 13, gap: 8 }}
                    >
                      <Navigation size={16} color={colors.purple} />
                      <Text style={{ fontWeight: '700', fontSize: 14, color: colors.purple }}>Cómo llegar</Text>
                    </Press>
                  </View>
                ) : null}
                {profileGroup.business.google_review_url ? (
                  <Press
                    onPress={() => Linking.openURL(profileGroup.business.google_review_url!)}
                    className="rounded-2xl items-center justify-center flex-row mt-8"
                    style={{ backgroundColor: '#FFF3D1', paddingVertical: 13, gap: 8 }}
                  >
                    <Star size={16} color="#C98A0B" weight="fill" />
                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#9A6A08' }}>Calificar en Google Maps</Text>
                  </Press>
                ) : null}
              </View>
            </ScrollView>
          {/* Fotos del local: una capa dentro de la ficha, NO otro panel (Modal). En iPhone, un panel abierto encima
              de otro y cerrado junto con él dejaba la pantalla sin responder y el mapa, al abrirlo después, no se movía. */}
          {galleryOpen && galleryPhotos.length > 0 ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: '#0B0B10' }}>
              <View className="flex-row items-center justify-between px-5" style={{ paddingTop: 58, paddingBottom: 12 }}>
                <Press
                  onPress={() => setGalleryOpen(false)}
                  className="rounded-full items-center justify-center"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.16)' }}
                  accessibilityLabel="Cerrar las fotos"
                >
                  <X size={18} color="#fff" />
                </Press>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {Math.min(galleryIndex + 1, galleryPhotos.length)} de {galleryPhotos.length}
                </Text>
                <View style={{ width: 40 }} />
              </View>
              <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12 }}>
                {galleryPhotos[galleryIndex] ? (
                  <Image
                    source={{ uri: galleryPhotos[galleryIndex] }}
                    style={{ width: '100%', height: '88%', borderRadius: 20 }}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
              {galleryPhotos.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 36 }}>
                  {galleryPhotos.map((uri, i) => (
                    <Press key={uri} onPress={() => setGalleryIndex(i)} accessibilityLabel={`Foto ${i + 1}`}>
                      <Image
                        source={{ uri }}
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: 14,
                          opacity: i === galleryIndex ? 1 : 0.55,
                          borderWidth: i === galleryIndex ? 2 : 0,
                          borderColor: '#fff',
                        }}
                      />
                    </Press>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
          {detailBenefit && profileGroup ? (
            <BenefitDetailOverlay benefit={detailBenefit} business={profileGroup.business} onClose={() => setDetailBenefitId(null)} />
          ) : null}
          </View>
        )}
      </Modal>

      {/* Código del local (4 números) */}
      <LocalCodeSheet
        visible={!!localCodeFor}
        businessName={localCodeFor?.business.name ?? ''}
        logoUrl={localCodeFor?.business.logo_url}
        category={localCodeFor?.business.category}
        benefitName={localCodeFor?.name ?? ''}
        costPoints={localCodeFor?.cost_points ?? 0}
        free={!!localCodeFor && loyalty?.benefit_id === localCodeFor.id && !!loyalty.ready}
        onClose={() => setLocalCodeFor(null)}
        onSubmit={(code) => (localCodeFor ? submitLocalCode(localCodeFor, code) : Promise.resolve(null))}
        onSuccess={() => {
          const done = localResult.current;
          localResult.current = null;
          if (!done) return;
          runAfterClose(afterLocalCodeClose, true, () => {
            setActiveBenefit(done.benefit);
            setActiveRedemption(done.redemption);
          });
          setLocalCodeFor(null);
        }}
        onDismiss={() => flushAfterClose(afterLocalCodeClose)}
      />

      {/* Código de canje */}
      <Modal visible={!!activeRedemption} transparent animationType="slide" onRequestClose={closeCode} onDismiss={() => flushAfterClose(afterCodeClose)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <Glass className="rounded-t-[32px] px-6 pt-3 pb-10">
            <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />

            <View className="flex-row items-center justify-between gap-2.5 mb-5">
              <View className="flex-row items-center gap-2.5 flex-1">
                {activeBenefit && businessIcon(activeBenefit.business.name, 38, activeBenefit.business.logo_url, activeBenefit.business.category)}
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{activeBenefit?.business.name}</Text>
                  <Text className="text-xs text-muted-light dark:text-muted-dark">{activeBenefit?.name}</Text>
                </View>
              </View>
              {!confirmed && activeBenefit?.business.lat != null && activeBenefit?.business.lng != null ? (
                <Press
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => openFullMap(activeBenefit.business.lat!, activeBenefit.business.lng!, activeBenefit.business.name)}
                  className="flex-row items-center gap-1 bg-purple-light-light dark:bg-purple-light-dark rounded-full px-3 py-1.5"
                >
                  <Locate size={12} color={colors.purple} />
                  <Text className="text-[12px] font-bold text-purple-ink dark:text-purple-soft">Cómo llegar</Text>
                </Press>
              ) : null}
            </View>

            {activeBenefit?.description ? (
              <Text className="text-[13.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">{activeBenefit.description}</Text>
            ) : null}

            {activeBenefit && benefitConditions(activeBenefit).length > 0 && (
              <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl px-4 py-3 mb-4 gap-1">
                {benefitConditions(activeBenefit).map((line) => (
                  <Text key={line} className="text-[12px] font-semibold text-purple-ink dark:text-purple-soft">{line}</Text>
                ))}
              </View>
            )}

            {activeBenefit?.online && activeBenefit.online_channel === 'web' && activeRedemption ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 px-4 items-center mb-4">
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-2 text-center">
                    Tu cupón de {activeBenefit.business.name}
                  </Text>
                  <Text
                    accessibilityLabel={`Cupón ${activeRedemption.code}`}
                    selectable
                    className="text-[28px] font-extrabold tracking-[3px] text-purple text-center"
                  >
                    {activeRedemption.code}
                  </Text>
                  <Press accessibilityRole="button" hitSlop={8} onPress={() => copyText(activeRedemption.code, 'code')} className="mt-2.5 px-3 py-1.5">
                    <Text className="text-[13px] font-bold text-purple-ink dark:text-purple-soft">{copiedKey === 'code' ? '¡Cupón copiado!' : 'Copiar cupón'}</Text>
                  </Press>
                </View>
                <Text className="text-[13px] leading-5 text-muted-light dark:text-muted-dark mb-3">
                  Abre la tienda, arma tu pedido y pega este cupón en el campo cupón antes de pagar. Ya se descontaron tus Puntos.
                </Text>
                {activeBenefit.business.website ? (
                  <Press
                    accessibilityRole="button"
                    onPress={() => Linking.openURL(websiteUrl(activeBenefit.business.website!)).catch(() => Alert.alert('No pudimos abrir la tienda', 'Copia el cupón y entra a su página.'))}
                    className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5"
                  >
                    <Text className="text-white font-bold text-[15px]">Ir a la tienda</Text>
                  </Press>
                ) : null}
                <Press accessibilityRole="button" onPress={closeCode} className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mb-2.5">
                  <Text className="text-purple-ink dark:text-purple-soft font-semibold text-[14px]">Listo</Text>
                </Press>
              </>
            ) : confirmed ? (
              <View className="items-center">
                {paso === 'ok' ? (
                  <View className="bg-aqua-light-light dark:bg-aqua-light-dark rounded-3xl py-6 px-4 items-center mb-4 w-full">
                    <BaifoMascot pose="festeja" height={132} />
                    <Text accessibilityLiveRegion="polite" className="text-aqua-ink dark:text-aqua font-extrabold text-[17px] mt-3">¡Canje confirmado!</Text>
                    <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-1 text-center">
                      {activeBenefit?.business.name} ya te entregó tu beneficio.
                    </Text>
                    {activeId && bonusById[activeId] ? (
                      <Text accessibilityLiveRegion="polite" className="text-aqua-ink dark:text-aqua text-[13px] font-bold mt-2 text-center">
                        {`¡+${bonusById[activeId]} Puntos por probar un local nuevo!`}
                      </Text>
                    ) : null}
                    {activeLoyalty ? (
                      <Text className="text-text-light dark:text-text-dark text-[13px] font-semibold mt-2 text-center">
                        {activeLoyalty.stamps === 0
                          ? 'Usaste el premio de tu tarjeta: empieza de nuevo.'
                          : activeLoyalty.ready
                            ? '¡Tarjeta completa! Tu próximo premio sale gratis.'
                            : `Sumaste un sello: ${activeLoyalty.stamps} de ${activeLoyalty.goal}.`}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {paso === 'ok' ? (
                  answered ? (
                    <Press
                      accessibilityRole="button"
                      onPress={() => setPaso(reviewUrl ? 'resena' : 'historia')}
                      className="w-full bg-aqua-deep rounded-2xl py-3.5 items-center"
                    >
                      <Text className="text-white font-bold text-[14px]">Continuar</Text>
                    </Press>
                  ) : (
                    <FollowupQuestion
                      businessName={activeBenefit?.business.name ?? 'el local'}
                      onAnswer={(extra) => {
                        answerFollowup(extra);
                        setPaso(reviewUrl ? 'resena' : 'historia');
                      }}
                    />
                  )
                ) : null}
                {paso === 'resena' ? (
                  <ReviewStep
                    businessName={activeBenefit?.business.name ?? 'el local'}
                    onReview={() => {
                      if (reviewUrl) Linking.openURL(reviewUrl);
                      setPaso('historia');
                    }}
                    onSkip={() => setPaso('historia')}
                  />
                ) : null}
                {paso === 'historia' ? <StoryStep onStory={startStoryFromCode} onSkip={closeCode} /> : null}
              </View>
            ) : activeBenefit?.online && !expired && activeRedemption ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 px-4 items-center mb-4">
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-2 text-center">
                    Tu código para {activeBenefit.business.name}
                  </Text>
                  <Text
                    accessibilityLabel={`Código ${activeRedemption.code.split('').join(' ')}`}
                    className="text-[34px] font-extrabold tracking-[8px] text-purple"
                  >
                    {activeRedemption.code.slice(0, 3)} {activeRedemption.code.slice(3)}
                  </Text>
                  <Press accessibilityRole="button" hitSlop={8} onPress={() => copyText(activeRedemption.code, 'code')} className="mt-2.5 px-3 py-1.5">
                    <Text className="text-[13px] font-bold text-purple-ink dark:text-purple-soft">{copiedKey === 'code' ? '¡Código copiado!' : 'Copiar código'}</Text>
                  </Press>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2 text-center">
                    Vale hasta el {dayMonth(activeRedemption.code_expires_at)}. Tus Puntos se descuentan cuando la tienda lo confirma.
                  </Text>
                </View>
                {(() => {
                  const message = onlineMessage(activeBenefit.name, activeRedemption.code);
                  const contact = onlineContact(activeBenefit.business, activeBenefit.online_channel, message);
                  const via = activeBenefit.online_channel ? ONLINE_CHANNEL_LABEL[activeBenefit.online_channel] : 'sus redes';
                  return (
                    <>
                      <Text className="text-[13px] leading-5 text-muted-light dark:text-muted-dark mb-3">
                        Mándale este código a la tienda por {via} y coordinen el pago y la entrega. Ellos lo confirman cuando lo reciban.
                      </Text>
                      <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl px-4 py-3 mb-3">
                        <Text className="text-[12.5px] leading-[18px] text-purple-ink dark:text-purple-soft">{message.replace(/\*/g, '')}</Text>
                      </View>
                      {contact ? (
                        <Press
                          accessibilityRole="button"
                          onPress={async () => {
                            // Solo WhatsApp acepta el texto ya escrito; en las redes se copia el mensaje para pegarlo en el chat.
                            if (!contact.prefilled) await copyText(message, 'msg');
                            Linking.openURL(contact.url).catch(() => Alert.alert('No pudimos abrir el enlace', 'Copia el mensaje y escríbele a la tienda.'));
                          }}
                          className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5"
                        >
                          <Text className="text-white font-bold text-[15px]">
                            {contact.prefilled ? 'Escribir por WhatsApp' : `Copiar mensaje y abrir ${via}`}
                          </Text>
                        </Press>
                      ) : null}
                      <Press accessibilityRole="button" onPress={() => copyText(message, 'msg')} className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mb-2.5">
                        <Text className="text-purple-ink dark:text-purple-soft font-semibold text-[14px]">{copiedKey === 'msg' ? '¡Mensaje copiado!' : 'Copiar mensaje'}</Text>
                      </Press>
                    </>
                  );
                })()}
              </>
            ) : !expired ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 items-center mb-4">
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-1.5">Muestra este código en el mostrador</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-2 px-6 text-center">Tus Puntos se descuentan cuando el local lo confirma.</Text>
                  {/* Se lee dígito por dígito, para dictárselo al comercio. */}
                  <Text
                    accessibilityLabel={`Código ${(activeRedemption?.code ?? '').split('').join(' ')}`}
                    className="text-[34px] font-extrabold tracking-[8px] text-purple"
                  >
                    {activeRedemption?.code.slice(0, 3)} {activeRedemption?.code.slice(3)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-center gap-2.5 mb-6">
                  <ProgressRing size={34} strokeWidth={4} progress={remainingMs / ttlMs} progressColor={colors.warn} trackColor={colors.light.line} />
                  <Text className="text-[13px] text-muted-light dark:text-muted-dark">
                    Vence en <Text className="font-bold text-text-light dark:text-text-dark">{mm}:{ss}</Text>
                  </Text>
                </View>
                {/* "Ya lo mostré" no cierra: queda esperando que el local valide y pasa solo a "Canje confirmado". */}
                {shownId === activeId ? (
                  <View accessibilityLiveRegion="polite" className="flex-row items-center justify-center gap-2.5 bg-bg-light dark:bg-bg-dark rounded-2xl py-4 mb-2.5">
                    <ActivityIndicator size="small" color={colors.aqua} />
                    <Text className="text-[14px] font-semibold text-text-light dark:text-text-dark">
                      Esperando que {activeBenefit?.business.name ?? 'el local'} lo confirme…
                    </Text>
                  </View>
                ) : (
                  <Press accessibilityRole="button" onPress={() => setShownId(activeId)} className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5">
                    <Text className="text-white font-bold text-[15px]">Ya lo mostré</Text>
                  </Press>
                )}
              </>
            ) : (
              <>
                <View className="bg-warn-light rounded-3xl py-6 items-center mb-4">
                  <Text accessibilityLiveRegion="polite" className="text-warn-deep font-bold text-base">Código vencido</Text>
                  <Text className="text-[#8A5A2E] text-xs mt-1">
                    {activeBenefit?.online ? 'La tienda no llegó a confirmarlo a tiempo.' : 'No llegaste a mostrarlo a tiempo.'}
                  </Text>
                </View>
                <Press accessibilityRole="button" onPress={handleCancelExpired} disabled={cancelExpired.isPending} className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5">
                  <Text className="text-white font-bold text-[15px]">Cancelar y recuperar Puntos</Text>
                </Press>
                <Press accessibilityRole="button" onPress={handleRegenerate} disabled={regenerate.isPending} className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mb-2.5">
                  <Text className="text-purple-ink dark:text-purple-soft font-semibold text-[14px]">Generar un código nuevo</Text>
                </Press>
              </>
            )}
            <Press accessibilityRole="button" hitSlop={{ top: 6, bottom: 20 }} onPress={closeCode} style={{ marginTop: 14 }}>
              <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center">Cerrar</Text>
            </Press>
          </Glass>
        </View>
      </Modal>
      {story.element}
    </View>
  );
}
