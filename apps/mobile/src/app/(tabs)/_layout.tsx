import { useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View } from 'react-native';
import { Home, Activity, Users, Calendar, ShoppingBag, type IconProps } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import { shareCoarseLocation } from '@/lib/coarse-location';
import { registerDevice } from '@/lib/device';
import { useColorScheme } from 'nativewind';
import { GlassTabBar } from '@/components/ui/GlassTabBar';
import { CelebrationHost } from '@/components/CelebrationHost';

// Ícono de la barra: inactivo de línea limpia, activo relleno sobre la pastilla verde suave de GlassTabBar.
function tabIcon(Icon: (p: IconProps) => React.ReactElement) {
  return function TabIcon({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) {
    return (
      <View
        style={{
          width: 48,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <Icon size={24} color={color} weight={focused ? 'fill' : 'regular'} />
      </View>
    );
  };
}

export default function TabsLayout() {
  const { session, initializing } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    if (session) {
      registerForPushNotificationsAsync();
      shareCoarseLocation();
      registerDevice();
    }
  }, [session]);

  if (!initializing && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as unknown as React.ComponentProps<typeof GlassTabBar>)} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.aqua,
        tabBarInactiveTintColor: '#9C8FC2',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          backgroundColor: dark ? colors.dark.card : colors.light.card,
          borderTopColor: dark ? colors.dark.line : colors.light.line,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon(Home) }} />
      <Tabs.Screen name="actividad" options={{ title: 'Actividad', tabBarIcon: tabIcon(Activity) }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos', tabBarIcon: tabIcon(Users) }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos', tabBarIcon: tabIcon(Calendar) }} />
      <Tabs.Screen name="canjes" options={{ title: 'Canjes', tabBarIcon: tabIcon(ShoppingBag) }} />
      {/* perfil se abre desde el avatar en el header, no es un tab de abajo. Y
          grupos/[groupId] es la pantalla de detalle de un grupo, no un tab propio.
          Sin declararlos acá, Expo Router los agrega solo al tab bar (bug real
          que se veía como "Grupos" duplicado y "perfil" suelto al final). */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="puntos" options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="grupos/[groupId]" options={{ href: null }} />
      <Tabs.Screen name="grupos/nuevo-desafio" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
    <CelebrationHost />
    </View>
  );
}
