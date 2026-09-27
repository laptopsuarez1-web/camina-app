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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Search, Heart } from 'lucide-react-native';
import {
  useBenefits,
  useRedeemBenefit,
  useRegenerateCode,
  useCancelExpiredRedemption,
  type BenefitWithBusiness,
} from '@/hooks/useBenefits';
import { usePointsBalance } from '@/hooks/usePoints';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { ZONES } from '@/constants/catalog';
import { BUSINESS_LOGOS } from '@/constants/business-assets';
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

function businessIcon(name: string, size: number) {
  const logo = BUSINESS_LOGOS[name];
  if (logo) {
    return <Image source={logo} style={{ width: size, height: size, borderRadius: size / 2 }} />;
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

export default function CanjesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: benefits, isLoading } = useBenefits();
  const { data: balance } = usePointsBalance();
  const redeem = useRedeemBenefit();
  const regenerate = useRegenerateCode();
  const cancelExpired = useCancelExpiredRedemption();

  const [view, setView] = useState<'lista' | 'mapa'>('lista');
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showZonePrompt, setShowZonePrompt] = useState(true);
  const [activeRedemption, setActiveRedemption] = useState<Redemption | null>(null);
  const [activeBenefit, setActiveBenefit] = useState<BenefitWithBusiness | null>(null);

  const remainingMs = useCountdown(activeRedemption?.code_expires_at ?? null);
  const expired = !!activeRedemption && remainingMs <= 0;
  const ttlMs = REDEMPTION_CODE_TTL_MINUTES * 60_000;

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
      <View className="px-5 pt-14 pb-3">
        <Text className="text-[26px] font-extrabold tracking-tight text-text-light dark:text-text-dark">Canjear</Text>
        <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">{balance ?? 0} Puntos disponibles</Text>

        {!profile?.zone && showZonePrompt && (
          <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-3.5">
            <Text className="text-[13px] font-semibold mb-2.5 text-text-light dark:text-text-dark">
              ¿Desde qué zona caminás?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ZONES.slice(0, 5).map((z) => (
                <Pressable key={z} onPress={() => saveZone(z)} className="bg-white dark:bg-card-dark rounded-full px-3 py-1.5">
                  <Text className="text-xs font-semibold text-purple">{z}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowZonePrompt(false)}>
                <Text className="text-xs text-muted-light dark:text-muted-dark px-2 py-1.5">Ahora no</Text>
              </Pressable>
            </View>
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
          <Pressable
            onPress={() => setView('lista')}
            className="flex-1 py-2 rounded-lg items-center"
            style={{ backgroundColor: view === 'lista' ? colors.light.card : 'transparent' }}
          >
            <Text className={view === 'lista' ? 'text-[12.5px] font-bold text-text-light' : 'text-[12.5px] font-semibold text-muted-light'}>
              Lista
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setView('mapa')}
            className="flex-1 py-2 rounded-lg items-center"
            style={{ backgroundColor: view === 'mapa' ? colors.light.card : 'transparent' }}
          >
            <Text className={view === 'mapa' ? 'text-[12.5px] font-bold text-text-light' : 'text-[12.5px] font-semibold text-muted-light'}>
              Mapa
            </Text>
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

      {view === 'mapa' ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={TARIJA_REGION}
        >
          {businessesWithCoords.map((b) => (
            <Marker
              key={b.business.id}
              coordinate={{ latitude: b.business.lat!, longitude: b.business.lng! }}
              title={b.business.name}
              description={b.name}
              onPress={() => {
                setView('lista');
                setCategory('Todos');
                setSearch(b.business.name);
              }}
            />
          ))}
        </MapView>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerClassName="gap-2.5 pb-8">
          {isLoading && <ActivityIndicator color={colors.aqua} />}

          {filtered.map((b) => {
            const canAfford = (balance ?? 0) >= b.cost_points;
            return (
              <View
                key={b.id}
                className="bg-card-light dark:bg-card-dark rounded-3xl p-4"
                style={{ shadowColor: '#291C47', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}
              >
                <View className="flex-row items-start gap-3">
                  {businessIcon(b.business.name, 50)}
                  <View className="flex-1">
                    <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">{b.business.name}</Text>
                    <Text className="text-xs text-muted-light dark:text-muted-dark mt-0.5">{b.business.category}</Text>
                    <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-1.5">{b.name}</Text>
                  </View>
                  <Pressable hitSlop={8}>
                    <Heart size={17} color={colors.light.muted} />
                  </Pressable>
                </View>
                <View className="flex-row justify-between items-center mt-3">
                  <Text className="text-[11px] text-muted-light dark:text-muted-dark">
                    {b.type === 'gratis' ? 'Gratis' : b.discount_detail}
                  </Text>
                  <Pressable
                    onPress={() => handleRedeem(b.id, b)}
                    disabled={!canAfford || redeem.isPending}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: canAfford ? colors.aqua : colors.light.line }}
                  >
                    <Text className="font-bold text-[13px]" style={{ color: canAfford ? '#fff' : colors.light.muted }}>
                      {b.cost_points} Pts
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center py-8">
              Todavía no hay beneficios con estos filtros.
            </Text>
          )}
        </ScrollView>
      )}

      <Modal visible={!!activeRedemption} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <View className="bg-card-light dark:bg-card-dark rounded-t-[32px] px-6 pt-3 pb-10">
            <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />

            <View className="flex-row items-center gap-2.5 mb-5">
              {activeBenefit && businessIcon(activeBenefit.business.name, 38)}
              <View>
                <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">
                  {activeBenefit?.business.name}
                </Text>
                <Text className="text-xs text-muted-light dark:text-muted-dark">{activeBenefit?.name}</Text>
              </View>
            </View>

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
