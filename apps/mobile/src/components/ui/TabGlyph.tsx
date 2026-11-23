import { useEffect, useRef, type ComponentType } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Calendar, ChartBar, Home, ShoppingBag, Users, type IconProps } from '@/components/icons';

// Íconos de la barra de abajo: los símbolos nativos (SF Symbols en iPhone, Material en Android) en el color que manda la barra;
// la pestaña activa va rellena.
// Al tocar, el ícono se achica apenas y vuelve: un gesto corto y sobrio.
export type TabKind = 'home' | 'activity' | 'groups' | 'events' | 'canjes';

const ICON: Record<TabKind, ComponentType<IconProps>> = {
  home: Home,
  activity: ChartBar,
  groups: Users,
  events: Calendar,
  canjes: ShoppingBag,
};

// `tick` sube cada vez que se toca la pestaña (también si ya estaba activa).
export function TabGlyph({ kind, color, focused, tick = 0, size = 26 }: { kind: TabKind; color: string; focused: boolean; tick?: number; size?: number }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    s.value = withSequence(withTiming(0.86, { duration: 110, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [tick, reduced, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const Icon = ICON[kind];
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={a}>
        <Icon size={size} color={color} weight={focused ? 'fill' : 'regular'} />
      </Animated.View>
    </View>
  );
}
