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
import { LocalBadge } from '@/components/badges/LocalBadge';
import { useAuthStore } from '@/store/useAuthStore';
import { levelLabel, nextLevel, useSetFeaturedBadge, useUserBadges, LEVELS, type LocalBadgeT } from '@/hooks/useBadges';
import { rutaMonthName, rutaMonthShort } from '@/hooks/useRuta';
import { friendlyServerError } from '@/lib/errors';
import { useThemeColors } from '@/theme/useThemeColors';

// Todas las insignias de una persona (las mías o, con ?u=, las de otra persona: son públicas).
export default function InsigniasScreen() {
  const insets = useSafeAreaInsets();
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

  async function feature(key: string) {
    if (!own) return;
    try {
      await setFeatured.mutateAsync(data?.featured === key ? null : key);
    } catch (e) {
      Alert.alert('No se pudo cambiar', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
        <Press accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/perfil'))}
          className="w-10 h-10 rounded-full items-center justify-center bg-purple-light dark:bg-card-dark">
          <ChevronLeft size={20} color={theme.text} />
        </Press>
        <Text className="text-[24px] font-extrabold text-text-light dark:text-text-dark">{own ? 'Mis insignias' : 'Insignias'}</Text>
      </View>

      {own && (
        <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4 leading-5 text-center">
          Toca una insignia para ver cómo vas. Mantenla presionada para destacarla: es la que ven tus amigos primero.
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
            const on = data?.featured === key;
            return (
              <Press key={r.month} accessibilityRole="button" onPress={() => (own ? router.push({ pathname: '/(tabs)/ruta-mes', params: { m: r.month } }) : undefined)}
                onLongPress={() => feature(key)} className="items-center">
                <RutaRing size={78} done={3} month={rutaMonthShort(r.month)} />
                <Text className="text-[12px] font-bold mt-1.5 text-text-light dark:text-text-dark" style={{ textTransform: 'capitalize' }}>{rutaMonthName(r.month)}</Text>
                {on && <Text className="text-[10.5px] font-bold text-aqua-ink dark:text-aqua">Destacada</Text>}
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
            return (
              <Press key={l.business_id} accessibilityRole="button" accessibilityHint={own ? 'Toca para ver cómo sumaste; mantén presionado para destacarla' : undefined} onPress={() => setSheet(l)} onLongPress={() => feature(key)} style={{ width: '47.5%' }}>
                <Glass className="rounded-3xl items-center" style={{ paddingVertical: 16, paddingHorizontal: 10, borderWidth: data?.featured === key ? 1.5 : 0, borderColor: '#62F0B6' }}>
                  <LocalBadge logoUrl={l.logo_url} name={l.name} level={l.level} size={60} />
                  <Text className="text-[14px] font-bold mt-3 text-text-light dark:text-text-dark" numberOfLines={1}>{l.name}</Text>
                  <Text className="text-[11.5px] text-muted-light dark:text-muted-dark text-center" numberOfLines={2}>
                    {next ? `${l.points} de ${next.target} para ${next.label}` : `${levelLabel(l.level)} · ${l.points} puntos de nivel`}
                  </Text>
                  {data?.featured === key && <Text className="text-[10.5px] font-bold text-aqua-ink dark:text-aqua mt-0.5">Destacada</Text>}
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
