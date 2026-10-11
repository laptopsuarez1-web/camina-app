// lib/age.ts: fecha de nacimiento escrita por la persona (día / mes / año) y edad mínima de 13 años.
import test from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { birthToISO, ageFromISO, MIN_AGE } from '../src/lib/age.ts';

const LA_PAZ = 'America/La_Paz';
const HOY = '2026-10-03T15:00:00Z'; // sábado 3 de octubre de 2026, 11:00 en La Paz

test('la edad mínima es 13', () => {
  assert.equal(MIN_AGE, 13);
});

test('birthToISO: fechas válidas se normalizan a AAAA-MM-DD (con ceros)', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('15', '3', '2000'), '2000-03-15');
    assert.equal(birthToISO('05', '03', '2000'), '2000-03-05');
    assert.equal(birthToISO('1', '1', '1900'), '1900-01-01');
    assert.equal(birthToISO('31', '12', '1999'), '1999-12-31');
  });
});

test('birthToISO: días y meses que no existen dan null', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('31', '2', '2000'), null);
    assert.equal(birthToISO('31', '4', '2000'), null);
    assert.equal(birthToISO('32', '1', '2000'), null);
    assert.equal(birthToISO('0', '1', '2000'), null);
    assert.equal(birthToISO('15', '13', '2000'), null);
    assert.equal(birthToISO('15', '0', '2000'), null);
  });
});

test('birthToISO: 29 de febrero solo en años bisiestos (incluye la regla de los siglos)', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('29', '2', '2000'), '2000-02-29');
    assert.equal(birthToISO('29', '2', '2004'), '2004-02-29');
    assert.equal(birthToISO('29', '2', '2001'), null);
    assert.equal(birthToISO('29', '2', '1900'), null);
  });
});

test('birthToISO: el año debe tener 4 cifras y ser 1900 o más', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('15', '3', '99'), null);
    assert.equal(birthToISO('15', '3', '200'), null);
    assert.equal(birthToISO('15', '3', '20000'), null);
    assert.equal(birthToISO('15', '3', '1899'), null);
    assert.equal(birthToISO('15', '3', ''), null);
  });
});

test('birthToISO: vacío o no numérico da null', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('', '3', '2000'), null);
    assert.equal(birthToISO('15', '', '2000'), null);
    assert.equal(birthToISO('quince', '3', '2000'), null);
    assert.equal(birthToISO('15', 'marzo', '2000'), null);
    assert.equal(birthToISO('15', '3', 'abcd'), null);
  });
});

test('birthToISO: no acepta fechas futuras; hoy sí', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(birthToISO('4', '10', '2026'), null);
    assert.equal(birthToISO('3', '10', '2027'), null);
    assert.equal(birthToISO('3', '10', '2026'), '2026-10-03');
    assert.equal(birthToISO('2', '10', '2026'), '2026-10-02');
  });
});

test('ageFromISO: cumple años justo hoy, ayer y mañana', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(ageFromISO('2013-10-03'), 13); // hoy cumple 13
    assert.equal(ageFromISO('2013-10-02'), 13); // cumplió ayer
    assert.equal(ageFromISO('2013-10-04'), 12); // cumple mañana
    assert.equal(ageFromISO('2013-11-01'), 12);
    assert.equal(ageFromISO('2013-09-30'), 13);
  });
});

test('ageFromISO: recién nacido y nacidos en año bisiesto', async () => {
  await atTime(HOY, LA_PAZ, () => {
    assert.equal(ageFromISO('2026-10-03'), 0);
    assert.equal(ageFromISO('2026-01-15'), 0);
    assert.equal(ageFromISO('2000-02-29'), 26);
  });
  // Nacida un 29 de febrero: el 28 de febrero todavía no cumplió, el 1 de marzo sí.
  await atTime('2026-02-28T15:00:00Z', LA_PAZ, () => assert.equal(ageFromISO('2012-02-29'), 13));
  await atTime('2026-03-01T15:00:00Z', LA_PAZ, () => assert.equal(ageFromISO('2012-02-29'), 14));
});

test('el filtro de 13 años en el registro: birthToISO + ageFromISO < MIN_AGE', async () => {
  await atTime(HOY, LA_PAZ, () => {
    const puedeUsarCamina = (d: string, m: string, y: string) => {
      const iso = birthToISO(d, m, y);
      return iso !== null && ageFromISO(iso) >= MIN_AGE;
    };
    assert.equal(puedeUsarCamina('3', '10', '2013'), true); // cumple 13 hoy
    assert.equal(puedeUsarCamina('4', '10', '2013'), false); // le falta un día
    assert.equal(puedeUsarCamina('1', '1', '2020'), false);
    assert.equal(puedeUsarCamina('31', '2', '1990'), false); // fecha inválida
    assert.equal(puedeUsarCamina('1', '1', '1990'), true);
  });
});

test('ageFromISO usa el día del dispositivo: a las 22:30 del 2 de octubre en La Paz (ya 3 en UTC) todavía no cumplió', async () => {
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, () => {
    assert.equal(ageFromISO('2013-10-03'), 12);
    assert.equal(ageFromISO('2013-10-02'), 13);
  });
});
