import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, RadialGradient, Stop, Path, Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { paletteFor, WAVES_VIEWBOX } from '@/components/ui/backgrounds';
import { useGlassStore } from '@/store/useGlassStore';
import { crystal } from '@/components/ui/glassMath';

// Fondo de toda la app: degradé de base casi blanco y, anclado abajo, tres olas suaves (Olas).
// Con el vidrio en el tramo Cristal aparecen manchas de color suaves y las olas se avivan, para que se vea a través de las tarjetas.
// `dark` fija el modo (el onboarding va siempre en claro); sin él sigue el modo de la app.
export function AmbientBackground({ dark: forced }: { dark?: boolean } = {}) {
  const scheme = useColorScheme().colorScheme === 'dark';
  const dark = forced ?? scheme;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = paletteFor(dark);
  const k = crystal(useGlassStore((s) => s.amount));
  const waveBoost = 1 + 1.2 * k;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={p.base} start={{ x: 0, y: 0 }} end={p.end ?? { x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${WAVES_VIEWBOX.w} ${WAVES_VIEWBOX.h}`} preserveAspectRatio="xMidYMax slice" style={StyleSheet.absoluteFill}>
        <Defs>
          {p.waves.map((w, i) => (
            <SvgGradient key={i} id={`${uid}w${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={w.c} stopOpacity={Math.min(1, w.a[0] * waveBoost)} />
              <Stop offset="1" stopColor={w.c} stopOpacity={Math.min(1, w.a[1] * waveBoost)} />
            </SvgGradient>
          ))}
          {k > 0 &&
            p.aura.map((a, i) => (
              <RadialGradient key={i} id={`${uid}a${i}`} cx={a.cx} cy={a.cy} r={a.r} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={a.c} stopOpacity={a.a * k} />
                <Stop offset="1" stopColor={a.c} stopOpacity={0} />
              </RadialGradient>
            ))}
        </Defs>
        {k > 0 && p.aura.map((a, i) => <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} fill={`url(#${uid}a${i})`} />)}
        {p.waves.map((w, i) => (
          <Path key={i} d={w.d} fill={`url(#${uid}w${i})`} />
        ))}
      </Svg>
    </View>
  );
}
