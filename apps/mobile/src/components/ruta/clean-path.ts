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
function roundCorners(path: LatLng[], times = 2): LatLng[] {
  let p = path;
  for (let n = 0; n < times; n++) {
    if (p.length < 3) return p;
    const out: LatLng[] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const q = (t: number) => ({ latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t });
      // Esquinas apenas redondeadas (corte chico): la línea no se sale de la calle.
      if (i > 0) out.push(q(0.18));
      if (i < p.length - 2) out.push(q(0.82));
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}
export function cleanPath(path: LatLng[]): LatLng[] {
  if (path.length < 4) return path;
  return roundCorners(simplify(noSpurs(path), 2.5));
}
