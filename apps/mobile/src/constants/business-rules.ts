// Reflejo, solo para UI (textos, cuentas regresivas), de las reglas que en verdad
// se aplican del lado del servidor en supabase/migrations/0001_init.sql.
// Si cambian acá, tienen que cambiar también las funciones SQL correspondientes.
export const POINTS_PER_STEP_UNIT = 1000; // 1 Punto cada 1000 pasos
export const DAILY_POINTS_CAP = 20; // tope de Puntos ganados por día
export const POINTS_TTL_DAYS = 90; // vigencia de un lote de Puntos
export const BUSINESS_REDEMPTION_COOLDOWN_DAYS = 14; // cooldown por comercio
export const REDEMPTION_CODE_TTL_MINUTES = 15; // vigencia del código de canje

// Solo para mostrar Km/Calorías estimados en Actividad — no hay wearable que
// mida esto de verdad, es una aproximación estándar de la industria fitness.
export const STEP_LENGTH_METERS = 0.762; // paso promedio de un adulto
export const KCAL_PER_STEP = 0.04;

// Meta semanal de equipo mostrada en el detalle de grupo — display-only, no autoritativa.
export const TEAM_CHALLENGE_WEEKLY_STEPS_PER_MEMBER = 42_000;


// Meta diaria de pasos: mínimo permitido, y desde cuánto se considera una meta "muy buena".
export const MIN_DAILY_GOAL = 1000;
export const GOOD_DAILY_GOAL = 5000;
