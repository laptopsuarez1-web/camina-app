// Rankings y conteos (código REAL con dobles): hooks/useGlobalRanking.ts, useGroupRanking.ts, useMyGroupsWeek.ts.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { useGlobalRanking, useCommunityAverage, useMyWeeklyRank } from '../src/hooks/useGlobalRanking.ts';
import { useMyGroupRanking } from '../src/hooks/useGroupRanking.ts';
import { useMyGroupsWeek } from '../src/hooks/useMyGroupsWeek.ts';

const LA_PAZ = 'America/La_Paz';
const USER = 'u-1';

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth(USER, { daily_goal: 6000 });
});

// ---------------------------------------------------------------- ranking global (abierto desde el primer usuario)
test('ranking global: pide los 15 primeros (de 15 en 15); el promedio de la comunidad cae a 0 si no hay dato', async () => {
  db.rpc.global_weekly_ranking = () => [{ user_id: 'a', total_steps: 1 }];
  useGlobalRanking();
  assert.deepEqual(rq.lastQuery.queryKey, ['global-ranking', 15]);
  assert.equal((await rq.lastQuery.queryFn()).length, 1);
  assert.deepEqual(db.rpcLog[0], { name: 'global_weekly_ranking', args: { p_limit: 15 } });
  db.rpc.global_weekly_ranking = () => ({ error: new Error('boom') });
  await assert.rejects(() => rq.lastQuery.queryFn(), /boom/);

  db.rpc.community_weekly_average = () => 8123.5;
  useCommunityAverage();
  assert.equal(await rq.lastQuery.queryFn(), 8123.5);
  db.rpc.community_weekly_average = () => null;
  assert.equal(await rq.lastQuery.queryFn(), 0);
});

test('mi puesto del ranking global: devuelve la fila, y null si no aparezco (ranking apagado o sin pasos)', async () => {
  db.rpc.my_weekly_rank = () => [{ rank_position: '38', total_steps: '552' }];
  useMyWeeklyRank();
  assert.deepEqual(rq.lastQuery.queryKey, ['my-weekly-rank', USER]);
  assert.deepEqual(await rq.lastQuery.queryFn(), { position: 38, steps: 552 });
  db.rpc.my_weekly_rank = () => [];
  assert.equal(await rq.lastQuery.queryFn(), null);
  db.rpc.my_weekly_rank = () => ({ error: new Error('boom') });
  await assert.rejects(() => rq.lastQuery.queryFn(), /boom/);
});

// ---------------------------------------------------------------- ranking del grupo propio
const GROUP = { id: 'g1', group_members: [{ user_id: USER }, { user_id: 'b' }, { user_id: 'c' }, { user_id: 'd' }] };

function runGroupRanking(groups: unknown[]) {
  rq.queryResult = { data: groups };
  useMyGroupRanking();
  return rq.lastQuery;
}

test('ranking del grupo: arma el ranking con la suma de la semana, nombre por defecto "Caminante" y mi puesto', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => { // sábado: la semana empezó el lunes 28/9
    db.tables.steps_daily = [
      { user_id: USER, day: '2026-09-28', steps: 4000 },
      { user_id: USER, day: '2026-10-02', steps: 4000 },
      { user_id: 'b', day: '2026-10-01', steps: 9000 },
      { user_id: 'c', day: '2026-09-27', steps: 99999 }, // domingo pasado: no cuenta
      { user_id: 'c', day: '2026-10-03', steps: 1000 },
    ];
    db.tables.public_profiles = [{ id: USER, full_name: 'Yo' }, { id: 'b', full_name: 'Beto' }, { id: 'c', full_name: 'Carla' }];
    const q = runGroupRanking([GROUP]);
    assert.equal(q.enabled, true);
    const r = await q.queryFn();
    assert.deepEqual(r.ranked.map((x: any) => [x.name, x.total]), [['Beto', 9000], ['Yo', 8000], ['Carla', 1000], ['Caminante', 0]]);
    assert.equal(r.myPosition, 2);
    const gte = db.log.find((l) => l.table === 'steps_daily')!.filters.find((f) => f[0] === 'gte')!;
    assert.deepEqual(gte, ['gte', 'day', '2026-09-28']);
  });
});

