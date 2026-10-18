// lib/share-stats.ts: cuentas de las tarjetas para compartir (día, semana y mes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeShareStats, longestRun, nextWrappedReminder, periodDates, rangeLabel, splitMonthPoints, dayKey } from '../src/lib/share-stats.ts';

const today = new Date(2026, 9, 18); // domingo 18 de octubre de 2026

function run(period: 'day' | 'week' | 'month', byDay: Record<string, number>, opened: string[] = Object.keys(byDay), goal = 8000) {
  return computeShareStats({
    period,
    today,
    byDay: new Map(Object.entries(byDay)),
    goalFor: () => goal,
    openedDays: new Set(opened),
  });
}

test('la semana son los últimos 7 días terminando hoy y el mes va del 1.º a hoy', () => {
  assert.equal(periodDates('day', today).length, 1);
  assert.equal(dayKey(periodDates('week', today)[0]), '2026-10-12');
  assert.equal(periodDates('month', today).length, 18);
  assert.equal(dayKey(periodDates('month', today)[0]), '2026-10-01');
});

test('semana: total, promedio por día, día más activo y días con meta', () => {
  const s = run('week', { '2026-10-12': 9000, '2026-10-13': 4000, '2026-10-14': 14200, '2026-10-18': 8000 });
  assert.equal(s.steps, 35200);
  assert.equal(s.avgPerDay, 5029);
  assert.deepEqual(s.best, { key: '2026-10-14', steps: 14200 });
  assert.equal(s.daysMet, 3);
  assert.equal(s.bars.length, 7);
  assert.equal(s.bars.filter((b) => b.isBest).length, 1);
});

test('un día sin abrir la app no cuenta como meta cumplida aunque Salud tenga pasos', () => {
  const s = run('week', { '2026-10-14': 20000 }, []);
  assert.equal(s.daysMet, 0);
});

test('tendencia contra la semana anterior; sin datos antes no hay porcentaje', () => {
  const withPrev = run('week', { '2026-10-13': 6000, '2026-10-06': 5000 });
  assert.equal(withPrev.trendPct, 20);
  assert.equal(run('week', { '2026-10-13': 6000 }).trendPct, null);
});

test('día: Puntos de hoy con tope de 20 y calorías/km estimados', () => {
  const s = run('day', { '2026-10-18': 10300 });
  assert.equal(s.pointsToday, 10);
  assert.equal(s.kcal, 412);
  assert.equal(run('day', { '2026-10-18': 50000 }).pointsToday, 20);
});

test('longestRun encuentra la mejor racha y desde cuándo', () => {
  const bars = [true, true, false, true, true, true, false].map((met, i) => ({ key: `2026-10-0${i + 1}`, met }));
  assert.deepEqual(longestRun(bars), { length: 3, from: '2026-10-04', to: '2026-10-06' });
  assert.equal(longestRun([]).length, 0);
});

test('rangeLabel: dentro del mes y cruzando de mes', () => {
  assert.equal(rangeLabel('2026-10-12', '2026-10-18'), '12–18 oct');
  assert.equal(rangeLabel('2026-09-28', '2026-10-04'), '28 sep–4 oct');
});

test('splitMonthPoints separa pasos de bonos e ignora los canjes', () => {
  const r = splitMonthPoints([
    { amount: 20, reason: 'steps' },
    { amount: 18, reason: 'steps' },
    { amount: 5, reason: 'challenge' },
    { amount: 5, reason: 'referral' },
    { amount: -30, reason: 'redemption' },
  ]);
  assert.deepEqual(r, { steps: 38, bonus: 10, total: 48 });
});

test('el aviso del Wrapped es el 1.º del mes a las 9:00 y habla del mes que terminó', () => {
  const mid = nextWrappedReminder(new Date(2026, 9, 18, 15, 0));
  assert.equal(dayKey(mid.date), '2026-11-01');
  assert.equal(mid.date.getHours(), 9);
  assert.equal(mid.monthIndex, 9); // octubre
  // El 1.º antes de las 9:00 es hoy y el mes es el anterior; después de las 9:00 pasa al mes siguiente.
  const early = nextWrappedReminder(new Date(2026, 10, 1, 8, 0));
  assert.equal(dayKey(early.date), '2026-11-01');
  assert.equal(early.monthIndex, 9);
  const late = nextWrappedReminder(new Date(2026, 10, 1, 9, 30));
  assert.equal(dayKey(late.date), '2026-12-01');
  assert.equal(late.monthIndex, 10);
  // Diciembre pasa a enero del año que viene.
  assert.equal(dayKey(nextWrappedReminder(new Date(2026, 11, 20)).date), '2027-01-01');
});
