// lib/streak-reminder-plan.ts: avisos de racha de día y de noche (horarios fijos, los manda Camina).
import test from 'node:test';
import assert from 'node:assert/strict';
import { planStreakReminders, REMINDER_DAYS_AHEAD } from '../src/lib/streak-reminder-plan.ts';

const morning = new Date(2026, 9, 31, 9, 0);

test('mañana temprano sin cumplir: hoy salen el de día y el de noche, y los días siguientes también', () => {
  const plan = planStreakReminders(morning, { streak: 3, metToday: false, missing: 4000 });
  assert.equal(plan.length, (REMINDER_DAYS_AHEAD + 1) * 2);
  assert.equal(plan[0].date.getHours(), 14);
  assert.equal(plan[1].date.getHours(), 20);
  assert.match(plan[1].body, /Te faltan 4\.000 pasos|Te faltan 4000 pasos/);
});

test('si hoy ya cumplió la meta, no hay avisos de hoy', () => {
  const plan = planStreakReminders(morning, { streak: 3, metToday: true, missing: 0 });
  assert.equal(plan.length, REMINDER_DAYS_AHEAD * 2);
  assert.ok(plan.every((r) => r.date.getDate() !== 31));
});

test('los horarios que ya pasaron hoy no se programan', () => {
  const plan = planStreakReminders(new Date(2026, 9, 31, 15, 0), { streak: 0, metToday: false, missing: 6000 });
  assert.equal(plan[0].date.getHours(), 20);
  assert.equal(plan[0].date.getDate(), 31);
});

test('sin racha el texto invita a empezar una', () => {
  const plan = planStreakReminders(morning, { streak: 0, metToday: false, missing: 6000 });
  assert.doesNotMatch(plan[0].body, /seguidos/);
});
