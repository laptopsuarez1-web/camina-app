// lib/trend.ts: series y trazado de los gráficos de tendencia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lastDaysSeries, linePath, areaPath, nearestIndex } from '../src/lib/trend.ts';

test('la serie termina hoy, va del más viejo al más nuevo y rellena con 0', () => {
  const s = lastDaysSeries(3, new Map([['2026-10-31', 500], ['2026-10-29', 100]]), new Date(2026, 9, 31));
  assert.deepEqual(s, [{ key: '2026-10-29', steps: 100 }, { key: '2026-10-30', steps: 0 }, { key: '2026-10-31', steps: 500 }]);
});

test('la línea sube hacia arriba: el máximo queda en y=0 y el cero en la base', () => {
  assert.equal(linePath([0, 10], 10, 100, 50), 'M0.0 50.0 L100.0 0.0');
});

test('el área cierra por la base', () => {
  assert.equal(areaPath([0, 10], 10, 100, 50), 'M0.0 50.0 L100.0 0.0 L100.0 50 L0.0 50 Z');
  assert.equal(areaPath([], 10, 100, 50), '');
});

test('un valor por encima del máximo no se sale del gráfico', () => {
  assert.equal(linePath([20], 10, 100, 50), 'M50.0 0.0');
});

test('toque: devuelve el día más cercano y no se sale de los extremos', () => {
  assert.equal(nearestIndex(0, 30, 290), 0);
  assert.equal(nearestIndex(290, 30, 290), 29);
  assert.equal(nearestIndex(1000, 30, 290), 29);
  assert.equal(nearestIndex(-5, 30, 290), 0);
  assert.equal(nearestIndex(145, 30, 290), 15);
});
