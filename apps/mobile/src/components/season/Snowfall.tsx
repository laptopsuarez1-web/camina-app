import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { create } from 'zustand';
import { useChristmas } from '@/hooks/useSeason';

// Nieve navideña. No está siempre: cae unos segundos en momentos puntuales (la primera vez que abres la app en el día,
// cuando cumples tu meta, cuando tu grupo enciende la luz del árbol) y se va sola. Solo en temporada y nunca con
// "reducir movimiento". Cualquier pantalla la pide con letItSnow(); la dibuja SnowHost, una sola vez arriba de todo.
// snowing = está cayendo; visible = todavía se ve (incluye el desvanecido final).
type SnowState = { snowing: boolean; visible: boolean };
const useSnowStore = create<SnowState>(() => ({ snowing: false, visible: false }));
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let stopAt = 0;

export function letItSnow(ms = 7000) {
  const at = Date.now() + ms;
  if (at <= stopAt && useSnowStore.getState().snowing) return;
  stopAt = at;
  if (stopTimer) clearTimeout(stopTimer);
  useSnowStore.setState({ snowing: true, visible: true });
  stopTimer = setTimeout(() => useSnowStore.setState({ snowing: false }), ms);
}

function snowGone() {
  if (!useSnowStore.getState().snowing) useSnowStore.setState({ visible: false });
}

// Números repetibles: cada copo tiene siempre el mismo tamaño y recorrido.
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

type Flake = { x: number; size: number; fall: number; delay: number; sway: number; opacity: number };

function makeFlakes(n: number, width: number): Flake[] {
  const r = rng(17);
  return Array.from({ length: n }, () => {
    const near = r() > 0.72; // algunos copos más grandes y rápidos, "más cerca"
    return {
      x: r() * width,
      size: near ? 5 + r() * 3 : 2.2 + r() * 2.6,
      fall: near ? 4200 + r() * 1800 : 6500 + r() * 3500,
      delay: r() * 3200,
      sway: 8 + r() * 18,
      opacity: near ? 0.85 : 0.45 + r() * 0.35,
    };
  });
}

function FlakeView({ f, height }: { f: Flake; height: number }) {
  const y = useSharedValue(-20);
  const sx = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(f.delay, withRepeat(withTiming(height + 20, { duration: f.fall, easing: Easing.linear }), -1, false));
    sx.value = withDelay(
      f.delay,
      withRepeat(withSequence(withTiming(f.sway, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(-f.sway, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1, true),
    );
    return () => {
      cancelAnimation(y);
      cancelAnimation(sx);
    };
  }, [f, height, y, sx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: sx.value }] }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: f.x,
          top: 0,
          width: f.size,
          height: f.size,
          borderRadius: f.size / 2,
          backgroundColor: '#FFFFFF',
          opacity: f.opacity,
          shadowColor: '#FFFFFF',
          shadowOpacity: 0.8,
          shadowRadius: f.size,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

// La nieve en sí: entra suave, cae y al apagarse se desvanece (no se corta de golpe).
export function Snowfall({ active, density = 34, onGone }: { active: boolean; density?: number; onGone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const flakes = useMemo(() => makeFlakes(density, width), [density, width]);
  const fade = useSharedValue(0);
  useEffect(() => {
    if (active) fade.value = withTiming(1, { duration: 700 });
    else fade.value = withTiming(0, { duration: 1400 }, (done) => {
      if (done && onGone) runOnJS(onGone)();
    });
  }, [active, fade, onGone]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {flakes.map((f, i) => <FlakeView key={i} f={f} height={height} />)}
    </Animated.View>
  );
}

// Va una sola vez en el layout de las pestañas, encima de todo.
export function SnowHost() {
  const christmas = useChristmas();
  const reduced = useReducedMotion();
  const { snowing, visible } = useSnowStore();
  if (!visible || !christmas || reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Snowfall active={snowing} onGone={snowGone} />
    </View>
  );
}
