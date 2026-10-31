// lib/android-steps-setup.ts: qué se le pide a la persona en Android según lo que ya tiene el teléfono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAndroidSetup } from '../src/lib/android-steps-setup.ts';

const ok = { sdk: 'available', granted: true, hasRecentSteps: true } as const;

test('sin lectura todavía: revisando', () => {
  assert.equal(resolveAndroidSetup(null), 'checking');
});

test('Health Connect faltante o desactualizado: falta configurar el sistema', () => {
  assert.equal(resolveAndroidSetup({ ...ok, sdk: 'unavailable' }), 'needs-system');
  assert.equal(resolveAndroidSetup({ ...ok, sdk: 'update-required' }), 'needs-system');
});

test('permiso denegado o revocado: pide el permiso, aunque haya pasos viejos', () => {
  assert.equal(resolveAndroidSetup({ ...ok, granted: false }), 'needs-permission');
});

test('permiso dado pero nadie guarda pasos: sugiere una app de pasos', () => {
  assert.equal(resolveAndroidSetup({ ...ok, hasRecentSteps: false }), 'needs-source');
});

test('todo listo (con o sin Google Fit): activado, no repite pasos', () => {
  assert.equal(resolveAndroidSetup(ok), 'active');
});

test('error técnico: recuperable, distinto de permiso negado', () => {
  assert.equal(resolveAndroidSetup({ ...ok, granted: false, failed: true }), 'error');
});
