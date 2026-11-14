// lib/sensor-steps-math.ts: el contador de pasos del teléfono (Android) se convierte en pasos por día.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReading, splitByDay, EMPTY_SENSOR_STATE } from '../src/lib/sensor-steps-math.ts';
import { boliviaDay, boliviaStartOfDay } from '../src/lib/bolivia.ts';

const fns = { dayOf: (ms: number) => boliviaDay(new Date(ms)), startOfDay: (ms: number) => boliviaStartOfDay(new Date(ms)).getTime() };
const t = (iso: string) => Date.parse(iso);
const BOOT = t('2026-11-10T12:00:00Z'); // prendido hace días

test('primera lectura con el celular prendido desde antes: solo es el punto de partida', () => {
  const s = applyReading(EMPTY_SENSOR_STATE, { count: 50_000, bootMs: BOOT }, t('2026-11-14T14:00:00Z'), fns);
  assert.deepEqual(s.days, {});
  assert.equal(s.last, 50_000);
});

test('primera lectura con el celular prendido hoy: todo lo que marca es de hoy', () => {
  const s = applyReading(EMPTY_SENSOR_STATE, { count: 1200, bootMs: t('2026-11-14T12:00:00Z') }, t('2026-11-14T14:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 1200 });
});

test('dos lecturas el mismo día: suma la diferencia', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 50_000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 53_200, bootMs: BOOT + 3 }, t('2026-11-14T20:00:00Z'), fns);
  s = applyReading(s, { count: 54_000, bootMs: BOOT - 5 }, t('2026-11-14T22:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 4000 });
});

test('un rato que cruza la medianoche se reparte por tiempo entre ayer y hoy', () => {
  // 20:00 a 08:00 en La Paz (00:00 a 12:00 UTC): 4 horas ayer y 8 horas hoy.
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 10_000, bootMs: BOOT }, t('2026-11-14T00:00:00Z'), fns);
  s = applyReading(s, { count: 13_000, bootMs: BOOT }, t('2026-11-14T12:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-13': 1000, '2026-11-14': 2000 });
  assert.equal(Object.values(s.days).reduce((a, b) => a + b, 0), 3000);
});

test('si el celular se reinició, cuenta lo que marca desde el encendido nuevo', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 50_000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 800, bootMs: t('2026-11-14T15:00:00Z') }, t('2026-11-14T16:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 800 });
});

test('un salto imposible no se suma', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 1000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 500_000, bootMs: BOOT }, t('2026-11-14T14:00:00Z'), fns);
  assert.deepEqual(s.days, {});
  assert.equal(s.last, 500_000);
});

test('guarda solo los últimos días', () => {
  let s = { ...EMPTY_SENSOR_STATE, boot: BOOT, last: 0, at: t('2026-11-08T14:00:00Z'), days: { '2026-11-08': 1, '2026-11-09': 2, '2026-11-10': 3, '2026-11-11': 4 } };
  s = applyReading(s, { count: 10, bootMs: BOOT }, t('2026-11-08T15:00:00Z'), fns);
  s = applyReading(s, { count: 20, bootMs: BOOT }, t('2026-11-12T15:00:00Z'), fns);
  assert.equal(Object.keys(s.days).length, 4);
  assert.ok(!('2026-11-08' in s.days));
});

test('splitByDay: todo dentro del mismo día', () => {
  assert.deepEqual(splitByDay(700, t('2026-11-14T13:00:00Z'), t('2026-11-14T15:00:00Z'), fns), { '2026-11-14': 700 });
});

test('trampa: cambiar la hora del teléfono no hace contar los pasos dos veces', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 50_000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 50_400, bootMs: BOOT }, t('2026-11-14T14:00:00Z'), fns);
  // Adelanta el reloj 3 horas: la hora de encendido calculada se corre 3 horas, pero el contador sigue igual.
  s = applyReading(s, { count: 50_500, bootMs: BOOT + 3 * 3_600_000 }, t('2026-11-14T17:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 500 });
});

test('trampa: atrasar la hora no suma nada extra', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 50_000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 51_000, bootMs: BOOT - 86_400_000 }, t('2026-11-13T13:00:00Z'), fns);
  // Con el reloj para atrás no hay tiempo transcurrido: se suma como mucho el margen, nunca de más.
  assert.ok(Object.values(s.days).reduce((a, b) => a + b, 0) <= 1000);
});

test('trampa: un salto de pasos imposible para el tiempo pasado se recorta', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 1000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  // 30.000 pasos en 10 minutos no se puede: se recorta a 10 x 250 + 300.
  s = applyReading(s, { count: 31_000, bootMs: BOOT }, t('2026-11-14T13:10:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 2800 });
});

test('trampa: la misma lectura repetida no suma', () => {
  let s = applyReading(EMPTY_SENSOR_STATE, { count: 1000, bootMs: BOOT }, t('2026-11-14T13:00:00Z'), fns);
  s = applyReading(s, { count: 1500, bootMs: BOOT }, t('2026-11-14T14:00:00Z'), fns);
  s = applyReading(s, { count: 1500, bootMs: BOOT }, t('2026-11-14T14:00:00Z'), fns);
  s = applyReading(s, { count: 1500, bootMs: BOOT }, t('2026-11-14T15:00:00Z'), fns);
  assert.deepEqual(s.days, { '2026-11-14': 500 });
});
