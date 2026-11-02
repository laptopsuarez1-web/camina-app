import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { GOLD } from '@/components/ui/Featured';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { Gift, ChevronRight } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { plural } from '@/lib/format';
import { daysLeft } from '@/hooks/useCaminaCard';
import type { CaminaCard } from '@/lib/database.types';

const GOLD_TEXT = '#3D2A00';

const dayFmt = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' });
const formatDay = (iso: string) => dayFmt.format(new Date(iso)).replace('.', '');

// Cuenta regresiva: dorada, naranja a los 7 días y roja a los 2.
export function Countdown({ days, label }: { days: number; label?: string }) {
  const t = useThemeColors();
  const urgent = days <= 2;
  const warn = days <= 7;
  const bg = urgent ? (t.dark ? 'rgba(255,131,136,0.16)' : '#FDE7E8') : warn ? (t.dark ? 'rgba(255,178,122,0.16)' : '#FDEEE2') : t.dark ? 'rgba(226,179,60,0.16)' : '#FFF4D6';
  const fg = urgent ? (t.dark ? colors.dangerSoft : colors.dangerInk) : warn ? (t.dark ? colors.warnSoft : colors.warnDeep) : t.dark ? '#F5D27A' : '#8F6307';
  return (
    <View className="self-start rounded-full" style={{ backgroundColor: bg, paddingHorizontal: 11, paddingVertical: 5 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: fg }}>
        {label ?? `Te ${plural(days, 'queda', 'quedan')} ${days} ${plural(days, 'día', 'días')}`}
      </Text>
    </View>
  );
}

// Un sello: la moneda dorada de Camina. Al aparecer cae con un golpe (resorte); los vacíos son un círculo punteado.
function StampCoin({ index, size, fresh }: { index: number; size: number; fresh: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced || !fresh ? 1 : 2.4);
  const opacity = useSharedValue(reduced || !fresh ? 1 : 0);
  const tilt = useSharedValue(reduced || !fresh ? 0 : -24);
  useEffect(() => {
    if (reduced || !fresh) return;
    const d = index * 120;
    opacity.value = withDelay(d, withTiming(1, { duration: 120 }));
    scale.value = withDelay(d, withSpring(1, { damping: 7, stiffness: 190 }));
    tilt.value = withDelay(d, withSpring(0, { damping: 9, stiffness: 160 }));
  }, [fresh, index, opacity, reduced, scale, tilt]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Coin size={size} gold />
    </Animated.View>
  );
}

export function CaminaStamps({ card, size = 46, animate = false }: { card: CaminaCard; size?: number; animate?: boolean }) {
  const t = useThemeColors();
  return (
    <View className="flex-row items-center justify-between">
      {Array.from({ length: card.goal }, (_, i) =>
        i < card.stamps ? (
          <StampCoin key={i} index={i} size={size} fresh={animate} />
        ) : (
          <View
            key={i}
            style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.muted }}>{i + 1}</Text>
          </View>
        )
      )}
    </View>
  );
}

