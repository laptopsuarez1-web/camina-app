import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View, type TextStyle } from 'react-native';
import { Text } from '@/components/ui/Text';

// Saldo de puntos animado: cuando sube estando en pantalla, el número "cuenta" hasta el valor nuevo
// y todo el chip (moneda + número + fondo) se agranda un poco y vuelve. Al abrir la app no hace nada.
export function usePointsPulse(raw: number | undefined) {
  const value = raw ?? 0;
  const prev = useRef<number | null>(null);
  const [shown, setShown] = useState(value);
  const scale = useRef(new Animated.Value(1)).current;
  const counter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (raw === undefined) return; // todavía cargando: no es una ganancia
    const before = prev.current;
    prev.current = value;
    if (before === null || value <= before) {
      setShown(value);
      return;
    }
    counter.stopAnimation();
    counter.removeAllListeners();
    counter.setValue(0);
    counter.addListener(({ value: v }) => setShown(Math.round(before + (value - before) * v)));
    Animated.timing(counter, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      counter.removeAllListeners();
      setShown(value);
    });
    scale.stopAnimation();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.14, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [raw, value, counter, scale]);

  return { shown, scale };
}

// `shown` null = el saldo no pudo cargarse: se muestra "—" en vez de un 0 que parece real.
export function PointsCounter({ shown, coinSize = 18, textStyle }: { shown: number | null; coinSize?: number; textStyle?: TextStyle }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Image source={require('@/../assets/camina-coin.png')} style={{ width: coinSize, height: coinSize, borderRadius: coinSize / 2 }} />
      <Text maxFontSizeMultiplier={1.3} style={[textStyle, { fontVariant: ['tabular-nums'] }]}>{shown === null ? '—' : shown.toLocaleString('es-BO')}</Text>
    </View>
  );
}
