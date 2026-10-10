// lib/errors.ts: errores de Supabase y de la red traducidos a un texto en español para mostrar en pantalla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError } from '../src/lib/errors.ts';

const GENERIC = 'Algo salió mal. Intentá de nuevo.';
const OFFLINE = 'No hay conexión. Revisá tu internet e intentá de nuevo.';

test('friendlyError: credenciales inválidas se traducen y no filtran el texto en inglés', () => {
  const supabaseError = { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400, name: 'AuthApiError' };
  const text = friendlyError(supabaseError);
  assert.equal(text, 'El correo o la contraseña no son correctos.');
  assert.doesNotMatch(text, /invalid/i);
});

test('friendlyError: cuenta ya existente, contraseña corta y correo mal escrito', () => {
  assert.match(friendlyError({ code: 'user_already_exists' }), /ya tiene una cuenta/);
  assert.match(friendlyError({ code: 'email_exists' }), /ya tiene una cuenta/);
  assert.match(friendlyError({ code: 'weak_password' }), /al menos 6 caracteres/);
  assert.match(friendlyError({ code: 'validation_failed' }), /correo esté bien escrito/);
  assert.match(friendlyError({ code: 'email_address_invalid' }), /correo esté bien escrito/);
});

test('friendlyError: correo sin confirmar y límites de intentos', () => {
  assert.match(friendlyError({ code: 'email_not_confirmed' }), /confirmar tu correo/);
  assert.match(friendlyError({ code: 'over_email_send_rate_limit' }), /muchos correos/);
  assert.match(friendlyError({ code: 'over_request_rate_limit' }), /muchos intentos/);
});

test('friendlyError: el código de Postgres 23505 (duplicado) tiene su texto', () => {
  assert.equal(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint' }), 'Eso ya estaba registrado.');
});

test('friendlyError: sin conexión, por mensaje de la red o por tipo de error de Supabase', () => {
  assert.equal(friendlyError(new TypeError('Network request failed')), OFFLINE);
  assert.equal(friendlyError(new Error('Failed to fetch')), OFFLINE);
  assert.equal(friendlyError({ message: 'The request timed out' }), OFFLINE);
  assert.equal(friendlyError({ name: 'AuthRetryableFetchError', message: '{}' }), OFFLINE);
});

test('friendlyError: un código conocido gana sobre el mensaje de red', () => {
  assert.equal(friendlyError({ code: 'invalid_credentials', message: 'Network request failed' }), 'El correo o la contraseña no son correctos.');
});

test('friendlyError: lo desconocido cae en el texto genérico o en el de respaldo que pase quien llama', () => {
  assert.equal(friendlyError({ code: 'algo_raro', message: 'boom' }), GENERIC);
  assert.equal(friendlyError(new Error('boom')), GENERIC);
  assert.equal(friendlyError({ code: 'algo_raro' }, 'No pudimos guardar tu zona.'), 'No pudimos guardar tu zona.');
});

test('friendlyError: valores raros no rompen (undefined, null, texto suelto, número, código que no es texto)', () => {
  assert.equal(friendlyError(undefined), GENERIC);
  assert.equal(friendlyError(null), GENERIC);
  assert.equal(friendlyError('Network request failed'), GENERIC); // un string no tiene .message: cae en el genérico
  assert.equal(friendlyError(42), GENERIC);
  assert.equal(friendlyError({ code: 23505 }), GENERIC); // el código tiene que venir como texto
  assert.equal(friendlyError({ message: 12345 }), GENERIC);
});

test('friendlyError: ningún texto que ve la persona está en inglés ni muestra un código técnico', () => {
  const codes = ['invalid_credentials', 'user_already_exists', 'email_exists', 'weak_password', 'validation_failed', 'email_address_invalid', 'email_not_confirmed', 'over_email_send_rate_limit', 'over_request_rate_limit', '23505'];
  for (const code of codes) {
    const text = friendlyError({ code, message: `raw ${code}` });
    assert.ok(text.length > 0, code);
    assert.doesNotMatch(text, /raw|_|\b(invalid|error|failed|rate|limit)\b/i, code);
  }
});
