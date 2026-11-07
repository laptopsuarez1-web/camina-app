import { useState } from 'react';
import { View } from 'react-native';
import { BadgeSheet } from './BadgeSheet';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { RutaRing } from '@/components/ruta/RutaRing';
import { LocalBadge } from './LocalBadge';
import { rutaMonthShort } from '@/hooks/useRuta';
import { profileBadges, type LocalBadgeT, type UserBadges } from '@/hooks/useBadges';

// "Mis insignias" en el Perfil: una sola fila con las insignias que la persona eligió (o las más recientes). "Ver todas" abre el resto.
// `own` = es mi perfil (se puede tocar para ver todas; en el de un amigo es solo para mirar).
export function BadgesCard({ badges, own = true, userId }: { badges: UserBadges | undefined; own?: boolean; userId?: string }) {
  const [sheet, setSheet] = useState<LocalBadgeT | null>(null);
  // Sin datos (cargando o el servidor todavía sin 0083): no se muestra nada.
  if (!badges) return null;
  // Las que la persona eligió mostrar (hasta 5) o, si no eligió, las más recientes.
  const shownBadges = profileBadges(badges);
  const empty = shownBadges.length === 0;
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
          {shownBadges.map((b) => b.kind === 'ruta' ? (
            <Press key={b.key} accessibilityRole="button" onPress={() => own && router.push({ pathname: '/(tabs)/ruta-mes', params: { m: b.month } })}>
              <RutaRing size={54} done={3} month={rutaMonthShort(b.month)} glow={false} themeMonth={b.month} />
            </Press>
          ) : (
            <Press key={b.key} accessibilityRole="button" accessibilityHint="Ver cómo va" onPress={() => setSheet(b.local)} hitSlop={4}>
              <LocalBadge logoUrl={b.local.logo_url} name={b.local.name} level={b.local.level} size={48} />
            </Press>
          ))}
        </View>
      )}
      {sheet ? <BadgeSheet badge={sheet} own={own} onClose={() => setSheet(null)} /> : null}
    </Glass>
  );
}
