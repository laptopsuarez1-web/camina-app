import { useLayoutEffect, useRef } from 'react';

// Guarda siempre el último valor (por ejemplo un `onClose`) para leerlo desde un gesto o un temporizador,
// sin tocar la ref mientras se dibuja el componente (se actualiza justo después de cada dibujo).
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
