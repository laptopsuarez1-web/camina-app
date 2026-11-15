// lib/personal-record.ts: cuándo hoy es récord personal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recordStatus } from '../src/lib/personal-record.ts';

const H = [{ day: '2026-11-10', steps: 5200 }, { day: '2026-11-11', steps: 7100 }, { day: '2026-11-12', steps: 4300 }];

test('supera su mejor día: es récord', () => {
  assert.deepEqual(recordStatus(7400, H, '2026-11-14'), { isRecord: true, prevBest: 7100, prevBestDay: '2026-11-11' });
});
test('igual o menos que su mejor día: no es récord', () => {
  assert.equal(recordStatus(7100, H, '2026-11-14').isRecord, false);
  assert.equal(recordStatus(6000, H, '2026-11-14').isRecord, false);
});
test('con pocos pasos o pocos días de historia no se festeja', () => {
  assert.equal(recordStatus(2500, [{ day: '2026-11-10', steps: 1000 }, { day: '2026-11-11', steps: 900 }, { day: '2026-11-12', steps: 800 }], '2026-11-14').isRecord, false);
  assert.equal(recordStatus(9000, H.slice(0, 2), '2026-11-14').isRecord, false);
});
test('el día de hoy guardado no cuenta como récord anterior', () => {
  assert.equal(recordStatus(9000, [...H, { day: '2026-11-14', steps: 8800 }], '2026-11-14').isRecord, true);
});
