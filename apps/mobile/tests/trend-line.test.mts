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

test('la escala no arranca en 0 y siempre incluye la meta', () => {
  const { min, max } = trendScale([5800, 6200, 6900], 5000);
  assert.ok(min > 0 && min < 5000);
  assert.ok(max > 6900);
  const p = chartPoints([min, max], 100, 50, max, min);
  assert.deepEqual(p.map((q) => q.y), [50, 0]);
  assert.equal(trendScale([0, 0], 5000).min, 0);
});
