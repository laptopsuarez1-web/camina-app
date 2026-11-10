// Ciudades de Camina. Tarija es la de lanzamiento; las demás quedan listas para cuando se abran.
// El centro de cada una se usa para ubicar el mapa cuando la persona no da permiso de ubicación.
export const DEFAULT_CITY = 'Tarija';

const CENTERS: Record<string, { latitude: number; longitude: number }> = {
  Tarija: { latitude: -21.5355, longitude: -64.7296 },
  'Santa Cruz': { latitude: -17.7833, longitude: -63.1821 },
  'La Paz': { latitude: -16.4897, longitude: -68.1193 },
  Cochabamba: { latitude: -17.3895, longitude: -66.1568 },
};

// Región del mapa centrada en la ciudad (si no se conoce la ciudad, la de lanzamiento).
export function cityRegion(city?: string | null) {
  const c = CENTERS[city ?? DEFAULT_CITY] ?? CENTERS[DEFAULT_CITY];
  return { ...c, latitudeDelta: 0.045, longitudeDelta: 0.045 };
}
