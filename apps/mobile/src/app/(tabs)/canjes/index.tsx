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
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { Search, Heart, Locate, List, ChevronRight, Navigation } from 'lucide-react-native';
import {
  useBenefits,
  useBenefitsRemainingToday,
  useRedeemBenefit,
  useRegenerateCode,
  useCancelExpiredRedemption,
  type BenefitWithBusiness,
} from '@/hooks/useBenefits';
import { usePointsBalance } from '@/hooks/usePoints';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { DARK_MAP_STYLE } from '@/constants/map-style';
import { ProgressRing } from '@/components/ui/ProgressRing';
import type { Redemption } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { REDEMPTION_CODE_TTL_MINUTES } from '@/constants/business-rules';

// Centro de Tarija — el marcador real hoy es solo Bloom (ver
// supabase/migrations/0004_seed_bloom.sql); el resto de comercios se van a ir
// sumando desde el panel.
const TARIJA_REGION = {
  latitude: -21.5355,
  longitude: -64.7296,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

// Mismo criterio que redeem_benefit en supabase/migrations/0003_fixes.sql,
// pero para mostrarlo en la UI antes de intentar canjear (el servidor igual
// lo vuelve a validar, esto es solo para no dejar apretar un botón que va a
// fallar). Asume hora local del teléfono = hora de Bolivia.
function isBenefitAvailableNow(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number }) {
  const now = new Date();
  const dayBit = (now.getDay() + 6) % 7; // JS: 0=domingo..6=sábado → 0=lunes..6=domingo
  if (!(b.valid_days_mask & (1 << dayBit))) return false;
  if (!b.valid_from || !b.valid_to) return true;
  const hhmm = now.toTimeString().slice(0, 5);
  const from = b.valid_from.slice(0, 5);
  const to = b.valid_to.slice(0, 5);
  return from <= to ? hhmm >= from && hhmm <= to : hhmm >= from || hhmm <= to;
}

const DIAS_ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Junta las condiciones del beneficio (días/horario/solo en el local) en
// líneas cortas para mostrar en el modal de canje, justo donde el usuario
// pidió verlas antes de usar el código.
function benefitConditions(b: { valid_from: string | null; valid_to: string | null; valid_days_mask: number; dine_in_only: boolean }) {
  const lines: string[] = [];
  const activeDays = DIAS_ABREV.filter((_, i) => b.valid_days_mask & (1 << i));
  if (activeDays.length > 0 && activeDays.length < 7) {
    lines.push(`Válido: ${activeDays.join(' ')}`);
  }
  if (b.valid_from && b.valid_to) {
    lines.push(`Horario: ${b.valid_from.slice(0, 5)} a ${b.valid_to.slice(0, 5)}`);
  }
  if (b.dine_in_only) {
    lines.push('Solo consumiendo en el local');
  }
  return lines;
}

// Abre el mapa completo del sistema (Google Maps / Apple Maps) con el pin del
// comercio, en vez del mapa chico embebido en la app. Pedido explícito: que
// el usuario pueda ver el mapa "completo" (con calles, tráfico, cómo llegar).
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

function businessIcon(name: string, size: number, logoUrl?: string | null) {
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center"
    >
      <Text className="text-aqua font-bold">{name[0]}</Text>
    </View>
  );
}

function MapMarker({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 2.5,
        borderColor: colors.aqua,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} />
      ) : (
        <Text style={{ color: colors.aqua, fontWeight: '800' }}>{name[0]}</Text>
      )}
    </View>
  );
}

