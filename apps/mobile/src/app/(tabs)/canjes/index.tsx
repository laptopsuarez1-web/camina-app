import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Search, MapPin, ChevronRight, X, Gift, AtSign, Locate, Navigation, MapIcon, Heart, Star, Check, IconBubble } from '@/components/icons';
import {
  useBenefits,
  useBenefitsRemainingToday,
  useRedeemBenefit,
  useRegenerateCode,
  useCancelExpiredRedemption,
  type BenefitWithBusiness,
} from '@/hooks/useBenefits';
import { usePointsBalance } from '@/hooks/usePoints';
import { BellButton } from '@/components/ui/BellButton';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { BusinessHours } from '@/components/BusinessHours';
import { shareCoarseLocation } from '@/lib/coarse-location';
import { BusinessAvatar, categoryStyle } from '@/components/CategoryAvatar';
import type { Redemption } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { REDEMPTION_CODE_TTL_MINUTES } from '@/constants/business-rules';
import { Glass } from '@/components/ui/Glass';

type BusinessT = BenefitWithBusiness['business'];

// Comercios del plan Paso Adelante: van primero, con marco y sello dorado.
const GOLD = '#E2B33C';
const isFeatured = (b: { plan?: string | null }) => b.plan === 'paso_adelante';

// Centro de Tarija (ciudad de lanzamiento) — último respaldo si no hay GPS ni comercios con ubicación.
const TARIJA_REGION = {
  latitude: -21.5355,
  longitude: -64.7296,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

// Mismo criterio que redeem_benefit en supabase/migrations (el servidor igual
// lo vuelve a validar; esto solo evita dejar apretar un botón que va a fallar).
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

function distanceMeters(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
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

function businessIcon(_name: string, size: number, logoUrl?: string | null, category?: string | null) {
  return <BusinessAvatar logoUrl={logoUrl} category={category} size={size} />;
}

function GoldBadge({ size = 20 }: { size?: number }) {
  return <Image source={require('@/../assets/camina-coin-gold.png')} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}

function MapMarker({ name, logoUrl, featured }: { name: string; logoUrl?: string | null; featured?: boolean }) {
  const size = featured ? 48 : 40;
  const box = size + 22; // espacio de sobra para que nada se corte al convertir el pin en imagen
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#fff',
          borderWidth: featured ? 3.5 : 2.5,
          borderColor: featured ? GOLD : colors.aqua,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }} />
        ) : (
          <Text style={{ color: featured ? GOLD : colors.aqua, fontWeight: '800', fontSize: 16 }}>{name[0]}</Text>
        )}
      </View>
      {featured && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image source={require('@/../assets/camina-coin-gold.png')} style={{ width: 22, height: 22, borderRadius: 11 }} />
        </View>
      )}
    </View>
  );
}

// Los pines de Android se "fotografían" una vez: hay que dejar que carguen las
// imágenes antes de congelarlos, si no salen cortados o vacíos.
function BusinessMarker({ business, onPress }: { business: BusinessT; onPress?: () => void }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker
      coordinate={{ latitude: business.lat!, longitude: business.lng! }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
    >
      <MapMarker name={business.name} logoUrl={business.logo_url} featured={isFeatured(business)} />
    </Marker>
  );
}

function CoinPrice({ cost, dim }: { cost: number; dim?: boolean }) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ gap: 5, backgroundColor: dim ? colors.light.line : colors.aqua, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 }}
    >
      <Image source={require('@/../assets/camina-coin.png')} style={{ width: 20, height: 20, borderRadius: 10 }} />
      <Text style={{ color: dim ? colors.light.muted : '#fff', fontSize: 13, fontWeight: '700' }}>{cost}</Text>
    </View>
  );
}

// Marca de éxito animada: la burbuja entra con un rebote y el anillo se expande una vez.
function SuccessMark() {
  const [scale] = useState(() => new Animated.Value(0.4));
  const [ring] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [scale, ring]);
  return (
    <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 84,
          height: 84,
          borderRadius: 42,
          borderWidth: 3,
          borderColor: colors.aqua,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.35] }) }],
        }}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconBubble icon={Check} tone="aqua" size={62} />
      </Animated.View>
    </View>
  );
}


