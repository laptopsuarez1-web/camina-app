import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { BadgeSheet } from '@/components/badges/BadgeSheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/icons';
import { RutaRing } from '@/components/ruta/RutaRing';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { LocalBadge } from '@/components/badges/LocalBadge';
import { useAuthStore } from '@/store/useAuthStore';
import { chosenKeys, levelLabel, nextLevel, useSetFeaturedBadge, useUserBadges, LEVELS, MAX_PROFILE_BADGES, type LocalBadgeT } from '@/hooks/useBadges';
import { rutaMonthName, rutaMonthShort } from '@/hooks/useRuta';
import { friendlyServerError } from '@/lib/errors';
import { useThemeColors } from '@/theme/useThemeColors';

// Todas las insignias de una persona (las mías o, con ?u=, las de otra persona: son públicas).
export default function InsigniasScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const theme = useThemeColors();
  const me = useAuthStore((s) => s.session?.user.id);
  const { u } = useLocalSearchParams<{ u?: string }>();
  const userId = u || me;
  const own = !u || u === me;
  const { data } = useUserBadges(userId);
  const setFeatured = useSetFeaturedBadge();
  const routes = data?.routes ?? [];
  const locals = data?.locals ?? [];
  const [sheet, setSheet] = useState<LocalBadgeT | null>(null);

  // Elegidas para el perfil, en orden (hasta 5). Mantener presionada pone o saca una.
  const chosen = chosenKeys(data?.featured);
  async function feature(key: string) {
    if (!own) return;
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    if (next.length > MAX_PROFILE_BADGES) {
      Alert.alert(`Máximo ${MAX_PROFILE_BADGES} insignias`, 'Mantén presionada una de las que ya elegiste para sacarla de tu perfil.');
      return;
    }
    try {
      await setFeatured.mutateAsync(next.length ? next.join(',') : null);
    } catch (e) {
      Alert.alert('No se pudo cambiar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  return (
    <ScrollView className="flex-1" style={{ flex: 1 }} showsVerticalScrollIndicator={false} alwaysBounceVertical contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: tabSpace + 16 }}>
      <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
        <Press accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/perfil'))}
          className="w-10 h-10 rounded-full items-center justify-center bg-purple-light dark:bg-card-dark">
          <ChevronLeft size={20} color={theme.text} />
        </Press>
        <Text className="text-[24px] font-extrabold text-text-light dark:text-text-dark">{own ? 'Mis insignias' : 'Insignias'}</Text>
      </View>

      {own && (
        <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4 leading-5 text-center">
          Toca una insignia para ver cómo vas. Mantenla presionada para mostrarla en tu perfil (hasta {MAX_PROFILE_BADGES}). Si no eliges ninguna, se muestran las más recientes.
        </Text>
      )}

      <Text className="text-[16px] font-bold text-center text-text-light dark:text-text-dark mb-3">Rutas del mes</Text>
      {routes.length === 0 ? (
        <Glass className="rounded-3xl p-4 mb-5 items-center">
          <RutaRing size={64} done={0} glow={false} />
          <Text className="text-[13px] text-muted-light dark:text-muted-dark text-center mt-2">Todavía no completaste una Ruta del mes. Cada mes tiene su insignia.</Text>
        </Glass>
      ) : (
        <View className="flex-row flex-wrap justify-center mb-5" style={{ gap: 18 }}>
          {routes.map((r) => {
            const key = `ruta:${r.month}`;
            const pos = chosen.indexOf(key) + 1;
            return (
              <Press key={r.month} accessibilityRole="button" onPress={() => (own ? router.push({ pathname: '/(tabs)/ruta-mes', params: { m: r.month } }) : undefined)}
                onLongPress={() => feature(key)} className="items-center">
                <RutaRing size={78} done={3} month={rutaMonthShort(r.month)} themeMonth={r.month} />
                <Text className="text-[12px] font-bold mt-1.5 text-text-light dark:text-text-dark" style={{ textTransform: 'capitalize' }}>{rutaMonthName(r.month)}</Text>
                {pos > 0 && <OnProfile pos={pos} own={own} />}
              </Press>
            );
          })}
        </View>
      )}

      <Text className="text-[16px] font-bold text-center text-text-light dark:text-text-dark mb-3">Locales</Text>
      {locals.length === 0 ? (
        <Glass className="rounded-3xl p-4 mb-5">
          <Text className="text-[13px] text-muted-light dark:text-muted-dark text-center">Canjea en un local para ganar tu primera insignia de Visitante.</Text>
        </Glass>
      ) : (
        <View className="flex-row flex-wrap justify-center" style={{ gap: 10 }}>
          {locals.map((l) => {
            const key = `local:${l.business_id}`;
            const next = nextLevel(l.points);
            const pos = chosen.indexOf(key) + 1;
            return (
              <Press key={l.business_id} accessibilityRole="button" accessibilityHint={own ? 'Toca para ver cómo sumaste; mantén presionado para mostrarla en tu perfil' : undefined} onPress={() => setSheet(l)} onLongPress={() => feature(key)} style={{ width: '47.5%' }}>
                <Glass className="rounded-3xl items-center" style={{ paddingVertical: 16, paddingHorizontal: 10, borderWidth: pos > 0 ? 1.5 : 0, borderColor: '#62F0B6' }}>
                  <LocalBadge logoUrl={l.logo_url} name={l.name} level={l.level} size={60} />
                  <Text className="text-[14px] font-bold mt-3 text-text-light dark:text-text-dark" numberOfLines={1}>{l.name}</Text>
                  <Text className="text-[11.5px] text-muted-light dark:text-muted-dark text-center" numberOfLines={2}>
                    {next ? `${l.points} de ${next.target} para ${next.label}` : `${levelLabel(l.level)} · ${l.points} puntos de nivel`}
                  </Text>
                  {pos > 0 && <OnProfile pos={pos} own={own} />}
                </Glass>
              </Press>
            );
          })}
        </View>
      )}

      <Glass className="rounded-3xl p-4 mt-5">
        <Text className="text-[15px] font-bold text-center text-text-light dark:text-text-dark mb-2">Cómo subes de nivel en un local</Text>
        {[
          ['Canje o visita de la Ruta confirmada', '+2'],
          ['Calificar el local después del canje', '+1'],
          ['Historia aprobada de tu canje', '+1'],
        ].map(([t, p], i) => (
          <View key={t} className={`flex-row justify-between items-center py-2.5 ${i ? 'border-t border-line-light dark:border-line-dark' : ''}`}>
            <Text className="text-[13px] text-text-light dark:text-text-dark flex-1">{t}</Text>
            <Text className="text-[15px] font-extrabold text-aqua-ink dark:text-aqua">{p}</Text>
          </View>
        ))}
        <Text className="text-[12px] text-muted-light dark:text-muted-dark text-center mt-2">
          {LEVELS.map((l) => `${l.label}: ${l.from === 1 ? 'primer canje' : `${l.from} puntos`}`).join(' · ')}
        </Text>
      </Glass>
      {sheet ? <BadgeSheet badge={sheet} own={own} onClose={() => setSheet(null)} /> : null}
    </ScrollView>
  );
}

// Marca "En tu perfil · 1": en qué lugar sale en la fila del perfil.
function OnProfile({ pos, own }: { pos: number; own: boolean }) {
  return (
    <View style={{ marginTop: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(98,240,182,0.16)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.5)' }}>
      <Text allowFontScaling={false} className="text-[10.5px] font-bold text-aqua-ink dark:text-aqua">{own ? `En tu perfil · ${pos}` : 'En su perfil'}</Text>
    </View>
  );
}
