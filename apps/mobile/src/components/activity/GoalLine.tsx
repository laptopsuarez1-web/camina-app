import { View } from 'react-native';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { colors } from '@/theme/tokens';

// Línea punteada de la meta diaria con la llama verde de la racha al inicio (la misma de Inicio y de la tarjeta de racha).
// Sin racha la llama queda apagada (más tenue), igual que en Inicio.
// La usan las barras de 7 días y la curva de 30 días (y sirve para el perfil de amigos).
// `top`/`bottom` ubican la línea dentro del gráfico (posición absoluta).
export function GoalLine({ lit, goal, top, bottom }: { lit: boolean; goal: number; top?: number; bottom?: number }) {
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Meta diaria: ${goal.toLocaleString('es-BO')} pasos${lit ? ', racha activa' : ''}`}
      style={{ position: 'absolute', left: 0, right: 0, top, bottom, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)' }}
    >
      <View
        style={{
          position: 'absolute', left: -4, top: -13, width: 24, height: 24, borderRadius: 12,
          backgroundColor: colors.mintDark, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View style={{ opacity: lit ? 1 : 0.45 }}><IllArt kind="flame" size={17} /></View>
      </View>
    </View>
  );
}
