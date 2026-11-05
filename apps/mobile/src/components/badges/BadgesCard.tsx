import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { RutaRing } from '@/components/ruta/RutaRing';
import { LocalBadge } from './LocalBadge';
import { rutaMonthShort } from '@/hooks/useRuta';
import type { UserBadges } from '@/hooks/useBadges';

// "Mis insignias" en el Perfil: arriba las rutas del mes completadas y abajo los locales. Todo centrado, sin huecos.
// `own` = es mi perfil (se puede tocar para ver todas; en el de un amigo es solo para mirar).
export function BadgesCard({ badges, own = true, userId }: { badges: UserBadges | undefined; own?: boolean; userId?: string }) {
  const routes = (badges?.routes ?? []).slice(0, 4);
  const locals = (badges?.locals ?? []).slice(0, 4);
  const empty = routes.length === 0 && locals.length === 0;
  if (!own && empty) return null;
  const openAll = () => router.push(own ? '/(tabs)/insignias' : { pathname: '/(tabs)/insignias', params: { u: userId } });
  return (
    <Glass className="rounded-3xl p-4 mb-3">
      <Press accessibilityRole="button" onPress={openAll} className="flex-row items-center justify-between mb-1">
        <Text className="font-bold text-[16px] text-text-light dark:text-text-dark">{own ? 'Mis insignias' : 'Insignias'}</Text>
        {!empty && <Text className="text-[13px] font-bold text-aqua-ink dark:text-aqua">Ver todas ›</Text>}
      </Press>
      {empty ? (
        <Text className="text-[13px] text-muted-light dark:text-muted-dark leading-5 mt-1">
          Completa tu Ruta del mes o canjea en un local para ganar tu primera insignia.
        </Text>
      ) : (
        <>
          {routes.length > 0 && (
            <View className="flex-row justify-center mt-3" style={{ gap: 18 }}>
              {routes.map((r) => (
                <Press key={r.month} accessibilityRole="button" onPress={() => own && router.push({ pathname: '/(tabs)/ruta-mes', params: { m: r.month } })}>
                  <RutaRing size={62} done={3} month={rutaMonthShort(r.month)} glow={false} />
                </Press>
              ))}
            </View>
          )}
          {routes.length > 0 && locals.length > 0 && <View className="h-px bg-line-light dark:bg-line-dark my-3.5" />}
          {locals.length > 0 && (
            <View className="flex-row justify-center" style={{ gap: 16, marginTop: routes.length ? 0 : 12 }}>
              {locals.map((l) => <LocalBadge key={l.business_id} logoUrl={l.logo_url} name={l.name} level={l.level} size={52} />)}
            </View>
          )}
        </>
      )}
    </Glass>
  );
}
