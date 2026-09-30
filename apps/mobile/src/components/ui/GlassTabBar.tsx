import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';
import { useGlassStore } from '@/store/useGlassStore';

// Barra de pestañas flotante de "vidrio": cápsula translúcida con la pestaña activa como botón brillante.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string; href?: string | null; tabBarStyle?: { display?: string }; tabBarIcon?: (p: { focused: boolean; color: string; size: number }) => React.ReactNode } }>;
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const level = useGlassStore((s) => s.level);
  const insets = useSafeAreaInsets();
  const [a, b] = (dark ? { 0: [0.2, 0.2], 1: [0.18, 0.08], 2: [0.12, 0.04] } : { 0: [1, 1], 1: [0.7, 0.4], 2: [0.5, 0.25] })[level];

  // Algunas pantallas (crear desafío) ocultan la barra para ir a pantalla completa.
  if (descriptors[state.routes[state.index]?.key]?.options.tabBarStyle?.display === 'none') return null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: dark ? colors.dark.bg : colors.light.bg,
      }}
    >
      <View
        style={{
          height: 66,
          borderRadius: 33,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.95)',
          shadowColor: dark ? '#000' : '#503C8C',
          shadowOpacity: dark ? 0.35 : 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
          backgroundColor: dark ? colors.dark.card : '#fff',
        }}
      >
        {Platform.OS === 'ios' && <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
        <LinearGradient
          colors={[`rgba(255,255,255,${a})`, `rgba(255,255,255,${b})`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            // Las pantallas sin pestaña (perfil, puntos, avisos, detalle de grupo) se declaran con href: null.
            if (options.href === null) return null;
            const focused = state.index === index;
            const color = focused ? colors.aqua : dark ? '#B3A6D6' : '#7C6A9C';
            const Icon = options.tabBarIcon;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={{
                  width: 66,
                  height: 54,
                  borderRadius: 27,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  backgroundColor: focused ? (dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.92)') : 'transparent',
                  shadowColor: '#503C8C',
                  shadowOpacity: focused && !dark ? 0.14 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                {Icon ? Icon({ focused, color, size: 23 }) : null}
                <Text style={{ fontSize: 9.5, color, fontWeight: focused ? '800' : '500' }}>
                  {typeof options.title === 'string' ? options.title : route.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
