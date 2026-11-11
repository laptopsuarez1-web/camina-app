// lib/baifo-today.ts: qué dice el Baifo en Inicio según cómo va el día.
import test from 'node:test';
import assert from 'node:assert/strict';
import { baifoToday } from '../src/lib/baifo-today.ts';

const base = { goal: 5000, streak: 0, pointsToday: 0, hour: 10 };

test('sin caminar por la mañana: sentado e invita a salir', () => {
  const b = baifoToday({ ...base, steps: 0 });
  assert.equal(b.pose, 'sentado');
  assert.equal(b.title, '¿Salimos a caminar?');
  assert.match(b.body, /5\.?000 pasos/);
});

test('sin caminar de noche y con racha: avisa que la racha está en juego', () => {
  const b = baifoToday({ ...base, steps: 120, streak: 7, hour: 20 });
  assert.equal(b.pose, 'sentado');
  assert.match(b.body, /7 días seguidos/);
});

test('en camino: camina y dice cuántos pasos faltan', () => {
  const b = baifoToday({ ...base, steps: 2306 });
  assert.equal(b.pose, 'camina');
  assert.equal(b.title, '¡Buen comienzo!');
  assert.match(b.body, /2\.?694 pasos/);
  assert.equal(baifoToday({ ...base, steps: 2600 }).title, '¡Vas por la mitad!');
  assert.equal(baifoToday({ ...base, steps: 4200 }).title, '¡Ya casi llegas!');
});

test('meta cumplida: festeja con la racha y los Puntos del día', () => {
  const b = baifoToday({ ...base, steps: 5306, streak: 7, pointsToday: 5 });
  assert.equal(b.pose, 'festeja');
  assert.equal(b.body, 'Ya van 7 días seguidos. Hoy ganaste 5 Puntos.');
  assert.equal(baifoToday({ ...base, steps: 5000, streak: 1, pointsToday: 1 }).body, 'Hoy ganaste 1 Punto.');
});

test('meta en 0 o rara no rompe', () => {
  assert.equal(baifoToday({ ...base, goal: 0, steps: 0 }).mood, 'rest');
});
