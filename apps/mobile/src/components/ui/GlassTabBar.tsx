import { View, Text, Pressable, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';
import { useGlassStore } from '@/store/useGlassStore';

// Barra de pestañas al estilo iOS: una cápsula de vidrio que flota sobre el contenido,
// con la pestaña activa en una pastilla y teñida del verde de Camina.
// En iOS 26 usa el vidrio líquido del sistema; en iOS anterior, desenfoque; en Android y web, un relleno translúcido.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string; href?: string | null; tabBarItemStyle?: unknown; tabBarStyle?: { display?: string }; tabBarIcon?: (p: { focused: boolean; color: string; size: number }) => React.ReactNode } }>;
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const BAR_HEIGHT = 64;

// Espacio que tiene que dejar abajo cada pantalla con barra, porque la barra flota encima del contenido.
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 12) + 24;
}

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const level = useGlassStore((s) => s.level);
  const insets = useSafeAreaInsets();

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

  const solid = level === 0;
  const capsule: ViewStyle = {
    minHeight: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(41,28,71,0.08)',
  };
  // Relleno cuando no hay vidrio del sistema: más denso en Android, donde no hay desenfoque.
  const fill = solid
    ? dark ? colors.dark.card : '#fff'
    : Platform.OS === 'android'
      ? dark ? 'rgba(34,25,51,0.96)' : 'rgba(255,255,255,0.96)'
      : dark ? 'rgba(34,25,51,0.74)' : 'rgba(255,255,255,0.7)';

  const items = (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
      {visible.map(({ route, index }, position) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        // Activa en verde de Camina (pasa 4.5:1 en los dos modos); el resto en el color del texto, como en iOS.
        const color = focused ? (dark ? colors.mint : colors.aquaDeep) : dark ? colors.dark.text : colors.light.text;
        const Icon = options.tabBarIcon;
        const title = typeof options.title === 'string' ? options.title : route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={`${title}, pestaña ${position + 1} de ${visible.length}`}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: BAR_HEIGHT - 8,
              borderRadius: (BAR_HEIGHT - 8) / 2,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              backgroundColor: focused
                ? dark ? 'rgba(255,255,255,0.12)' : 'rgba(41,28,71,0.07)'
                : 'transparent',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
              {Icon ? Icon({ focused, color, size: 25 }) : null}
            </View>
            <Text numberOfLines={1} style={{ fontSize: 12, color, fontWeight: focused ? '700' : '500', letterSpacing: -0.1 }}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom - 6, 12) }}
    >
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
          <GlassView glassEffectStyle="regular" isInteractive colorScheme={dark ? 'dark' : 'light'} style={capsule}>
            {items}
          </GlassView>
        ) : (
          <View
            style={[
              capsule,
              { backgroundColor: Platform.OS === 'ios' && !solid ? 'transparent' : fill },
              // En web el navegador desenfoca lo que pasa por debajo, como el vidrio de iOS.
              Platform.OS === 'web' && !solid ? ({ backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as object) : null,
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
