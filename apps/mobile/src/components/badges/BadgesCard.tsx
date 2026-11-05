import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { RutaRing } from '@/components/ruta/RutaRing';
import { LocalBadge } from './LocalBadge';
import { rutaMonthShort } from '@/hooks/useRuta';
import type { UserBadges } from '@/hooks/useBadges';

// "Mis insignias" en el Perfil: una sola fila con las rutas del mes completadas y los locales. "Ver todas" abre el resto.
// `own` = es mi perfil (se puede tocar para ver todas; en el de un amigo es solo para mirar).
export function BadgesCard({ badges, own = true, userId }: { badges: UserBadges | undefined; own?: boolean; userId?: string }) {
  // Sin datos (cargando o el servidor todavía sin 0083): no se muestra nada.
  if (!badges) return null;
  const routes = (badges?.routes ?? []).slice(0, 2);
  const locals = (badges?.locals ?? []).slice(0, 5 - routes.length);
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
        // Todo en una sola fila: primero las rutas del mes y después los locales (máximo 5, sin separador).
        <View className="flex-row justify-center items-center mt-3" style={{ gap: 14 }}>
          {routes.map((r) => (
            <Press key={r.month} accessibilityRole="button" onPress={() => own && router.push({ pathname: '/(tabs)/ruta-mes', params: { m: r.month } })}>
              <RutaRing size={54} done={3} month={rutaMonthShort(r.month)} glow={false} />
            </Press>
          ))}
          {locals.map((l) => <LocalBadge key={l.business_id} logoUrl={l.logo_url} name={l.name} level={l.level} size={48} />)}
        </View>
      )}
    </Glass>
  );
}