export default function CanjesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: benefits, isLoading } = useBenefits();
  const { data: remainingToday } = useBenefitsRemainingToday();
  const { data: balance } = usePointsBalance();
  const redeem = useRedeemBenefit();
  const regenerate = useRegenerateCode();
  const cancelExpired = useCancelExpiredRedemption();

  // "Ver todo" en Inicio manda acá con ?view=lista para abrir directo en la lista
  // en vez del mapa (que es el default cuando se entra por el tab de abajo).
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'lista' | 'mapa'>(params.view === 'lista' ? 'lista' : 'mapa');
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showZonePrompt, setShowZonePrompt] = useState(true);
  const [zoneInput, setZoneInput] = useState('');
  const [activeRedemption, setActiveRedemption] = useState<Redemption | null>(null);
  const [activeBenefit, setActiveBenefit] = useState<BenefitWithBusiness | null>(null);

  const remainingMs = useCountdown(activeRedemption?.code_expires_at ?? null);
  const expired = !!activeRedemption && remainingMs <= 0;
  const ttlMs = REDEMPTION_CODE_TTL_MINUTES * 60_000;

  // Camina no es solo de Tarija — el mapa se centra en la ubicación real del
  // usuario (así funciona igual de bien para alguien en Santa Cruz o
  // cualquier otra ciudad), con Tarija de respaldo si no da permiso o falla
  // el GPS. null mientras se resuelve, para no renderizar el mapa dos veces
  // con initialRegion (que solo aplica en el primer montaje).
  const [mapRegion, setMapRegion] = useState<typeof TARIJA_REGION | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMapRegion(TARIJA_REGION);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
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

  const categories = useMemo(() => {
    const set = new Set((benefits ?? []).map((b) => b.business.category));
    return ['Todos', ...set];
  }, [benefits]);

  const filtered = useMemo(() => {
    return (benefits ?? [])
      .filter((b) => category === 'Todos' || b.business.category === category)
      .filter((b) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (b.business.name + ' ' + b.name + ' ' + b.business.category).toLowerCase().includes(q);
      });
  }, [benefits, category, search]);

  // Un comercio puede tener varios beneficios activos ahora (antes el panel
  // solo dejaba cargar uno) — se agrupan por comercio para no repetir el
  // logo/nombre en una tarjeta por cada beneficio suyo.
  const groupedByBusiness = useMemo(() => {
    const map = new Map<string, { business: BenefitWithBusiness['business']; benefits: BenefitWithBusiness[] }>();
    for (const b of filtered) {
      if (!map.has(b.business.id)) map.set(b.business.id, { business: b.business, benefits: [] });
      map.get(b.business.id)!.benefits.push(b);
    }
    return [...map.values()];
  }, [filtered]);

  const businessesWithCoords = useMemo(() => {
    const map = new Map<string, BenefitWithBusiness>();
    for (const b of benefits ?? []) {
      if (b.business.lat != null && b.business.lng != null && !map.has(b.business.id)) {
        map.set(b.business.id, b);
      }
    }
    return [...map.values()];
  }, [benefits]);

  async function handleRedeem(benefitId: string, benefit: BenefitWithBusiness) {
    try {
      const result = await redeem.mutateAsync(benefitId);
      setActiveBenefit(benefit);
      setActiveRedemption(result);
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

  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      {view === 'mapa' ? (
        <View style={{ flex: 1 }}>
          {mapRegion ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              customMapStyle={DARK_MAP_STYLE}
            >
              {businessesWithCoords.map((b) => (
                <Marker
                  key={b.business.id}
                  coordinate={{ latitude: b.business.lat!, longitude: b.business.lng! }}
                  onPress={() => openFullMap(b.business.lat!, b.business.lng!, b.business.name)}
                >
                  <MapMarker name={b.business.name} logoUrl={b.business.logo_url} />
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.aqua} />
            </View>
          )}

          {/* barra flotante superior: volver a lista + balance, como el chip del clima de Apple Maps */}
          <View className="absolute left-4 right-4 flex-row justify-between items-center" style={{ top: 54 }}>
            <Pressable
              onPress={() => setView('lista')}
              className="flex-row items-center gap-1.5 bg-auth-bg/90 rounded-full pl-3 pr-4 py-2.5"
            >
              <List size={14} color="#fff" />
              <Text className="text-white text-xs font-bold">Lista</Text>
            </Pressable>
            <View className="bg-auth-bg/90 rounded-full px-3.5 py-2.5">
              <Text className="text-mint text-xs font-bold">{balance ?? 0} Pts</Text>
            </View>
          </View>

          {/* botones flotantes laterales: abrir el mapa completo (Google/Apple Maps) y centrar en mi ubicación */}
          <View className="absolute right-4 bg-card-light dark:bg-card-dark rounded-2xl overflow-hidden" style={{ bottom: 300 }}>
            <Pressable
              className="p-3 border-b border-line-light dark:border-line-dark"
              onPress={() => mapRegion && openFullMap(mapRegion.latitude, mapRegion.longitude, 'Comercios cerca tuyo')}
            >
              <Navigation size={17} color={colors.light.text} />
            </Pressable>
            <Pressable
              className="p-3"
              onPress={async () => {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const pos = await Location.getCurrentPositionAsync({});
                setMapRegion((r) => ({ ...(r ?? TARIJA_REGION), latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
              }}
            >
              <Locate size={17} color={colors.aqua} />
            </Pressable>
          </View>

          {/* hoja inferior tipo Apple Maps: buscador + lista de sugerencias */}
          <BlurView
            intensity={70}
            tint="light"
            className="absolute left-0 right-0 bottom-0 overflow-hidden"
            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: 340 }}
          >
            <View className="items-center pt-2.5 pb-1">
              <View className="w-9 h-1.5 rounded-full bg-black/15" />
            </View>
            <View className="flex-row items-center gap-2.5 px-4 pb-3">
              <View className="flex-1 flex-row items-center gap-2 bg-white/70 rounded-xl px-3 py-2.5">
                <Search size={15} color={colors.light.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar en Camina"
                  placeholderTextColor={colors.light.muted}
                  className="flex-1 text-[13px] text-text-light"
                />
              </View>
              <View className="w-9 h-9 rounded-full bg-mint items-center justify-center">
                <Text className="text-mint-dark font-bold text-xs">
                  {(profile?.full_name || 'C')[0]?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text className="px-4 pb-2 text-[11px] font-bold text-muted-light uppercase tracking-wide">
              Cerca tuyo
            </Text>
            <ScrollView contentContainerClassName="px-4 pb-6 gap-1.5">
              {groupedByBusiness.map((g) => (
                <Pressable
                  key={g.business.id}
                  onPress={() => {
                    setView('lista');
                    setSearch(g.business.name);
                  }}
                  className="flex-row items-center gap-3 bg-white/60 rounded-2xl p-2.5"
                >
                  {businessIcon(g.business.name, 34, g.business.logo_url)}
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-text-light">{g.business.name}</Text>
                    <Text className="text-[11px] text-muted-light">
                      {g.benefits.length === 1 ? g.benefits[0].name : `${g.benefits.length} beneficios`}
                    </Text>
                  </View>
                  <ChevronRight size={15} color={colors.light.muted} />
                </Pressable>
              ))}
              {groupedByBusiness.length === 0 && (
                <Text className="text-muted-light text-xs py-3">Nada por acá todavía.</Text>
              )}
            </ScrollView>
          </BlurView>
        </View>
      ) : (
        <>
          <View className="px-5 pt-14 pb-3">
            <Text className="text-[26px] font-extrabold tracking-tight text-text-light dark:text-text-dark">Canjear</Text>
            <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">{balance ?? 0} Puntos disponibles</Text>

            {!profile?.zone && showZonePrompt && (
              <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-3.5">
                <Text className="text-[13px] font-semibold mb-2.5 text-text-light dark:text-text-dark">
                  ¿Desde qué zona caminás?
                </Text>
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

            <View className="flex-row items-center gap-2 bg-card-light dark:bg-card-dark rounded-2xl px-3.5 py-3 mb-3">
              <Search size={16} color={colors.light.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar comercios o categorías…"
                placeholderTextColor={colors.light.muted}
                className="flex-1 text-[13.5px] text-text-light dark:text-text-dark"
              />
            </View>

            <View className="flex-row bg-purple-light-light dark:bg-purple-light-dark rounded-xl p-1 mb-3.5">
              <Pressable onPress={() => setView('mapa')} className="flex-1 py-2 rounded-lg items-center">
                <Text className="text-[12.5px] font-semibold text-muted-light">Mapa</Text>
              </Pressable>
              <Pressable
                onPress={() => setView('lista')}
                className="flex-1 py-2 rounded-lg items-center"
                style={{ backgroundColor: colors.light.card }}
              >
                <Text className="text-[12.5px] font-bold text-text-light">Lista</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {categories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className="rounded-full px-3.5 py-1.5"
                  style={{ backgroundColor: category === c ? colors.purple : colors.light.card }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: category === c ? '#fff' : colors.light.muted }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView className="flex-1 px-5" contentContainerClassName="gap-2.5 pb-8">
            {isLoading && <ActivityIndicator color={colors.aqua} />}

            {groupedByBusiness.map((g) => (
              <View
                key={g.business.id}
                className="bg-card-light dark:bg-card-dark rounded-3xl p-4"
                style={{ shadowColor: '#291C47', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}
              >
                <View className="flex-row items-center gap-3">
                  {businessIcon(g.business.name, 50, g.business.logo_url)}
                  <View className="flex-1">
                    <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">{g.business.name}</Text>
                    <Text className="text-xs text-muted-light dark:text-muted-dark mt-0.5">{g.business.category}</Text>
                  </View>
                  {g.benefits.length > 1 && (
                    <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-full px-2.5 py-1">
                      <Text className="text-[10.5px] font-bold text-purple">{g.benefits.length} beneficios</Text>
                    </View>
                  )}
                  <Pressable hitSlop={8}>
                    <Heart size={17} color={colors.light.muted} />
                  </Pressable>
                </View>

                <View className="mt-3" style={{ gap: 10 }}>
                  {g.benefits.map((b) => {
                    const canAfford = (balance ?? 0) >= b.cost_points;
                    const available = isBenefitAvailableNow(b);
                    const unlimited = b.daily_quota == null;
                    const remaining = b.daily_quota == null ? Infinity : Math.max(0, b.daily_quota - (remainingToday?.get(b.id) ?? 0));
                    const outOfStock = !unlimited && remaining <= 0;
                    const canRedeem = canAfford && available && !outOfStock;
                    const redeeming = redeem.isPending && redeem.variables === b.id;
                    const buttonLabel = !available ? 'Fuera de horario' : outOfStock ? 'Sin cupones hoy' : `${b.cost_points} Pts`;
                    return (
                      <View
                        key={b.id}
                        className="bg-bg-light dark:bg-bg-dark rounded-2xl p-3"
                        style={{ opacity: available ? 1 : 0.6 }}
                      >
                        {b.image_url && (
                          <Image
                            source={{ uri: b.image_url }}
                            style={{ width: '100%', height: 90, borderRadius: 14, marginBottom: 8 }}
                            resizeMode="cover"
                          />
                        )}
                        <Text className="text-[13px] font-semibold text-text-light dark:text-text-dark">{b.name}</Text>
                        <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                          {b.dine_in_only && (
                            <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-full px-2 py-0.5">
                              <Text className="text-[9.5px] font-bold text-purple">Solo en el local</Text>
                            </View>
                          )}
                          {!available && (
                            <View className="bg-warn-light rounded-full px-2 py-0.5">
                              <Text className="text-[9.5px] font-bold" style={{ color: colors.warn }}>Fuera de horario</Text>
                            </View>
                          )}
                          {available && !unlimited && !outOfStock && remaining <= 3 && (
                            <Text className="text-[9.5px] font-semibold text-muted-light dark:text-muted-dark">
                              Quedan {remaining} hoy
                            </Text>
                          )}
                        </View>
                        <View className="flex-row justify-between items-center mt-2.5">
                          <Text className="text-[11px] text-muted-light dark:text-muted-dark">
                            {b.type === 'gratis' ? 'Gratis' : b.discount_detail}
                          </Text>
                          <Pressable
                            onPress={() => handleRedeem(b.id, b)}
                            disabled={!canRedeem || redeem.isPending}
                            className="rounded-full px-4 py-2 flex-row items-center gap-1.5"
                            style={{ backgroundColor: canRedeem ? colors.aqua : colors.light.line }}
                          >
                            {redeeming && <ActivityIndicator size="small" color="#fff" />}
                            <Text className="font-bold text-[13px]" style={{ color: canRedeem ? '#fff' : colors.light.muted }}>
                              {redeeming ? 'Canjeando…' : buttonLabel}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            {!isLoading && filtered.length === 0 && (
              <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center py-8">
                Todavía no hay beneficios con estos filtros.
              </Text>
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={!!activeRedemption} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <View className="bg-card-light dark:bg-card-dark rounded-t-[32px] px-6 pt-3 pb-10">
            <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />

            <View className="flex-row items-center justify-between gap-2.5 mb-5">
              <View className="flex-row items-center gap-2.5 flex-1">
                {activeBenefit && businessIcon(activeBenefit.business.name, 38, activeBenefit.business.logo_url)}
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">
                    {activeBenefit?.business.name}
                  </Text>
                  <Text className="text-xs text-muted-light dark:text-muted-dark">{activeBenefit?.name}</Text>
                </View>
              </View>
              {activeBenefit?.business.lat != null && activeBenefit?.business.lng != null && (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    openFullMap(activeBenefit.business.lat!, activeBenefit.business.lng!, activeBenefit.business.name)
                  }
                  className="flex-row items-center gap-1 bg-purple-light-light dark:bg-purple-light-dark rounded-full px-3 py-1.5"
                >
                  <Navigation size={12} color={colors.purple} />
                  <Text className="text-[10.5px] font-bold text-purple">Cómo llegar</Text>
                </Pressable>
              )}
            </View>

            {activeBenefit && benefitConditions(activeBenefit).length > 0 && (
              <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl px-4 py-3 mb-4 gap-1">
                {benefitConditions(activeBenefit).map((line) => (
                  <Text key={line} className="text-[11.5px] font-semibold text-purple">
                    {line}
                  </Text>
                ))}
              </View>
            )}

            {!expired ? (
              <>
                <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 items-center mb-4">
                  <Text className="text-[11px] text-muted-light dark:text-muted-dark mb-1.5">
                    Mostrá este código en el mostrador
                  </Text>
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
                <Pressable
                  onPress={() => {
                    setActiveRedemption(null);
                    setActiveBenefit(null);
                  }}
                  className="bg-aqua rounded-2xl py-4 items-center mb-2.5"
                >
                  <Text className="text-white font-bold text-[15px]">Ya lo mostré</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="bg-warn-light rounded-3xl py-6 items-center mb-4">
                  <Text className="text-warn font-bold text-base">Código vencido</Text>
                  <Text className="text-[#8A5A2E] text-xs mt-1">No llegaste a mostrarlo a tiempo.</Text>
                </View>
                <Pressable
                  onPress={handleCancelExpired}
                  disabled={cancelExpired.isPending}
                  className="bg-aqua rounded-2xl py-4 items-center mb-2.5"
                >
                  <Text className="text-white font-bold text-[15px]">Cancelar y recuperar Puntos</Text>
                </Pressable>
                <Pressable
                  onPress={handleRegenerate}
                  disabled={regenerate.isPending}
                  className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mb-2.5"
                >
                  <Text className="text-purple font-semibold text-[14px]">Generar un código nuevo</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => {
                setActiveRedemption(null);
                setActiveBenefit(null);
              }}
            >
              <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
