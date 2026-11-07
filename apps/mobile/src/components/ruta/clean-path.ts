type LatLng = { latitude: number; longitude: number };

// Recorrido prolijo para dibujar: el camino a pie que devuelve el servidor de mapas trae "espinas" (entra a una calle
// y vuelve por el mismo lado, sobre todo al llegar a cada local) y quiebres de pocos metros. Acá se sacan las espinas,
// se quitan los puntos que no cambian la forma y se redondean las esquinas: queda una línea limpia que sigue las calles.
const M_PER_DEG = 111_320;
function meters(a: LatLng, b: LatLng) {
  const k = Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot((b.longitude - a.longitude) * k, b.latitude - a.latitude) * M_PER_DEG;
}
function noSpurs(path: LatLng[]): LatLng[] {
  const out = [...path];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length - 2 && !changed; i++) {
      // Si unos puntos más adelante se vuelve a (casi) el mismo lugar, lo del medio es una ida y vuelta: se saca.
      for (let j = Math.min(out.length - 1, i + 10); j >= i + 2; j--) {
        if (meters(out[i], out[j]) >= 12) continue;
        // Solo los desvíos cortos (hasta 40 m): una calle sin salida larga que lleva a un local se respeta.
        let reach = 0;
        for (let k = i + 1; k < j; k++) reach = Math.max(reach, meters(out[i], out[k]));
        if (reach <= 40) { out.splice(i + 1, j - i - 1); changed = true; break; }
      }
    }
  }
  return out;
}
function simplify(path: LatLng[], tol: number): LatLng[] {
  if (path.length < 3) return path;
  const keep = new Array(path.length).fill(false);
  keep[0] = keep[path.length - 1] = true;
  const stack: [number, number][] = [[0, path.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1, far = 0;
    for (let i = a + 1; i < b; i++) {
      // Distancia del punto a la recta a-b (en metros, plano local).
      const A = path[a], B = path[b], P = path[i];
      const k = Math.cos((A.latitude * Math.PI) / 180);
      const bx = (B.longitude - A.longitude) * k, by = B.latitude - A.latitude;
      const px = (P.longitude - A.longitude) * k, py = P.latitude - A.latitude;
      const len = Math.hypot(bx, by) || 1e-12;
      const d = (Math.abs(bx * py - by * px) / len) * M_PER_DEG;
      if (d > far) { far = d; best = i; }
    }
    if (best > 0 && far > tol) { keep[best] = true; stack.push([a, best], [best, b]); }
  }
  return path.filter((_, i) => keep[i]);
}
// Esquinas suavizadas con un corte de pocos metros (nunca proporcional al largo de la calle: en una cuadra larga un
// corte proporcional sacaba la línea de la calzada). Un solo paso, así la línea queda pegada a las calles reales.
const CORNER_M = 6;
function roundCorners(path: LatLng[]): LatLng[] {
  if (path.length < 3) return path;
  const out: LatLng[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1], cur = path[i], next = path[i + 1];
    const cutIn = Math.min(CORNER_M, meters(prev, cur) * 0.4);
    const cutOut = Math.min(CORNER_M, meters(cur, next) * 0.4);
    const lerp = (a: LatLng, b: LatLng, t: number) => ({ latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t });
    const d1 = meters(prev, cur) || 1, d2 = meters(cur, next) || 1;
    const p1 = lerp(cur, prev, cutIn / d1);
    const p2 = lerp(cur, next, cutOut / d2);
    // Curva suave entre los dos cortes (punto medio desplazado hacia la esquina).
    out.push(p1, lerp(lerp(p1, cur, 0.5), lerp(cur, p2, 0.5), 0.5), p2);
  }
  out.push(path[path.length - 1]);
  return out;
}
export function cleanPath(path: LatLng[]): LatLng[] {
  if (path.length < 4) return path;
  return roundCorners(simplify(noSpurs(path), 1.5));
}
