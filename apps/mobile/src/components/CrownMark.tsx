import { useId } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Corona propia de Camina, hermana del trofeo (mismo dorado con degradé, mismo brillo y las huellas del logo adentro).
// Es un dibujo de colores fijos, como el trofeo: sirve igual en claro y en oscuro.
export function CrownMark({ size = 40 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const k = size / 64;
  const foot = (x: number, y: number, left: boolean) => (
    <Image
      source={left ? require('@/../assets/pie-izq-mint.png') : require('@/../assets/pie-der-mint.png')}
      accessible={false}
      resizeMode="contain"
      style={{ position: 'absolute', left: x * k, top: y * k, width: 6.4 * k, height: 12.8 * k, tintColor: '#FFF6D2', opacity: 0.95 }}
    />
  );
  return (
    <View style={{ width: size, height: size * 0.75 }}>
      <Svg width={size} height={size * 0.75} viewBox="0 0 64 48">
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE27A" />
            <Stop offset="1" stopColor="#E9A21C" />
          </LinearGradient>
          <LinearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F2B63A" />
            <Stop offset="1" stopColor="#C98512" />
          </LinearGradient>
        </Defs>
        <Path d="M10 36 L6.5 15 L20.5 27 L32 8 L43.5 27 L57.5 15 L54 36 Z" fill={`url(#${id}g)`} stroke={`url(#${id}g)`} strokeWidth={4} strokeLinejoin="round" />
        <Path d="M13 34 L10 19 L16 24.5 L16 34 Z" fill="#FFFFFF" opacity={0.3} />
        <Circle cx={6} cy={12.5} r={4.2} fill={`url(#${id}g)`} />
        <Circle cx={32} cy={5.5} r={4.6} fill={`url(#${id}g)`} />
        <Circle cx={58} cy={12.5} r={4.2} fill={`url(#${id}g)`} />
        <Rect x={9} y={37} width={46} height={8} rx={3.5} fill={`url(#${id}d)`} />
        <Circle cx={20} cy={41} r={1.6} fill="#FFF6D2" opacity={0.8} />
        <Circle cx={32} cy={41} r={1.6} fill="#FFF6D2" opacity={0.8} />
        <Circle cx={44} cy={41} r={1.6} fill="#FFF6D2" opacity={0.8} />
      </Svg>
      {foot(24.6, 21.5, true)}
      {foot(33, 23.5, false)}
    </View>
  );
}
