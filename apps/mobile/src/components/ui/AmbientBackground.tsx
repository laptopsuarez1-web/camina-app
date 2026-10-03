import { View, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';

// Fondo liso detrás de todas las pantallas (sin manchas de color).
export function AmbientBackground() {
  const dark = useColorScheme().colorScheme === 'dark';
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colors.dark.bg : colors.light.bg }]} />;
}
