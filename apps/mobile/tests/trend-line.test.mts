import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaPath, chartPoints, rollingAverage, smoothPath, trendScale } from '../src/lib/trend-line.ts';

test('promedio móvil de 7 días usa los días anteriores al rango', () => {
  const history = [7000, 7000, 7000, 7000, 7000, 7000, 0, 7000];
  const r = rollingAverage(history, 7, 2);
  assert.equal(r.length, 2);
  assert.equal(r[0], 6000); // seis de 7000 y un 0
  assert.equal(r[1], 6000);
});

test('sin historia suficiente promedia lo que hay', () => {
  assert.deepEqual(rollingAverage([3000, 5000], 7, 2), [3000, 4000]);
});

test('los puntos cubren todo el ancho y no se salen del alto', () => {
  const p = chartPoints([0, 5000, 20000], 300, 100, 10000);
  assert.deepEqual(p.map((q) => q.x), [0, 150, 300]);
  assert.deepEqual(p.map((q) => q.y), [100, 50, 0]);
});

test('la curva pasa por el primer y el último punto, y el área se cierra abajo', () => {
  const p = chartPoints([1000, 2000, 3000], 200, 80, 4000);
  const d = smoothPath(p);
  assert.ok(d.startsWith('M0,60'));
  assert.ok(d.endsWith('200,20'));
  assert.ok(areaPath(p, 80).endsWith('L200,80 L0,80 Z'));
  assert.equal(smoothPath([]), '');
});

test('la escala arranca en 0 y siempre incluye la meta', () => {
  const { min, max } = trendScale([5800, 6200, 6900], 5000);
  assert.equal(min, 0);
  assert.ok(max > 6900);
  assert.ok(trendScale([1000, 2000], 5000).max > 5000);
});

test('mismo valor, misma altura: lo que supera la meta queda arriba y lo que no, abajo', () => {
  // Días como los de la captura: 2.803 tiene que quedar bajo la meta y 5.306 sobre ella pero bajo días mejores.
  const values = [8000, 2803, 5306, 12000, 5306];
  const goal = 5000;
  const { min, max } = trendScale(values, goal);
  const p = chartPoints(values, 400, 110, max, min);
  const goalY = 110 - ((goal - min) / (max - min)) * 110;
  assert.ok(p[1].y > goalY); // 2.803: más abajo que la meta (y crece hacia abajo)
  assert.ok(p[2].y < goalY); // 5.306: arriba de la meta
  assert.ok(p[3].y < p[2].y); // 12.000: más arriba que 5.306
  assert.equal(p[2].y, p[4].y); // mismo valor, misma altura
  assert.equal(Math.min(...p.map((q) => q.y)), p[3].y); // el mejor día es el punto más alto
});

test('la curva no se pasa de los puntos: entre dos días solo sube o solo baja', () => {
  const p = chartPoints([1000, 9000, 1000], 200, 100, 10000);
  const nums = smoothPath(p).match(/-?[\d.]+/g)!.map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...ys) >= p[1].y && Math.max(...ys) <= p[0].y);
});
