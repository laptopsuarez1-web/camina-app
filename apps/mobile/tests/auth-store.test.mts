// store/useAuthStore.ts (código REAL, con Supabase y react-query de mentira): sesión, perfil y vaciado de la caché.
// Cubre dos riesgos: mostrar datos de la persona anterior al cambiar de cuenta, y mandar a una persona que ya existe
// al alta de cuenta nueva porque el perfil no se pudo leer (sin red).
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, authEvents } from './helpers/stubs/supabase.mts';
import { rq } from './helpers/stubs/react-query.mts';
// Ruta relativa a propósito: '@/store/useAuthStore' está reemplazado por un doble en las demás pruebas.
import { useAuthStore, initAuthListener } from '../src/store/useAuthStore.ts';

const sessionOf = (id: string) => ({ user: { id } }) as any;
const flush = () => new Promise((r) => setTimeout(r, 0));
const emit = async (event: string, session: any) => { await authEvents.listener!(event, session); };

test('al arrancar con sesión carga la sesión y el perfil, y deja de estar "inicializando"', async () => {
  db.tables.profiles = [{ id: 'A', full_name: 'Ana' }, { id: 'B', full_name: 'Beto' }];
  authEvents.session = sessionOf('A');
  initAuthListener();
  await flush(); await flush();
  const s = useAuthStore.getState();
  assert.equal(s.session?.user.id, 'A');
  assert.equal(s.profile?.full_name, 'Ana');
  assert.equal(s.profileError, false);
  assert.equal(s.initializing, false);
  assert.equal(rq.clears, 0);
});

test('TOKEN_REFRESHED y volver a abrir la app con la misma persona NO vacían la caché', async () => {
  await emit('TOKEN_REFRESHED', sessionOf('A'));
  await emit('INITIAL_SESSION', sessionOf('A'));
  assert.equal(rq.clears, 0);
});

test('si el perfil no se puede leer (sin red) se conserva el que había y se avisa con profileError', async () => {
  db.errors.profiles = { message: 'Failed to fetch' };
  await emit('TOKEN_REFRESHED', sessionOf('A'));
  const s = useAuthStore.getState();
  assert.equal(s.profile?.full_name, 'Ana', 'no se pierde el perfil existente');
  assert.equal(s.profileError, true);
  delete db.errors.profiles;
  await emit('TOKEN_REFRESHED', sessionOf('A'));
  assert.equal(useAuthStore.getState().profileError, false);
});

test('entrar con OTRA cuenta vacía la caché y carga el perfil nuevo', async () => {
  await emit('SIGNED_IN', sessionOf('B'));
  assert.equal(rq.clears, 1);
  assert.ok(rq.cancels >= 1);
  assert.equal(useAuthStore.getState().profile?.full_name, 'Beto');
});

test('cerrar sesión vacía la caché y deja la sesión y el perfil en blanco', async () => {
  await emit('SIGNED_OUT', null);
  assert.equal(rq.clears, 2);
  const s = useAuthStore.getState();
  assert.equal(s.session, null);
  assert.equal(s.profile, null);
});

test('después de cerrar sesión, entrar con otra cuenta no vuelve a vaciar de más ni muestra lo anterior', async () => {
  await emit('SIGNED_IN', sessionOf('A'));
  assert.equal(rq.clears, 2);
  assert.equal(useAuthStore.getState().profile?.full_name, 'Ana');
});

test('la sesión y el perfil se publican juntos: nunca hay un instante con sesión y sin perfil (iría al alta de cuenta nueva)', async () => {
  const vistos: { session: boolean; profile: boolean }[] = [];
  const stop = useAuthStore.subscribe((s) => vistos.push({ session: !!s.session, profile: !!s.profile }));
  await emit('SIGNED_OUT', null);
  vistos.length = 0;
  await emit('SIGNED_IN', sessionOf('B'));
  stop();
  assert.ok(vistos.length > 0);
  assert.ok(vistos.every((v) => !v.session || v.profile), JSON.stringify(vistos));
});

test('si el perfil de la cuenta NUEVA no se puede leer, no queda el perfil de la anterior (foto y nombre ajenos)', async () => {
  await emit('SIGNED_IN', sessionOf('A'));
  assert.equal(useAuthStore.getState().profile?.full_name, 'Ana');
  db.errors.profiles = { message: 'Failed to fetch' };
  await emit('SIGNED_IN', sessionOf('B'));
  const s = useAuthStore.getState();
  assert.equal(s.profile, null);
  assert.equal(s.profileError, true);
  delete db.errors.profiles;
});
