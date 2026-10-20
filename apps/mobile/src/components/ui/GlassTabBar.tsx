import { useEffect, useState } from 'react';
import { View, Pressable, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';
import { buzz } from '@/lib/haptics';
import { useGlassStore } from '@/store/useGlassStore';
import { paletteFor } from '@/components/ui/backgrounds';
import { barFill, blurWeb, glassOn } from '@/components/ui/glassMath';

// Barra de pestañas al estilo iOS: una cápsula de vidrio que flota sobre el contenido,
// con la pestaña activa en una pastilla y teñida del verde de Camina.
// En iOS 26 usa el vidrio líquido del sistema; en iOS anterior, desenfoque; en Android y web, un relleno translúcido.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string; href?: string | null; tabBarItemStyle?: unknown; tabBarStyle?: { display?: string }; tabBarIcon?: (p: { focused: boolean; color: string; size: number; tick?: number }) => React.ReactNode } }>;
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const BAR_HEIGHT = 64;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Espacio que tiene que dejar abajo cada pantalla con barra, porque la barra flota encima del contenido.
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + (Platform.OS === 'android' ? insets.bottom + 12 : Math.max(insets.bottom, 12)) + 24;
}

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

// Pastilla de la pestaña activa: una sola vista que se desliza de una pestaña a otra (resorte de unos 280 ms).
// Con "reducir movimiento" salta sin animar.
function ActivePill({ position, count, dark }: { position: number; count: number; dark: boolean }) {
  const [trackW, setTrackW] = useState(0);
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const itemW = count > 0 ? trackW / count : 0;
  useEffect(() => {
    if (!itemW) return;
    const to = position * itemW;
    x.value = reduced ? to : withSpring(to, { damping: 22, stiffness: 260 });
  }, [position, itemW, reduced, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="none" onLayout={(e) => setTrackW(e.nativeEvent.layout.width)} style={{ position: 'absolute', left: 4, right: 4, top: 4, bottom: 4 }}>
      <Animated.View
        style={[
          { width: itemW || undefined, height: '100%', borderRadius: (BAR_HEIGHT - 8) / 2, backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(41,28,71,0.07)', opacity: itemW ? 1 : 0 },
          style,
        ]}
      />
    </View>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const amount = useGlassStore((s) => s.amount);
  const insets = useSafeAreaInsets();
  // Cuántas veces se tocó cada pestaña: el ícono reacciona en cada toque (también si ya estaba activa).
  const [taps, setTaps] = useState<Record<string, number>>({});

  // Algunas pantallas (crear desafío, chat del grupo) ocultan la barra para ir a pantalla completa.
  if (descriptors[state.routes[state.index]?.key]?.options.tabBarStyle?.display === 'none') return null;

  // Las pantallas sin pestaña (perfil, puntos, avisos, detalle de grupo) se declaran con href: null;
  // expo-router las convierte en tabBarItemStyle { display: 'none' }, así que se filtran acá.
  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => {
      const { options } = descriptors[route.key];
      const itemStyle = StyleSheet.flatten(options.tabBarItemStyle as never) as { display?: string } | undefined;
      return options.href !== null && itemStyle?.display !== 'none';
    });

  const solid = !glassOn(amount);
  const capsule: ViewStyle = {
    minHeight: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(255,255,255,0.16)' : solid ? 'rgba(41,28,71,0.08)' : 'rgba(255,255,255,0.8)',
  };
  // Relleno cuando no hay vidrio del sistema: más denso en Android, donde no hay desenfoque.
  const fill = barFill(amount, dark, Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios', paletteFor(dark).tint);

  const items = (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
      <ActivePill position={Math.max(0, visible.findIndex(({ index }) => index === state.index))} count={visible.length} dark={dark} />
      {visible.map(({ route, index }, position) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        // Activa en verde de Camina (pasa 4.5:1 en los dos modos); el resto en gris violáceo (trazo), como en iOS.
        const color = focused ? (dark ? colors.mint : colors.aquaDeep) : dark ? colors.dark.muted : colors.light.muted;
        // La etiqueta activa va en verde de texto (aquaInk): aquaDeep no llega a 4,5:1 sobre el vidrio. El ícono queda en aquaDeep.
        const labelColor = focused ? (dark ? colors.mint : colors.aquaInk) : color;
        const Icon = options.tabBarIcon;
        const title = typeof options.title === 'string' ? options.title : route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={`${title}, pestaña ${position + 1} de ${visible.length}`}
            accessibilityState={{ selected: focused }}
            aria-selected={focused}
            onPress={() => {
              setTaps((t) => ({ ...t, [route.key]: (t[route.key] ?? 0) + 1 }));
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                buzz.selection();
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: BAR_HEIGHT - 8,
              borderRadius: (BAR_HEIGHT - 8) / 2,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              paddingHorizontal: 2,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
              {Icon ? <Icon focused={focused} color={color} size={26} tick={taps[route.key] ?? 0} /> : null}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1} style={{ fontSize: 11.5, color: labelColor, fontWeight: focused ? '700' : '500', letterSpacing: -0.1 }}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const [vr, vg, vb] = hexToRgb(paletteFor(dark).base[2]);
  // En Android el botón/gestos del sistema ocupan insets.bottom: la barra va por encima con aire, sin restarle nada.
  const bottomPad = Platform.OS === 'android' ? insets.bottom + 12 : Math.max(insets.bottom - 6, 12);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Platform.OS === 'android' ? 12 : 18, paddingBottom: bottomPad }}
    >
      {/* Velo inferior: el contenido se desvanece antes de llegar a la barra y no se ven textos "fantasma" detrás de las etiquetas. */}
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(${vr},${vg},${vb},0)`, `rgba(${vr},${vg},${vb},0.94)`]}
        locations={[0, 0.55]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_HEIGHT + bottomPad + 56 }}
      />
      <View
        style={{
          borderRadius: BAR_HEIGHT / 2,
          shadowColor: '#140C24',
          shadowOpacity: Platform.OS === 'ios' ? (dark ? 0.45 : 0.16) : 0,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 0,
          ...(Platform.OS === 'web' ? ({ boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(41,28,71,0.14)' } as object) : null),
        }}
      >
        {liquidGlass && !solid ? (
          <GlassView glassEffectStyle="regular" isInteractive colorScheme={dark ? 'dark' : 'light'} tintColor={dark ? undefined : `rgba(${(paletteFor(dark).tint ?? [167, 139, 250]).join(',')},${(0.22 * amount).toFixed(3)})`} style={capsule}>
            {items}
          </GlassView>
        ) : (
          <View
            style={[
              capsule,
              { backgroundColor: Platform.OS === 'ios' && !solid ? 'transparent' : fill },
              // En web el navegador desenfoca lo que pasa por debajo, como el vidrio de iOS.
              Platform.OS === 'web' && !solid ? ({ backdropFilter: blurWeb(amount), WebkitBackdropFilter: blurWeb(amount) } as object) : null,
            ]}
          >
            {Platform.OS === 'ios' && !solid && (
              <>
                <BlurView intensity={60} tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(34,25,51,0.25)' : 'rgba(255,255,255,0.25)' }]} />
              </>
            )}
            {items}
          </View>
        )}
      </View>
    </View>
  );
}
