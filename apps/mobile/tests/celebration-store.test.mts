// store/useCelebrationStore.ts: cola de celebraciones (toast, hoja, pantalla completa).
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useCelebrationStore, celebrate } from '../src/store/useCelebrationStore.ts';

beforeEach(() => {
  useCelebrationStore.setState({ queue: [] });
});

test('celebrate encola con un id propio y respeta el orden de llegada', () => {
  celebrate({ kind: 'toast', icon: 'flame', title: '3 días de racha' });
  celebrate({ kind: 'sheet', title: 'Reto cumplido', points: 6 });
  const { queue } = useCelebrationStore.getState();
  assert.equal(queue.length, 2);
  assert.deepEqual(queue.map((q) => q.title), ['3 días de racha', 'Reto cumplido']);
  assert.equal(new Set(queue.map((q) => q.id)).size, 2);
  assert.ok(queue[1].id > queue[0].id);
});

test('dismiss saca la primera y deja el resto', () => {
  celebrate({ kind: 'toast', icon: 'gift', title: 'A' });
  celebrate({ kind: 'win', title: 'B', points: 30 });
  useCelebrationStore.getState().dismiss();
  assert.deepEqual(useCelebrationStore.getState().queue.map((q) => q.title), ['B']);
  useCelebrationStore.getState().dismiss();
  assert.equal(useCelebrationStore.getState().queue.length, 0);
});

test('dismiss con la cola vacía no rompe', () => {
  useCelebrationStore.getState().dismiss();
  assert.equal(useCelebrationStore.getState().queue.length, 0);
});

test('los ids no se repiten aunque se vacíe la cola', () => {
  celebrate({ kind: 'toast', icon: 'check', title: 'uno' });
  const first = useCelebrationStore.getState().queue[0].id;
  useCelebrationStore.getState().dismiss();
  celebrate({ kind: 'toast', icon: 'check', title: 'dos' });
  assert.ok(useCelebrationStore.getState().queue[0].id > first);
});
