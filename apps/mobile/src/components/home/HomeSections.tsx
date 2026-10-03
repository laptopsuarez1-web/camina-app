import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useColorScheme } from 'nativewind';
import { Glass } from '@/components/ui/Glass';
import { EmptyState } from '@/components/ui/EmptyState';
import { GOLD, isFeatured, GoldBadge } from '@/components/ui/Featured';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { dayLabel } from '@/lib/format';
import { colors } from '@/theme/tokens';
import type { BenefitWithBusiness } from '@/hooks/useBenefits';

// ---------------------------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------------------------

export function SectionHeader({
  title, actionLabel, onAction,
}: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-5 mb-3">
      <Text accessibilityRole="header" className="font-bold text-base text-text-light dark:text-text-dark">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={8} onPress={onAction}>
          <Text className="text-aqua-deep dark:text-aqua text-xs font-semibold">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CoinPill({ value, prefix }: { value: number; prefix?: string }) {
  return (
    <View className="flex-row items-center bg-aqua-deep rounded-full self-start" style={{ gap: 4, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 }}>
      <Image source={require('@/../assets/camina-coin.png')} style={{ width: 18, height: 18, borderRadius: 9 }} />
      <Text className="text-white text-[12px] font-bold">{prefix ? `${prefix} ` : ''}{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Ubicación: solo si la persona ya dio permiso (en Inicio nunca se pide por su cuenta).
// ---------------------------------------------------------------------------------------------

function distanceMeters(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function useHomePosition() {
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const p = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        if (alive && p) setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      } catch {
        // sin GPS: simplemente no se muestran distancias
      }
    })();
    return () => { alive = false; };
  }, []);
  return pos;
}

type Business = BenefitWithBusiness['business'];

function distanceTo(pos: { latitude: number; longitude: number } | null, b: Business) {
  return pos && b.lat != null && b.lng != null ? distanceMeters(pos, b.lat, b.lng) : null;
}

const ROW_CONTENT = { paddingHorizontal: 20, gap: 12, paddingTop: 4, paddingBottom: 18 } as const;

// ---------------------------------------------------------------------------------------------
// Locales cerca tuyo
// ---------------------------------------------------------------------------------------------

