// hooks/usePoints.ts (código REAL con dobles): saldo, sincronización de pasos, puntos de hoy y puntos por vencer.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { usePointsBalance, useSyncSteps, usePointsToday, usePointsExpiringSoon, usePointsLedger } from '../src/hooks/usePoints.ts';

const LA_PAZ = 'America/La_Paz';
const USER = 'u-1';

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth(USER, { daily_goal: 6000 });
});

test('saldo: llama a user_points_balance con la persona y devuelve el número', async () => {
  db.rpc.user_points_balance = () => 42;
  usePointsBalance();
  assert.deepEqual(rq.lastQuery.queryKey, ['points-balance', USER]);
  assert.equal(rq.lastQuery.staleTime, 15_000);
  assert.equal(await rq.lastQuery.queryFn(), 42);
  assert.deepEqual(db.rpcLog[0], { name: 'user_points_balance', args: { p_user_id: USER } });
});

test('saldo: sin sesión no consulta; un error de la base se propaga', async () => {
  setAuth(null);
  usePointsBalance();
  assert.equal(rq.lastQuery.enabled, false);
  setAuth(USER);
  db.rpc.user_points_balance = () => ({ error: new Error('sin red') });
  usePointsBalance();
  await assert.rejects(() => rq.lastQuery.queryFn(), /sin red/);
});

test('sincronizar pasos: manda el día LOCAL del dispositivo, no el día UTC (22:30 del 2/10 en La Paz)', async () => {
  // 02:30 UTC del 3 de octubre = 22:30 del 2 de octubre en La Paz. El servidor (America/La_Paz) está en el 2.
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, async () => {
    db.rpc.earn_points_from_steps = () => 7;
    useSyncSteps();
    const res = await rq.lastMutation.mutationFn(7345);
    assert.equal(res, 7);
    assert.deepEqual(db.rpcLog[0], { name: 'earn_points_from_steps', args: { p_user_id: USER, p_day: '2026-10-02', p_steps: 7345 } });
  });
});

test('sincronizar pasos: los meses y días de una cifra llevan cero (2026-01-05)', async () => {
  await atTime('2026-01-05T15:00:00Z', LA_PAZ, async () => {
    db.rpc.earn_points_from_steps = () => 0;
    useSyncSteps();
    await rq.lastMutation.mutationFn(10);
    assert.equal(db.rpcLog[0].args.p_day, '2026-01-05');
  });
});

test('sincronizar pasos: sin sesión falla antes de llamar al servidor', async () => {
  setAuth(null);
  useSyncSteps();
  await assert.rejects(() => rq.lastMutation.mutationFn(1000), /Sin sesión/);
  assert.equal(db.rpcLog.length, 0);
});

test('sincronizar pasos: un rechazo del servidor (fecha inválida, no autorizado) se propaga', async () => {
  db.rpc.earn_points_from_steps = () => ({ error: new Error('Fecha de sincronización inválida') });
  useSyncSteps();
  await assert.rejects(() => rq.lastMutation.mutationFn(1000), /Fecha de sincronización inválida/);
});

test('sincronizar pasos: al terminar refresca el saldo', () => {
  useSyncSteps();
  rq.lastMutation.onSuccess();
  assert.deepEqual(rq.invalidated, [{ queryKey: ['points-balance', USER] }]);
});

test('puntos de hoy: suma TODOS los orígenes desde la medianoche LOCAL (instante exacto con zona)', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.tables.points_ledger = [
      { user_id: USER, amount: 5, earned_at: '2026-10-03T05:00:00.000Z' }, // 01:00 local: hoy
      { user_id: USER, amount: 3, earned_at: '2026-10-03T14:00:00.000Z' },
      { user_id: USER, amount: -2, earned_at: '2026-10-03T14:30:00.000Z' }, // un canje también resta
      { user_id: USER, amount: 9, earned_at: '2026-10-03T03:59:59.000Z' }, // 23:59 de AYER local: no cuenta
      { user_id: 'otra', amount: 100, earned_at: '2026-10-03T10:00:00.000Z' },
    ];
    usePointsToday();
    const total = await rq.lastQuery.queryFn();
    assert.equal(total, 6);
    const gte = db.log[0].filters.find((f) => f[0] === 'gte')!;
    assert.deepEqual(gte, ['gte', 'earned_at', '2026-10-03T04:00:00.000Z']); // medianoche de La Paz = 04:00 UTC
  });
});

test('puntos de hoy: sin movimientos es 0', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.tables.points_ledger = [];
    usePointsToday();
    assert.equal(await rq.lastQuery.queryFn(), 0);
  });
});

test('por vencer: devuelve { amount, days } de la primera fila y pide la ventana indicada', async () => {
  db.rpc.points_expiring_soon = () => [{ amount: 12, days: 4 }];
  usePointsExpiringSoon();
  assert.deepEqual(rq.lastQuery.queryKey, ['points-expiring-soon', USER, 30]);
  assert.deepEqual(await rq.lastQuery.queryFn(), { amount: 12, days: 4 });
  assert.deepEqual(db.rpcLog[0], { name: 'points_expiring_soon', args: { p_within_days: 30 } });
  usePointsExpiringSoon(14);
  assert.deepEqual(rq.lastQuery.queryKey, ['points-expiring-soon', USER, 14]);
});

test('por vencer: sin filas o con 0 Puntos devuelve null (no se muestra el aviso)', async () => {
  usePointsExpiringSoon();
  db.rpc.points_expiring_soon = () => [];
  assert.equal(await rq.lastQuery.queryFn(), null);
  db.rpc.points_expiring_soon = () => [{ amount: 0, days: 0 }];
  assert.equal(await rq.lastQuery.queryFn(), null);
  db.rpc.points_expiring_soon = () => null;
  assert.equal(await rq.lastQuery.queryFn(), null);
});

test('movimientos: los últimos 30 de la persona, de más nuevo a más viejo', async () => {
  db.tables.points_ledger = [
    { user_id: USER, amount: 1, earned_at: '2026-10-01T10:00:00Z' },
    { user_id: USER, amount: 2, earned_at: '2026-10-03T10:00:00Z' },
    { user_id: USER, amount: 3, earned_at: '2026-10-02T10:00:00Z' },
  ];
  usePointsLedger();
  const rows = await rq.lastQuery.queryFn();
  assert.deepEqual(rows.map((r: { amount: number }) => r.amount), [2, 3, 1]);
});
