import { createContext, useContext, useEffect, type ReactNode } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { KEYS, MOTION_MS, sample, type IconMotion } from '@/lib/motion';

// Cuántas veces se apretó el contenedor (un `Press`). Los íconos que están adentro lo leen para reaccionar al toque.
export const PressTickContext = createContext(0);
export const usePressTick = () => useContext(PressTickContext);

const ORIGIN: Record<IconMotion, string> = { pop: '50% 50%', thud: '50% 50%', wobble: '50% 100%', ring: '50% 8%', flick: '50% 90%' };

// Envuelve un ícono y le da un gesto corto cada vez que `tick` cambia (no al montarse).
// Con "reducir movimiento" no se anima. `idle` hace que respire solo (la llama de la racha).
export function ReactiveIcon({ motion = 'pop', tick, idle = false, children }: { motion?: IconMotion; tick: number; idle?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  const breath = useSharedValue(0);
  const keys = KEYS[motion];

  useEffect(() => {
    if (tick === 0 || reduced) return;
    p.value = 0;
    p.value = withTiming(1, { duration: MOTION_MS[motion], easing: Easing.out(Easing.quad) });
  }, [tick, reduced, motion, p]);

  useEffect(() => {
    if (!idle || reduced) return;
    breath.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, false);
    return () => { breath.value = 0; };
  }, [idle, reduced, breath]);

  const style = useAnimatedStyle(() => {
    const v = p.value;
    const s = keys.scale ? sample(keys.at, keys.scale, v) : 1;
    const sx = keys.scaleX ? sample(keys.at, keys.scaleX, v) : 1;
    const r = keys.rotate ? sample(keys.at, keys.rotate, v) : 0;
    const b = idle ? breath.value : 0;
    return { transform: [{ scaleX: sx * (1 - 0.025 * b) }, { scaleY: s * (1 + 0.05 * b) }, { rotate: `${r}deg` }] };
  });

  return <Animated.View style={[{ transformOrigin: ORIGIN[motion] }, style]}>{children}</Animated.View>;
}
