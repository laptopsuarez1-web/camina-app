// store/useAuthStore.ts (código REAL): arranque con la sesión guardada.
// Bug real (iPhone, 6/11): al abrir la app la sesión se lee dos veces a la vez (la lectura del arranque y el evento
// INITIAL_SESSION de la librería). Si la lectura más vieja del perfil terminaba antes que la más nueva, el arranque
// marcaba "ya no estoy inicializando" con la sesión todavía vacía: la app mostraba el login con la sesión viva.
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, authEvents } from './helpers/stubs/supabase.mts';
import { useAuthStore, initAuthListener } from '../src/store/useAuthStore.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('con dos lecturas del perfil a la vez, nunca se muestra "sin sesión" mientras la sesión todavía se está publicando', async () => {
  db.tables.profiles = [{ id: 'A', full_name: 'Ana' }];
  db.latency.profiles = [20, 90]; // la lectura del arranque termina primero; la del evento, después
  authEvents.session = { user: { id: 'A' } } as any;
  const vistos: { initializing: boolean; session: boolean }[] = [];
  const stop = useAuthStore.subscribe((s) => vistos.push({ initializing: s.initializing, session: !!s.session }));
  initAuthListener();
  await wait(5); // la lectura del arranque ya pidió el perfil
  void authEvents.listener!('INITIAL_SESSION', authEvents.session);
  await wait(250);
  stop();
  assert.ok(vistos.length > 0);
  assert.ok(vistos.every((v) => v.initializing || v.session), `aparecería el login con la sesión viva: ${JSON.stringify(vistos)}`);
  const s = useAuthStore.getState();
  assert.equal(s.initializing, false);
  assert.equal(s.session?.user.id, 'A');
  assert.equal(s.profile?.full_name, 'Ana');
});
