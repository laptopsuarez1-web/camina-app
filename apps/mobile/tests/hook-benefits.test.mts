// hooks/useBenefits.ts y useRedeemCounts.ts (código REAL con dobles): canjes con código, vencimiento y devolución.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import {
  useBenefits, useBenefitsRemainingToday, useRedeemBenefit, useRegenerateCode, useCancelExpiredRedemption, useMyRedemptions,
} from '../src/hooks/useBenefits.ts';
import { useRedeemCounts } from '../src/hooks/useRedeemCounts.ts';

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth('u-1', { city: 'Tarija' });
});

const row = (id: string, city: string | undefined) => ({ id, active: true, business: city === undefined ? null : { id: `b-${id}`, city } });

test('beneficios: solo los de la ciudad de la persona', async () => {
  db.tables.benefits = [row('1', 'Tarija'), row('2', 'La Paz'), row('3', 'Tarija')];
  useBenefits();
  assert.deepEqual(rq.lastQuery.queryKey, ['benefits', 'Tarija']);
  assert.deepEqual((await rq.lastQuery.queryFn()).map((b: any) => b.id), ['1', '3']);
  setAuth('u-1', { city: 'La Paz' });
  useBenefits();
  assert.deepEqual(rq.lastQuery.queryKey, ['benefits', 'La Paz']);
  assert.deepEqual((await rq.lastQuery.queryFn()).map((b: any) => b.id), ['2']);
});

test('beneficios: sin perfil o sin ciudad se asume Tarija; un comercio sin ciudad también cuenta como Tarija', async () => {
  setAuth('u-1', null);
  db.tables.benefits = [row('1', 'Tarija'), row('2', 'La Paz'), row('3', undefined)];
  useBenefits();
  assert.deepEqual(rq.lastQuery.queryKey, ['benefits', 'Tarija']);
  assert.deepEqual((await rq.lastQuery.queryFn()).map((b: any) => b.id), ['1', '3']);
});

test('beneficios: solo se piden los activos y un error de la base se propaga', async () => {
  db.tables.benefits = [{ id: 'x', active: false, business: { city: 'Tarija' } }, row('1', 'Tarija')];
  useBenefits();
  assert.deepEqual((await rq.lastQuery.queryFn()).map((b: any) => b.id), ['1']);
  db.errors.benefits = new Error('boom');
  await assert.rejects(() => rq.lastQuery.queryFn(), /boom/);
});

test('cupos del día: arma un mapa beneficio -> canjeados hoy', async () => {
  db.rpc.benefits_remaining_today = () => [{ benefit_id: 'a', redeemed_today: 2 }, { benefit_id: 'b', redeemed_today: 0 }];
  useBenefitsRemainingToday();
  assert.equal(rq.lastQuery.staleTime, 60_000);
  const map: Map<string, number> = await rq.lastQuery.queryFn();
  assert.equal(map.get('a'), 2);
  assert.equal(map.get('b'), 0);
  assert.equal(map.get('zzz'), undefined);
  db.rpc.benefits_remaining_today = () => null;
  assert.equal((await rq.lastQuery.queryFn()).size, 0);
});

test('canjear: llama a redeem_benefit y devuelve el canje con su código', async () => {
  db.rpc.redeem_benefit = () => ({ id: 'red-1', code: '123456', code_expires_at: '2026-10-03T15:15:00Z', status: 'pending' });
  useRedeemBenefit();
  const red = await rq.lastMutation.mutationFn('ben-1');
  assert.equal(red.code, '123456');
  assert.deepEqual(db.rpcLog[0], { name: 'redeem_benefit', args: { p_benefit_id: 'ben-1' } });
});

test('canjear: los rechazos del servidor llegan tal cual (saldo, cooldown, cupo, horario)', async () => {
  useRedeemBenefit();
  for (const msg of ['Saldo insuficiente', 'Ya canjeaste en este comercio hace menos de 14 días', 'Se agotaron los cupones de hoy para este beneficio', 'Este beneficio no está disponible hoy']) {
    db.rpc.redeem_benefit = () => ({ error: new Error(msg) });
    await assert.rejects(() => rq.lastMutation.mutationFn('ben-1'), new RegExp(msg));
  }
});

test('canjear: al terminar refresca saldo, movimientos, vencimientos, canjes, cupos y tarjetas', () => {
  useRedeemBenefit();
  rq.lastMutation.onSuccess();
  assert.deepEqual(rq.invalidated.map((i: any) => i.queryKey[0]).sort(),
    ['benefits-remaining-today', 'loyalty-card', 'loyalty-cards', 'points-balance', 'points-expiring-soon', 'points-ledger', 'redemptions']);
});

test('regenerar código: llama a regenerate_redemption_code con el id del canje', async () => {
  db.rpc.regenerate_redemption_code = () => ({ id: 'red-1', code: '654321' });
  useRegenerateCode();
  assert.equal((await rq.lastMutation.mutationFn('red-1')).code, '654321');
  assert.deepEqual(db.rpcLog[0], { name: 'regenerate_redemption_code', args: { p_redemption_id: 'red-1' } });
  db.rpc.regenerate_redemption_code = () => ({ error: new Error('No se puede regenerar este código') });
  await assert.rejects(() => rq.lastMutation.mutationFn('red-1'), /No se puede regenerar/);
});

test('cancelar canje vencido: devuelve los Puntos y refresca saldo, movimientos, vencimientos y canjes', async () => {
  db.rpc.cancel_expired_redemption = () => ({ id: 'red-1', status: 'cancelled' });
  useCancelExpiredRedemption();
  assert.equal((await rq.lastMutation.mutationFn('red-1')).status, 'cancelled');
  assert.deepEqual(db.rpcLog[0], { name: 'cancel_expired_redemption', args: { p_redemption_id: 'red-1' } });
  rq.lastMutation.onSuccess();
  assert.deepEqual(rq.invalidated.map((i: any) => i.queryKey[0]).sort(), ['points-balance', 'points-expiring-soon', 'points-ledger', 'redemptions']);
  db.rpc.cancel_expired_redemption = () => ({ error: new Error('Este código todavía no venció') });
  await assert.rejects(() => rq.lastMutation.mutationFn('red-1'), /todavía no venció/);
});

test('mis canjes: del más nuevo al más viejo', async () => {
  db.tables.redemptions = [
    { id: 'a', created_at: '2026-10-01T10:00:00Z' }, { id: 'b', created_at: '2026-10-03T10:00:00Z' }, { id: 'c', created_at: '2026-10-02T10:00:00Z' },
  ];
  useMyRedemptions();
  assert.deepEqual((await rq.lastQuery.queryFn()).map((r: any) => r.id), ['b', 'c', 'a']);
});

test('canjes confirmados por comercio: mapa con números; si la función falla o no existe, no se muestra nada', async () => {
  useRedeemCounts();
  assert.equal(rq.lastQuery.staleTime, 10 * 60 * 1000);
  db.rpc.business_redeem_counts = () => [{ business_id: 'b1', total: '120' }, { business_id: 'b2', total: 100 }];
  assert.deepEqual(await rq.lastQuery.queryFn(), { b1: 120, b2: 100 });
  db.rpc.business_redeem_counts = () => ({ error: new Error('function does not exist') });
  assert.deepEqual(await rq.lastQuery.queryFn(), {});
  db.rpc.business_redeem_counts = () => null;
  assert.deepEqual(await rq.lastQuery.queryFn(), {});
});
