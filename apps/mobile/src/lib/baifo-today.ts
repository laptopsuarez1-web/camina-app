// Qué dice el Baifo en Inicio según cómo va el día. Una sola frase corta y el dato que importa.
// Va aparte de la pantalla para poder probarlo sin teléfono.
export type BaifoMood = 'rest' | 'going' | 'done';
export type BaifoToday = { mood: BaifoMood; pose: 'sentado' | 'camina' | 'festeja'; title: string; body: string };

const nf = (n: number) => n.toLocaleString('es-BO');
const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

export function baifoToday(o: { steps: number; goal: number; streak: number; pointsToday: number; hour: number }): BaifoToday {
  const goal = Math.max(1, o.goal);
  const left = Math.max(0, goal - o.steps);
  if (o.steps >= goal) {
    const parts = [
      o.streak > 1 ? `Ya van ${dias(o.streak)} seguidos.` : '',
      o.pointsToday > 0 ? `Hoy ganaste ${o.pointsToday} ${o.pointsToday === 1 ? 'Punto' : 'Puntos'}.` : '',
    ].filter(Boolean);
    return { mood: 'done', pose: 'festeja', title: '¡Meta cumplida!', body: parts.join(' ') || 'Lo lograste. Mañana vamos por otra.' };
  }
  const pct = o.steps / goal;
  // Con menos de la décima parte de la meta todavía no arrancó el día: el Baifo espera sentado.
  if (pct >= 0.1) {
    const title = pct >= 0.8 ? '¡Ya casi llegas!' : pct >= 0.5 ? '¡Vas por la mitad!' : '¡Buen comienzo!';
    return { mood: 'going', pose: 'camina', title, body: `Te faltan ${nf(left)} pasos para tu meta de hoy.` };
  }
  if (o.hour >= 19 && o.streak > 0) {
    return { mood: 'rest', pose: 'sentado', title: 'Tu racha te espera', body: `Camina hoy para no cortar tus ${dias(o.streak)} seguidos.` };
  }
  if (o.hour >= 19) return { mood: 'rest', pose: 'sentado', title: '¿Una vuelta corta?', body: `Todavía puedes sumar pasos antes de que termine el día.` };
  if (o.hour >= 12) return { mood: 'rest', pose: 'sentado', title: 'Todavía hay tiempo', body: `Tu meta de hoy son ${nf(goal)} pasos.` };
  return { mood: 'rest', pose: 'sentado', title: '¿Salimos a caminar?', body: `Tu meta de hoy son ${nf(goal)} pasos.` };
}
