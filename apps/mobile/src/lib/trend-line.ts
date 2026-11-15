// Cuentas del gráfico de 30 días de Actividad: una curva con el promedio de los últimos 7 días de cada día,
// para que se vea si la persona va subiendo o bajando sin el ruido de día a día.

// Promedio móvil: para cada día, el promedio de ese día y los `window - 1` anteriores.
// `history` trae días extra al principio (los anteriores al rango) para que los primeros puntos también tengan 7 días.
export function rollingAverage(history: number[], window: number, count: number): number[] {
  const out: number[] = [];
  const start = Math.max(0, history.length - count);
  for (let i = start; i < history.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = history.slice(from, i + 1);
    out.push(slice.reduce((a, v) => a + v, 0) / slice.length);
  }
  return out;
}

export type Pt = { x: number; y: number };

// Puntos del gráfico en píxeles: x reparte los días a lo ancho; y = 0 arriba, `height` abajo.
// La escala va de `min` a `max` (no desde 0) para que se note si la curva sube o baja.
export function chartPoints(values: number[], width: number, height: number, max: number, min = 0): Pt[] {
  const n = values.length;
  if (n === 0 || max <= min) return [];
  return values.map((v, i) => ({
    x: n === 1 ? width / 2 : (i * width) / (n - 1),
    y: height - Math.max(0, Math.min(1, (v - min) / (max - min))) * height,
  }));
}

// Escala del gráfico: deja aire arriba y abajo de la curva y siempre incluye la meta, para que su línea se vea.
export function trendScale(values: number[], goal: number): { min: number; max: number } {
  const hi = Math.max(goal, ...values, 1);
  const lo = Math.min(goal, ...values);
  const pad = Math.max((hi - lo) * 0.35, hi * 0.08);
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

// Curva suave que pasa por todos los puntos (curvas de Bézier con el punto de control a mitad de camino en x).
export function smoothPath(p: Pt[]): string {
  if (p.length === 0) return '';
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = `M${f(p[0].x)},${f(p[0].y)}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const cx = (a.x + b.x) / 2;
    d += ` C${f(cx)},${f(a.y)} ${f(cx)},${f(b.y)} ${f(b.x)},${f(b.y)}`;
  }
  return d;
}

// El mismo trazo cerrado hasta abajo, para el relleno degradé bajo la curva.
export function areaPath(p: Pt[], height: number): string {
  if (p.length === 0) return '';
  return `${smoothPath(p)} L${p[p.length - 1].x},${height} L${p[0].x},${height} Z`;
}
