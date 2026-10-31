import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { Flame } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { STREAK_BONUS_POINTS, STREAK_BONUS_DAYS, STREAK_MIN_STEPS } from '@/constants/business-rules';

const DAYS = Array.from({ length: STREAK_BONUS_DAYS }, (_, i) => i);

// Tarjeta de racha semanal: 7 casillas que se llenan de izquierda a derecha y, al cerrar la semana, +5 Puntos.
// Al entrar a la pantalla la llama se enciende y las casillas se llenan una tras otra (sin animación si el sistema pide menos movimiento).
export function StreakCard({ streak, isDark }: { streak: number; isDark: boolean }) {
  const filled = streak <= 0 ? 0 : streak % STREAK_BONUS_DAYS === 0 ? STREAK_BONUS_DAYS : streak % STREAK_BONUS_DAYS;
  const [flame] = useState(() => new Animated.Value(0));
  const [cells] = useState(() => DAYS.map(() => new Animated.Value(0)));

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!alive) return;
        if (v) {
          flame.setValue(1);
          cells.forEach((c, i) => c.setValue(i < filled ? 1 : 0));
          return;
        }
        Animated.sequence([
          Animated.timing(flame, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
          Animated.stagger(
            110,
            cells.map((c, i) => Animated.timing(c, { toValue: i < filled ? 1 : 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
          ),
        ]).start();
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [filled, flame, cells]);

  const ink = isDark ? '#FFB27A' : colors.warnDeep;
  const flameScale = flame.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const left = STREAK_BONUS_DAYS - filled;

  return (
    <Glass className="rounded-2xl px-3.5 py-3.5 mb-3">
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Animated.View
          style={{
            width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(242,152,92,0.18)' : colors.warnLight,
            opacity: flame, transform: [{ scale: flameScale }],
          }}
        >
          <Flame size={22} color={colors.warn} />
        </Animated.View>
        <View className="flex-1">
          <Text className="text-[13.5px] font-bold" style={{ color: ink }}>
            {streak > 0 ? `${streak} ${streak === 1 ? 'día seguido' : 'días seguidos'}` : 'Empieza tu racha'}
          </Text>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark">
            {streak <= 0
              ? `Camina al menos ${STREAK_MIN_STEPS.toLocaleString('es-BO')} pasos ${STREAK_BONUS_DAYS} días seguidos y ganas +${STREAK_BONUS_POINTS} Puntos`
              : filled === STREAK_BONUS_DAYS
                ? `¡Semana completa! Sumaste +${STREAK_BONUS_POINTS} Puntos`
                : `${left === 1 ? 'Falta 1 día' : `Faltan ${left} días`} para +${STREAK_BONUS_POINTS} Puntos (mín. ${STREAK_MIN_STEPS.toLocaleString('es-BO')} pasos al día)`}
          </Text>
        </View>
      </View>
      <View
        className="flex-row mt-3"
        style={{ gap: 6 }}
        accessible
        accessibilityLabel={`Racha semanal: ${filled} de ${STREAK_BONUS_DAYS} días`}
      >
        {DAYS.map((i) => {
          const last = i === STREAK_BONUS_DAYS - 1;
          const scale = cells[i].interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.18, 1] });
          return (
            <View key={i} className="flex-1 items-center">
              <View
                style={{
                  width: '100%', height: 30, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(36,23,72,0.06)',
                }}
              >
                <Animated.View
                  style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.warn,
                    opacity: cells[i], transform: [{ scale }],
                  }}
                />
                {last ? (
                  <Text className="text-[12px] font-extrabold" style={{ color: i < filled ? '#fff' : ink }}>{`+${STREAK_BONUS_POINTS}`}</Text>
                ) : (
                  <Flame size={14} color={i < filled ? '#fff' : isDark ? '#6F6590' : '#C7BEDB'} />
                )}
              </View>
              <Text className="text-[12px] mt-1 text-muted-light dark:text-muted-dark">{i + 1}</Text>
            </View>
          );
        })}
      </View>
    </Glass>
  );
}
