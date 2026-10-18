// lib/motion.ts: el movimiento de los íconos al tocarlos (funciones puras: cuadros clave y color con transparencia).
import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, MOTION_MS, partProgress, sample, withAlpha, type IconMotion } from '../src/lib/motion.ts';

test('cada gesto empieza y termina en reposo', () => {
  for (const m of Object.keys(KEYS) as IconMotion[]) {
    const k = KEYS[m];
    assert.ok(MOTION_MS[m] >= 300 && MOTION_MS[m] <= 800, `${m}: duración razonable`);
    for (const arr of [k.scale, k.scaleX, k.rotate, k.y]) {
      if (!arr) continue;
      assert.equal(arr.length, k.at.length, `${m}: un valor por cuadro`);
      assert.equal(arr[arr.length - 1], k.rotate === arr ? 0 : 1, `${m}: vuelve al reposo`);
    }
    assert.equal(k.at[0], 0);
    assert.equal(k.at[k.at.length - 1], 1);
  }
});

test('sample: interpola entre cuadros y se queda en los extremos', () => {
  const at = [0, 0.5, 1];
  const v = [1, 3, 1];
  assert.equal(sample(at, v, -1), 1);
  assert.equal(sample(at, v, 0.25), 2);
  assert.equal(sample(at, v, 0.5), 3);
  assert.equal(sample(at, v, 0.75), 2);
  assert.equal(sample(at, v, 2), 1);
});

test('partProgress: respeta el retraso y la duración de cada parte', () => {
  assert.equal(partProgress(0, 70, 500), 0);
  assert.equal(partProgress(70, 70, 500), 0);
  assert.equal(partProgress(320, 70, 500), 0.5);
  assert.equal(partProgress(900, 70, 500), 1);
});

test('withAlpha: agrega la transparencia a un hex de 6 dígitos y deja lo demás igual', () => {
  assert.equal(withAlpha('#1F7A66', 0.2), '#1F7A6633');
  assert.equal(withAlpha('#7FEDC4', 1), '#7FEDC4ff');
  assert.equal(withAlpha('#7FEDC4', 0), '#7FEDC400');
  assert.equal(withAlpha('rgba(1,2,3,1)', 0.5), 'rgba(1,2,3,1)');
  assert.equal(withAlpha('#fff', 0.5), '#fff');
});
