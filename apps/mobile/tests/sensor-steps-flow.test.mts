// lib/sensor-steps.ts (código REAL con dobles): permisos, teléfono que no responde, versiones sin el módulo y lecturas cruzadas.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from 'react-native';
import { resetStorage } from './helpers/stubs/async-storage.mts';
import { sensorPerm, resetSensorPerm } from './helpers/stubs/expo-sensors.mts';
import { counter, resetCounter } from './helpers/stubs/step-counter.mts';
import { readSensorDaySteps, requestSensorPermission, sensorStatus } from '../src/lib/sensor-steps.ts';
import { atTime } from './helpers/clock.mts';

const LA_PAZ = 'America/La_Paz';
const BOOT = Date.parse('2026-11-10T12:00:00Z');

beforeEach(() => {
  resetStorage();
  resetSensorPerm();
  resetCounter();
  (Platform as { OS: string }).OS = 'android';
  counter.bootMs = BOOT;
});

test('iPhone o web: el contador no existe', async () => {
  (Platform as { OS: string }).OS = 'ios';
  assert.equal(await sensorStatus(), 'unavailable');
  assert.equal(await readSensorDaySteps(new Date()), null);
  assert.equal(await requestSensorPermission(), false);
  assert.equal(sensorPerm.requests, 0); // en iPhone nunca se pide este permiso
});

test('versión de la app sin el módulo nativo (llegó por OTA): no falla y no pide nada', async () => {
  counter.present = false;
  assert.equal(await sensorStatus(), 'unavailable');
  assert.equal(await readSensorDaySteps(new Date()), null);
  assert.equal(await requestSensorPermission(), false);
  assert.equal(sensorPerm.requests, 0);
});

test('teléfono sin sensor de pasos: unavailable', async () => {
  counter.available = false;
  assert.equal(await sensorStatus(), 'unavailable');
});

test('sin permiso: no lee el contador; al dar el permiso empieza a contar', async () => {
  assert.equal(await sensorStatus(), 'needs-permission');
  assert.equal(await readSensorDaySteps(new Date()), null);
  assert.equal(counter.reads, 0);
  assert.equal(await requestSensorPermission(), true);
  assert.equal(await sensorStatus(), 'active');
});

test('permiso negado: sigue en needs-permission sin romper nada', async () => {
  sensorPerm.grantOnRequest = false;
  assert.equal(await requestSensorPermission(), false);
  assert.equal(await sensorStatus(), 'needs-permission');
  sensorPerm.failRequest = true;
  assert.equal(await requestSensorPermission(), false);
});

test('cuenta los pasos del día entre aperturas', async () => {
  sensorPerm.granted = true;
  counter.count = 40_000;
  assert.equal(await atTime('2026-11-14T13:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())), 0); // punto de partida
  counter.count = 43_500;
  assert.equal(await atTime('2026-11-14T16:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())), 3500);
  counter.count = 45_000;
  assert.equal(await atTime('2026-11-14T20:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())), 5000);
});

test('si el teléfono no responde a tiempo, devuelve lo último que tenía (no se traba ni se pierde)', async () => {
  sensorPerm.granted = true;
  counter.count = 40_000;
  await atTime('2026-11-14T13:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date()));
  counter.count = 41_000;
  await atTime('2026-11-14T14:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date()));
  counter.respond = false;
  assert.equal(await atTime('2026-11-14T15:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())), 1000);
  counter.respond = true;
  counter.count = 42_000;
  assert.equal(await atTime('2026-11-14T16:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())), 2000);
});

test('dos lecturas al mismo tiempo no cuentan los pasos dos veces', async () => {
  sensorPerm.granted = true;
  counter.count = 40_000;
  await atTime('2026-11-14T13:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date()));
  counter.count = 42_000;
  const [a, b] = await atTime('2026-11-14T15:00:00Z', LA_PAZ, () => Promise.all([readSensorDaySteps(new Date()), readSensorDaySteps(new Date())]));
  assert.equal(a, 2000);
  assert.equal(b, 2000);
});

test('ayer queda con lo suyo cuando el rato cruza la medianoche', async () => {
  sensorPerm.granted = true;
  counter.count = 10_000;
  await atTime('2026-11-14T00:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())); // 20:00 del 13 en La Paz
  counter.count = 13_000;
  const hoy = await atTime('2026-11-14T12:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date())); // 08:00 del 14
  const ayer = await atTime('2026-11-14T12:00:00Z', LA_PAZ, () => readSensorDaySteps(new Date(Date.now() - 86_400_000)));
  assert.equal(hoy, 2000);
  assert.equal(ayer, 1000);
});
