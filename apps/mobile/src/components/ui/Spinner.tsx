import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme/tokens';

// Ruedita de carga de Camina: un aro fino con un tramo de color que gira. Reemplaza a la ruedita gris del sistema,
// con las mismas props (`size`, `color`, `style`) para usarla igual en botones y pantallas.
export function Spinner({ size = 'small', color = colors.mint, style, accessibilityLabel = 'Cargando' }: { size?: 'small' | 'large' | number; color?: string; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const d = typeof size === 'number' ? size : size === 'large' ? 34 : 20;
  const stroke = Math.max(2, Math.round(d / 9));
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    // Con "reducir movimiento" gira igual pero lento: quieta parecería que la app se colgó.
    turn.value = withRepeat(withTiming(1, { duration: reduced ? 2400 : 800, easing: Easing.linear }), -1);
  }, [turn, reduced]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: d, height: d }}>
        <View style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: stroke, borderColor: color, opacity: 0.22 }} />
        <Animated.View style={[{ width: d, height: d, borderRadius: d / 2, borderWidth: stroke, borderColor: 'transparent', borderTopColor: color, borderRightColor: color }, anim]} />
      </View>
    </View>
  );
}