test('ranking del grupo: si hoy es domingo la semana sigue contando desde el lunes anterior', async () => {
  await atTime('2026-10-04T15:00:00Z', LA_PAZ, async () => { // domingo 4/10
    const q = runGroupRanking([GROUP]);
    await q.queryFn();
    assert.equal(db.log.find((l) => l.table === 'steps_daily')!.filters.find((f) => f[0] === 'gte')![2], '2026-09-28');
  });
});

test('ranking del grupo: sin grupo no consulta', () => {
  assert.equal(runGroupRanking([]).enabled, false);
  assert.equal(runGroupRanking([{ id: 'otro', group_members: [{ user_id: 'x' }] }]).enabled, false);
});

test('ranking del grupo: dentro del ranking aparecen todos los miembros aunque no tengan pasos', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.tables.steps_daily = [];
    db.tables.public_profiles = [];
    const r = await runGroupRanking([GROUP]).queryFn();
    assert.equal(r.ranked.length, 4);
    assert.ok(r.ranked.every((x: any) => x.total === 0));
    assert.notEqual(r.myPosition, null);
  });
});

test('ranking del grupo: un error de la base se propaga', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.errors.steps_daily = new Error('boom');
    await assert.rejects(() => runGroupRanking([GROUP]).queryFn(), /boom/);
  });
});

// ---------------------------------------------------------------- resumen de la semana de cada grupo (lista de Grupos)
const GROUPS = [
  { id: 'g1', group_members: [{ user_id: USER }, { user_id: 'b' }, { user_id: 'c' }] },
  { id: 'g2', group_members: [{ user_id: USER }, { user_id: 'd' }] },
];
function week(groups = GROUPS) {
  useMyGroupsWeek(groups, USER);
  return rq.lastQuery;
}

test('mi semana por grupo: total, puesto, cuántos caminaron hoy y las 4 primeras caras', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => { // sábado 11:00 en La Paz
    db.tables.steps_daily = [
      { user_id: USER, day: '2026-10-03', steps: 3000 },
      { user_id: USER, day: '2026-10-01', steps: 2000 },
      { user_id: 'b', day: '2026-10-03', steps: 9000 },
      { user_id: 'c', day: '2026-10-03', steps: 0 },        // sin pasos: no cuenta como "caminó hoy"
      { user_id: 'd', day: '2026-10-02', steps: 7000 },
    ];
    db.tables.public_profiles = [
      { id: USER, full_name: 'Yo', photo_url: null }, { id: 'b', full_name: 'Beto', photo_url: 'x.jpg' },
      { id: 'c', full_name: 'Carla', photo_url: null }, { id: 'd', full_name: 'Dani', photo_url: null },
    ];
    const res = await week().queryFn();
    assert.equal(res.g1.total, 14000);
    assert.equal(res.g1.walkedToday, 2);
    assert.equal(res.g1.myRank, 2);
    assert.deepEqual(res.g1.avatars.map((a: any) => a.name), ['Beto', 'Yo', 'Carla']);
    assert.equal(res.g1.avatars[0].photoUrl, 'x.jpg');
    assert.equal(res.g2.total, 12000);
    assert.equal(res.g2.walkedToday, 1);
    assert.equal(res.g2.myRank, 2);
  });
});

test('mi semana por grupo: una sola consulta con todos los miembros de todos los grupos, sin repetidos', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.tables.steps_daily = [];
    db.tables.public_profiles = [];
    await week().queryFn();
    const q = db.log.find((l) => l.table === 'steps_daily')!;
    assert.deepEqual(q.filters.find((f) => f[0] === 'in')![2], [USER, 'b', 'c', 'd'].sort());
  });
});

