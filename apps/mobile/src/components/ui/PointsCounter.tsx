import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View, type TextStyle } from 'react-native';

// Moneda + saldo de puntos. Cuando el saldo sube estando en pantalla, la moneda late una vez
// y sale un "+N" dorado que se desvanece. Al abrir la app (primer valor) no hace nada.
export function PointsCounter({ value: rawValue, coinSize = 18, textStyle }: { value: number | undefined; coinSize?: number; textStyle?: TextStyle }) {
  const value = rawValue ?? 0;
  const prev = useRef<number | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const gain = useRef(0);

  useEffect(() => {
    if (rawValue === undefined) return; // todavía cargando: no es una ganancia
    if (prev.current !== null && value > prev.current) {
      gain.current = value - prev.current;
      pulse.setValue(0);
      rise.setValue(0);
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rise, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
    prev.current = value;
  }, [rawValue, value, pulse, rise]);

  const scale = pulse.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.35, 1] });
  const floatY = rise.interpolate({ inputRange: [0, 1], outputRange: [6, -8] });
  const floatOpacity = rise.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={require('@/../assets/camina-coin.png')} style={{ width: coinSize, height: coinSize, borderRadius: coinSize / 2 }} />
      </Animated.View>
      <Text style={textStyle}>{value}</Text>
      <Animated.Text
        pointerEvents="none"
        style={{
          position: 'absolute', right: -30, top: 0, fontSize: 13, fontWeight: '900', color: '#F2B53C',
          opacity: floatOpacity, transform: [{ translateY: floatY }],
        }}
      >
        {`+${gain.current || 1}`}
      </Animated.Text>
    </View>
  );
}
