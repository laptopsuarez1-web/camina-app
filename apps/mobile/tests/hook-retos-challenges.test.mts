// hooks/useRetos.ts y hooks/useChallenges.ts (código REAL con dobles): retos de Camina y desafíos de grupo.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { useRetos, useWeeklyGoalReto, useClaimReto } from '../src/hooks/useRetos.ts';
import { useGroupChallenge, useJoinChallenge, useMyChallengeResult, daysLeft, RULE_LABEL, ruleText } from '../src/hooks/useChallenges.ts';

const USER = 'u-1';

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth(USER, { daily_goal: 6000 });
});

// ---------------------------------------------------------------- retos
const RETOS = [
  { id: 'r1', title: 'Invitá 5 amigos', description: 'd', kind: 'referrals', target: 5, reward_points: 10, active: true, sort: 1 },
  { id: 'r2', title: '10.000 pasos x 14 días', description: 'd', kind: 'steps_streak', target: 14, reward_points: 10, active: true, sort: 2 },
  { id: 'r3', title: '5 metas esta semana', description: 'd', kind: 'weekly_goals', target: 5, reward_points: 6, active: true, sort: 3 },
  { id: 'r4', title: 'Reto apagado', description: 'd', kind: 'weekly_goals', target: 3, reward_points: 1, active: false, sort: 4 },
];

test('retos: junta el reto con el avance que calcula el servidor y saca el porcentaje', async () => {
  db.tables.retos = RETOS;
  db.rpc.reto_progress = () => [
    { reto_id: 'r1', met: 2, claimable: false, claimed_now: false },
    { reto_id: 'r2', met: 14, claimable: true, claimed_now: false },
    { reto_id: 'r3', met: 5, claimable: false, claimed_now: true },
  ];
  useRetos();
  assert.deepEqual(rq.lastQuery.queryKey, ['retos', USER]);
  const list = await rq.lastQuery.queryFn();
  assert.deepEqual(list.map((r: any) => r.id), ['r1', 'r2', 'r3'], 'solo los activos, en el orden `sort`');
  assert.deepEqual(list.map((r: any) => r.pct), [40, 100, 100]);
  assert.deepEqual(list.map((r: any) => r.met), [2, 14, 5]);
  assert.deepEqual(list.map((r: any) => r.claimable), [false, true, false]);
  assert.deepEqual(list.map((r: any) => r.claimed), [false, false, true]);
});

test('retos: un reto sin fila de avance queda en 0 % y no cobrable', async () => {
  db.tables.retos = [RETOS[0]];
  db.rpc.reto_progress = () => [];
  useRetos();
  const [r] = await rq.lastQuery.queryFn();
  assert.equal(r.met, 0);
  assert.equal(r.pct, 0);
  assert.equal(r.claimable, false);
  assert.equal(r.claimed, false);
});

test('retos: el porcentaje se redondea y nunca pasa de 100 (aunque met supere el objetivo)', async () => {
  db.tables.retos = [{ ...RETOS[0], target: 3 }];
  db.rpc.reto_progress = () => [{ reto_id: 'r1', met: 1, claimable: false, claimed_now: false }];
  useRetos();
  assert.equal((await rq.lastQuery.queryFn())[0].pct, 33);
  db.rpc.reto_progress = () => [{ reto_id: 'r1', met: 2, claimable: false, claimed_now: false }];
  assert.equal((await rq.lastQuery.queryFn())[0].pct, 67);
  db.rpc.reto_progress = () => [{ reto_id: 'r1', met: 9, claimable: true, claimed_now: false }];
  assert.equal((await rq.lastQuery.queryFn())[0].pct, 100);
});

test('retos: un error al leer los retos o el avance se propaga', async () => {
  db.tables.retos = RETOS;
  db.rpc.reto_progress = () => ({ error: new Error('rpc caída') });
  useRetos();
  await assert.rejects(() => rq.lastQuery.queryFn(), /rpc caída/);
  db.rpc.reto_progress = () => [];
  db.errors.retos = new Error('tabla caída');
  await assert.rejects(() => rq.lastQuery.queryFn(), /tabla caída/);
});

test('retos: la tarjeta de metas de la semana usa el primer reto semanal activo', () => {
  rq.queryResult = { data: [{ id: 'a', kind: 'referrals' }, { id: 'b', kind: 'weekly_goals' }, { id: 'c', kind: 'weekly_goals' }] };
  assert.equal(useWeeklyGoalReto().data.id, 'b');
  rq.queryResult = { data: [{ id: 'a', kind: 'referrals' }] };
  assert.equal(useWeeklyGoalReto().data, undefined);
  rq.queryResult = { data: undefined };
  assert.equal(useWeeklyGoalReto().data, undefined);
});

