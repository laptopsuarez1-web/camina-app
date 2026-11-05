import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { useChristmas } from '@/hooks/useSeason';

const LOGO = require('@/../assets/logo-mint.png');

// El logo de Camina. En Navidad (temporada del servidor) lleva una corona navideña alrededor del aro:
// hojas, bayas y un moño abajo. El logo es el mismo; la corona va por fuera, así que con corona se achica un poco.
// La caja del dibujo es de 640 unidades: el logo (512) va adentro y la corona sobresale.
const BOX = { x: -64, y: -46, s: 640 };
const C = 256;

function leaves() {
  const out: { x: number; y: number; rot: number; s: number; tone: 0 | 1 }[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    // No hay hojas justo abajo: ahí va el moño.
    if (Math.abs(((i * 360) / n + 360) % 360 - 180) < 20) continue;
    const x = C + 246 * Math.cos(a);
    const y = C + 246 * Math.sin(a);
    const deg = (a * 180) / Math.PI + 90;
    out.push({ x, y, rot: deg - 32, s: 0.95, tone: 0 });
    out.push({ x: C + 246 * Math.cos(a + 0.11), y: C + 246 * Math.sin(a + 0.11), rot: deg + 30, s: 0.82, tone: 1 });
  }
  return out;
}
const LEAVES = leaves();
const BERRIES = [-70, -30, 10, 50, 110, 150, 210, 250].map((d) => {
  const a = (d * Math.PI) / 180;
  return { x: C + 240 * Math.cos(a), y: C + 240 * Math.sin(a) };
});

export function Wreath() {
  return (
    <G>
      <Defs>
        <LinearGradient id="wr-l0" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3FC98A" />
          <Stop offset="1" stopColor="#1E8A5C" />
        </LinearGradient>
        <LinearGradient id="wr-l1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2FA772" />
          <Stop offset="1" stopColor="#146A47" />
        </LinearGradient>
        <LinearGradient id="wr-bow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF6B70" />
          <Stop offset="1" stopColor="#B81D33" />
        </LinearGradient>
      </Defs>
      {LEAVES.map((l, i) => (
        <G key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`}>
          <Path d="M0 0 C 16 -12 26 -32 0 -56 C -26 -32 -16 -12 0 0 Z" fill={`url(#wr-l${l.tone})`} />
          <Path d="M0 -4 L0 -48" stroke="#0F5A3C" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ))}
      {BERRIES.map((b, i) => (
        <G key={i}>
          <Circle cx={b.x} cy={b.y} r={14} fill="#E5414D" />
          <Circle cx={b.x - 4.5} cy={b.y - 4.5} r={4.5} fill="#FFA3A8" />
        </G>
      ))}
      {/* Moño. */}
      <G transform="translate(256 506)">
        <Path d="M-6 8 L-40 74 L-16 66 L0 82 L10 14 Z" fill="#A3162C" />
        <Path d="M6 8 L40 74 L16 66 L0 82 L-10 14 Z" fill="#C92E3E" />
        <Path d="M0 0 L-72 -36 C -100 -12 -94 28 -64 32 Z" fill="url(#wr-bow)" />
        <Path d="M0 0 L72 -36 C 100 -12 94 28 64 32 Z" fill="url(#wr-bow)" />
        <Path d="M-16 -8 L-58 -26" stroke="#FF9AA0" strokeOpacity={0.6} strokeWidth={5} strokeLinecap="round" />
        <Circle r={19} fill="#FF5D6A" />
        <Circle cx={-6} cy={-6} r={6} fill="#FFB3B6" />
      </G>
    </G>
  );
}

export function CaminaLogo({ size, festive, style }: { size: number; festive?: boolean; style?: StyleProp<ViewStyle> }) {
  const christmas = useChristmas();
  const on = festive ?? christmas;
  if (!on) return <Image source={LOGO} accessible={false} style={[{ width: size, height: size }, style as object]} />;
  const k = size / BOX.s;
  return (
    <View accessible={false} style={[{ width: size, height: size }, style]}>
      <Image source={LOGO} style={{ position: 'absolute', left: -BOX.x * k, top: -BOX.y * k, width: 512 * k, height: 512 * k }} />
      <Svg width={size} height={size} viewBox={`${BOX.x} ${BOX.y} ${BOX.s} ${BOX.s}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Wreath />
      </Svg>
    </View>
  );
}
