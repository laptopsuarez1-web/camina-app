import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

// Fondo con un degradé suave y parejo (sin manchas ni círculos): le da color al vidrio de las
// tarjetas y de la barra de abajo sin ensuciar la pantalla.
const LIGHT = ['#DDF8EC', '#F1EEFF', '#D9C9FA'] as const;
const DARK = ['#14262A', '#1B1530', '#34206B'] as const;

export function AmbientBackground() {
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <LinearGradient
      pointerEvents="none"
      colors={dark ? DARK : LIGHT}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
