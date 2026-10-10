import { useEffect, useRef, useState } from 'react';
import { type TextProps } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from 'react-native-reanimated';

// Cifra grande que cuenta de 0 al valor en 900 ms (salida suave) la PRIMERA vez que se abre una pantalla en la sesión.
// Después no se anima: al volver a la pantalla, o cuando el valor cambia, se muestra el valor final. Con "reducir movimiento" tampoco.
// Cada cuadro vuelve a dibujar solo este texto (no toda la pantalla).
const seen = new Set<string>();
const DURATION = 900;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({
  value, id, ready = true, format = (n) => n.toLocaleString('es-BO'), ...props
}: { value: number; id: string; ready?: boolean; format?: (n: number) => string } & TextProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (!ready || seen.has(id) || reduced ? value : 0));
  const first = useRef(!seen.has(id) && !reduced);

  useEffect(() => {
    // Mientras los datos no llegaron (ready = false) se muestra el valor tal cual y no se gasta la animación.
    if (!ready || !first.current) { setShown(value); return; }
    first.current = false;
    seen.add(id);
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      setShown(value * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, id, ready]);

  const text = format(Number.isInteger(value) ? Math.round(shown) : shown);
  return <Text {...props}>{text}</Text>;
}
