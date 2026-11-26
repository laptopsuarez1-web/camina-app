// Sucursales de un comercio (0133). Un comercio es una sola ficha; cada sucursal es un lugar más en el mapa.
// La ubicación del comercio (businesses.lat/lng/address) es la sucursal principal (id MAIN_PLACE).
// Sin imports de React Native: se prueba con node (tests/branches.test.mts).

type DayHours = { from: string; to: string; from2?: string; to2?: string } | null;
export type WeekHours = Record<string, DayHours>;

export type Branch = {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  opening_hours: WeekHours | null;
};

// Lo mínimo del comercio que hace falta para armar sus lugares.
export type PlaceBusiness = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  opening_hours?: WeekHours | null;
  branch_label?: string | null;
};

export const MAIN_PLACE = 'main';

export type Place = {
  // MAIN_PLACE para la principal; el id de la sucursal para las demás.
  id: string;
  // Nombre corto de la sucursal ("Centro", "Av. Las Américas").
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  // Sin horario propio, la sucursal usa el del local principal.
  opening_hours: WeekHours | null;
};

export const MAIN_LABEL_FALLBACK = 'Principal';

// Lugares del comercio: primero la principal (si tiene ubicación) y después sus sucursales.
export function placesOf(business: PlaceBusiness, branches: readonly Branch[] | undefined): Place[] {
  const out: Place[] = [];
  const mainHours = business.opening_hours ?? null;
  if (isCoord(business.lat) && isCoord(business.lng)) {
    out.push({
      id: MAIN_PLACE,
      label: business.branch_label?.trim() || MAIN_LABEL_FALLBACK,
      address: business.address,
      lat: business.lat,
      lng: business.lng,
      opening_hours: mainHours,
    });
  }
  for (const br of branches ?? []) {
    if (br.business_id !== business.id || !isCoord(br.lat) || !isCoord(br.lng)) continue;
    out.push({
      id: br.id,
      label: br.name?.trim() || 'Sucursal',
      address: br.address,
      lat: br.lat,
      lng: br.lng,
      opening_hours: br.opening_hours ?? mainHours,
    });
  }
  return out;
}

function isCoord(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function metersBetween(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// La sucursal más cercana a la persona; sin ubicación, la principal (la primera).
export function nearestPlace(places: readonly Place[], pos: { latitude: number; longitude: number } | null): Place | null {
  if (places.length === 0) return null;
  if (!pos) return places[0];
  let best = places[0];
  let bestD = metersBetween(pos, best.lat, best.lng);
  for (let i = 1; i < places.length; i++) {
    const d = metersBetween(pos, places[i].lat, places[i].lng);
    if (d < bestD) {
      best = places[i];
      bestD = d;
    }
  }
  return best;
}

// El comercio "visto desde" una sucursal: misma ficha, con la dirección, el punto y el horario de esa sucursal.
// Si el lugar es la principal, devuelve el mismo objeto (sin copias: nada cambia para los comercios sin sucursales).
export function atPlace<T extends PlaceBusiness>(business: T, place: Place | null): T {
  if (!place || place.id === MAIN_PLACE) return business;
  return { ...business, address: place.address, lat: place.lat, lng: place.lng, opening_hours: place.opening_hours };
}

// Reglas de cada premio por sucursal: sin filas, vale en todas.
export type BenefitBranchRule = { branch_id: string | null; daily_quota: number | null };
export type BranchAvailability =
  | { kind: 'all' }
  | { kind: 'here'; dailyQuota: number | null; remainingToday: number | null }
  | { kind: 'elsewhere'; labels: string[] };

// ¿El premio vale en esta sucursal? Y si tiene cupos propios ahí, cuántos quedan hoy.
// usedToday: canjes de hoy por sucursal (clave = id de sucursal o MAIN_PLACE).
export function availabilityAt(
  rules: readonly BenefitBranchRule[] | undefined,
  placeId: string,
  places: readonly Place[],
  usedToday?: ReadonlyMap<string, number>,
): BranchAvailability {
  if (!rules || rules.length === 0) return { kind: 'all' };
  const key = (id: string | null) => id ?? MAIN_PLACE;
  const rule = rules.find((r) => key(r.branch_id) === placeId);
  if (!rule) {
    const labels = rules
      .map((r) => places.find((p) => p.id === key(r.branch_id))?.label)
      .filter((x): x is string => !!x);
    return { kind: 'elsewhere', labels };
  }
  if (rule.daily_quota == null) return { kind: 'here', dailyQuota: null, remainingToday: null };
  const used = usedToday?.get(placeId) ?? 0;
  return { kind: 'here', dailyQuota: rule.daily_quota, remainingToday: Math.max(0, rule.daily_quota - used) };
}
