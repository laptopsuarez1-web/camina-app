import type { TextStyle } from 'react-native';

// Escala tipográfica de Camina (tamaño / interlineado / peso / tracking). Las cifras llevan siempre tabular-nums.
// Display: saldo de Puntos y total de la semana. Título: título de pantalla. Sección: "Hoy", "Retos Camina", "Movimientos".
// Cuerpo: texto corrido y subtítulos. Apoyo: leyendas (nunca menos de 12).
export const typo: Record<'display' | 'title' | 'section' | 'body' | 'support', TextStyle> = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7 },
  section: { fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14.5, lineHeight: 20, fontWeight: '400' },
  support: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
};
