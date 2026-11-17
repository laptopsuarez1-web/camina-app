import * as Location from 'expo-location';

// Última ubicación conocida, compartida entre pantallas (Inicio, Canjes). Así Canjes ya abre ordenado por
// cercanía, en vez de mostrar primero un orden y reacomodar la lista cuando llega el GPS unos segundos después.
// Solo se usa si la persona ya dio permiso de ubicación: nunca pide el permiso.
export type LatLng = { latitude: number; longitude: number };
let cached: LatLng | null = null;
let pending: Promise<LatLng | null> | null = null;

export function getCachedPosition() {
  return cached;
}

export function setCachedPosition(p: LatLng) {
  cached = { latitude: p.latitude, longitude: p.longitude };
}

// Rápida: la última posición que guarda el teléfono; si no hay, una lectura de baja precisión.
export function loadPositionIfAllowed(): Promise<LatLng | null> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return null;
      const p = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
      if (p) setCachedPosition(p.coords);
      return cached;
    } catch {
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
