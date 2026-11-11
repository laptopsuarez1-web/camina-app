import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Coin } from '@/components/ui/Coin';
import { Check } from '@/components/icons';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { colors } from '@/theme/tokens';
import { STREAK_BONUS_DAYS, STREAK_BONUS_POINTS } from '@/constants/business-rules';

// Cuántos días del tramo actual lleva la racha: 0..7. Con la racha en un múltiplo de 7 el tramo está completo (bono ganado).
export function streakLap(streak: number) {
  if (streak <= 0) return 0;
  const r = streak % STREAK_BONUS_DAYS;
  return r === 0 ? STREAK_BONUS_DAYS : r;
}

// La racha debajo del aro de Inicio: la llama con el número y el camino de 7 días hasta el bono.
// Va sobre la cabecera oscura, así que usa los colores de la cabecera en los dos modos.
export function StreakPath({ streak, onPress }: { streak: number; onPress: () => void }) {
  const lap = streakLap(streak);
  const left = STREAK_BONUS_DAYS - lap;
  const label = streak <= 0
    ? `Sin racha. Camina hoy para empezar: cada ${STREAK_BONUS_DAYS} días seguidos ganas ${STREAK_BONUS_POINTS} Puntos. Ver tus rachas`
    : `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. ${left === 0 ? `Ganaste el bono de ${STREAK_BONUS_POINTS} Puntos` : `${left === 1 ? 'Falta 1 día' : `Faltan ${left} días`} para el bono de ${STREAK_BONUS_POINTS} Puntos`}. Ver tus rachas`;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="light"
      className="mx-5 flex-row items-center rounded-2xl"
      style={{ marginTop: 20, paddingVertical: 10, paddingLeft: 12, paddingRight: 12, gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <View style={{ opacity: streak > 0 ? 1 : 0.45 }}>
        <IllArt kind="flame" size={30} />
      </View>
      <View style={{ minWidth: 34 }}>
        <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 19, lineHeight: 21, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{streak}</Text>
        <Text allowFontScaling={false} style={{ color: colors.authMuted, fontSize: 11, lineHeight: 13 }}>{streak === 1 ? 'día' : 'días'}</Text>
      </View>
      <View className="flex-1 flex-row items-center justify-between" accessible={false} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: STREAK_BONUS_DAYS - 1 }, (_, i) => {
          const on = i < lap;
          return (
            <View key={i} style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.mint : 'rgba(255,255,255,0.1)' }}>
              {on ? <Check size={12} color={colors.mintDark} weight="bold" /> : null}
            </View>
          );
        })}
        {/* El séptimo día es el bono: la moneda se enciende cuando se completa el tramo. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 5, paddingRight: 8, height: 24, borderRadius: 12, backgroundColor: lap >= STREAK_BONUS_DAYS ? 'rgba(98,240,182,0.22)' : 'rgba(255,255,255,0.1)', opacity: lap >= STREAK_BONUS_DAYS ? 1 : 0.75 }}>
          <Coin size={16} />
          <Text allowFontScaling={false} style={{ color: lap >= STREAK_BONUS_DAYS ? colors.mint : colors.authMuted, fontSize: 11.5, fontWeight: '800' }}>+{STREAK_BONUS_POINTS}</Text>
        </View>
      </View>
    </Press>
  );
}
