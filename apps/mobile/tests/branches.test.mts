// lib/branches.ts: sucursales de un comercio (una ficha, varios lugares) y premios por sucursal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placesOf, nearestPlace, atPlace, availabilityAt, MAIN_PLACE, type Branch } from '../src/lib/branches.ts';

const hours = { '0': { from: '08:00', to: '20:00' } };
const biz = { id: 'b1', name: 'Café Tarija', address: 'Plaza principal', lat: -21.5355, lng: -64.7296, opening_hours: hours, branch_label: 'Centro' };
const br = (id: string, lat: number, extra: Partial<Branch> = {}): Branch => ({
  id, business_id: 'b1', name: `Suc ${id}`, address: `Calle ${id}`, lat, lng: -64.7296, opening_hours: null, ...extra,
});

test('sin sucursales: solo la principal, con su nombre', () => {
  const ps = placesOf(biz, []);
  assert.equal(ps.length, 1);
  assert.equal(ps[0].id, MAIN_PLACE);
  assert.equal(ps[0].label, 'Centro');
});

test('principal sin nombre: "Principal"', () => {
  assert.equal(placesOf({ ...biz, branch_label: null }, [])[0].label, 'Principal');
  assert.equal(placesOf({ ...biz, branch_label: '   ' }, [])[0].label, 'Principal');
});

test('la principal va primero y después las sucursales', () => {
  const ps = placesOf(biz, [br('a', -21.52), br('b', -21.50)]);
  assert.deepEqual(ps.map((p) => p.id), [MAIN_PLACE, 'a', 'b']);
});

test('sucursal sin horario propio usa el de la principal; con horario, el suyo', () => {
  const own = { '0': { from: '10:00', to: '22:00' } };
  const ps = placesOf(biz, [br('a', -21.52), br('b', -21.50, { opening_hours: own })]);
  assert.deepEqual(ps[1].opening_hours, hours);
  assert.deepEqual(ps[2].opening_hours, own);
});

test('ignora sucursales de otro comercio o sin coordenadas', () => {
  const ps = placesOf(biz, [br('x', -21.5, { business_id: 'otro' }), br('y', Number.NaN)]);
  assert.equal(ps.length, 1);
});

test('comercio sin ubicación principal: quedan solo las sucursales', () => {
  const ps = placesOf({ ...biz, lat: null, lng: null }, [br('a', -21.52)]);
  assert.deepEqual(ps.map((p) => p.id), ['a']);
});

test('la más cercana a la persona; sin ubicación, la principal', () => {
  const ps = placesOf(biz, [br('a', -21.40), br('b', -21.60)]);
  assert.equal(nearestPlace(ps, { latitude: -21.41, longitude: -64.7296 })!.id, 'a');
  assert.equal(nearestPlace(ps, { latitude: -21.61, longitude: -64.7296 })!.id, 'b');
  assert.equal(nearestPlace(ps, { latitude: -21.535, longitude: -64.7296 })!.id, MAIN_PLACE);
  assert.equal(nearestPlace(ps, null)!.id, MAIN_PLACE);
  assert.equal(nearestPlace([], null), null);
});

test('atPlace: la principal devuelve el mismo objeto (nada cambia sin sucursales)', () => {
  const ps = placesOf(biz, [br('a', -21.40)]);
  assert.equal(atPlace(biz, ps[0]), biz);
  assert.equal(atPlace(biz, null), biz);
});

test('atPlace: una sucursal cambia dirección, punto y horario, y mantiene el comercio', () => {
  const ps = placesOf(biz, [br('a', -21.40)]);
  const v = atPlace(biz, ps[1]);
  assert.equal(v.id, 'b1');
  assert.equal(v.name, 'Café Tarija');
  assert.equal(v.address, 'Calle a');
  assert.equal(v.lat, -21.40);
  assert.deepEqual(v.opening_hours, hours);
  assert.equal(biz.address, 'Plaza principal', 'no toca el original');
});

test('premio sin reglas: vale en todas', () => {
  const ps = placesOf(biz, [br('a', -21.40)]);
  assert.deepEqual(availabilityAt(undefined, 'a', ps), { kind: 'all' });
  assert.deepEqual(availabilityAt([], MAIN_PLACE, ps), { kind: 'all' });
});

test('premio solo en la principal: en la sucursal dice dónde vale', () => {
  const ps = placesOf(biz, [br('a', -21.40)]);
  const rules = [{ branch_id: null, daily_quota: null }];
  assert.deepEqual(availabilityAt(rules, MAIN_PLACE, ps), { kind: 'here', dailyQuota: null, remainingToday: null });
  assert.deepEqual(availabilityAt(rules, 'a', ps), { kind: 'elsewhere', labels: ['Centro'] });
});

test('cupos por sucursal: quedan los que no se usaron hoy, nunca negativo', () => {
  const ps = placesOf(biz, [br('a', -21.40)]);
  const rules = [{ branch_id: 'a', daily_quota: 5 }];
  assert.deepEqual(availabilityAt(rules, 'a', ps, new Map([['a', 2]])), { kind: 'here', dailyQuota: 5, remainingToday: 3 });
  assert.deepEqual(availabilityAt(rules, 'a', ps, new Map([['a', 9]])), { kind: 'here', dailyQuota: 5, remainingToday: 0 });
  assert.deepEqual(availabilityAt(rules, 'a', ps), { kind: 'here', dailyQuota: 5, remainingToday: 5 });
});

test('regla de una sucursal borrada no rompe (se omite su nombre)', () => {
  const ps = placesOf(biz, []);
  assert.deepEqual(availabilityAt([{ branch_id: 'borrada', daily_quota: null }], MAIN_PLACE, ps), { kind: 'elsewhere', labels: [] });
});
