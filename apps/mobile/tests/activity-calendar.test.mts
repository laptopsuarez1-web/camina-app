// lib/activity-calendar.ts: colores del calendario de Actividad (verde, rojo, gris).
import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDayState } from '../src/lib/activity-calendar.ts';

const base = { todayKey: '2026-10-10', firstDay: '2026-10-01', goal: 6000 };

test('abrió la app y cumplió la meta: verde', () => {
  assert.equal(calendarDayState({ ...base, key: '2026-10-05', opened: true, steps: 6000 }), 'met');
});

test('abrió la app y no llegó a la meta: rojo, también con 0 pasos', () => {
  assert.equal(calendarDayState({ ...base, key: '2026-10-05', opened: true, steps: 5999 }), 'miss');
  assert.equal(calendarDayState({ ...base, key: '2026-10-05', opened: true, steps: 0 }), 'miss');
});

test('no abrió la app: gris, aunque Salud tenga pasos de sobra', () => {
  assert.equal(calendarDayState({ ...base, key: '2026-10-05', opened: false, steps: 12000 }), 'idle');
  assert.equal(calendarDayState({ ...base, key: '2026-10-05', opened: false, steps: 0 }), 'idle');
});

test('hoy: verde si ya cumplió, sin color mientras sigue en curso', () => {
  assert.equal(calendarDayState({ ...base, key: '2026-10-10', opened: true, steps: 6500 }), 'met');
  assert.equal(calendarDayState({ ...base, key: '2026-10-10', opened: true, steps: 1200 }), 'none');
});

test('futuro y días antes de usar la app: sin color', () => {
  assert.equal(calendarDayState({ ...base, key: '2026-10-11', opened: false, steps: 0 }), 'none');
  assert.equal(calendarDayState({ ...base, key: '2026-09-30', opened: false, steps: 0 }), 'none');
});
