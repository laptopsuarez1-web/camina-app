import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

// Los pies del logo sin el aro (mismo lienzo que logo-mint.png, así calzan exacto dentro del aro).
const PIES = require('@/../assets/logo-pies-mint.png');

// Pantalla de carga con el logo de Camina: los pies quietos y el aro del logo girando como ruedita.
// Las medidas del aro salen del logo: grosor 32/512 y borde exterior a 9/512 del lienzo.
export function LogoLoader({ size = 96 }: { size?: number }) {
  const dark = useColorScheme().colorScheme === 'dark';
  // En claro el menta casi no se ve sobre el fondo lila: va el verde de íconos.
  const color = dark ? colors.mint : colors.aquaIcon;
  const stroke = (size * 32) / 512;
  const r = (size * (494 / 512) - stroke) / 2;
  const c = size / 2;
  const len = 2 * Math.PI * r;
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    // Con "reducir movimiento" gira igual pero lento: quieto parecería que la app se colgó.
    turn.value = withRepeat(withTiming(1, { duration: reduced ? 3000 : 1000, easing: Easing.linear }), -1);
  }, [turn, reduced]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Cargando" style={{ width: size, height: size }}>
      <Image source={PIES} style={{ position: 'absolute', width: size, height: size, tintColor: color }} />
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={color} strokeOpacity={0.22} strokeWidth={stroke} fill="none" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, anim]}>
        <Svg width={size} height={size}>
          {/* Tramo de ~110° con puntas redondas, como en la muestra. */}
          <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len * 0.3} ${len}`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
