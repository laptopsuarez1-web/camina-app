// lib/auth-storage.ts (código REAL, con Llavero y AsyncStorage de mentira): la sesión guardada nunca se lee a medias.
// Riesgo: una lectura que coincide con una renovación de sesión juntaba pedazos de dos versiones, el JSON salía roto,
// la app creía que no había sesión y mostraba el login.
import test from 'node:test';
import assert from 'node:assert/strict';
import { authStorage } from '../src/lib/auth-storage.ts';
import { resetStorage, control } from './helpers/stubs/async-storage.mts';
import { resetSecure } from './helpers/stubs/secure-store.mts';

const KEY = 'sb-test-auth-token';
const session = (n: number, size: number) => JSON.stringify({ access_token: String(n).repeat(size), refresh_token: 'r' + n, expires_at: n });

test('lecturas durante renovaciones seguidas siempre devuelven una sesión entera', async () => {
  resetStorage(); resetSecure();
  await authStorage.setItem(KEY, session(1, 5000));
  const reads: (string | null)[] = [];
  const jobs: Promise<unknown>[] = [];
  for (let i = 2; i < 30; i++) {
    jobs.push(authStorage.setItem(KEY, session(i, i % 2 ? 4000 : 7000)));
    jobs.push(authStorage.getItem(KEY).then((v) => { reads.push(v); }));
  }
  await Promise.all(jobs);
  assert.ok(reads.length > 0);
  for (const v of reads) assert.doesNotThrow(() => JSON.parse(v!), 'la lectura no puede venir rota ni vacía');
});

test('si el Llavero queda vacío, la sesión se recupera de AsyncStorage y se repara el Llavero', async () => {
  resetStorage(); resetSecure();
  await authStorage.setItem(KEY, session(5, 3000));
  resetSecure();
  assert.equal(await authStorage.getItem(KEY), session(5, 3000));
  resetStorage();
  assert.equal(await authStorage.getItem(KEY), session(5, 3000), 'el Llavero fue reparado');
});

test('si AsyncStorage falla, la sesión sigue saliendo del Llavero; cerrar sesión borra todo', async () => {
  resetStorage(); resetSecure();
  await authStorage.setItem(KEY, session(7, 2500));
  control.failAll = true;
  assert.equal(await authStorage.getItem(KEY), session(7, 2500));
  control.failAll = false;
  await authStorage.removeItem(KEY);
  assert.equal(await authStorage.getItem(KEY), null);
});
