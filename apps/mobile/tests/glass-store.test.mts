// store/useGlassStore.ts: el deslizador de vidrio (Sólido a Cristal) y su valor guardado en el dispositivo.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage, { resetStorage, control, dump } from './helpers/stubs/async-storage.mts';
import { useGlassStore, DEFAULT_GLASS } from '../src/store/useGlassStore.ts';

const KEY = 'camina_glass_amount';
const LEGACY = 'camina_glass_level';

beforeEach(() => {
  resetStorage();
  useGlassStore.setState({ amount: DEFAULT_GLASS });
});

test('el vidrio por defecto es 0,65 (lila)', () => {
  assert.equal(DEFAULT_GLASS, 0.65);
  assert.equal(useGlassStore.getState().amount, 0.65);
});

test('setAmount limita el valor entre 0 y 1', () => {
  const { setAmount } = useGlassStore.getState();
  setAmount(0.3);
  assert.equal(useGlassStore.getState().amount, 0.3);
  setAmount(-2);
  assert.equal(useGlassStore.getState().amount, 0);
  setAmount(7);
  assert.equal(useGlassStore.getState().amount, 1);
  setAmount(0);
  assert.equal(useGlassStore.getState().amount, 0);
});

test('persist guarda el valor como texto, recién al soltar el deslizador', async () => {
  const { setAmount, persist } = useGlassStore.getState();
  setAmount(0.4);
  assert.deepEqual(dump(), {}); // mover el deslizador no escribe
  persist();
  await Promise.resolve();
  assert.deepEqual(dump(), { [KEY]: '0.4' });
});

test('hydrate: lee el valor guardado', async () => {
  await AsyncStorage.setItem(KEY, '0.25');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 0.25);
});

test('hydrate: valores fuera de rango se acotan y 0 (Sólido) se respeta', async () => {
  await AsyncStorage.setItem(KEY, '3');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 1);
  await AsyncStorage.setItem(KEY, '-4');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 0);
  await AsyncStorage.setItem(KEY, '0');
  useGlassStore.setState({ amount: 0.9 });
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 0);
});

test('hydrate: texto que no es número se ignora y queda el valor por defecto', async () => {
  await AsyncStorage.setItem(KEY, 'mucho');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, DEFAULT_GLASS);
});

test('hydrate: migra los tres niveles viejos (0 -> Sólido, 2 -> Cristal, 1 -> por defecto)', async () => {
  await AsyncStorage.setItem(LEGACY, '0');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 0);

  useGlassStore.setState({ amount: DEFAULT_GLASS });
  await AsyncStorage.setItem(LEGACY, '2');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 1);

  useGlassStore.setState({ amount: DEFAULT_GLASS });
  await AsyncStorage.setItem(LEGACY, '1');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, DEFAULT_GLASS);
});

test('hydrate: el valor nuevo gana sobre el nivel viejo', async () => {
  await AsyncStorage.setItem(KEY, '0.8');
  await AsyncStorage.setItem(LEGACY, '0');
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, 0.8);
});

test('sin almacenamiento disponible la app sigue con el valor por defecto (no tira error)', async () => {
  control.failAll = true;
  await useGlassStore.getState().hydrate();
  assert.equal(useGlassStore.getState().amount, DEFAULT_GLASS);
  useGlassStore.getState().persist(); // tampoco debe lanzar
  await Promise.resolve();
});
