// lib/deep-links.ts (código REAL con dobles): invitaciones (referido y grupo) que llegan por link antes de tener sesión.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage, { resetStorage, dump } from './helpers/stubs/async-storage.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { consumePendingDeepLinks } from '../src/lib/deep-links.ts';
import { PENDING_REFERRAL_KEY, PENDING_GROUP_JOIN_KEY } from '../src/constants/sharing.ts';

beforeEach(() => {
  resetStorage();
  resetDb();
  db.user = { id: 'me' };
});

test('sin invitaciones guardadas no hace nada', async () => {
  assert.deepEqual(await consumePendingDeepLinks(), { joinedGroupId: null });
  assert.equal(db.rpcLog.length, 0);
  assert.equal(db.writes.length, 0);
});

test('referido pendiente: lo captura en el servidor y borra la marca', async () => {
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, 'ref-user');
  db.rpc.capture_referral = () => null;
  assert.deepEqual(await consumePendingDeepLinks(), { joinedGroupId: null });
  assert.deepEqual(db.rpcLog, [{ name: 'capture_referral', args: { p_referrer_id: 'ref-user' } }]);
  assert.equal(dump()[PENDING_REFERRAL_KEY], undefined);
});

test('grupo pendiente: se anota a la persona y devuelve el grupo al que navegar', async () => {
  await AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, 'g-1');
  const res = await consumePendingDeepLinks();
  assert.deepEqual(res, { joinedGroupId: 'g-1' });
  assert.deepEqual(db.writes, [{ table: 'group_members', op: 'upsert', row: { group_id: 'g-1', user_id: 'me' }, opts: { onConflict: 'group_id,user_id' } }]);
  assert.equal(dump()[PENDING_GROUP_JOIN_KEY], undefined);
});

test('grupo pendiente con error al anotarse: no navega y la marca se borra (caracterización)', async () => {
  await AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, 'g-1');
  db.errors['group_members:write'] = { message: 'grupo lleno' };
  assert.deepEqual(await consumePendingDeepLinks(), { joinedGroupId: null });
  assert.equal(dump()[PENDING_GROUP_JOIN_KEY], undefined);
});

test('grupo pendiente sin usuario logueado: no se anota y no navega', async () => {
  db.user = null;
  await AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, 'g-1');
  assert.deepEqual(await consumePendingDeepLinks(), { joinedGroupId: null });
  assert.equal(db.writes.length, 0);
});

test('las dos invitaciones juntas se aplican', async () => {
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, 'ref-user');
  await AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, 'g-9');
  db.rpc.capture_referral = () => null;
  assert.deepEqual(await consumePendingDeepLinks(), { joinedGroupId: 'g-9' });
  assert.deepEqual(dump(), {});
});

test('BUG conocido: si capture_referral falla (sin red, servidor caído), la invitación se borra igual y el referido se pierde', { todo: 'lib/deep-links.ts:18-22: el error del rpc no tira excepción y la marca se borra siempre; borrarla solo si no hubo error de red' }, async () => {
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, 'ref-user');
  db.rpc.capture_referral = () => ({ error: { message: 'Failed to fetch' } });
  await consumePendingDeepLinks();
  assert.equal(dump()[PENDING_REFERRAL_KEY], 'ref-user');
});
