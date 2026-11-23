// Lee una ubicación de Google Maps: "-21.53, -64.73" o un link largo (…!3d-21.53!4d-64.73… o …@-21.53,-64.73…).
// !3d/!4d va primero: es el pin exacto del lugar; @ es solo el centro de la vista del mapa.
export function parseUbicacion(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const m =
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/) ||
    t.match(/^(-?\d+\.\d+)\s*[,; ]\s*(-?\d+\.\d+)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// El link corto de "Compartir" (maps.app.goo.gl/…) no trae coordenadas: lo resuelve /api/mapa.
export const esLinkCorto = (text: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(text.trim());

export async function resolverLinkMapa(text: string): Promise<{ lat: number; lng: number } | null> {
  const directo = parseUbicacion(text);
  if (directo) return directo;
  if (!esLinkCorto(text)) return null;
  try {
    const res = await fetch(`/api/mapa?url=${encodeURIComponent(text.trim())}`);
    if (res.ok) return (await res.json()) as { lat: number; lng: number };
  } catch {
    // se avisa en pantalla
  }
  return null;
}
