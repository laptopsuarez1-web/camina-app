import { Image, View } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';

const MINT = '#62F0B6';
const OFF = '#3a2d63';
const HUELLAS = require('@/../assets/ruta-huellas.png');

// Insignia de la Ruta del mes (temática de noviembre: anillo de 3 tramos). Cada local confirmado llena un tramo.
export function RutaRing({ size = 120, done = 0, month = '', glow = true }: { size?: number; done?: number; month?: string; glow?: boolean }) {
  const r = 100;
  const C = 2 * Math.PI * r;
  const gap = 48;
  const seg = C / 3 - gap;
  const full = done >= 3;
  return (
    <View
      accessible
      accessibilityLabel={`Ruta de ${month}: ${Math.min(done, 3)} de 3 locales`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: MINT,
        shadowOpacity: glow && full ? 0.55 : 0,
        shadowRadius: size / 7,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <RadialGradient id="rr" cx="0.3" cy="0.25" r="0.9">
            <Stop offset="0" stopColor="#3B2577" />
            <Stop offset="1" stopColor="#200A52" />
          </RadialGradient>
        </Defs>
        <Circle cx={120} cy={120} r={88} fill="url(#rr)" />
        {[0, 1, 2].map((i) => {
          const rot = -90 + ((gap / 2) * 360) / C + i * 120;
          const a = ((-90 + i * 120) * Math.PI) / 180;
          const on = i < done;
          return (
            <G key={i}>
              <Circle cx={120} cy={120} r={r} fill="none" stroke={on ? MINT : OFF} strokeWidth={16} strokeLinecap="round"
                strokeDasharray={`${seg} ${C}`} rotation={rot} origin="120, 120" />
              <Circle cx={120 + r * Math.cos(a)} cy={120 + r * Math.sin(a)} r={7} fill={on ? MINT : OFF} />
            </G>
          );
        })}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={HUELLAS} style={{ width: size * 0.27, height: size * 0.3 }} resizeMode="contain" />
        {!!month && (
          <Text style={{ ...heavy(), fontSize: size * 0.11, color: MINT, marginTop: size * 0.02 }}>{month}</Text>
        )}
      </View>
    </View>
  );
}
