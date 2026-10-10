// hooks/useStreak.ts (código REAL, con Supabase y React Query reemplazados por dobles): racha de días seguidos con la meta de cada día.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { atTime } from './helpers/clock.mts';
import { rq, resetRq } from './helpers/stubs/react-query.mts';
import { setAuth } from './helpers/stubs/auth-store.mts';
import { db, resetDb } from './helpers/stubs/supabase.mts';
import { useStreak } from '../src/hooks/useStreak.ts';

const LA_PAZ = 'America/La_Paz';
const USER = 'u-1';
// Sábado 3 de octubre de 2026, 11:00 en La Paz.
const AHORA = '2026-10-03T15:00:00Z';

function dayKey(offset: number, base = '2026-10-03') {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
type Row = { day: string; steps: number; goal: number | null };
function seed(rows: Row[]) {
  db.tables.steps_daily = rows.map((r) => ({ user_id: USER, ...r }));
}
async function streak(profileGoal: number | undefined = 6000): Promise<number> {
  setAuth(USER, profileGoal === undefined ? {} : { daily_goal: profileGoal });
  useStreak();
  return rq.lastQuery.queryFn();
}

beforeEach(() => {
  resetRq();
  resetDb();
  setAuth(USER, { daily_goal: 6000 });
});

test('sin sesión la consulta no corre y la clave incluye usuario y meta', () => {
  setAuth(null, null);
  useStreak();
  assert.equal(rq.lastQuery.enabled, false);
  setAuth(USER, { daily_goal: 7000 });
  useStreak();
  assert.deepEqual(rq.lastQuery.queryKey, ['streak', USER, 7000]);
  assert.equal(rq.lastQuery.enabled, true);
});

test('sin pasos guardados la racha es 0', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([]);
    assert.equal(await streak(), 0);
  });
});

test('hoy cumplido y los días anteriores seguidos: cuenta hoy + los anteriores', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([0, -1, -2, -3].map((o) => ({ day: dayKey(o), steps: 6500, goal: 6000 })));
    assert.equal(await streak(), 4);
  });
});

test('hoy en curso (no llegó a la meta): no corta la racha, cuenta desde ayer', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(0), steps: 1200, goal: 6000 },
      { day: dayKey(-1), steps: 6000, goal: 6000 },
      { day: dayKey(-2), steps: 9000, goal: 6000 },
    ]);
    assert.equal(await streak(), 2);
  });
});

test('un día sin llegar a la meta corta la racha', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(0), steps: 7000, goal: 6000 },
      { day: dayKey(-1), steps: 5999, goal: 6000 }, // le faltó 1 paso
      { day: dayKey(-2), steps: 9000, goal: 6000 },
    ]);
    assert.equal(await streak(), 1);
  });
});

test('un día sin fila (no abrió la app) corta la racha', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(-1), steps: 7000, goal: 6000 },
      { day: dayKey(-3), steps: 7000, goal: 6000 },
    ]);
    assert.equal(await streak(), 1);
  });
});

test('si ni hoy ni ayer cumplieron, la racha es 0 aunque antes haya habido una larga', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([-2, -3, -4, -5].map((o) => ({ day: dayKey(o), steps: 9000, goal: 6000 })));
    assert.equal(await streak(), 0);
  });
});

test('cada día se mide con la meta que tenía ese día, no con la actual', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(0), steps: 9000, goal: 9000 },
      { day: dayKey(-1), steps: 3000, goal: 3000 }, // con la meta de entonces sí cumplió
      { day: dayKey(-2), steps: 3000, goal: 3000 },
    ]);
    assert.equal(await streak(9000), 3); // hoy la meta es 9.000: igual cuentan los días con 3.000
    seed([
      { day: dayKey(0), steps: 9000, goal: 9000 },
      { day: dayKey(-1), steps: 7000, goal: 9000 }, // con la meta de entonces NO cumplió
    ]);
    assert.equal(await streak(1000), 1); // aunque hoy la meta sea 1.000
  });
});

test('días viejos sin meta guardada usan la meta actual', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(0), steps: 5000, goal: null },
      { day: dayKey(-1), steps: 5000, goal: null },
    ]);
    assert.equal(await streak(5000), 2);
    assert.equal(await streak(5001), 0);
  });
});

test('la meta nunca baja de 1.000: una meta guardada menor (dato viejo) se sube a 1.000', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([
      { day: dayKey(0), steps: 900, goal: 500 },
      { day: dayKey(-1), steps: 1000, goal: 500 },
    ]);
    assert.equal(await streak(), 1); // hoy 900 < 1.000 no cuenta; ayer 1.000 sí
  });
});

test('sin perfil cargado se usa la meta por defecto de 6.000', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([{ day: dayKey(0), steps: 6000, goal: null }]);
    assert.equal(await streak(undefined), 1);
    seed([{ day: dayKey(0), steps: 5999, goal: null }]);
    assert.equal(await streak(undefined), 0);
  });
});

test('pide solo los pasos de la persona, desde una fecha de corte', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed([]);
    await streak();
    const q = db.log[0];
    assert.equal(q.table, 'steps_daily');
    assert.deepEqual(q.filters.find((f) => f[0] === 'eq'), ['eq', 'user_id', USER]);
    assert.equal(q.filters.find((f) => f[0] === 'gte')![1], 'day');
  });
});

test('un error de la base se propaga (la pantalla muestra su estado de error)', async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    db.errors.steps_daily = new Error('boom');
    setAuth(USER, { daily_goal: 6000 });
    useStreak();
    await assert.rejects(() => rq.lastQuery.queryFn(), /boom/);
  });
});

test('el filtro de fecha usa el día local: desde las 20:00 en La Paz sigue pidiendo desde el día correcto', async () => {
  // 02:30 UTC del 3/10 = 22:30 del 2/10 en La Paz. Hace 60 días (local) es el 3/8.
  await atTime('2026-10-03T02:30:00Z', LA_PAZ, async () => {
    seed([]);
    await streak();
    const gte = db.log[0].filters.find((f) => f[0] === 'gte')![2];
    assert.equal(gte, '2026-08-03');
  });
});

test('BUG conocido: una racha de más de ~60 días se muestra recortada', { todo: 'hooks/useStreak.ts:17-18 mira solo los últimos 60 días; con 100 días seguidos devuelve 61' }, async () => {
  await atTime(AHORA, LA_PAZ, async () => {
    seed(Array.from({ length: 100 }, (_, i) => ({ day: dayKey(-i), steps: 7000, goal: 6000 })));
    assert.equal(await streak(), 100);
  });
});