export function NearbyRow({
  benefits, pos, loading,
}: { benefits: BenefitWithBusiness[]; pos: { latitude: number; longitude: number } | null; loading: boolean }) {
  const places = useMemo(() => {
    const map = new Map<string, { business: Business; count: number; minCost: number }>();
    for (const b of benefits) {
      const cur = map.get(b.business.id);
      if (cur) {
        cur.count += 1;
        cur.minCost = Math.min(cur.minCost, b.cost_points);
      } else {
        map.set(b.business.id, { business: b.business, count: 1, minCost: b.cost_points });
      }
    }
    return [...map.values()]
      .map((p) => ({ ...p, distance: distanceTo(pos, p.business) }))
      .sort(
        (a, b) =>
          Number(isFeatured(b.business)) - Number(isFeatured(a.business)) ||
          (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
          a.business.name.localeCompare(b.business.name),
      )
      .slice(0, 10);
  }, [benefits, pos]);

  if (places.length === 0) {
    if (loading) return null;
    return (
      <View>
        <SectionHeader title="Locales cerca tuyo" />
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/canjes?view=lista')} className="mx-5">
          <Glass className="rounded-3xl p-4">
            <Text className="text-[13px] font-bold text-text-light dark:text-text-dark mb-1">Explorá comercios</Text>
            <Text className="text-[12px] text-muted-light dark:text-muted-dark">Todavía no hay nada cerca: mirá qué se puede canjear.</Text>
          </Glass>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title="Locales cerca tuyo" actionLabel="Ver mapa" onAction={() => router.push('/(tabs)/canjes')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ROW_CONTENT} style={{ marginBottom: -10 }}>
        {places.map((p) => {
          const featured = isFeatured(p.business);
          return (
            <Pressable
              key={p.business.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.business.name}, ${p.business.category}, ${p.count} ${p.count === 1 ? 'premio' : 'premios'}${p.distance != null ? `, a ${formatDistance(p.distance)}` : ''}`}
              onPress={() => router.push('/(tabs)/canjes')}
              style={{ width: 268 }}
            >
              <Glass
                className="rounded-3xl"
                style={[{ flex: 1, padding: 18 }, featured ? { borderWidth: 2, borderColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.25 } : null]}
              >
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <BusinessAvatar logoUrl={p.business.logo_url} category={p.business.category} size={62} />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center" style={{ gap: 5 }}>
                      <Text className="text-[16px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>{p.business.name}</Text>
                      {featured && <GoldBadge size={15} />}
                    </View>
                    <Text className="text-[13px] text-muted-light dark:text-muted-dark" numberOfLines={1}>
                      {p.distance != null ? `${p.business.category} · ${formatDistance(p.distance)}` : p.business.category}
                    </Text>
                  </View>
                </View>
                <Text className="text-[14.5px] font-semibold text-aqua-deep dark:text-mint" style={{ marginTop: 14 }}>
                  {p.count} {p.count === 1 ? 'premio disponible' : 'premios disponibles'}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <CoinPill value={p.minCost} prefix="desde" />
                </View>
              </Glass>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Tus canjes
// ---------------------------------------------------------------------------------------------

export type RedemptionRow = {
  id: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  cost_points: number;
  created_at: string;
  benefit: { name: string } | null;
  business: { name: string; logo_url: string | null; category: string } | null;
};

const STATUS_LABEL: Record<RedemptionRow['status'], string> = {
  pending: 'Pendiente', confirmed: 'Canjeado', expired: 'Vencido', cancelled: 'Cancelado',
};

function statusColors(s: RedemptionRow['status'], dark: boolean): { bg: string; fg: string } {
  if (s === 'confirmed') return dark ? { bg: 'rgba(127,237,196,0.16)', fg: colors.mint } : { bg: colors.light.aquaLight, fg: colors.aquaDeep };
  if (s === 'pending') return dark ? { bg: 'rgba(242,152,92,0.18)', fg: '#FFB27A' } : { bg: colors.warnLight, fg: colors.warnDeep };
  return dark ? { bg: 'rgba(255,255,255,0.08)', fg: colors.dark.muted } : { bg: colors.light.purpleLight, fg: colors.light.muted };
}

export function MyRedemptionsSection({ redemptions, loading }: { redemptions: RedemptionRow[] | undefined; loading: boolean }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const list = (redemptions ?? []).slice(0, 3);
  if (loading && !redemptions) return null;
  return (
    <View>
      <SectionHeader title="Tus canjes" />
      {list.length === 0 ? (
        <View className="mx-5">
          <EmptyState
            title="Todavía no canjeaste nada"
            text="Tus pasos se vuelven Puntos, y los Puntos se vuelven premios en comercios de tu ciudad."
            actionLabel="Ir a canjear"
            onAction={() => router.push('/(tabs)/canjes')}
          />
        </View>
      ) : (
        <Glass className="rounded-3xl mx-5 overflow-hidden">
          {list.map((r, i) => {
            const c = statusColors(r.status, dark);
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.benefit?.name ?? 'Premio'} en ${r.business?.name ?? 'un comercio'}, ${STATUS_LABEL[r.status]}`}
                onPress={() => router.push('/(tabs)/canjes')}
                className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-line-light dark:border-line-dark' : ''}`}
                style={{ gap: 12 }}
              >
                <BusinessAvatar logoUrl={r.business?.logo_url} category={r.business?.category} size={42} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[13.5px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>{r.benefit?.name ?? 'Premio'}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark" numberOfLines={1}>
                    {r.business?.name ?? 'Comercio'} · {dayLabel(r.created_at.slice(0, 10))}
                  </Text>
                </View>
                <View className="rounded-full" style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: c.fg, fontSize: 12, fontWeight: '700' }}>{STATUS_LABEL[r.status]}</Text>
                </View>
              </Pressable>
            );
          })}
        </Glass>
      )}
    </View>
  );
}
