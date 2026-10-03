import { useEffect, useRef, useState } from 'react';
import { View, PanResponder, type LayoutChangeEvent, type AccessibilityActionEvent } from 'react-native';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';

const THUMB = 28;
const TRACK = 6;

// Deslizador de 0 a 1 sin dependencias nativas: anda igual en iOS, Android y web.
export function GlassSlider({
  value, onChange, onDone, label,
}: { value: number; onChange: (v: number) => void; onDone?: () => void; label: string }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startX = useRef(0);
  const cbs = useRef({ onChange, onDone });
  useEffect(() => {
    cbs.current = { onChange, onDone };
  });

  // Los refs solo se leen dentro de los gestos (no al dibujar); la regla no distingue el inicializador.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        const span = Math.max(1, widthRef.current - THUMB);
        cbs.current.onChange(Math.min(1, Math.max(0, (e.nativeEvent.locationX - THUMB / 2) / span)));
      },
      onPanResponderMove: (e, g) => {
        const span = Math.max(1, widthRef.current - THUMB);
        const x = startX.current + g.dx;
        cbs.current.onChange(Math.min(1, Math.max(0, (x - THUMB / 2) / span)));
      },
      onPanResponderRelease: () => cbs.current.onDone?.(),
      onPanResponderTerminate: () => cbs.current.onDone?.(),
    }),
  );

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };
  const left = value * Math.max(0, width - THUMB);
  const step = (dir: 1 | -1) => {
    cbs.current.onChange(Math.min(1, Math.max(0, Math.round((value + dir * 0.1) * 10) / 10)));
    cbs.current.onDone?.();
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)} por ciento` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      onLayout={onLayout}
      style={{ height: 44, justifyContent: 'center' }}
      {...pan.panHandlers}
    >
      <View style={{ height: TRACK, borderRadius: TRACK / 2, backgroundColor: dark ? 'rgba(179,166,214,0.22)' : 'rgba(110,92,143,0.2)' }} />
      <View style={{ position: 'absolute', left: THUMB / 2, height: TRACK, width: left, borderRadius: TRACK / 2, backgroundColor: colors.aquaDeep }} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(41,28,71,0.12)',
          shadowColor: '#291C47', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
        }}
      />
    </View>
  );
}
