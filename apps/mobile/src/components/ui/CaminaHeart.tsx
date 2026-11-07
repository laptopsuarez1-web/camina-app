import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Corazón de Camina (favoritos): degradé menta → aqua de la marca, con un brillo arriba. Apagado: solo el contorno.
export function CaminaHeart({ size = 16, on = true, stroke = '#1F7A66' }: { size?: number; on?: boolean; stroke?: string }) {
  const d = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Defs>
        <LinearGradient id="ch" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7DF7C4" />
          <Stop offset="1" stopColor="#1FB89A" />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={on ? 'url(#ch)' : 'none'} stroke={on ? '#0E5E4E' : stroke} strokeWidth={1.6} strokeLinejoin="round" />
      {on ? <Path d="M6.4 7.2c-1.3.3-2 1.5-1.8 2.8" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.4} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );
}
