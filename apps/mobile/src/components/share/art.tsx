import { useId } from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle } from 'react-native-svg';

// Ilustraciones propias para las láminas del mes (trofeo y llama). Son dibujos planos con degradé, sin bordes, para que se
// vean parejos con las monedas y las huellas de Camina.

export function FlameArt({ size = 64 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`${id}o`} x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor="#FFB84D" />
          <Stop offset="1" stopColor="#F0562B" />
        </LinearGradient>
        <LinearGradient id={`${id}i`} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#FFF0A6" />
          <Stop offset="1" stopColor="#FFC447" />
        </LinearGradient>
      </Defs>
      <Path d="M33 3C35 15 51 23 51 40C51 52.5 43 61 32 61C21 61 13 52.5 13 40C13 31 18 26 21 19C22.5 24 25 27 28.5 28C27 19 28 9 33 3Z" fill={`url(#${id}o)`} />
      <Path d="M32 29C34.5 36 42 39 42 47C42 53.5 37.5 58 32 58C26.5 58 22 53.5 22 47C22 41.5 26 39 28.5 34.5C29.5 37 31 38.5 33 39C31.5 36 31 32.5 32 29Z" fill={`url(#${id}i)`} />
    </Svg>
  );
}

export function TrophyArt({ size = 64 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const k = size / 64;
  const foot = (x: number, y: number, src: number) => (
    <Image
      source={src === 0 ? require('@/../assets/pie-izq-mint.png') : require('@/../assets/pie-der-mint.png')}
      accessible={false}
      resizeMode="contain"
      style={{ position: 'absolute', left: x * k, top: y * k, width: 9.5 * k, height: 19 * k, tintColor: '#FFF6D2', opacity: 0.95 }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 64 64">
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
      <Path d="M17 14H9V19C9 26 13.5 30.5 20 31.5" stroke={`url(#${id}d)`} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M47 14H55V19C55 26 50.5 30.5 44 31.5" stroke={`url(#${id}d)`} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M16 7H48V26C48 36 41 42.5 32 42.5C23 42.5 16 36 16 26Z" fill={`url(#${id}g)`} />
      <Path d="M21 12H26V26C26 30 24.5 33 22.5 34.5C21.2 32.4 21 29 21 26Z" fill="#FFFFFF" opacity={0.35} />
      <Rect x={28.5} y={42} width={7} height={8} fill={`url(#${id}d)`} />
      <Rect x={19} y={49} width={26} height={8} rx={3} fill={`url(#${id}d)`} />
      <Circle cx={32} cy={53} r={1.6} fill="#FFF6D2" opacity={0.8} />
    </Svg>
    {/* Las huellas del logo de Camina, en lugar de la estrella. */}
    {foot(22.5, 13, 0)}
    {foot(32.5, 17, 1)}
    </View>
  );
}
