import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { paletteFor, WAVES_VIEWBOX } from '@/components/ui/backgrounds';
import { useGlassStore } from '@/store/useGlassStore';
import { crystal } from '@/components/ui/glassMath';

// Fondo de toda la app: degradé de base casi blanco y, anclado abajo, tres olas suaves (Olas).
// Con el vidrio en el tramo Cristal las olas se avivan apenas, para que se note el vidrio sin cambiar el fondo.
// `dark` fija el modo (el onboarding va siempre en claro); sin él sigue el modo de la app.
export function AmbientBackground({ dark: forced }: { dark?: boolean } = {}) {
  const scheme = useColorScheme().colorScheme === 'dark';
  const dark = forced ?? scheme;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = paletteFor(dark);
  const k = crystal(useGlassStore((s) => s.amount));
  const waveBoost = 1 + 0.35 * k;
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
        </Defs>
        {p.waves.map((w, i) => (
          <Path key={i} d={w.d} fill={`url(#${uid}w${i})`} />
        ))}
      </Svg>
    </View>
  );
}
