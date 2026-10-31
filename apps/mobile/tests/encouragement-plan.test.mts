// lib/encouragement-plan.ts: avisos de aliento de las 18:30.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planEncouragement, ENCOURAGEMENT_DAYS_AHEAD } from '../src/lib/encouragement-plan.ts';

const noon = new Date(2026, 9, 31, 12, 0);
const base = { goal: 5000, pointsCap: 20 };

test('sin cumplir la meta: dice cuántos pasos faltan y recuerda abrir la app', () => {
  const plan = planEncouragement(noon, { ...base, stepsToday: 3760, pointsToday: 3 });
  assert.equal(plan.length, ENCOURAGEMENT_DAYS_AHEAD + 1);
  assert.equal(plan[0].date.getHours(), 18);
  assert.equal(plan[0].date.getMinutes(), 30);
  assert.match(plan[0].body, /1\.?240 pasos/);
  assert.match(plan[0].body, /Abre Camina/);
});

test('meta cumplida con Puntos por sumar: bien hecho', () => {
  const plan = planEncouragement(noon, { ...base, stepsToday: 6000, pointsToday: 6 });
  assert.equal(plan[0].title, '¡Bien hecho!');
  assert.match(plan[0].body, /6 Puntos/);
  assert.match(plan[0].body, /hasta 20/);
});

test('en el tope de Puntos hoy no se avisa, pero los días siguientes sí', () => {
  const plan = planEncouragement(noon, { ...base, stepsToday: 30000, pointsToday: 20 });
  assert.equal(plan.length, ENCOURAGEMENT_DAYS_AHEAD);
  assert.ok(plan.every((r) => r.date.getDate() !== 31));
});

test('si ya pasaron las 18:30 no se programa el de hoy', () => {
  const plan = planEncouragement(new Date(2026, 9, 31, 19, 0), { ...base, stepsToday: 100, pointsToday: 0 });
  assert.equal(plan.length, ENCOURAGEMENT_DAYS_AHEAD);
  assert.equal(plan[0].date.getDate(), 1);
});

test('singular: 1 Punto', () => {
  const plan = planEncouragement(noon, { goal: 1000, pointsCap: 20, stepsToday: 1000, pointsToday: 1 });
  assert.match(plan[0].body, /1 Punto\./);
});