test('cobrar reto: manda el id y devuelve los Puntos; al terminar refresca retos, saldo, vencimientos, movimientos y hoy', async () => {
  db.rpc.claim_reto = () => 6;
  useClaimReto();
  assert.equal(await rq.lastMutation.mutationFn('r3'), 6);
  assert.deepEqual(db.rpcLog[0], { name: 'claim_reto', args: { p_reto_id: 'r3' } });
  rq.lastMutation.onSuccess();
  const keys = rq.invalidated.map((i: any) => i.queryKey[0]);
  assert.deepEqual(keys.sort(), ['points-balance', 'points-expiring-soon', 'points-ledger', 'points-today', 'retos']);
});

test('cobrar reto: el rechazo del servidor llega a la pantalla', async () => {
  db.rpc.claim_reto = () => ({ error: new Error('Ya cobraste este reto.') });
  useClaimReto();
  await assert.rejects(() => rq.lastMutation.mutationFn('r3'), /Ya cobraste este reto/);
});

// ---------------------------------------------------------------- desafíos de grupo
test('etiquetas de las reglas de desafío', () => {
  assert.deepEqual(RULE_LABEL, { steps: 'Más pasos', days: 'Más días', streak: 'Mejor racha' });
});

test('daysLeft: cuenta los días que faltan después de hoy (el día de cierre da 0 = "último día"); nunca negativo', async () => {
  await atTime('2026-10-03T15:00:00Z', 'America/La_Paz', () => {
    assert.equal(daysLeft('2026-10-03'), 0); // termina hoy: último día (antes decía "queda 1 día" todo el día)
    assert.equal(daysLeft('2026-10-04'), 1);
    assert.equal(daysLeft('2026-10-10'), 7);
    assert.equal(daysLeft('2026-10-02'), 0);
    assert.equal(daysLeft('2025-01-01'), 0);
  });
});

test('daysLeft: usa el día local, no el UTC (de noche en La Paz ya es mañana en UTC)', async () => {
  await atTime('2026-10-04T03:59:59Z', 'America/La_Paz', () => { // 23:59:59 del 3/10 en La Paz
    assert.equal(daysLeft('2026-10-03'), 0);
    assert.equal(daysLeft('2026-10-04'), 1);
  });
});

const CHALLENGE = { id: 'c1', group_id: 'g1', name: 'Semana', rule: 'steps', daily_goal: 5000, start_day: '2026-10-01', end_day: '2026-10-07', stake: 10, status: 'active' };

test('desafío del grupo: sin ninguno devuelve null; solo con uno terminado devuelve el último terminado', async () => {
  useGroupChallenge('g1');
  assert.deepEqual(rq.lastQuery.queryKey, ['group-challenge', 'g1', USER]);
  db.tables.group_challenges = [];
  assert.deepEqual(await rq.lastQuery.queryFn(), { active: null, entries: 0, joined: false, standings: [], lastFinished: null });
  db.tables.group_challenges = [{ ...CHALLENGE, status: 'finished', created_at: '2026-09-01' }];
  const r = await rq.lastQuery.queryFn();
  assert.equal(r.active, null);
  assert.equal(r.lastFinished.id, 'c1');
});

test('desafío del grupo: si no hay grupo o sesión, no consulta', () => {
  useGroupChallenge(undefined);
  assert.equal(rq.lastQuery.enabled, false);
  setAuth(null);
  useGroupChallenge('g1');
  assert.equal(rq.lastQuery.enabled, false);
});

test('desafío del grupo: posiciones ordenadas por la regla del desafío y, si empatan, por pasos', async () => {
  db.tables.group_challenges = [{ ...CHALLENGE, rule: 'days', created_at: '2026-10-01' }];
  db.tables.group_challenge_entries = [{ challenge_id: 'c1', user_id: USER }, { challenge_id: 'c1', user_id: 'b' }, { challenge_id: 'c1', user_id: 'c' }];
  db.rpc.challenge_progress = () => [
    { user_id: 'a', steps: 30000, goal_days: 4, best_streak: 4, met_goal: true },
    { user_id: 'b', steps: 50000, goal_days: 5, best_streak: 2, met_goal: true },
    { user_id: 'c', steps: 60000, goal_days: 4, best_streak: 1, met_goal: true },
  ];
  useGroupChallenge('g1');
  let r = await rq.lastQuery.queryFn();
  assert.deepEqual(r.standings.map((s: any) => s.user_id), ['b', 'c', 'a'], 'más días primero; empate entre c y a: más pasos');
  assert.equal(r.entries, 3);
  assert.equal(r.joined, true);
  assert.equal(r.active.id, 'c1');

  db.tables.group_challenges = [{ ...CHALLENGE, rule: 'streak', created_at: '2026-10-01' }];
  r = await rq.lastQuery.queryFn();
  assert.deepEqual(r.standings.map((s: any) => s.user_id), ['a', 'b', 'c'], 'mejor racha primero');

  db.tables.group_challenges = [{ ...CHALLENGE, rule: 'steps', created_at: '2026-10-01' }];
  r = await rq.lastQuery.queryFn();
  assert.deepEqual(r.standings.map((s: any) => s.user_id), ['c', 'b', 'a'], 'más pasos primero');
});

