// Amigos: semana/mes de la ficha (lib/friend-week.ts) y consultas de hooks/useFriends.ts (código REAL con dobles).
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { buildDayCells, compactSteps, mondayOf } from '../src/lib/friend-week.ts';
import { useFriends, useFriendRequests, useFriendsRanking, useFriendCard, useFriendActions, useGroupInvites, useInviteFriendsToGroup } from '../src/hooks/useFriends.ts';

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth('u-1', { daily_goal: 6000 });
});

// ---------------------------------------------------------------- semana y mes
test('mondayOf: la semana arranca el lunes (también si hoy es domingo)', () => {
  assert.equal(mondayOf('2026-10-12'), '2026-10-12'); // lunes
  assert.equal(mondayOf('2026-10-14'), '2026-10-12'); // miércoles
  assert.equal(mondayOf('2026-10-18'), '2026-10-12'); // domingo
  assert.equal(mondayOf('2026-10-01'), '2026-09-28'); // cruza de mes
});

test('buildDayCells: esta semana de lunes a domingo, con el estado de cada día', () => {
  const days = [
    { day: '2026-10-12', steps: 4000, goal: 4000 },
    { day: '2026-10-13', steps: 3800, goal: 4000 },
    { day: '2026-10-14', steps: 100, goal: 4000 }, // hoy y todavía sin llegar: sin marca
  ];
  const cells = buildDayCells(days, '2026-10-14');
  assert.equal(cells.length, 7);
  assert.deepEqual(cells.map((c) => c.label), ['L', 'M', 'X', 'J', 'V', 'S', 'D']);
  assert.deepEqual(cells.map((c) => c.state), ['met', 'miss', 'none', 'none', 'none', 'none', 'none']);
  assert.equal(cells[2].isToday, true);
});

test('buildDayCells: un día sin registro es "idle" (no abrió la app) y los anteriores a su primer día no cuentan', () => {
  const days = [{ day: '2026-10-13', steps: 5000, goal: 4000 }, { day: '2026-10-15', steps: 5000, goal: 4000 }];
  const cells = buildDayCells(days, '2026-10-16');
  assert.deepEqual(cells.map((c) => c.state), ['none', 'met', 'idle', 'met', 'none', 'none', 'none']);
});

test('buildDayCells: el mes son 5 semanas terminando en la actual', () => {
  const cells = buildDayCells([], '2026-10-14', 5);
  assert.equal(cells.length, 35);
  assert.equal(cells[0].key, '2026-09-14');
  assert.equal(cells[34].key, '2026-10-18');
});

test('compactSteps: miles con coma decimal', () => {
  assert.equal(compactSteps(0), '0');
  assert.equal(compactSteps(740), '740');
  assert.equal(compactSteps(4000), '4,0k');
  assert.equal(compactSteps(4600), '4,6k');
  assert.equal(compactSteps(48200), '48,2k');
});

// ---------------------------------------------------------------- hooks
test('amigos: convierte los bigint que llegan como texto y se apaga sin sesión', async () => {
  db.rpc.my_friends = () => [{ user_id: 'a', full_name: 'Ana', week_steps: '552', streak: '3' }];
  useFriends();
  assert.deepEqual(rq.lastQuery.queryKey, ['friends', 'u-1']);
  const r = await rq.lastQuery.queryFn();
  assert.equal(r[0].week_steps, 552);
  assert.equal(r[0].streak, 3);
  db.rpc.my_friends = () => ({ error: new Error('boom') });
  await assert.rejects(() => rq.lastQuery.queryFn(), /boom/);
});

test('solicitudes recibidas, ranking de amigos y ficha usan sus funciones', async () => {
  db.rpc.friend_requests_incoming = () => [{ user_id: 'a', full_name: 'Ana', photo_url: null, created_at: 'x' }];
  useFriendRequests();
  assert.equal((await rq.lastQuery.queryFn()).length, 1);

  db.rpc.friends_weekly_ranking = () => [{ user_id: 'a', full_name: 'Ana', photo_url: null, total_steps: '9000', streak: 2, is_me: false }];
  useFriendsRanking();
  assert.equal((await rq.lastQuery.queryFn())[0].total_steps, 9000);

  db.rpc.friend_card = () => null;
  useFriendCard('a');
  assert.deepEqual(rq.lastQuery.queryKey, ['friend-card', 'a']);
  assert.equal(await rq.lastQuery.queryFn(), null); // bloqueo o persona inexistente
  assert.deepEqual(db.rpcLog.at(-1), { name: 'friend_card', args: { p_user: 'a' } });
  useFriendCard(undefined);
  assert.equal(rq.lastQuery.enabled, false);
});

test('acciones de amistad: quitar amigo manda el parámetro correcto y refresca las listas', async () => {
  db.rpc.remove_friend = () => null;
  useFriendActions(); // la última mutación declarada es la de quitar
  await rq.lastMutation.mutationFn('p1');
  assert.deepEqual(db.rpcLog.at(-1), { name: 'remove_friend', args: { p_user: 'p1' } });
  rq.lastMutation.onSuccess();
  assert.deepEqual(rq.invalidated.map((i: any) => i.queryKey[0]), ['friends', 'friend-requests', 'friends-ranking', 'friend-card']);
  db.rpc.remove_friend = () => ({ error: new Error('boom') });
  await assert.rejects(() => rq.lastMutation.mutationFn('p1'), /boom/);
});

test('invitaciones de grupo: se leen, y invitar manda el grupo y la lista de amigos', async () => {
  db.rpc.pending_group_invites = () => [{ group_id: 'g', group_name: 'Gym', inviter_name: 'Ana', member_count: '3', created_at: 'x' }];
  useGroupInvites();
  assert.equal((await rq.lastQuery.queryFn())[0].member_count, 3);

  db.rpc.invite_friends_to_group = () => 2;
  useInviteFriendsToGroup();
  assert.equal(await rq.lastMutation.mutationFn({ groupId: 'g', userIds: ['a', 'b'] }), 2);
  assert.deepEqual(db.rpcLog.at(-1), { name: 'invite_friends_to_group', args: { p_group: 'g', p_users: ['a', 'b'] } });
});
