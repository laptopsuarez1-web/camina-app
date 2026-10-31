import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { colors } from '@/theme/tokens';

const COIN_SIZE = 30;
const STEPS = 24;

export type CoinFlightPath = { xs: number[]; ys: number[]; end: { x: number; y: number } };

// Curva suave de (x0, y0) a (x1, y1): sale hacia un costado y sube hasta el destino.
export function coinFlightPath(x0: number, y0: number, x1: number, y1: number): CoinFlightPath {
  const mx = Math.max(x0, x1) + 70;
  const my = (y0 + y1) / 2 - 20;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    xs.push(u * u * x0 + 2 * u * t * mx + t * t * x1);
    ys.push(u * u * y0 + 2 * u * t * my + t * t * y1);
  }
  return { xs, ys, end: { x: x1, y: y1 } };
}

// La moneda de Puntos sale del chip del aro, cruza la pantalla y entra en la moneda del saldo.
// Al llegar corre `bump` (0 a 1): el que lo pasa hace latir el saldo y aquí sale un aro. Se pinta encima de todo y no recibe toques.
export function CoinFlight({ path, bump, onDone }: { path: CoinFlightPath; bump: Animated.Value; onDone: () => void }) {
  const [spawn] = useState(() => new Animated.Value(0));
  const [fly] = useState(() => new Animated.Value(0));
  useEffect(() => {
    bump.setValue(0);
    const run = Animated.sequence([
      Animated.timing(spawn, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(fly, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bump, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    run.start(({ finished }) => { if (finished) onDone(); });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const input = path.xs.map((_, i) => i / STEPS);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      <Animated.View
        style={{
          position: 'absolute', left: 0, top: 0, width: COIN_SIZE, height: COIN_SIZE,
          opacity: Animated.multiply(spawn, fly.interpolate({ inputRange: [0, 0.94, 1], outputRange: [1, 1, 0] })),
          transform: [
            { translateX: fly.interpolate({ inputRange: input, outputRange: path.xs.map((x) => x - COIN_SIZE / 2) }) },
            { translateY: fly.interpolate({ inputRange: input, outputRange: path.ys.map((y) => y - COIN_SIZE / 2) }) },
            // Nace chica, se agranda al salir del chip y se achica hasta el tamaño de la moneda del saldo (18 px).
            { scale: Animated.add(spawn.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), fly.interpolate({ inputRange: [0, 1], outputRange: [0, -0.4] })) },
          ],
        }}
      >
        <Image source={require('@/../assets/camina-coin.png')} style={{ width: COIN_SIZE, height: COIN_SIZE, borderRadius: COIN_SIZE / 2 }} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute', left: path.end.x - 9, top: path.end.y - 9, width: 18, height: 18, borderRadius: 9,
          borderWidth: 2, borderColor: colors.mint,
          opacity: bump.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
    </View>
  );
}
