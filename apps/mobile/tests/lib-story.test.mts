// lib/story-rules.ts: cuándo un canje muestra el botón de la historia de Instagram y cómo se limpia el usuario.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storyStateFor, normalizeHandle, STORY_WINDOW_DAYS } from '../src/lib/story-rules.ts';

const now = Date.parse('2026-10-12T15:00:00Z');
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

test('un canje confirmado hace poco ofrece subir la historia', () => {
  assert.equal(storyStateFor({ status: 'confirmed', confirmed_at: hoursAgo(1) }, undefined, now), 'available');
});

test('canjes pendientes, vencidos o de hace más de 7 días no muestran el botón', () => {
  assert.equal(storyStateFor({ status: 'pending', confirmed_at: null }, undefined, now), null);
  assert.equal(storyStateFor({ status: 'expired', confirmed_at: null }, undefined, now), null);
  assert.equal(storyStateFor({ status: 'confirmed', confirmed_at: hoursAgo(STORY_WINDOW_DAYS * 24 + 1) }, undefined, now), null);
});

test('si ya mandó la historia, se muestra su estado aunque hayan pasado los 7 días', () => {
  const viejo = { status: 'confirmed', confirmed_at: hoursAgo(30 * 24) };
  for (const s of ['pending', 'approved', 'rejected'] as const) assert.equal(storyStateFor(viejo, { status: s }, now), s);
});

test('acepta fechas con microsegundos de Postgres', () => {
  assert.equal(storyStateFor({ status: 'confirmed', confirmed_at: '2026-10-12T14:00:00.123456+00:00' }, undefined, now), 'available');
});

test('el usuario de Instagram se guarda sin @, sin espacios y en minúsculas', () => {
  assert.equal(normalizeHandle('  @Sofi.Camina '), 'sofi.camina');
  assert.equal(normalizeHandle('diego_rios'), 'diego_rios');
  assert.equal(normalizeHandle('no vale'), '');
  assert.equal(normalizeHandle('@'), '');
  assert.equal(normalizeHandle('a'.repeat(31)), '');
});