export default function CanjesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: benefits, isLoading } = useBenefits();
  const { data: remainingToday } = useBenefitsRemainingToday();
  const { data: balance } = usePointsBalance();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const redeem = useRedeemBenefit();
  const regenerate = useRegenerateCode();
  const cancelExpired = useCancelExpiredRedemption();

  const [category, setCategory] = useState('Todos');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const favorites = useFavorites();
  const favIds = favorites.ids;
  const [search, setSearch] = useState('');
  const [showZonePrompt, setShowZonePrompt] = useState(true);
  const [zoneInput, setZoneInput] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [profileBusinessId, setProfileBusinessId] = useState<string | null>(null);
  const [activeRedemption, setActiveRedemption] = useState<Redemption | null>(null);
  const [activeBenefit, setActiveBenefit] = useState<BenefitWithBusiness | null>(null);

  // Seguimiento del canje: cuando el comercio confirma el código, se pregunta si compró algo más.
  const activeId = activeRedemption?.id ?? null;
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const confirmed = !!activeId && confirmedId === activeId;
  const answered = !!activeId && answeredId === activeId;
  useEffect(() => {
    if (!activeId) return;
    const check = async () => {
      const { data } = await supabase.from('redemptions').select('status').eq('id', activeId).maybeSingle();
      if (data?.status === 'confirmed') setConfirmedId(activeId);
    };
    check();
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, [activeId]);

  async function answerFollowup(extra: boolean) {
    if (!activeId) return;
    setAnsweredId(activeId);
    await supabase.rpc('answer_redemption_followup', { p_redemption_id: activeId, p_extra: extra });
  }

  const remainingMs = useCountdown(activeRedemption?.code_expires_at ?? null);
  const expired = !!activeRedemption && remainingMs <= 0;
  const ttlMs = REDEMPTION_CODE_TTL_MINUTES * 60_000;

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
    return [...map.values()];
  }, [benefits]);

  // Sin GPS, el mapa se centra en donde están los comercios (sirve igual para
  // Tarija que para Santa Cruz o La Paz cuando se sumen).
  const mapRegion = useMemo(() => {
    if (hasGps || !businessesWithCoords.length) return baseRegion;
    const lat = businessesWithCoords.reduce((acc, b) => acc + b.lat!, 0) / businessesWithCoords.length;
    const lng = businessesWithCoords.reduce((acc, b) => acc + b.lng!, 0) / businessesWithCoords.length;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.045, longitudeDelta: 0.045 };
  }, [hasGps, businessesWithCoords, baseRegion]);

  const categories = useMemo(() => {
    const set = new Set((benefits ?? []).map((b) => b.business.category));
    return ['Todos', ...set];
  }, [benefits]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, { business: BusinessT; benefits: BenefitWithBusiness[] }>();
    for (const b of benefits ?? []) {
      if (category !== 'Todos' && b.business.category !== category) continue;
      if (q && !(b.business.name + ' ' + b.name + ' ' + b.business.category).toLowerCase().includes(q)) continue;
      if (!map.has(b.business.id)) map.set(b.business.id, { business: b.business, benefits: [] });
      map.get(b.business.id)!.benefits.push(b);
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
    // Destacados siempre primero (también dentro de cada categoría), después por cercanía.
    list.sort(
      (a, b) =>
        Number(isFeatured(b.business)) - Number(isFeatured(a.business)) ||
        (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
        a.business.name.localeCompare(b.business.name)
    );
    return list;
  }, [benefits, category, search, onlyOpen, onlyFavs, favIds, hasGps, mapRegion]);

  const profileGroup = useMemo(() => {
    if (!profileBusinessId) return null;
    const list = (benefits ?? []).filter((b) => b.business.id === profileBusinessId);
    return list.length ? { business: list[0].business, benefits: list } : null;
  }, [benefits, profileBusinessId]);

  async function handleRedeem(benefitId: string, benefit: BenefitWithBusiness) {
    try {
      const result = await redeem.mutateAsync(benefitId);
      // Primero se cierra la ficha del comercio; el modal del código se abre
      // recién después para que iOS no intente mostrar dos modales a la vez.
      setProfileBusinessId(null);
      setTimeout(() => {
        setActiveBenefit(benefit);
        setActiveRedemption(result);
      }, 350);
    } catch (e) {
      Alert.alert('No se pudo canjear', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  }

  async function handleRegenerate() {
    if (!activeRedemption) return;
    const result = await regenerate.mutateAsync(activeRedemption.id);
    setActiveRedemption(result);
  }

  async function handleCancelExpired() {
    if (!activeRedemption) return;
    await cancelExpired.mutateAsync(activeRedemption.id);
    setActiveRedemption(null);
    setActiveBenefit(null);
  }

  async function saveZone(zone: string) {
    if (!profile) return;
    setShowZonePrompt(false);
    await supabase.from('profiles').update({ zone }).eq('id', profile.id);
    await useAuthStore.getState().refreshProfile();
  }

  function closeCode() {
    setActiveRedemption(null);
    setActiveBenefit(null);
  }

  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
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
          {mapRegion ? (
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
              {businessesWithCoords.map((b) => (
                <BusinessMarker key={b.id} business={b} />
              ))}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.aqua} />
            </View>
          )}

          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: 54, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Pressable
              onPress={() => router.push('/(tabs)/puntos')}
              className="flex-row items-center bg-card-light rounded-full pl-1.5 pr-3"
              style={{ height: 32, gap: 6 }}
            >
              <Image source={require('@/../assets/camina-coin.png')} style={{ width: 20, height: 20, borderRadius: 10 }} />
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.light.text }}>{balance ?? 0}</Text>
            </Pressable>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <BellButton color={colors.light.muted} bg="#fff" />
              <Pressable
                onPress={() => router.push('/(tabs)/perfil')}
                className="bg-mint rounded-full items-center justify-center overflow-hidden"
                style={{ width: 32, height: 32 }}
              >
                {profile?.photo_url ? (
                  <Image source={{ uri: profile.photo_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
            <Pressable
              onPress={() => setMapOpen(true)}
              className="flex-row items-center bg-card-light rounded-full"
              style={{ gap: 8, paddingHorizontal: 18, paddingVertical: 11, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <MapIcon size={16} color={colors.aqua} />
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.light.text }}>Explorar el mapa</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-5 pt-5">
          <Text className="text-[21px] font-extrabold text-text-light dark:text-text-dark" style={{ letterSpacing: -0.5 }}>
            Canjear
          </Text>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">{balance ?? 0} Puntos disponibles</Text>

          {!profile?.zone && showZonePrompt && (
            <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-3.5">
              <Text className="text-[13px] font-semibold mb-2.5 text-text-light dark:text-text-dark">¿Desde qué zona caminás?</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={zoneInput}
                  onChangeText={setZoneInput}
                  placeholder="Ej: Equipetrol, Centro, Los Pinos…"
                  placeholderTextColor={colors.light.muted}
                  className="flex-1 bg-white dark:bg-card-dark rounded-full px-3.5 py-2 text-xs text-text-light dark:text-text-dark"
                  onSubmitEditing={() => zoneInput.trim() && saveZone(zoneInput.trim())}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={() => zoneInput.trim() && saveZone(zoneInput.trim())}
                  disabled={!zoneInput.trim()}
                  className="bg-purple rounded-full px-3.5 py-2"
                >
                  <Text className="text-xs font-semibold text-white">Guardar</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setShowZonePrompt(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark mt-2">Ahora no</Text>
              </Pressable>
            </View>
          )}

          <Glass className="flex-row items-center gap-2 rounded-2xl px-3.5 py-3 mb-3">
            <Search size={16} color={colors.light.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar comercios o categorías…"
              placeholderTextColor={colors.light.muted}
              className="flex-1 text-[13.5px] text-text-light dark:text-text-dark"
            />
          </Glass>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            <Pressable
              onPress={() => setOnlyOpen((v) => !v)}
              className="rounded-full border px-3.5 py-2"
              style={{ backgroundColor: onlyOpen ? colors.aqua : colors.light.card, borderColor: onlyOpen ? colors.aqua : colors.light.line }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: onlyOpen ? '#fff' : colors.light.muted }}>Disponibles ahora</Text>
            </Pressable>
            <Pressable
              onPress={() => setOnlyFavs((v) => !v)}
              className="flex-row items-center rounded-full border px-3.5 py-2"
              style={{ gap: 5, backgroundColor: onlyFavs ? '#E5484D' : colors.light.card, borderColor: onlyFavs ? '#E5484D' : colors.light.line }}
            >
              <Heart size={12} color={onlyFavs ? '#fff' : colors.light.muted} fill={onlyFavs ? '#fff' : 'none'} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: onlyFavs ? '#fff' : colors.light.muted }}>Favoritos</Text>
            </Pressable>
            {categories.map((c) => {
              const st = categoryStyle(c);
              const CIcon = st.icon;
              const on = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className="flex-row items-center rounded-full border"
                  style={{
                    gap: 6,
                    paddingVertical: 7,
                    paddingLeft: 10,
                    paddingRight: 13,
                    backgroundColor: on ? st.to : colors.light.card,
                    borderColor: on ? st.to : colors.light.line,
                  }}
                >
                  <CIcon size={16} color={on ? '#fff' : st.to} weight={on ? 'fill' : 'duotone'} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#fff' : colors.light.muted }}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="px-5 pt-4" style={{ gap: 12 }}>
          {isLoading && <ActivityIndicator color={colors.aqua} />}

          {groups.map((g) => (
            <Pressable
              key={g.business.id}
              onPress={() => setProfileBusinessId(g.business.id)}
              className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-3xl p-4"
              style={{
                shadowColor: '#291C47', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1,
                ...(isFeatured(g.business) ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.25 } : {}),
              }}
            >
              <View className="flex-row items-start" style={{ gap: 14 }}>
                {businessIcon(g.business.name, 62, g.business.logo_url, g.business.category)}
                <View className="flex-1">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-[16px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>{g.business.name}</Text>
                    {isFeatured(g.business) && <GoldBadge size={18} />}
                  </View>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">{g.business.category}</Text>
                  {g.business.address ? (
                    <View className="flex-row items-center mt-1.5" style={{ gap: 5 }}>
                      <MapPin size={12} color={colors.aqua} />
                      <Text className="flex-1 text-[12px] text-aqua" numberOfLines={1}>{g.business.address}</Text>
                    </View>
                  ) : null}
                  <Text className="text-[12px] font-semibold mt-1" style={{ color: g.openNow ? '#2E9E7C' : colors.light.muted }}>
                    {g.openNow ? 'Disponible ahora' : 'Fuera de horario'}
                    {g.distance != null ? ` · ${formatDistance(g.distance)}` : ''}
                  </Text>
                </View>
                <View className="items-center" style={{ gap: 10 }}>
                  <Pressable onPress={() => favorites.toggle(g.business.id)} hitSlop={10}>
                    <Heart size={20} color={favorites.isFavorite(g.business.id) ? '#E5484D' : colors.light.muted} fill={favorites.isFavorite(g.business.id) ? '#E5484D' : 'none'} />
                  </Pressable>
                  <ChevronRight size={18} color={colors.light.muted} />
                </View>
              </View>

              <Text className="text-[11.5px text-muted-light dark:text-muted-dark mt-3.5 mb-2">Premios disponibles</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {g.benefits.map((b) => (
                  <View
                    key={b.id}
                    className="flex-row items-center bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-full"
                    style={{ gap: 6, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 }}
                  >
                    <Image source={require('@/../assets/camina-coin.png')} style={{ width: 18, height: 18, borderRadius: 9 }} />
                    <Text className="text-[12px] font-semibold text-text-light dark:text-text-dark">{b.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          ))}

          {!isLoading && groups.length === 0 && (
            <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center py-8">
              Todavía no hay comercios con estos filtros.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Mapa completo */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#1d1b2e' }}>
          {mapRegion && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              customMapStyle={DARK_MAP_STYLE}
              showsUserLocation={hasGps}
            >
              {businessesWithCoords.map((b) => (
                <BusinessMarker
                  key={b.id}
                  business={b}
                  onPress={() => {
                    setMapOpen(false);
                    setTimeout(() => setProfileBusinessId(b.id), 350);
                  }}
                />
              ))}
            </MapView>
          )}
          <Pressable
            onPress={() => setMapOpen(false)}
            className="absolute bg-card-light rounded-full items-center justify-center"
            style={{ top: 56, left: 20, width: 40, height: 40 }}
          >
            <X size={18} color={colors.light.text} />
          </Pressable>
          {mapRegion && (
            <Pressable
              onPress={() => openFullMap(mapRegion.latitude, mapRegion.longitude, 'Comercios cerca tuyo')}
              className="absolute flex-row items-center bg-card-light rounded-full"
              style={{ bottom: 44, alignSelf: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12 }}
            >
              <Navigation size={15} color={colors.purple} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: colors.light.text }}>Abrir en Google Maps</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      {/* Ficha del comercio */}
      <Modal visible={!!profileGroup} animationType="slide" onRequestClose={() => setProfileBusinessId(null)}>
        {profileGroup && (
          <View className="flex-1 bg-bg-light dark:bg-bg-dark">
            <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
              <View style={{ height: 170, backgroundColor: colors.purple }}>
                {profileGroup.business.cover_url ? (
                  <Image source={{ uri: profileGroup.business.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: colors.authBg }} />
                )}
                <Pressable
                  onPress={() => setProfileBusinessId(null)}
                  className="absolute bg-card-light rounded-full items-center justify-center"
                  style={{ top: 54, left: 20, width: 40, height: 40 }}
                >
                  <X size={18} color={colors.light.text} />
                </Pressable>
              </View>

              <View className="px-5" style={{ marginTop: -36 }}>
                <View style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4, alignSelf: 'flex-start' }}>
                  {businessIcon(profileGroup.business.name, 84, profileGroup.business.logo_url, profileGroup.business.category)}
                </View>
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
                    <Text className="text-[24px] font-extrabold text-text-light dark:text-text-dark shrink" style={{ letterSpacing: -0.5 }}>
                      {profileGroup.business.name}
                    </Text>
                    {isFeatured(profileGroup.business) && <GoldBadge size={24} />}
                  </View>
                  <Pressable onPress={() => favorites.toggle(profileGroup.business.id)} hitSlop={10} className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full items-center justify-center" style={{ width: 40, height: 40 }}>
                    <Heart size={19} color={favorites.isFavorite(profileGroup.business.id) ? '#E5484D' : colors.light.muted} fill={favorites.isFavorite(profileGroup.business.id) ? '#E5484D' : 'none'} />
                  </Pressable>
                </View>

                <Text className="text-[13px] text-muted-light dark:text-muted-dark">{profileGroup.business.category}</Text>

                {profileGroup.business.description ? (
                  <Text className="text-[14px] leading-5 text-muted-light dark:text-muted-dark mt-3">{profileGroup.business.description}</Text>
                ) : null}

                <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
                  {profileGroup.business.address ? (
                    <Pressable
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
                      <MapPin size={14} color={colors.aqua} />
                      <Text className="text-[12.5px] font-semibold text-aqua">{profileGroup.business.address}</Text>
                    </Pressable>
                  ) : null}
                  <BusinessHours openingHours={profileGroup.business.opening_hours} hoursText={profileGroup.business.hours_text} />
                  {profileGroup.business.instagram ? (
                    <Pressable
                      onPress={() => Linking.openURL(`https://instagram.com/${profileGroup.business.instagram!.replace('@', '')}`)}
                      className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
                      style={{ gap: 6 }}
                    >
                      <AtSign size={14} color={colors.light.text} />
                      <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">
                        {profileGroup.business.instagram.replace('@', '')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {(['gratis', 'descuento'] as const).map((type) => {
                  const list = profileGroup.benefits.filter((b) => b.type === type);
                  if (list.length === 0) return null;
                  return (
                    <View key={type} className="mt-7">
                      <Text className="text-[17px] font-bold text-text-light dark:text-text-dark mb-3">
                        {type === 'gratis' ? 'Premios disponibles' : 'Descuentos'}
                      </Text>
                      <View style={{ gap: 12 }}>
                        {list.map((b) => {
                          const available = isBenefitAvailableNow(b);
                          const unlimited = b.daily_quota == null;
                          const remaining = b.daily_quota == null ? Infinity : Math.max(0, b.daily_quota - (remainingToday?.get(b.id) ?? 0));
                          const outOfStock = !unlimited && remaining <= 0;
                          const canAfford = (balance ?? 0) >= b.cost_points;
                          const canRedeem = canAfford && available && !outOfStock;
                          const redeeming = redeem.isPending && redeem.variables === b.id;
                          const note = !available ? 'Fuera de horario' : outOfStock ? 'Sin cupones hoy' : !canAfford ? 'Te faltan Puntos' : null;
                          return (
                            <Glass
                              key={b.id}
                              className="rounded-3xl p-3.5"
                              style={{ opacity: available && !outOfStock ? 1 : 0.7 }}
                            >
                              <View className="flex-row items-center" style={{ gap: 14 }}>
                                {b.image_url ? (
                                  <Image source={{ uri: b.image_url }} style={{ width: 84, height: 84, borderRadius: 18 }} />
                                ) : (
                                  <View className="bg-purple-light-light dark:bg-purple-light-dark items-center justify-center" style={{ width: 84, height: 84, borderRadius: 18 }}>
                                    <Gift size={28} color={colors.purple} />
                                  </View>
                                )}
                                <View className="flex-1">
                                  <Text className="text-[16px] font-bold text-text-light dark:text-text-dark" numberOfLines={2}>{b.name}</Text>
                                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5" numberOfLines={2}>
                                    {b.type === 'descuento' ? b.discount_detail ?? 'Descuento' : 'Gratis'}
                                  </Text>
                                  <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
                                    <CoinPrice cost={b.cost_points} dim={!canRedeem} />
                                    {!unlimited && !outOfStock && available && remaining <= 3 ? (
                                      <Text className="text-[11px] font-semibold text-muted-light dark:text-muted-dark">Quedan {remaining} hoy</Text>
                                    ) : null}
                                  </View>
                                </View>
                              </View>
                              <Pressable
                                onPress={() => handleRedeem(b.id, b)}
                                disabled={!canRedeem || redeem.isPending}
                                className="rounded-2xl items-center justify-center flex-row mt-3"
                                style={{ backgroundColor: canRedeem ? colors.aqua : colors.light.line, paddingVertical: 11, gap: 8 }}
                              >
                                {redeeming && <ActivityIndicator size="small" color="#fff" />}
                                <Text style={{ fontWeight: '700', fontSize: 14, color: canRedeem ? '#fff' : colors.light.muted }}>
                                  {redeeming ? 'Canjeando…' : note ?? 'Canjear'}
                                </Text>
                              </Pressable>
                            </Glass>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Código de canje */}
      <Modal visible={!!activeRedemption} transparent animationType="slide" onRequestClose={closeCode}>
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
              {confirmed && activeBenefit?.business.google_review_url ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => Linking.openURL(activeBenefit.business.google_review_url!)}
                  className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: '#FFF3D1' }}
                >
                  <Star size={12} color="#C98A0B" weight="fill" />
                  <Text className="text-[10.5px] font-bold" style={{ color: '#9A6A08' }}>Calificar en Google Maps</Text>
                </Pressable>
              ) : !confirmed && activeBenefit?.business.lat != null && activeBenefit?.business.lng != null ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => openFullMap(activeBenefit.business.lat!, activeBenefit.business.lng!, activeBenefit.business.name)}
                  className="flex-row items-center gap-1 bg-purple-light-light dark:bg-purple-light-dark rounded-full px-3 py-1.5"
                >
                  <Locate size={12} color={colors.purple} />
                  <Text className="text-[10.5px] font-bold text-purple">Cómo llegar</Text>
                </Pressable>
              ) : null}
            </View>

            {activeBenefit && benefitConditions(activeBenefit).length > 0 && (
              <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl px-4 py-3 mb-4 gap-1">
                {benefitConditions(activeBenefit).map((line) => (
                  <Text key={line} className="text-[11.5px] font-semibold text-purple">{line}</Text>
                ))}
              </View>
            )}

            {confirmed ? (
              <View className="items-center">
                <View className="bg-aqua-light-light dark:bg-aqua-light-dark rounded-3xl py-6 px-4 items-center mb-4 w-full">
                  <SuccessMark />
                  <Text className="text-aqua font-extrabold text-[17px] mt-3">¡Canje confirmado!</Text>
                  <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-1 text-center">
                    {activeBenefit?.business.name} ya te entregó tu beneficio.
                  </Text>
                </View>
                {!answered ? (
                  <>
                    <Text className="text-[14px] font-bold text-text-light dark:text-text-dark mb-3">¿Compraste algo más?</Text>
                    <View className="flex-row gap-2.5 w-full mb-2.5">
                      <Pressable onPress={() => answerFollowup(true)} className="flex-1 bg-aqua rounded-2xl py-3.5 items-center">
                        <Text className="text-white font-bold text-[14px]">Sí, compré algo</Text>
                      </Pressable>
                      <Pressable onPress={() => answerFollowup(false)} className="flex-1 bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center">
                        <Text className="text-purple font-semibold text-[14px]">Solo el beneficio</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-3 text-center">¡Gracias por contarnos!</Text>
                    {activeBenefit?.business.google_review_url ? (
                      <Pressable
                        onPress={() => Linking.openURL(activeBenefit.business.google_review_url!)}
                        className="w-full rounded-2xl py-3.5 items-center justify-center flex-row mb-2.5"
                        style={{ backgroundColor: '#FFF3D1', gap: 8 }}
                      >
                        <Star size={16} color="#C98A0B" weight="fill" />
                        <Text className="font-bold text-[14px]" style={{ color: '#9A6A08' }}>Calificar en Google Maps</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
                <Pressable onPress={closeCode} className="w-full bg-aqua rounded-2xl py-4 items-center mt-1">
                  <Text className="text-white font-bold text-[15px]">Listo</Text>
                </Pressable>
              </View>
            ) : !expired ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 items-center mb-4">
                  <Text className="text-[11px] text-muted-light dark:text-muted-dark mb-1.5">Mostrá este código en el mostrador</Text>
                  <Text className="text-[34px] font-extrabold tracking-[8px] text-purple">
                    {activeRedemption?.code.slice(0, 3)} {activeRedemption?.code.slice(3)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-center gap-2.5 mb-6">
                  <ProgressRing size={34} strokeWidth={4} progress={remainingMs / ttlMs} progressColor={colors.warn} trackColor={colors.light.line} />
                  <Text className="text-[13px] text-muted-light dark:text-muted-dark">
                    Vence en <Text className="font-bold text-text-light dark:text-text-dark">{mm}:{ss}</Text>
                  </Text>
                </View>
                <Pressable onPress={closeCode} className="bg-aqua rounded-2xl py-4 items-center mb-2.5">
                  <Text className="text-white font-bold text-[15px]">Ya lo mostré</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="bg-warn-light rounded-3xl py-6 items-center mb-4">
                  <Text className="text-warn font-bold text-base">Código vencido</Text>
                  <Text className="text-[#8A5A2E] text-xs mt-1">No llegaste a mostrarlo a tiempo.</Text>
                </View>
                <Pressable onPress={handleCancelExpired} disabled={cancelExpired.isPending} className="bg-aqua rounded-2xl py-4 items-center mb-2.5">
                  <Text className="text-white font-bold text-[15px]">Cancelar y recuperar Puntos</Text>
                </Pressable>
                <Pressable onPress={handleRegenerate} disabled={regenerate.isPending} className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mb-2.5">
                  <Text className="text-purple font-semibold text-[14px]">Generar un código nuevo</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={closeCode}>
              <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center">Cerrar</Text>
            </Pressable>
          </Glass>
        </View>
      </Modal>
    </View>
  );
}
