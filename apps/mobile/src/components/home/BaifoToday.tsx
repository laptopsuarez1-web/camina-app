import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { BaifoMascot } from '@/components/ui/BaifoMascot';
import type { BaifoToday as Today } from '@/lib/baifo-today';

const FEET = [require('@/../assets/pie-izq-mint.png'), require('@/../assets/pie-der-mint.png')];

// Una huella de Camina que aparece y se apaga, una detrás de otra, como si el Baifo viniera caminando.
function Step({ i, n }: { i: number; n: number }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 0.5 : 0);
  useEffect(() => {
    if (reduced) { o.value = 0.5; return; }
    const beat = 420;
    o.value = withDelay(i * beat, withRepeat(withSequence(
      withTiming(0.9, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(0.9, { duration: beat }),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: Math.max(0, n * beat - 260 - beat - 700) + 500 }),
    ), -1));
  }, [o, i, n, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ marginTop: i % 2 ? 7 : 0 }, style]}>
      <Image source={FEET[i % 2]} accessible={false} style={{ width: 9, height: 14, transform: [{ rotate: '90deg' }] }} resizeMode="contain" />
    </Animated.View>
  );
}

// El Baifo en Inicio: una tarjeta chica debajo del aro con una frase según cómo va el día.
// Sentado si todavía no caminaste, caminando (y dejando huellas) cuando vas en camino, festejando con la meta cumplida.
export function BaifoToday({ today, onPress }: { today: Today; onPress: () => void }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={`${today.title} ${today.body}`} onPress={onPress} haptic="light" className="mx-5 mb-4" style={{ marginTop: 10 }}>
      <Glass className="rounded-3xl flex-row items-center" style={{ paddingVertical: 12, paddingRight: 16, paddingLeft: 92, minHeight: 72 }}>
        <View className="flex-1">
          <Text className="text-[14.5px] font-extrabold text-text-light dark:text-text-dark" numberOfLines={1}>{today.title}</Text>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark" style={{ lineHeight: 17, marginTop: 1 }} numberOfLines={2}>{today.body}</Text>
        </View>
      </Glass>
      {/* El Baifo sobresale un poco por arriba de la tarjeta, parado en su borde de abajo. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 6, bottom: 6, width: 84, alignItems: 'center' }}>
        <BaifoMascot pose={today.pose} height={today.pose === 'sentado' ? 74 : 86} />
      </View>
      {today.mood === 'going' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 4, bottom: 3, flexDirection: 'row', gap: 3 }}>
          {[0, 1, 2].map((i) => <Step key={i} i={i} n={3} />)}
        </View>
      ) : null}
    </Press>
  );
}
