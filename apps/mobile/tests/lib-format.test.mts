// lib/format.ts: etiquetas de día ("Hoy", "Ayer", "Sáb 5 sep") que se usan en Puntos, Actividad y Canjes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { dayLabel, localDay, plural } from '../src/lib/format.ts';

const LA_PAZ = 'America/La_Paz';
// 3 de octubre de 2026 es sábado. 15:00 UTC = 11:00 en La Paz.
const SABADO_11AM = '2026-10-03T15:00:00Z';

test('dayLabel: hoy y ayer', async () => {
  await atTime(SABADO_11AM, LA_PAZ, () => {
    assert.equal(dayLabel('2026-10-03'), 'Hoy');
    assert.equal(dayLabel('2026-10-02'), 'Ayer');
  });
});

test('dayLabel: otros días llevan día de la semana, número y mes abreviado', async () => {
  await atTime(SABADO_11AM, LA_PAZ, () => {
    assert.equal(dayLabel('2026-10-01'), 'Jue 1 oct');
    assert.equal(dayLabel('2026-09-05'), 'Sáb 5 sep');
    assert.equal(dayLabel('2026-01-31'), 'Sáb 31 ene');
    assert.equal(dayLabel('2025-12-25'), 'Jue 25 dic');
  });
});

test('dayLabel: un día futuro no se llama "Hoy" ni "Ayer" (no hay "Mañana")', async () => {
  await atTime(SABADO_11AM, LA_PAZ, () => {
    assert.equal(dayLabel('2026-10-04'), 'Dom 4 oct');
  });
});

test('dayLabel: cruza fin de mes y de año', async () => {
  await atTime('2027-01-01T15:00:00Z', LA_PAZ, () => {
    assert.equal(dayLabel('2027-01-01'), 'Hoy');
    assert.equal(dayLabel('2026-12-31'), 'Ayer');
    assert.equal(dayLabel('2026-12-30'), 'Mié 30 dic');
  });
});

test('dayLabel: usa el día del dispositivo, no el UTC (a las 22:30 de La Paz ya es el día siguiente en UTC)', async () => {
  // 02:30 UTC del 3 de octubre = 22:30 del 2 de octubre en La Paz.
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, () => {
    assert.equal(dayLabel('2026-10-02'), 'Hoy');
    assert.equal(dayLabel('2026-10-01'), 'Ayer');
  });
});

test('dayLabel: el cambio de horario de verano no corre la etiqueta (zona con DST)', async () => {
  // En Nueva York el 8 de marzo de 2026 el día dura 23 horas.
  await atTime('2026-03-09T16:00:00Z', 'America/New_York', () => {
    assert.equal(dayLabel('2026-03-09'), 'Hoy');
    assert.equal(dayLabel('2026-03-08'), 'Ayer');
  });
});

// Cómo lo usan las pantallas: HomeSections.tsx y puntos.tsx reciben created_at / earned_at (instantes en UTC).
// slice(0, 10) da el día UTC, no el del dispositivo: a partir de las 20:00 en La Paz ya es el día siguiente.
// El arreglo es pasar por localDay(new Date(iso)), que usa el día del dispositivo.
test('localDay(new Date(instante UTC)) + dayLabel: un canje de las 22:00 en La Paz dice "Hoy", no un día más', async () => {
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, () => {
    const createdAt = '2026-10-03T02:00:00+00:00'; // canje hecho a las 22:00 del 2 de octubre, hora de La Paz
    assert.equal(createdAt.slice(0, 10), '2026-10-03'); // lo que se hacía antes: el día UTC, un día más que el del dispositivo
    assert.equal(localDay(new Date(createdAt)), '2026-10-02');
    assert.equal(dayLabel(localDay(new Date(createdAt))), 'Hoy');
  });
});

test('localDay: un instante de la tarde no cambia de día y las cifras de una letra llevan cero', async () => {
  await atTime('2026-01-05T15:00:00Z', LA_PAZ, () => {
    assert.equal(localDay(new Date('2026-01-05T15:00:00Z')), '2026-01-05');
    assert.equal(localDay(), '2026-01-05'); // sin argumento usa "ahora"
  });
});

test('localDay: cruza fin de mes y de año con el día del dispositivo (00:30 UTC = 20:30 del día anterior en La Paz)', async () => {
  await atTime('2027-01-01T00:30:00Z', LA_PAZ, () => {
    assert.equal(localDay(), '2026-12-31');
    assert.equal(dayLabel(localDay()), 'Hoy');
  });
});

test('plural: uno solo en singular; cero, varios y decimales en plural', () => {
  assert.equal(plural(1, 'paso', 'pasos'), 'paso');
  assert.equal(plural(0, 'paso', 'pasos'), 'pasos');
  assert.equal(plural(2, 'paso', 'pasos'), 'pasos');
  assert.equal(plural(1500, 'miembro', 'miembros'), 'miembros');
  assert.equal(plural(1.5, 'día', 'días'), 'días');
});
