// "Horas muertas": las franjas en que el local está más vacío. Poner el premio justo ahí trae gente
// cuando más hace falta. Son atajos y una sugerencia: el comercio siempre puede ajustar los horarios.
export type Franja = { id: string; label: string; from: string; to: string; hint: string };

// Franjas típicas de poca clientela. No dependen de datos del local.
export const FRANJAS_COMUNES: Franja[] = [
  { id: 'manana', label: 'Mañana tranquila', from: '09:00', to: '11:30', hint: 'Después de abrir, antes del movimiento del mediodía' },
  { id: 'siesta', label: 'Media tarde', from: '14:30', to: '17:30', hint: 'Después del almuerzo, cuando casi no entra nadie' },
  { id: 'noche', label: 'Noche temprana', from: '20:30', to: '22:00', hint: 'Antes del cierre' },
];

// Lunes a jueves suelen ser los días más flojos (bit 0 = lunes ... bit 6 = domingo).
export const DIAS_ENTRE_SEMANA_MASK = 0b0001111;

const MIN_CANJES = 10; // con menos canjes, el dato no dice nada
const LARGO = 3; // horas de la franja sugerida
const DESDE = 9;
const HASTA = 22;

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

// byHour[h] = canjes confirmados a esa hora. Devuelve la ventana de 3 horas con menos canjes
// (entre las 9 y las 22), o null si todavía hay muy pocos canjes para decir algo.
export function franjaFloja(byHour: number[]): { from: string; to: string; canjes: number; promedio: number } | null {
  const total = byHour.reduce((a, b) => a + b, 0);
  if (total < MIN_CANJES) return null;
  const dentro = byHour.slice(DESDE, HASTA).reduce((a, b) => a + b, 0);
  let best = -1;
  let bestSum = Infinity;
  for (let h = DESDE; h + LARGO <= HASTA; h++) {
    let s = 0;
    for (let k = 0; k < LARGO; k++) s += byHour[h + k] ?? 0;
    if (s < bestSum) {
      bestSum = s;
      best = h;
    }
  }
  if (best < 0 || dentro === 0) return null;
  const promedio = dentro / (HASTA - DESDE) * LARGO;
  // Si la franja más floja no es claramente más floja que el promedio, no hay nada que sugerir.
  if (bestSum > promedio * 0.7) return null;
  return { from: hh(best), to: hh(best + LARGO), canjes: bestSum, promedio: Math.round(promedio) };
}
