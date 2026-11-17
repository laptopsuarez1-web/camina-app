import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { useRefreshStore } from '@/store/useRefreshStore';

const FESTEJA = require('@/../assets/baifo/festeja.webp');
const RATIO = 287 / 420;
const SIZE = 68; // círculo
const BAIFO_H = 48;
const HOP = 9; // altura del salto
const LOOP = 720; // ms por salto

// Indicador de "tirar para actualizar": el Baifo salta de alegría dentro de un círculo mientras se recargan los datos.
// Una sola pose (festeja) en bucle. Todo en JS con Reanimated (corre en el hilo de la UI), sin módulos nativos.
// Con "reducir movimiento" el Baifo queda quieto.
export function RefreshIndicator() {
  const refreshing = useRefreshStore((s) => s.refreshing);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const show = useSharedValue(0);
  const p = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      show.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      p.value = 0;
      if (!reduced) p.value = withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1, false);
      return;
    }
    show.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    // Ya escondido, el salto se detiene: no gasta nada mientras no se recarga.
    const id = setTimeout(() => { cancelAnimation(p); p.value = 0; }, 220);
    return () => clearTimeout(id);
  }, [refreshing]); // eslint-disable-line react-hooks/exhaustive-deps

  const wrap = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ translateY: (show.value - 1) * 14 }, { scale: 0.85 + show.value * 0.15 }] }));
  const baifo = useAnimatedStyle(() => {
    // 80% del ciclo en el aire (curva suave), 20% aterrizando con un pequeño aplastón.
    const air = p.value < 0.8 ? Math.sin((p.value / 0.8) * Math.PI) : 0;
    const land = p.value >= 0.8 ? Math.sin(((p.value - 0.8) / 0.2) * Math.PI) : 0;
    return { transform: [{ translateY: -air * HOP }, { scaleY: 1 - land * 0.07 + air * 0.03 }, { scaleX: 1 + land * 0.05 }] };
  });
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center', zIndex: 50 }}
    >
      <Animated.View
        style={[
          {
            width: SIZE, height: SIZE, borderRadius: SIZE / 2,
            backgroundColor: colors.authBgSoft, borderWidth: 1, borderColor: 'rgba(98,240,182,0.35)',
            alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5,
            shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          },
          wrap,
        ]}
      >
        <Animated.Image source={FESTEJA} resizeMode="contain" style={[{ height: BAIFO_H, aspectRatio: RATIO, transformOrigin: 'bottom' }, baifo]} />
      </Animated.View>
    </View>
  );
}
