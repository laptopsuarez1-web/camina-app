import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Modal, PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '@/components/ui/Press';
import { useLatest } from '@/hooks/useLatest';

// Hoja inferior oscura (Horarios, insignia del local):
// - sin capa oscura encima de la pantalla: solo aparece la hoja (con una sombra para despegarla); tocar afuera la cierra;
// - la lista adentro se desliza (la ScrollView puede encogerse; sin eso quedaba más alta que la hoja, cortada y sin deslizar);
// - se cierra deslizando hacia abajo desde la manija, jalando la lista hacia abajo estando arriba, o tocando el fondo.
const H = Dimensions.get('window').height;

export function SwipeSheet({
  visible,
  onClose,
  children,
  maxHeight = '86%',
  background = '#1d1729',
  handleColor = '#5c4f80',
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: `${number}%`;
  background?: string;
  handleColor?: string;
}) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(H));
  const closeRef = useLatest(onClose);

  useEffect(() => {
    if (!visible) return;
    y.setValue(H);
    Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, y]);

  const dismissRef = useLatest(() => {
    Animated.timing(y, { toValue: H, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => closeRef.current());
  });

  // eslint-disable-next-line react-hooks/refs -- las refs solo se leen al arrastrar, no al dibujar
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80 || g.vy > 0.8) dismissRef.current();
        else Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => dismissRef.current()}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Zona transparente para cerrar tocando afuera. Es hermana de la hoja (no su padre): así la lista recibe el gesto de deslizar. */}
        <Press accessibilityRole="button" accessibilityLabel="Cerrar" feedback="none" onPress={() => dismissRef.current()} style={StyleSheet.absoluteFill} />
        <Animated.View style={{ maxHeight, transform: [{ translateY: y }] }}>
          <View
            style={{
              flexShrink: 1,
              backgroundColor: background,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingBottom: insets.bottom + 12,
              shadowColor: '#120a1e',
              shadowOpacity: 0.28,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -6 },
              elevation: 24,
            }}
          >
            <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Cerrar. Desliza hacia abajo o toca dos veces" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => dismissRef.current()} style={{ paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: handleColor, alignSelf: 'center' }} />
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              bounces
              scrollEventThrottle={16}
              onScrollEndDrag={(e) => { if (e.nativeEvent.contentOffset.y < -70) dismissRef.current(); }}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
