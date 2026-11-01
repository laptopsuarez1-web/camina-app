import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { colors } from '@/theme/tokens';

// Barra animada de la meta del grupo (también usada en la ficha de amigo): se llena al entrar, un brillo la recorre mientras falta y, al cumplirla, late.
// `plain`: sin latido ni cambio de color al llegar al 100 % (para comparar dos personas, donde la mayor siempre llega al tope).
export function GoalBar({ pct, accent, plain = false }: { pct: number; accent: string; plain?: boolean }) {
  const w = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 1100, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  useEffect(() => {
    const loop = Animated.loop(
      !plain && pct >= 100
        ? Animated.sequence([
            Animated.timing(pulse, { toValue: 1.04, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        : Animated.sequence([
            Animated.timing(shine, { toValue: 1, duration: 1600, delay: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
    );
    loop.start();
    return () => loop.stop();
  }, [pct >= 100, plain, shine, pulse]);
  return (
    <Animated.View style={{ transform: [{ scaleY: pulse }] }}>
      <View className="h-2.5 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
        <Animated.View style={{ width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), height: '100%', backgroundColor: !plain && pct >= 100 ? colors.mint : accent, overflow: 'hidden', borderRadius: 999 }}>
          <Animated.View
            style={{
              position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.45)',
              transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-60, 320] }) }, { skewX: '-20deg' }],
            }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

