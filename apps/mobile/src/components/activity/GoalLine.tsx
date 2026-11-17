import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { colors } from '@/theme/tokens';

// Línea punteada de la meta diaria con la llama verde de la racha al inicio (la misma de Inicio y de la tarjeta de racha).
// Sin racha la llama queda apagada (más tenue), igual que en Inicio.
// La usan las barras de 7 días y la curva de 30 días (y sirve para el perfil de amigos).
// `top`/`bottom` ubican la línea dentro del gráfico (posición absoluta). La llama va en un margen a la izquierda
// (GOAL_GUTTER) que el gráfico deja libre, para no tapar barras ni la curva.
export const GOAL_GUTTER = 30;

export function GoalLine({ lit, goal, top, bottom }: { lit: boolean; goal: number; top?: number; bottom?: number }) {
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Meta diaria: ${goal.toLocaleString('es-BO')} pasos${lit ? ', racha activa' : ''}`}
      style={{ position: 'absolute', left: -8, right: 0, top, bottom, height: 0 }}
    >
      {/* La raya se dibuja con SVG: en iPhone un borde punteado de un solo lado (borderTop + dashed) no se ve. */}
      <Svg width="100%" height={4} style={{ position: 'absolute', left: 0, right: 0, top: -2 }}>
        <Line x1="0" x2="100%" y1="2" y2="2" stroke={colors.mint} strokeWidth={1.5} strokeDasharray="6 5" />
      </Svg>
      <View
        style={{
          position: 'absolute', left: 8 - GOAL_GUTTER, top: -13, width: 24, height: 24, borderRadius: 12,
          backgroundColor: colors.mintDark, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View style={{ opacity: lit ? 1 : 0.45 }}><IllArt kind="flame" size={17} /></View>
      </View>
    </View>
  );
}
