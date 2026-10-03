import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { paletteFor } from '@/components/ui/backgrounds';

// Fondo de toda la app: degradé de base y, encima, luces radiales muy suaves (Perlado).
export function AmbientBackground() {
  const dark = useColorScheme().colorScheme === 'dark';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = paletteFor(dark);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={p.base} start={{ x: 0, y: 0 }} end={p.end ?? { x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          {p.glows.map((g, i) => (
            <RadialGradient key={i} id={`${uid}g${i}`} cx={g.x} cy={g.y} r={g.r} fx={g.x} fy={g.y}>
              <Stop offset="0" stopColor={g.c} stopOpacity={g.a} />
              <Stop offset="1" stopColor={g.c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {p.glows.map((g, i) => (
          <Rect key={i} x="0" y="0" width="100" height="100" fill={`url(#${uid}g${i})`} />
        ))}
      </Svg>
    </View>
  );
}
