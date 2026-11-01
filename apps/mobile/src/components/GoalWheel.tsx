import { useRef, useState } from 'react';
import { View, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { MIN_DAILY_GOAL } from '@/constants/business-rules';

export const GOAL_STEP = 500;
export const GOAL_MAX = 30000;
export const GOAL_VALUES = Array.from({ length: (GOAL_MAX - MIN_DAILY_GOAL) / GOAL_STEP + 1 }, (_, i) => MIN_DAILY_GOAL + i * GOAL_STEP);

const ROW = 52;
const VISIBLE = 5; // filas a la vista: la del medio es la elegida

/** Valor de la lista más cercano al que se pide (una meta guardada puede no ser múltiplo de 500). */
export function nearestGoalIndex(v: number): number {
  const i = Math.round((v - MIN_DAILY_GOAL) / GOAL_STEP);
  return Math.max(0, Math.min(GOAL_VALUES.length - 1, i));
}

// Ruedita de pasos por día, como el temporizador del reloj de Apple: se desliza y se frena en cada valor.
export function GoalWheel({ index, onIndex, dark }: { index: number; onIndex: (i: number) => void; dark: boolean }) {
  const last = useRef(index);
  const wheel = useRef<ScrollView>(null);
  const placed = useRef(false);
  const [start] = useState(index);
  const pad = ((VISIBLE - 1) / 2) * ROW;
  const ink = dark ? '#fff' : colors.light.text;
  const value = GOAL_VALUES[index];

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(GOAL_VALUES.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (i !== last.current) {
      last.current = i;
      onIndex(i);
      buzz.selection();
    }
  }

  // Tocar un valor lo elige y lleva la ruedita hasta ahí: además de deslizar, siempre hay otra forma de cambiarlo.
  function jumpTo(i: number) {
    if (i === last.current) return;
    last.current = i;
    onIndex(i);
    buzz.selection();
    wheel.current?.scrollTo({ y: i * ROW, animated: true });
  }

  return (
    <View style={{ height: ROW * VISIBLE, overflow: 'hidden' }}>
      {/* Franja de la fila elegida, como en el reloj del teléfono */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: pad, height: ROW, borderRadius: 16, backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(41,28,71,0.07)' }} />
      <ScrollView
        accessibilityRole="adjustable"
        accessibilityLabel="Meta de pasos por día"
        accessibilityValue={{ text: `${value.toLocaleString('es-BO')} pasos` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const i = e.nativeEvent.actionName === 'increment' ? Math.min(GOAL_VALUES.length - 1, index + 1) : Math.max(0, index - 1);
          last.current = i;
          onIndex(i);
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        ref={wheel}
        // contentOffset solo funciona en iOS: en Android y web la ruedita se lleva al valor inicial apenas se mide.
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          requestAnimationFrame(() => wheel.current?.scrollTo({ y: start * ROW, animated: false }));
        }}
        contentOffset={{ x: 0, y: start * ROW }}
        contentContainerStyle={{ paddingVertical: pad }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {GOAL_VALUES.map((v, i) => {
          const d = Math.abs(i - index);
          return (
            <Press key={v} accessible={false} feedback="none" onPress={() => jumpTo(i)} style={{ height: ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Text style={{ color: ink, opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.25, fontSize: d === 0 ? 34 : 26, fontWeight: d === 0 ? '800' : '600', fontVariant: ['tabular-nums'] }}>
                {v.toLocaleString('es-BO')}
              </Text>
              {d === 0 ? <Text style={{ color: ink, fontSize: 17, fontWeight: '700' }}>pasos</Text> : null}
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}
