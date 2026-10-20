// lib/promo.ts: textos y colores de las tarjetas de desafíos, eventos y publicidad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { timeLeftLabel, dateRangeLabel, goalParts, participantsLabel, promoBgKey } from '../src/lib/promo.ts';

const now = new Date('2026-10-18T15:00:00Z');

test('tiempo restante: días, mañana, horas y terminó', () => {
  assert.equal(timeLeftLabel('2026-10-17T12:00:00Z', '2026-10-21T01:00:00Z', now), 'Termina en 2 días');
  assert.equal(timeLeftLabel('2026-10-17T12:00:00Z', '2026-10-19T20:00:00Z', now), 'Termina mañana');
  assert.equal(timeLeftLabel('2026-10-17T12:00:00Z', '2026-10-18T20:00:00Z', now), 'Termina en 5 h');
  assert.equal(timeLeftLabel('2026-10-17T12:00:00Z', '2026-10-18T15:20:00Z', now), 'Termina en menos de 1 hora');
  assert.equal(timeLeftLabel('2026-10-10T12:00:00Z', '2026-10-17T20:00:00Z', now), 'Terminó');
});

test('tiempo restante: todavía no empezó', () => {
  assert.equal(timeLeftLabel('2026-10-21T12:00:00Z', '2026-10-25T12:00:00Z', now), 'Empieza en 3 días');
  assert.equal(timeLeftLabel('2026-10-19T12:00:00Z', '2026-10-25T12:00:00Z', now), 'Empieza mañana');
});

test('rango de fechas en hora de Bolivia', () => {
  assert.equal(dateRangeLabel('2026-10-18T12:00:00Z', '2026-10-21T01:00:00Z'), '18 – 20 oct');
  assert.equal(dateRangeLabel('2026-10-28T12:00:00Z', '2026-11-02T12:00:00Z'), '28 oct – 2 nov');
  assert.equal(dateRangeLabel('2026-10-18T12:00:00Z', '2026-10-18T22:00:00Z'), '18 oct');
});

const none = { goal_mode: null, goal_steps: null, goal_days: null, req_steps: null, req_days: null };

test('meta: por día, en total, regla vieja y sin meta', () => {
  assert.deepEqual(goalParts({ ...none, goal_mode: 'daily', goal_steps: 8000, goal_days: 3 }), { big: (8000).toLocaleString('es-BO'), small: 'pasos por día, durante 3 días' });
  assert.equal(goalParts({ ...none, goal_mode: 'total', goal_steps: 50000 })?.small, 'pasos en total');
  assert.equal(goalParts({ ...none, req_steps: 5000, req_days: 1 })?.small, 'pasos por día, durante 1 día');
  assert.equal(goalParts(none), null);
});

test('participantes y color de fondo con valor desconocido', () => {
  assert.equal(participantsLabel(0), 'Sé de los primeros en sumarte');
  assert.equal(participantsLabel(1), '1 persona se sumó');
  assert.equal(participantsLabel(30), '+30 se sumaron');
  assert.equal(promoBgKey('rosa'), 'violeta');
  assert.equal(promoBgKey('menta'), 'menta');
  assert.equal(promoBgKey('aurora'), 'aurora');
  assert.equal(promoBgKey('clasico'), 'clasico');
});
