// Red de seguridad de sesión (store/useAuthStore.ts, código REAL): la app solo muestra el login si la persona cierra
// sesión a propósito o si el servidor rechaza de verdad la renovación. Un SIGNED_OUT que nadie pidió se recupera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, authEvents } from './helpers/stubs/supabase.mts';
import { useAuthStore, initAuthListener, signOutUser } from '../src/store/useAuthStore.ts';

const sess = (id: string) => ({ user: { id }, access_token: `a-${id}`, refresh_token: `r-${id}`, expires_at: 9e9 }) as any;
const flush = () => new Promise((r) => setTimeout(r, 20));
const emit = async (event: string, session: any) => { await authEvents.listener!(event, session); };

test('SIGNED_OUT que nadie pidió: se recupera con la copia y NO se muestra el login', async () => {
  db.tables.profiles = [{ id: 'A', full_name: 'Ana' }];
  authEvents.session = sess('A');
  initAuthListener();
  await flush();
  await emit('TOKEN_REFRESHED', sess('A'));
  assert.equal(useAuthStore.getState().session?.user.id, 'A');

  authEvents.setSessionResult = () => {
    // setSession vuelve a abrir la sesión y avisa, como hace supabase-js
    setTimeout(() => authEvents.listener!('SIGNED_IN', sess('A')), 0);
    return { data: { session: sess('A') }, error: null };
  };
  await emit('SIGNED_OUT', null);
  await flush();
  assert.equal(authEvents.setSessionCalls.length, 1);
  assert.equal(authEvents.setSessionCalls[0].refresh_token, 'r-A');
  assert.equal(useAuthStore.getState().session?.user.id, 'A', 'la sesión sigue');
});

test('sin red: no se cierra nada', async () => {
  authEvents.setSessionResult = () => ({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
  await emit('SIGNED_OUT', null);
  await flush();
  assert.equal(useAuthStore.getState().session?.user.id, 'A');
});

test('si el servidor rechaza la renovación de verdad, recién ahí se muestra el login', async () => {
  authEvents.setSessionResult = () => ({ data: { session: null }, error: { name: 'AuthApiError', message: 'Invalid Refresh Token', status: 400 } });
  await emit('SIGNED_OUT', null);
  await flush();
  assert.equal(useAuthStore.getState().session, null);
});

test('cerrar sesión a propósito (signOutUser) no se recupera', async () => {
  await emit('SIGNED_IN', sess('A'));
  await flush();
  const antes = authEvents.setSessionCalls.length;
  await signOutUser('local');
  await emit('SIGNED_OUT', null);
  await flush();
  assert.equal(authEvents.setSessionCalls.length, antes);
  assert.equal(useAuthStore.getState().session, null);
});

test('SIGNED_OUT justo al abrir la app (la copia está en el teléfono pero todavía no en memoria): se recupera', async () => {
  // Así se perdía la sesión: con la app recién abierta, la librería no pudo renovar y cerró la sesión antes de que la
  // copia de respaldo estuviera cargada en memoria; la app lo tomaba como un cierre a propósito y mostraba el login.
  const mod = await import('../src/store/useAuthStore.ts');
  await new Promise((r) => setTimeout(r, 3100)); // pasa la ventana del cierre a propósito de la prueba anterior
  await emit('SIGNED_IN', sess('B'));
  await flush();
  assert.equal(mod.useAuthStore.getState().session?.user.id, 'B');
  mod.__forgetBackupInMemoryForTests();
  const antes = authEvents.setSessionCalls.length;
  authEvents.setSessionResult = () => {
    setTimeout(() => authEvents.listener!('SIGNED_IN', sess('B')), 0);
    return { data: { session: sess('B') }, error: null };
  };
  await emit('SIGNED_OUT', null);
  await flush();
  assert.equal(authEvents.setSessionCalls.length, antes + 1, 'intentó recuperar con la copia del teléfono');
  assert.equal(authEvents.setSessionCalls.at(-1).refresh_token, 'r-B');
  assert.equal(mod.useAuthStore.getState().session?.user.id, 'B', 'no se mostró el login');
});
