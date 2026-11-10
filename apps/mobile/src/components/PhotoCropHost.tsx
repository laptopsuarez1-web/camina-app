import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, BackHandler, Modal, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { colors } from '@/theme/tokens';
import { usePhotoCropStore, type CropRequest } from '@/store/usePhotoCropStore';

// Editor de foto: la persona mueve y hace zoom hasta que la foto quede como quiere dentro del marco, y recién ahí se guarda.
// Se muestra encima de todo (también de hojas abiertas), igual que los avisos de Camina.
function Layer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  if (Platform.OS === 'ios') return <FullWindowOverlay><View style={StyleSheet.absoluteFill}>{children}</View></FullWindowOverlay>;
  if (Platform.OS === 'android') return <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>{children}</Modal>;
  return <View style={[StyleSheet.absoluteFill, { position: 'fixed' as 'absolute', zIndex: 9999 }]}>{children}</View>;
}

const MAX_ZOOM = 5;

function Editor({ req }: { req: CropRequest }) {
  const finish = usePhotoCropStore((s) => s.finish);
  const insets = useSafeAreaInsets();
  const { width: sw, height: sh } = useWindowDimensions();
  const [busy, setBusy] = useState(false);

  // Marco: lo más grande que entre en pantalla con la proporción pedida.
  const maxW = sw - 32;
  const maxH = sh - insets.top - insets.bottom - 220;
  const fw = Math.min(maxW, maxH * req.aspect);
  const fh = fw / req.aspect;
  // Con zoom 1 la foto cubre justo el marco.
  const base = Math.max(fw / req.width, fh / req.height);
  const dw = req.width * base;
  const dh = req.height * base;

  const k = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const k0 = useSharedValue(1);
  const x0 = useSharedValue(0);
  const y0 = useSharedValue(0);

  const clamp = (v: number, lim: number) => {
    'worklet';
    return Math.min(lim, Math.max(-lim, v));
  };
  const fit = () => {
    'worklet';
    tx.value = clamp(tx.value, Math.max(0, (dw * k.value - fw) / 2));
    ty.value = clamp(ty.value, Math.max(0, (dh * k.value - fh) / 2));
  };

  const pan = Gesture.Pan()
    .onStart(() => { x0.value = tx.value; y0.value = ty.value; })
    .onUpdate((e) => {
      tx.value = x0.value + e.translationX;
      ty.value = y0.value + e.translationY;
      fit();
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { k0.value = k.value; })
    .onUpdate((e) => {
      k.value = Math.min(MAX_ZOOM, Math.max(1, k0.value * e.scale));
      fit();
    });
  const gesture = Gesture.Simultaneous(pan, pinch);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: k.value }],
  }));

  const zoomBy = (d: number) => {
    const nk = Math.min(MAX_ZOOM, Math.max(1, k.get() + d));
    k.set(nk);
    tx.set(clamp(tx.get(), Math.max(0, (dw * nk - fw) / 2)));
    ty.set(clamp(ty.get(), Math.max(0, (dh * nk - fh) / 2)));
  };

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const s = base * k.value; // px de pantalla por px de la foto
    const cw = Math.min(req.width, fw / s);
    const ch = Math.min(req.height, fh / s);
    const x = Math.min(req.width - cw, Math.max(0, req.width / 2 - tx.value / s - cw / 2));
    const y = Math.min(req.height - ch, Math.max(0, req.height / 2 - ty.value / s - ch / 2));
    await finish({ x, y, width: cw, height: ch });
  }

  const frameRadius = req.round ? fw / 2 : 14;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Text className="text-white text-center text-[17px] font-bold mt-2">{req.title}</Text>
        <Text className="text-white/70 text-center text-[13px] mt-1">Mueve la foto y pellizca para acercar</Text>
        <View className="flex-1 items-center justify-center">
          <GestureDetector gesture={gesture}>
            <View style={{ width: fw, height: fh, borderRadius: frameRadius, overflow: 'hidden', backgroundColor: '#000' }}>
              <Animated.View style={[{ width: fw, height: fh, alignItems: 'center', justifyContent: 'center' }, imgStyle]}>
                <Image source={{ uri: req.uri }} style={{ width: dw, height: dh }} contentFit="fill" />
              </Animated.View>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: frameRadius, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }]} />
            </View>
          </GestureDetector>
        </View>
        <View className="flex-row items-center justify-center mb-4" style={{ gap: 14 }}>
          <Press accessibilityRole="button" accessibilityLabel="Alejar" onPress={() => zoomBy(-0.4)} className="w-12 h-12 rounded-full bg-white/15 items-center justify-center">
            <Text className="text-white text-[26px] font-bold">−</Text>
          </Press>
          <Press accessibilityRole="button" accessibilityLabel="Acercar" onPress={() => zoomBy(0.4)} className="w-12 h-12 rounded-full bg-white/15 items-center justify-center">
            <Text className="text-white text-[26px] font-bold">+</Text>
          </Press>
        </View>
        <View className="flex-row px-5" style={{ gap: 12 }}>
          <Press accessibilityRole="button" accessibilityLabel="Cancelar" onPress={() => !busy && finish(null)} className="flex-1 rounded-2xl py-4 items-center bg-white/15">
            <Text className="text-white text-[16px] font-bold">Cancelar</Text>
          </Press>
          <Press accessibilityRole="button" accessibilityLabel="Usar esta foto" onPress={confirm} className="flex-1 rounded-2xl py-4 items-center" style={{ backgroundColor: colors.aquaDeep }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[16px] font-bold">Usar foto</Text>}
          </Press>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

export function PhotoCropHost() {
  const req = usePhotoCropStore((s) => s.request);
  const finish = usePhotoCropStore((s) => s.finish);
  useEffect(() => {
    if (!req || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { finish(null); return true; });
    return () => sub.remove();
  }, [req, finish]);
  if (!req) return null;
  return (
    <Layer onClose={() => finish(null)}>
      <Editor key={req.id} req={req} />
    </Layer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B10' },
});
