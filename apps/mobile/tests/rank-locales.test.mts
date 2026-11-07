// lib/rank-locales.ts: los destacados salen entre los primeros según qué tan cerca estén.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLocales } from '../src/lib/rank-locales.ts';

type L = { n: string; d: number | null; f?: boolean };
const rank = (xs: L[]) => rankLocales(xs, (x) => x.d, (x) => !!x.f, (x) => x.n).map((x) => x.n);
const near = [{ n: 'a', d: 100 }, { n: 'b', d: 300 }, { n: 'c', d: 600 }, { n: 'e', d: 900 }];

test('destacado cerca: va primero', () => {
  assert.deepEqual(rank([...near, { n: 'Bloom', d: 700, f: true }]), ['Bloom', 'a', 'b', 'c', 'e']);
});
test('destacado a media distancia: segundo', () => {
  assert.deepEqual(rank([...near, { n: 'Bloom', d: 1500, f: true }]), ['a', 'Bloom', 'b', 'c', 'e']);
});
test('destacado lejos: tercero', () => {
  assert.deepEqual(rank([...near, { n: 'Bloom', d: 5000, f: true }]), ['a', 'b', 'Bloom', 'c', 'e']);
});
test('si por distancia ya le toca antes, no lo baja', () => {
  assert.deepEqual(rank([{ n: 'Bloom', d: 3000, f: true }, { n: 'x', d: 4000 }]), ['Bloom', 'x']);
});
test('sin ubicación: destacados primero', () => {
  assert.deepEqual(rank([{ n: 'b', d: null }, { n: 'Bloom', d: null, f: true }, { n: 'a', d: null }]), ['Bloom', 'a', 'b']);
});
test('dos destacados no se pisan', () => {
  assert.deepEqual(rank([...near, { n: 'S1', d: 200, f: true }, { n: 'S2', d: 300, f: true }]), ['S1', 'S2', 'a', 'b', 'c', 'e']);
});
