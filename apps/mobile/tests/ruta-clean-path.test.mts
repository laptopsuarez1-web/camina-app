// components/ruta/clean-path.ts: la línea de la Ruta sin idas y vueltas ni quiebres de pocos metros.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPath } from '../src/components/ruta/clean-path.ts';

const M = 1 / 111_320; // un metro en grados (cerca del ecuador alcanza para la prueba)
const p = (x: number, y: number) => ({ latitude: -17.78 + y * M, longitude: -63.18 + x * M });

test('saca una ida y vuelta corta (entra 25 m a una calle y vuelve)', () => {
  const raw = [p(0, 0), p(100, 0), p(100, 25), p(101, 1), p(200, 0), p(300, 0)];
  const out = cleanPath(raw);
  assert.ok(out.every((q) => (q.latitude - -17.78) / M < 5), 'ningún punto queda en el desvío');
});

test('respeta una calle sin salida larga (el local está al fondo)', () => {
  const raw = [p(0, 0), p(100, 0), p(100, 120), p(100, 1), p(200, 0), p(300, 0)];
  const out = cleanPath(raw);
  assert.ok(out.some((q) => (q.latitude - -17.78) / M > 80), 'la línea sigue llegando al fondo');
});

test('empieza y termina en el mismo lugar', () => {
  const raw = [p(0, 0), p(50, 1), p(100, 0), p(100, 100), p(200, 100)];
  const out = cleanPath(raw);
  assert.deepEqual(out[0], raw[0]);
  assert.deepEqual(out[out.length - 1], raw[raw.length - 1]);
});
