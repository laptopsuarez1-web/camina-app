import { Image, View } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';

const MINT = '#62F0B6';
const OFF = '#3a2d63';
const HUELLAS = require('@/../assets/ruta-huellas.png');

// La insignia ganada es igual al logo de la Ruta (anillo menta con las huellas), todos los meses: sin colores por mes.
type Theme = { ring: string; inner: [string, string]; label: string };
const BASE: Theme = { ring: MINT, inner: ['#3B2577', '#200A52'], label: MINT };

// Insignia de la Ruta del mes: anillo de 3 tramos; cada local confirmado llena un tramo.
// `themeMonth` queda por compatibilidad (ya no cambia el color). `mystery`: insignia sorpresa ("?").
export function RutaRing({ size = 120, done = 0, month = '', glow = true, themeMonth, mystery = false }: {
  size?: number; done?: number; month?: string; glow?: boolean; themeMonth?: string | null; mystery?: boolean;
}) {
  void themeMonth;
  const t = BASE;
  const ON = mystery ? '#5c4f80' : t.ring;
  const r = 100;
  const C = 2 * Math.PI * r;
  const gap = 48;
  const seg = C / 3 - gap;
  const full = done >= 3;
  return (
    <View
      accessible
      accessibilityLabel={mystery ? 'Insignia sorpresa' : `Ruta de ${month}: ${Math.min(done, 3)} de 3 locales`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: ON,
        shadowOpacity: glow && full ? 0.55 : 0,
        shadowRadius: size / 7,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <RadialGradient id="rr" cx="0.3" cy="0.25" r="0.9">
            <Stop offset="0" stopColor={t.inner[0]} />
            <Stop offset="1" stopColor={t.inner[1]} />
          </RadialGradient>
        </Defs>
        <Circle cx={120} cy={120} r={88} fill="url(#rr)" />
        {[0, 1, 2].map((i) => {
          const rot = -90 + ((gap / 2) * 360) / C + i * 120;
          const a = ((-90 + i * 120) * Math.PI) / 180;
          const on = i < done;
          return (
            <G key={i}>
              <Circle cx={120} cy={120} r={r} fill="none" stroke={on ? ON : OFF} strokeWidth={16} strokeLinecap="round"
                strokeDasharray={`${seg} ${C}`} rotation={rot} origin="120, 120" />
              <Circle cx={120 + r * Math.cos(a)} cy={120 + r * Math.sin(a)} r={7} fill={on ? ON : OFF} />
            </G>
          );
        })}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        {mystery ? (
          <Text allowFontScaling={false} style={{ ...heavy(), fontSize: size * 0.4, lineHeight: size * 0.48, color: MINT }}>?</Text>
        ) : (
          <Image source={HUELLAS} style={{ width: size * 0.27, height: size * 0.3 }} resizeMode="contain" />
        )}
        {!!month && !mystery && (
          <Text style={{ ...heavy(), fontSize: size * 0.11, color: t.label, marginTop: size * 0.02 }}>{month}</Text>
        )}
      </View>
    </View>
  );
}