// Brillo dorado que cruza la tarjeta cuando está completa.
function Shine() {
  const reduced = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduced) return;
    x.value = withRepeat(withSequence(withTiming(-1, { duration: 0 }), withDelay(900, withTiming(1.2, { duration: 1700, easing: Easing.inOut(Easing.ease) }))), -1);
  }, [reduced, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 360 }, { skewX: '-20deg' }] }));
  if (reduced) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 90 }, style]}>
      <LinearGradient colors={['transparent', 'rgba(226,179,60,0.28)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

// La tarjeta general de Camina, en Puntos (donde antes iban las tarjetas por local).
export function CaminaCardView({ card, onOpen, animate }: { card: CaminaCard; onOpen: () => void; animate?: boolean }) {
  const t = useThemeColors();
  const [now] = useState(() => Date.now());
  const ready = card.stamps >= card.goal;
  const days = daysLeft(card, now);
  const chosen = card.chosen_benefit_id ? card.options.find((o) => o.benefit_id === card.chosen_benefit_id) ?? null : null;
  const missing = card.goal - card.stamps;

  return (
    <Glass
      className="rounded-3xl p-4 overflow-hidden"
      style={ready ? { borderWidth: 2, borderColor: GOLD } : undefined}
      accessible={false}
    >
      {ready ? <Shine /> : null}
      <View className="flex-row items-center justify-between mb-3.5">
        <Text accessibilityRole="header" className="text-[16px] font-bold text-text-light dark:text-text-dark shrink" numberOfLines={1}>Tarjeta de fidelidad</Text>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: ready ? GOLD : t.dark ? colors.dark.purpleLight : colors.light.purpleLight }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: ready ? GOLD_TEXT : t.purpleText }}>{Math.min(card.stamps, card.goal)} de {card.goal}</Text>
        </View>
      </View>

      <CaminaStamps card={card} animate={animate} />

      {!ready ? (
        <>
          <Text className="text-[13.5px] leading-[19px] text-text-light dark:text-text-dark mt-4">
            {missing === 1 ? 'Te falta 1 canje' : `Te faltan ${missing} canjes`} para elegir un premio gratis. Cada canje cuenta, en cualquier comercio.
          </Text>
          {card.history.length > 0 ? (
            <View className="mt-3 pt-3 border-t border-line-light dark:border-line-dark">
              <Text className="text-[12px] font-semibold text-muted-light dark:text-muted-dark mb-1">Dónde y cuándo canjeaste</Text>
              {card.history.map((h) => (
                <Text key={h.at} className="text-[13px] text-text-light dark:text-text-dark" style={{ lineHeight: 20 }}>{h.business_name} · {formatDay(h.at)}</Text>
              ))}
            </View>
          ) : null}
        </>
      ) : chosen ? (
        <View className="mt-4" style={{ gap: 12 }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <BusinessAvatar logoUrl={chosen.business.logo_url} category={chosen.business.category} size={46} />
            <View className="flex-1">
              <Text className="text-[12px] font-semibold text-muted-light dark:text-muted-dark">Tu premio</Text>
              <Text className="text-[15px] font-bold text-text-light dark:text-text-dark" numberOfLines={2}>{chosen.benefit_name}</Text>
              <Text className="text-[13px] text-muted-light dark:text-muted-dark" numberOfLines={1}>{chosen.business.name}</Text>
            </View>
          </View>
          {days !== null ? <Countdown days={days} label={`Vence en ${days} ${plural(days, 'día', 'días')}`} /> : null}
          <Press accessibilityRole="button" onPress={onOpen} className="rounded-full flex-row items-center justify-center" style={{ backgroundColor: GOLD, paddingVertical: 13, gap: 6 }}>
            <Text style={{ color: GOLD_TEXT, fontSize: 15, fontWeight: '800' }}>Ver mi premio</Text>
            <ChevronRight size={16} color={GOLD_TEXT} />
          </Press>
        </View>
      ) : (
        <View className="mt-4" style={{ gap: 12 }}>
          <View>
            <Text className="text-[17px] font-bold text-text-light dark:text-text-dark">¡Completaste tu tarjeta!</Text>
            <Text className="text-[13.5px] leading-[19px] text-text-light dark:text-text-dark mt-1">Elige un premio gratis entre los comercios que participan.</Text>
          </View>
          {days !== null ? <Countdown days={days} /> : null}
          <Press accessibilityRole="button" onPress={onOpen} className="rounded-full flex-row items-center justify-center" style={{ backgroundColor: GOLD, paddingVertical: 13, gap: 8 }}>
            <Gift size={18} color={GOLD_TEXT} />
            <Text style={{ color: GOLD_TEXT, fontSize: 15, fontWeight: '800' }}>Elegir mi premio</Text>
          </Press>
        </View>
      )}
    </Glass>
  );
}
