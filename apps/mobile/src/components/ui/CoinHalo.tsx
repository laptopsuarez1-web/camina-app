import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

// Halo menta muy suave detrás de la moneda de Puntos (22 % en el centro, se apaga hacia el borde).
export function CoinHalo({ size, children }: { size: number; children: React.ReactNode }) {
  const halo = size * 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" importantForAccessibility="no" style={{ position: 'absolute', width: halo, height: halo }}>
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="coinHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.mint} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.mint} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#coinHalo)" />
        </Svg>
      </View>
      {children}
    </View>
  );
}
