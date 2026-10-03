import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';
import { useGlassStore } from '@/store/useGlassStore';

// Fondo con manchas de color suaves detrás de todo: el vidrio de tarjetas y de la barra
// necesita algo de color detrás para notarse (sobre un fondo liso se ve como una tarjeta blanca).
// Cada mancha es una pila de círculos casi transparentes, que da un degradé redondo sin imágenes.
function Blob({ x, y, size, color, alpha }: { x: number; y: number; size: number; color: string; alpha: number }) {
  const steps = 9;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      {Array.from({ length: steps }).map((_, i) => {
        const d = size * (1 - i / steps);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (size - d) / 2,
              top: (size - d) / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity: alpha,
            }}
          />
        );
      })}
    </View>
  );
}

export function AmbientBackground() {
  const dark = useColorScheme().colorScheme === 'dark';
  const level = useGlassStore((s) => s.level);
  const { width, height } = useWindowDimensions();
  // En "Sólido" no hay vidrio, así que no hace falta fondo con color.
  if (level === 0) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colors.dark.bg : colors.light.bg }]} />;
  const k = level === 2 ? 1.25 : 1;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colors.dark.bg : colors.light.bg, overflow: 'hidden' }]}>
      {dark ? (
        <>
          <Blob x={width * 0.9} y={height * 0.12} size={width * 1.1} color="#8B4FD1" alpha={0.05 * k} />
          <Blob x={width * 0.05} y={height * 0.55} size={width * 1.0} color="#4FC3A8" alpha={0.04 * k} />
          <Blob x={width * 0.85} y={height * 0.92} size={width * 0.9} color="#8B4FD1" alpha={0.045 * k} />
        </>
      ) : (
        <>
          <Blob x={width * 0.92} y={height * 0.1} size={width * 1.2} color="#B58AF0" alpha={0.07 * k} />
          <Blob x={width * 0.02} y={height * 0.5} size={width * 1.1} color="#7FEDC4" alpha={0.09 * k} />
          <Blob x={width * 0.9} y={height * 0.9} size={width * 1.0} color="#F7B98A" alpha={0.08 * k} />
        </>
      )}
    </View>
  );
}
