import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';

// Ilustraciones de los estados vacíos (180 x 128): un caminito de huellas que llega a algo.
// Las huellas son las del logo (PNG), izquierda y derecha alternadas, una encima de otra en orden de paso.
// Eventos: un calendario con un espacio punteado para el primer evento. Avisos: una campana tranquila con luna y estrellitas.
// Puntos: la moneda Camina al final del caminito. Todo en la paleta de la app; sin desenfoque (el halo es un degradé radial).
export type Illustration = 'eventos' | 'avisos' | 'puntos';

const W = 180;
const H = 128;
const SPARKLE = 'M0 -6 C0.8 -1.5 1.5 -0.8 6 0 C1.5 0.8 0.8 1.5 0 6 C-0.8 1.5 -1.5 0.8 -6 0 C-1.5 -0.8 -0.8 -1.5 0 -6 Z';

function Sparkle({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return <Path d={SPARKLE} fill={fill} transform={`translate(${x} ${y}) scale(${s})`} />;
}

type Step = { x: number; y: number; rot: number; opacity: number; side: 1 | -1 };

// Camino de `count` huellas de `from` a `to`, alternando pie derecho e izquierdo a los lados de la línea y
// subiendo de opacidad hacia el destino. La punta de cada huella mira hacia donde se camina.
function trail(from: [number, number], to: [number, number], count: number): Step[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const rot = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const nx = -dy / len;
  const ny = dx / len;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 1 : i / (count - 1);
    const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
    return {
      x: from[0] + dx * t + nx * 7 * side,
      y: from[1] + dy * t + ny * 7 * side,
      rot,
      opacity: 0.32 + 0.6 * t,
      side,
    };
  });
}

// Las huellas son las del logo de Camina (el pie derecho lleva el corazón), en PNG para que sean idénticas a la marca.
const PIES = {
  mint: { izq: require('@/../assets/pie-izq-mint.png'), der: require('@/../assets/pie-der-mint.png') },
  aqua: { izq: require('@/../assets/pie-izq-aqua.png'), der: require('@/../assets/pie-der-aqua.png') },
};
const PIE_ALTO = 30;
const PIE_ANCHO = { izq: (PIE_ALTO * 80) / 168, der: (PIE_ALTO * 86) / 163 };

function Footprints({ steps, tono }: { steps: Step[]; tono: 'mint' | 'aqua' }) {
  return (
    <>
      {steps.map((st, i) => {
        const lado = st.side === 1 ? 'der' : 'izq';
        const w = PIE_ANCHO[lado];
        return (
          <Image
            key={i}
            source={PIES[tono][lado]}
            accessible={false}
            style={{ position: 'absolute', left: st.x - w / 2, top: st.y - PIE_ALTO / 2, width: w, height: PIE_ALTO, opacity: st.opacity, transform: [{ rotate: `${st.rot}deg` }] }}
          />
        );
      })}
    </>
  );
}

export function EmptyIllustration({ kind }: { kind: Illustration }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const floor = dark ? 'rgba(0,0,0,0.42)' : 'rgba(91,49,163,0.13)';
  const haloColor = kind === 'puntos' ? colors.mint : '#A672E8';
  const tono = dark ? 'mint' : 'aqua';
  const spark = dark ? '#FFFFFF' : colors.purple;

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: W, height: H, marginBottom: 6 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={haloColor} stopOpacity={dark ? 0.3 : 0.22} />
            <Stop offset="1" stopColor={haloColor} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="purple" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B88AF2" />
            <Stop offset="1" stopColor="#6A3CB5" />
          </LinearGradient>
          <LinearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dark ? '#3A2D5A' : '#FFFFFF'} />
            <Stop offset="1" stopColor={dark ? '#2A2040' : '#EAE0FA'} />
          </LinearGradient>
        </Defs>
        <Circle cx={kind === 'puntos' ? 118 : 100} cy={54} r={62} fill="url(#halo)" />
        <Ellipse cx={kind === 'puntos' ? 112 : 96} cy={112} rx={44} ry={6} fill={floor} />

        {kind === 'eventos' && (
          <G transform="translate(66 22) rotate(6 32 34)">
            <Rect x={0} y={8} width={64} height={60} rx={14} fill="url(#paper)" stroke={dark ? 'rgba(255,255,255,0.25)' : 'rgba(91,49,163,0.25)'} strokeWidth={1} />
            <Path d="M14 8 H50 A14 14 0 0 1 64 22 V30 H0 V22 A14 14 0 0 1 14 8 Z" fill="url(#purple)" />
            <Rect x={14} y={1} width={7} height={15} rx={3.5} fill={dark ? '#F0EBFA' : '#6A3CB5'} />
            <Rect x={43} y={1} width={7} height={15} rx={3.5} fill={dark ? '#F0EBFA' : '#6A3CB5'} />
            <Rect x={13} y={38} width={38} height={21} rx={7} fill="none" stroke="#A672E8" strokeWidth={1.4} strokeDasharray="4 3" />
            <Sparkle x={70} y={12} s={1.2} fill={colors.mint} />
          </G>
        )}

        {kind === 'avisos' && (
          <G transform="translate(66 20)">
            <Path d="M30 6 C18 6 12 16 12 30 L12 42 C12 47 8 50 4 54 L56 54 C52 50 48 47 48 42 L48 30 C48 16 42 6 30 6 Z" fill="url(#purple)" />
            <Path d="M20 14 C16 18 15 24 15 30" stroke="rgba(255,255,255,0.55)" strokeWidth={2.4} strokeLinecap="round" fill="none" />
            <Circle cx={30} cy={5} r={3.5} fill="#6A3CB5" />
            <Path d="M22 58 A8 8 0 0 0 38 58 Z" fill="#6A3CB5" />
            <Path d="M70 6 A11 11 0 1 0 78 24 A9 9 0 1 1 70 6 Z" fill={dark ? '#F0EBFA' : '#FFFFFF'} stroke={dark ? 'none' : 'rgba(91,49,163,0.25)'} strokeWidth={0.8} />
            <Sparkle x={-10} y={14} s={0.9} fill={colors.mint} />
            <Sparkle x={-16} y={42} s={0.6} fill={spark} />
          </G>
        )}

        {kind === 'puntos' && (
          <G>
            <Circle cx={134} cy={46} r={34} fill="none" stroke={colors.mint} strokeOpacity={dark ? 0.55 : 0.7} strokeWidth={3} />
            <Sparkle x={166} y={16} s={1} fill={spark} />
          </G>
        )}
      </Svg>

      {kind === 'eventos' && <Footprints steps={trail([20, 100], [48, 70], 3)} tono={tono} />}
      {kind === 'puntos' && <Footprints steps={trail([20, 102], [84, 56], 4)} tono={tono} />}

      {kind === 'puntos' && (
        <Image source={require('@/../assets/camina-coin.png')} accessible={false} style={{ position: 'absolute', left: 104, top: 16, width: 60, height: 60, borderRadius: 30 }} />
      )}
    </View>
  );
}
