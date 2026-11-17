import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

// Mapas de Google: mientras bajan las teselas y el estilo oscuro, el mapa se ve blanco un momento y a veces
// se reacomoda (encuadre de los pines). Se tapa con el color de fondo de la tarjeta y se destapa con un fundido
// cuando el mapa terminó de cargar. Si el mapa nunca avisa (sin internet, modo lite), se destapa igual.
export function useMapReveal(color: string) {
  const [gone, setGone] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const done = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reveal = useCallback(() => {
    if (done.current) return;
    done.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setGone(true));
  }, [opacity]);

  useEffect(() => {
    const list = timers.current;
    list.push(setTimeout(reveal, 4000));
    return () => list.forEach(clearTimeout);
  }, [reveal]);

  // Listo para dibujar: se da un margen para que lleguen las teselas.
  const onMapReady = useCallback(() => { timers.current.push(setTimeout(reveal, 1200)); }, [reveal]);

  const cover = gone ? null : (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]} />
  );
  return { cover, onMapReady, onMapLoaded: reveal };
}

// Lo mismo como envoltorio, para un mapa que se arma dentro de una pantalla grande:
// <MapRevealBox color="…">{(h) => <MapView {...h} … />}</MapRevealBox>. Si el mapa se vuelve a montar, montar también la caja.
export function MapRevealBox({ color, children }: { color: string; children: (h: { onMapReady: () => void; onMapLoaded: () => void }) => React.ReactNode }) {
  const { cover, onMapReady, onMapLoaded } = useMapReveal(color);
  return (
    <>
      {children({ onMapReady, onMapLoaded })}
      {cover}
    </>
  );
}
