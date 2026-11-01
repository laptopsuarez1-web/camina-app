import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Corona dibujada para Camina: tres puntas con bolitas, banda y tres joyas. `color` es el dorado de la superficie
// (claro u oscuro); `jewel` es el color de las joyas (el fondo sobre el que va, para que parezcan caladas).
export function CrownMark({ size = 28, color = '#F5C645', jewel = '#2A1A3A' }: { size?: number; color?: string; jewel?: string }) {
  const h = (size * 38) / 48;
  return (
    <Svg width={size} height={h} viewBox="0 0 48 38">
      <Defs>
        <LinearGradient id="crownShine" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M5 30 L3 11 L15 21 L24 6 L33 21 L45 11 L43 30 Z" fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M5 30 L3 11 L15 21 L24 6 L33 21 L45 11 L43 30 Z" fill="url(#crownShine)" />
      <Circle cx={3} cy={9} r={3.2} fill={color} />
      <Circle cx={24} cy={4.4} r={3.4} fill={color} />
      <Circle cx={45} cy={9} r={3.2} fill={color} />
      <Rect x={5} y={30.5} width={38} height={6.5} rx={3} fill={color} />
      <Rect x={5} y={30.5} width={38} height={6.5} rx={3} fill="url(#crownShine)" />
      <Circle cx={14} cy={33.7} r={1.7} fill={jewel} />
      <Circle cx={24} cy={33.7} r={1.7} fill={jewel} />
      <Circle cx={34} cy={33.7} r={1.7} fill={jewel} />
    </Svg>
  );
}
