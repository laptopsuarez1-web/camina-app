// constants/business-rules.ts + onboarding.ts + sharing.ts + catalog.ts.
// Las constantes de la app son un REFLEJO de reglas que de verdad aplica el servidor: acá se comprueba que
// coinciden con las migraciones SQL (si alguien cambia una sola punta, esta prueba falla).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../src/constants/business-rules.ts';
import { ONBOARDING } from '../src/constants/onboarding.ts';
import { referralLink, groupInviteLink, PENDING_REFERRAL_KEY, PENDING_GROUP_JOIN_KEY } from '../src/constants/sharing.ts';
import { CATEGORIES, INTERESTS_OPTIONS } from '../src/constants/catalog.ts';

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../supabase/migrations');
const sql = (file: string) => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
const allSql = () => fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort().map(sql);
/** Valor de una función SQL de una sola línea `select N;` (la última definición gana). */
function sqlConstant(fn: string): number {
  const re = new RegExp(`function ${fn}\\(\\)[^$]*\\$\\w*\\$\\s*select\\s+(\\d+)\\s*;?`, 'g');
  const found = [...allSql().join('\n').matchAll(re)];
  assert.ok(found.length > 0, `no encontré ${fn}() en las migraciones`);
  return Number(found[found.length - 1][1]);
}

test('valores de las reglas de negocio', () => {
  assert.equal(R.POINTS_PER_STEP_UNIT, 1000);
  assert.equal(R.DAILY_POINTS_CAP, 20);
  assert.equal(R.POINTS_TTL_DAYS, 90);
  assert.equal(R.BUSINESS_REDEMPTION_COOLDOWN_DAYS, 14);
  assert.equal(R.REDEMPTION_CODE_TTL_MINUTES, 15);
  assert.equal(R.MIN_DAILY_GOAL, 1000);
  assert.equal(R.GOOD_DAILY_GOAL, 5000);
  assert.equal(R.BIO_MAX_LENGTH, 80);
});

test('coherencia interna: la meta "muy buena" supera al mínimo y el tope diario no se alcanza sin 20.000 pasos', () => {
  assert.ok(R.GOOD_DAILY_GOAL > R.MIN_DAILY_GOAL);
  assert.equal(R.DAILY_POINTS_CAP * R.POINTS_PER_STEP_UNIT, 20000);
  assert.ok(R.STEP_LENGTH_METERS > 0 && R.STEP_LENGTH_METERS < 1.5);
  assert.ok(R.KCAL_PER_STEP > 0 && R.KCAL_PER_STEP < 0.2);
});

test('contrato con SQL: vigencia de Puntos, tope diario, cooldown y vencimiento del código', () => {
  assert.equal(sqlConstant('points_ttl_days'), R.POINTS_TTL_DAYS);
  assert.equal(sqlConstant('daily_points_cap'), R.DAILY_POINTS_CAP);
  assert.equal(sqlConstant('business_redemption_cooldown_days'), R.BUSINESS_REDEMPTION_COOLDOWN_DAYS);
  assert.equal(sqlConstant('redemption_code_ttl_minutes'), R.REDEMPTION_CODE_TTL_MINUTES);
  assert.equal(sqlConstant('loyalty_goal'), R.LOYALTY_STAMPS_GOAL);
  assert.equal(sqlConstant('loyalty_card_days'), R.LOYALTY_CARD_DAYS);
});

test('contrato con SQL: 1 Punto cada POINTS_PER_STEP_UNIT pasos (última versión de earn_points_from_steps)', () => {
  const body = sql('0039_goal_history_user_count.sql');
  const m = body.match(/v_target_points := least\(floor\(v_steps \/ (\d+)\.0\)::integer, v_cap\)/);
  assert.ok(m, 'no encontré el cálculo de v_target_points en 0039');
  assert.equal(Number(m![1]), R.POINTS_PER_STEP_UNIT);
});

test('contrato con SQL: la meta diaria mínima y el mínimo de desafíos', () => {
  const m = sql('0032_min_daily_goal.sql').match(/check \(daily_goal >= (\d+)\)/);
  assert.ok(m);
  assert.equal(Number(m![1]), R.MIN_DAILY_GOAL);
  const c = sql('0030_group_challenges.sql').match(/daily_goal integer not null check \(daily_goal between (\d+) and (\d+)\)/);
  assert.ok(c);
  assert.equal(Number(c![1]), R.MIN_DAILY_GOAL);
});

test('contrato con SQL: la plausibilidad de pasos de 0038 (300 por minuto, margen de 2.000) no cambió sin avisar', () => {
  const body = sql('0039_goal_history_user_count.sql');
  assert.match(body, /\+ 2000\b/);
  assert.match(body, /\* 300\)::integer/);
  assert.match(body, /least\(p_steps, v_allowed, 100000\)/);
});

test('contrato con SQL: el ranking global de la app (1.000 usuarios) no lo decide el servidor', () => {
  // No hay constante SQL equivalente: app_user_count() solo devuelve el número y la app decide.
  assert.match(sql('0039_goal_history_user_count.sql'), /create or replace function app_user_count\(\) returns integer/);
});

test('onboarding: 4 pantallas, y los números del texto salen de las constantes', () => {
  assert.equal(ONBOARDING.length, 4);
  assert.deepEqual(ONBOARDING.map((s) => s.art), ['ring', 'points', 'reward', 'group']);
  for (const s of ONBOARDING) {
    assert.ok(s.title.length > 0 && s.desc.length > 0);
  }
  const puntos = ONBOARDING[1].desc;
  assert.ok(puntos.includes(`${R.POINTS_PER_STEP_UNIT.toLocaleString('es-BO')} pasos ganas 1 Punto`), puntos);
  assert.ok(puntos.includes(`duran ${R.POINTS_TTL_DAYS} días`), puntos);
  assert.ok(puntos.includes(`hasta ${R.DAILY_POINTS_CAP} por día`), puntos);
});

test('onboarding: sin textos que ya se descartaron ("faltan N pasos", "Promedio por día", "Premios que te copan")', () => {
  const todo = ONBOARDING.map((s) => `${s.title} ${s.desc}`).join(' ').toLowerCase();
  assert.ok(!todo.includes('faltan'));
  assert.ok(!todo.includes('promedio por día'));
  assert.ok(!todo.includes('te copan'));
});

test('sharing: links de invitación y claves de almacenamiento', () => {
  assert.equal(referralLink('abc-123'), 'https://caminaapp.com/r/abc-123');
  assert.equal(groupInviteLink('g-9'), 'https://caminaapp.com/join-group/g-9');
  assert.notEqual(PENDING_REFERRAL_KEY, PENDING_GROUP_JOIN_KEY);
  assert.ok(PENDING_REFERRAL_KEY.startsWith('camina_') && PENDING_GROUP_JOIN_KEY.startsWith('camina_'));
});

test('catálogo: categorías sin ids repetidos, con "Todos" primero, e intereses que existen como categoría o son válidos', () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], 'Todos');
  const interests = INTERESTS_OPTIONS.map(([name]) => name);
  assert.equal(new Set(interests).size, interests.length);
  for (const [name, icon] of INTERESTS_OPTIONS) assert.ok(name && icon);
});