test('mi semana por grupo: sin grupos no consulta', () => {
  assert.equal(week([]).enabled, false);
});

test('BUG conocido: a partir de las 20:00 en La Paz "caminaron hoy" siempre da 0 (compara con el día UTC, que ya es mañana)', { todo: 'hooks/useMyGroupsWeek.ts:29 (new Date().toISOString().slice(0, 10)); usar el día local' }, async () => {
  // 02:30 UTC del 3/10 = 22:30 del 2/10 en La Paz. Beto caminó hoy (2/10).
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, async () => {
    db.tables.steps_daily = [{ user_id: 'b', day: '2026-10-02', steps: 9000 }];
    db.tables.public_profiles = [{ id: 'b', full_name: 'Beto', photo_url: null }];
    const res = await week([{ id: 'g1', group_members: [{ user_id: USER }, { user_id: 'b' }] }]).queryFn();
    assert.equal(res.g1.walkedToday, 1);
  });
});

test('BUG conocido (dispositivos al este de UTC): la semana arranca el domingo porque se pasa el lunes 00:00 local a UTC', { todo: 'hooks/useMyGroupsWeek.ts:28, useGroupRanking.ts:37 y useGroupDetail.ts:35; en Bolivia (UTC-4) no se nota' }, async () => {
  // Madrid (UTC+2): el lunes 28/9 00:00 local es el domingo 27/9 22:00 UTC.
  await atTime('2026-10-03T10:00:00Z', 'Europe/Madrid', async () => {
    db.tables.steps_daily = [];
    db.tables.public_profiles = [];
    await week().queryFn();
    const gte = db.log.find((l) => l.table === 'steps_daily')!.filters.find((f) => f[0] === 'gte')![2];
    assert.equal(gte, '2026-09-28');
  });
});

// ---------------------------------------------------------------- pasos de los integrantes (migración 0051, función group_members_steps)
test('pasos de grupo: con la función 0051 ven los pasos de los demás, y solo de gente del grupo', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.rpc.group_members_steps = () => [
      { user_id: USER, day: '2026-10-01', steps: 3000 },
      { user_id: 'b', day: '2026-10-02', steps: 7000 },
      { user_id: 'ajena', day: '2026-10-02', steps: 50000 }, // de otro grupo en común: no entra al ranking
    ];
    db.tables.public_profiles = [{ id: 'b', full_name: 'Beto' }];
    const r = await runGroupRanking([GROUP]).queryFn();
    assert.deepEqual(r.ranked.map((x: any) => [x.name, x.total]).slice(0, 2), [['Beto', 7000], ['Caminante', 3000]]);
    assert.deepEqual(db.rpcLog[0], { name: 'group_members_steps', args: { p_since: '2026-09-28' } });
    assert.equal(db.log.some((l) => l.table === 'steps_daily'), false, 'no lee steps_daily si la función existe');
  });
});

test('pasos de grupo: si la base todavía no tiene la función 0051, sigue leyendo steps_daily como antes', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.tables.steps_daily = [{ user_id: USER, day: '2026-10-01', steps: 3000 }];
    db.tables.public_profiles = [];
    const r = await runGroupRanking([GROUP]).queryFn();
    assert.equal(r.ranked.find((x: any) => x.id === USER).total, 3000);
    assert.ok(db.log.some((l) => l.table === 'steps_daily'));
  });
});

test('pasos de grupo: un error que no es "falta la función" (sin red) se propaga y no se esconde con ceros', async () => {
  await atTime('2026-10-03T15:00:00Z', LA_PAZ, async () => {
    db.rpc.group_members_steps = () => ({ error: { code: '08006', message: 'Failed to fetch' } });
    await assert.rejects(() => runGroupRanking([GROUP]).queryFn(), (e: any) => e.message === 'Failed to fetch');
    assert.equal(db.log.some((l) => l.table === 'steps_daily'), false);
  });
});
