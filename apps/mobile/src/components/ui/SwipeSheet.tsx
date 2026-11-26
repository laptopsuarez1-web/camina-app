import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Modal, PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from '@/components/ui/Press';
import { useLatest } from '@/hooks/useLatest';

// Hoja inferior oscura (Horarios, insignia del local):
// - el fondo oscuro aparece suave en su lugar; solo la hoja sube (antes el Modal subía el fondo junto con la hoja y se veía
//   una franja opaca subiendo hasta arriba);
// - la lista adentro se desliza (la ScrollView puede encogerse; sin eso quedaba más alta que la hoja, cortada y sin deslizar);
// - se cierra deslizando hacia abajo desde la manija, jalando la lista hacia abajo estando arriba, o tocando el fondo.
const H = Dimensions.get('window').height;

export function SwipeSheet({ visible, onClose, children, maxHeight = '86%' }: { visible: boolean; onClose: () => void; children: ReactNode; maxHeight?: `${number}%` }) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(H));
  const [fade] = useState(() => new Animated.Value(0));
  const closeRef = useLatest(onClose);

  useEffect(() => {
    if (!visible) return;
    y.setValue(H);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [visible, y, fade]);

  const dismissRef = useLatest(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(y, { toValue: H, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => closeRef.current());
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
        {/* El fondo es hermano de la hoja (no su padre): así la lista recibe el gesto de deslizar sin que el toque del fondo se lo quite. */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar" feedback="none" onPress={() => dismissRef.current()} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,10,30,0.55)' }]} />
        </Animated.View>
        <Animated.View style={{ maxHeight, transform: [{ translateY: y }] }}>
          <View style={{ flexShrink: 1, backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: insets.bottom + 12 }}>
            <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Cerrar. Desliza hacia abajo o toca dos veces" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => dismissRef.current()} style={{ paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center' }} />
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
