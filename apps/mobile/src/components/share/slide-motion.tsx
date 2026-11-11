import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// Movimiento de las láminas del resumen del mes cuando se ven en pantalla, como una historia:
// los bloques entran de a uno, los números suben y las barras crecen.
// Solo se mueve la lámina que la persona está mirando. La copia que se captura para compartir no tiene este
// contexto, así que siempre sale quieta y completa (nunca se comparte una imagen a medio animar).
const SlideMotion = createContext(false);

export function SlideMotionProvider({ on, children }: { on: boolean; children: ReactNode }) {
  return <SlideMotion.Provider value={on}>{children}</SlideMotion.Provider>;
}
export const useSlideMotion = () => useContext(SlideMotion);

const STEP_MS = 130;

// Contenedor de una lámina: sus bloques (título, panel, cifras) entran uno detrás de otro, de arriba hacia abajo.
export function Stagger({ style, children }: { style?: ViewStyle; children: ReactNode }) {
  const on = useSlideMotion();
  if (!on) return <View style={style}>{children}</View>;
  return (
    <View style={style}>
      {React.Children.toArray(children).map((child, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(60 + i * STEP_MS).duration(420).easing(Easing.out(Easing.cubic))}>
          {child}
        </Animated.View>
      ))}
    </View>
  );
}

// Barras que crecen desde abajo (o desde la izquierda con axis="x").
export function Grow({ axis = 'y', delay = 260, children }: { axis?: 'x' | 'y'; delay?: number; children: ReactNode }) {
  const on = useSlideMotion();
  const k = useSharedValue(on ? 0 : 1);
  useEffect(() => {
    if (on) k.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [on, k, delay]);
  const style = useAnimatedStyle(() => ({ transform: axis === 'y' ? [{ scaleY: k.value }] : [{ scaleX: k.value }] }));
  if (!on) return <>{children}</>;
  return <Animated.View style={[{ transformOrigin: axis === 'y' ? 'bottom' : 'left' }, style]}>{children}</Animated.View>;
}

// Un número que sube desde cero hasta su valor ("148.230", "#12", "7"). Lo que no es número (prefijo, sufijo) queda fijo.
// `format` vuelve a escribir el número con el mismo formato que el valor final.
export function useCountUp(value: string, format: (n: number) => string, duration = 900): string {
  const on = useSlideMotion();
  const m = /^(\D*)([\d.]+)(\D*)$/.exec(value);
  const target = m ? Number(m[2].replace(/\./g, '')) : NaN;
  const can = on && !!m && Number.isFinite(target) && target > 0;
  const [n, setN] = useState(can ? 0 : target);
  useEffect(() => {
    if (!can) return;
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const q = Math.min(1, (Date.now() - t0) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - q, 3))));
      if (q < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [can, target, duration]);
  return can && m ? `${m[1]}${format(n)}${m[3]}` : value;
}