test('desafío del grupo: "joined" es falso si la persona no se anotó', async () => {
  db.tables.group_challenges = [{ ...CHALLENGE, created_at: '2026-10-01' }];
  db.tables.group_challenge_entries = [{ challenge_id: 'c1', user_id: 'otro' }];
  db.rpc.challenge_progress = () => [];
  useGroupChallenge('g1');
  const r = await rq.lastQuery.queryFn();
  assert.equal(r.joined, false);
  assert.equal(r.entries, 1);
});

test('desafío del grupo: entre dos desafíos, el activo es el que se muestra aunque no sea el más nuevo', async () => {
  db.tables.group_challenges = [
    { ...CHALLENGE, id: 'viejo', status: 'active', created_at: '2026-09-01' },
    { ...CHALLENGE, id: 'nuevo', status: 'finished', created_at: '2026-10-01' },
  ];
  db.rpc.challenge_progress = () => [];
  useGroupChallenge('g1');
  assert.equal((await rq.lastQuery.queryFn()).active.id, 'viejo');
});

test('anotarse al desafío: llama a join_group_challenge y refresca desafío, saldo, movimientos y vencimientos', async () => {
  db.rpc.join_group_challenge = () => null;
  useJoinChallenge('g1');
  await rq.lastMutation.mutationFn('c1');
  assert.deepEqual(db.rpcLog[0], { name: 'join_group_challenge', args: { p_challenge: 'c1' } });
  rq.lastMutation.onSuccess();
  assert.deepEqual(rq.invalidated.map((i: any) => i.queryKey[0]).sort(), ['group-challenge', 'points-balance', 'points-expiring-soon', 'points-ledger']);
  db.rpc.join_group_challenge = () => ({ error: new Error('Ya no se puede sumar: el desafío empezó.') });
  await assert.rejects(() => rq.lastMutation.mutationFn('c1'), /Ya no se puede sumar/);
});

test('mi resultado en el último desafío terminado: devuelve mi puesto, premio y el podio, o null', async () => {
  useMyChallengeResult('g1');
  db.tables.group_challenges = [];
  assert.equal(await rq.lastQuery.queryFn(), null);
  db.tables.group_challenges = [
    { id: 'c1', name: 'Viejo', rule: 'steps', start_day: '2026-09-01', end_day: '2026-09-07', status: 'finished', settled_at: '2026-09-01', group_id: 'g1' },
    { id: 'c2', name: 'Reciente', rule: 'days', start_day: '2026-09-24', end_day: '2026-09-30', status: 'finished', settled_at: '2026-10-01', group_id: 'g1' },
    { id: 'c3', name: 'En curso', status: 'active', settled_at: null, group_id: 'g1' },
  ];
  const yo = { challenge_id: 'c2', user_id: USER, steps: 20000, goal_days: 6, best_streak: 4, payout: 15, rank: 1 };
  const otro = { challenge_id: 'c2', user_id: 'otro', steps: 18000, goal_days: 5, best_streak: 3, payout: 0, rank: 2 };
  db.tables.group_challenge_results = [otro, yo];
  const r = await rq.lastQuery.queryFn();
  assert.equal(r.challengeId, 'c2');
  assert.equal(r.name, 'Reciente');
  assert.equal(r.rule, 'days');
  assert.equal(r.days, 7);
  assert.equal(r.payout, 15);
  assert.equal(r.rank, 1);
  assert.deepEqual(r.results.map((x: any) => x.user_id), [USER, 'otro']);
  db.tables.group_challenge_results = [otro];
  assert.equal(await rq.lastQuery.queryFn(), null);
});

test('ruleText: el valor de cada persona dicho con la regla del desafío', () => {
  const r = { steps: 21430, goal_days: 1, best_streak: 4 };
  assert.equal(ruleText('steps', r), `${(21430).toLocaleString('es-BO')} pasos`);
  assert.equal(ruleText('days', r), '1 día');
  assert.equal(ruleText('days', { ...r, goal_days: 5 }), '5 días');
  assert.equal(ruleText('streak', r), 'racha de 4');
});

// ---------------------------------------------------------------- días que faltan en un desafío de grupo

test('daysLeft: el último día da 0 ("último día"), el anterior 1 y nunca baja de 0', () => {
  assert.equal(daysLeft('2026-10-10', '2026-10-10'), 0);
  assert.equal(daysLeft('2026-10-10', '2026-10-09'), 1);
  assert.equal(daysLeft('2026-10-10', '2026-10-03'), 7);
  assert.equal(daysLeft('2026-10-10', '2026-10-12'), 0);
});
