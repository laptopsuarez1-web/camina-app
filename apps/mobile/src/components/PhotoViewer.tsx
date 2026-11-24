import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { X } from '@/components/icons';

const MAX_ZOOM = 4;

// Una foto a pantalla completa: se ve ENTERA (sin recortes), se acerca con pellizco o doble toque y se mueve con el dedo.
function ZoomPhoto({ uri, width, height, onZoomed }: { uri: string; width: number; height: number; onZoomed: (z: boolean) => void }) {
  const k = useSharedValue(1);
  const k0 = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const x0 = useSharedValue(0);
  const y0 = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const setZ = (z: boolean) => {
    setZoomed(z);
    onZoomed(z);
  };
  const limit = () => {
    'worklet';
    const lx = (width * k.value - width) / 2;
    const ly = (height * k.value - height) / 2;
    tx.value = Math.min(lx, Math.max(-lx, tx.value));
    ty.value = Math.min(ly, Math.max(-ly, ty.value));
  };
  const reset = () => {
    'worklet';
    k.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    runOnJS(setZ)(false);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      k0.value = k.value;
    })
    .onUpdate((e) => {
      k.value = Math.min(MAX_ZOOM, Math.max(0.9, k0.value * e.scale));
      limit();
    })
    .onEnd(() => {
      if (k.value <= 1.02) reset();
      else runOnJS(setZ)(true);
    });
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onStart(() => {
      x0.value = tx.value;
      y0.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = x0.value + e.translationX;
      ty.value = y0.value + e.translationY;
      limit();
    });
  const doble = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (k.value > 1.05) reset();
      else {
        k.value = withTiming(2.5);
        runOnJS(setZ)(true);
      }
    });
  const gesture = Gesture.Simultaneous(pinch, pan, doble);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: k.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width, height }, estilo]}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// Visor de fotos del local (carta, catálogo, afiches): pantalla completa, deslizas entre fotos y haces zoom con pellizco.
export function PhotoViewer({ photos, index, onIndex, onClose }: { photos: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);
  const ref = useRef<FlatList<string>>(null);
  const alto = height - 130;
  // Deslizar hacia abajo para salir: la foto sigue al dedo y el fondo se desvanece. Solo funciona sin zoom, y no estorba
  // al deslizar de lado entre fotos (un movimiento horizontal cancela este gesto).
  const dy = useSharedValue(0);
  const cerrar = Gesture.Pan()
    .enabled(!zoomed)
    .activeOffsetY(14)
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      dy.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dy.value > 110 || e.velocityY > 900) {
        dy.value = withTiming(height, { duration: 180 }, () => runOnJS(onClose)());
      } else {
        dy.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });
  const fondo = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - dy.value / 420) }));
  const contenido = useAnimatedStyle(() => ({ transform: [{ translateY: dy.value }, { scale: Math.max(0.85, 1 - dy.value / 2400) }] }));
  return (
    <GestureHandlerRootView style={[StyleSheet.absoluteFill, { zIndex: 10, elevation: 10 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0B10' }, fondo]} />
      <GestureDetector gesture={cerrar}>
        <Animated.View style={[{ flex: 1 }, contenido]}>
      <View className="flex-row items-center justify-between px-5" style={{ paddingTop: 58, paddingBottom: 12 }}>
        <Press onPress={onClose} className="rounded-full items-center justify-center" style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.16)' }} accessibilityLabel="Cerrar las fotos">
          <X size={18} color="#fff" />
        </Press>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {Math.min(index + 1, photos.length)} de {photos.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        ref={ref}
        data={photos}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(index, photos.length - 1)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(u) => u}
        onMomentumScrollEnd={(e) => onIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <ZoomPhoto uri={item} width={width} height={alto} onZoomed={setZoomed} />}
      />
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, textAlign: 'center', paddingBottom: 34 }}>
        Pellizca o toca dos veces para acercar{photos.length > 1 ? ' · desliza para ver más' : ''}
      </Text>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
