import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useConnectionStore } from '@/store/useConnectionStore';
import { colors } from '@/theme/tokens';

// Aviso fijo arriba cuando no hay internet. Se va solo cuando vuelve la conexión.
export function OfflineBanner() {
  const offline = useConnectionStore((s) => s.offline);
  const insets = useSafeAreaInsets();
  if (!offline) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0, alignItems: 'center', zIndex: 50 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.authBg, borderColor: 'rgba(255,178,122,0.55)', borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '92%' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warnSoft }} />
        <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Sin conexión. Te mostramos lo último guardado.</Text>
      </View>
    </Animated.View>
  );
}
