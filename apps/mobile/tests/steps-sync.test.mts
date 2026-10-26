// lib/steps-sync.ts (código REAL con dobles): la sincronización en segundo plano manda solo los pasos de hoy.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { health, resetHealth } from './helpers/stubs/health-steps.mts';
import * as stepsSync from '../src/lib/steps-sync.ts';

const LA_PAZ = 'America/La_Paz';
const USER = 'u-1';

beforeEach(() => {
  resetDb();
  resetHealth();
});

test('segundo plano: lee y manda solo hoy, nunca ayer', async () => {
  health.steps = 7926;
  db.rpc.earn_points_from_steps = () => 7;
  const sent = await atTime('2026-10-26T05:06:00Z', LA_PAZ, () => stepsSync.syncToday(USER)); // 01:06 en La Paz
  assert.equal(sent, true);
  assert.deepEqual(health.readLog, ['2026-10-26']);
  assert.equal(db.rpcLog.length, 1);
  assert.deepEqual(db.rpcLog[0], { name: 'earn_points_from_steps', args: { p_user_id: USER, p_day: '2026-10-26', p_steps: 7926 } });
});

test('segundo plano: sin pasos hoy no manda nada', async () => {
  health.steps = 0;
  assert.equal(await stepsSync.syncToday(USER), false);
  health.steps = null; // sin fuente de pasos (web)
  assert.equal(await stepsSync.syncToday(USER), false);
  assert.equal(db.rpcLog.length, 0);
});

test('ya no existe la sincronización de ayer', () => {
  assert.equal('syncYesterday' in stepsSync, false);
  assert.equal('syncRecentDays' in stepsSync, false);
});
