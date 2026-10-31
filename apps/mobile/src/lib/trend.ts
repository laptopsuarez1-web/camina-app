// Tendencias: serie de días y trazado de las líneas de los gráficos (sin dependencias, para poder probarlo).
export type TrendPoint = { key: string; steps: number };

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Los últimos `n` días terminando hoy (el más viejo primero); los días sin dato valen 0.
export function lastDaysSeries(n: number, byDay: Map<string, number>, today: Date = new Date()): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = localKey(d);
    out.push({ key, steps: byDay.get(key) ?? 0 });
  }
  return out;
}

export function pointXY(i: number, count: number, steps: number, max: number, w: number, h: number, pad = 0) {
  const x = count <= 1 ? w / 2 : pad + (i / (count - 1)) * (w - pad * 2);
  const y = max > 0 ? h - (Math.min(steps, max) / max) * h : h;
  return { x, y };
}

export function linePath(values: number[], max: number, w: number, h: number, pad = 0): string {
  return values
    .map((v, i) => {
      const { x, y } = pointXY(i, values.length, v, max, w, h, pad);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function areaPath(values: number[], max: number, w: number, h: number, pad = 0): string {
  if (values.length === 0) return '';
  const first = pointXY(0, values.length, 0, max, w, h, pad).x;
  const last = pointXY(values.length - 1, values.length, 0, max, w, h, pad).x;
  return `${linePath(values, max, w, h, pad)} L${last.toFixed(1)} ${h} L${first.toFixed(1)} ${h} Z`;
}

// Índice del día más cercano a una posición horizontal tocada.
export function nearestIndex(x: number, count: number, w: number, pad = 0): number {
  if (count <= 1) return 0;
  const t = (x - pad) / (w - pad * 2);
  return Math.max(0, Math.min(count - 1, Math.round(t * (count - 1))));
}
