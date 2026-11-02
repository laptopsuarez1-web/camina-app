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
