import { useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Platform } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Home, ChartBar, Users, Calendar, ShoppingBag, type IconProps } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { registerForPushNotificationsAsync, useNotificationTaps } from '@/lib/push-notifications';
import { shareCoarseLocation } from '@/lib/coarse-location';
import { registerDevice } from '@/lib/device';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassTabBar } from '@/components/ui/GlassTabBar';
import { CelebrationHost } from '@/components/CelebrationHost';

// Ícono de la barra: en iOS el símbolo del sistema (SF Symbols), como las apps de Apple;
// en Android y web, el mismo dibujo en Phosphor relleno.
function tabIcon(Icon: (p: IconProps) => React.ReactElement, symbol: SFSymbol) {
  return function TabIcon({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) {
    const fallback = <Icon size={25} color={color} weight={focused ? 'fill' : 'regular'} />;
    if (Platform.OS !== 'ios') return fallback;
    return <SymbolView name={symbol} size={24} tintColor={color} type="monochrome" fallback={fallback} />;
  };
}

export default function TabsLayout() {
  const { session, initializing } = useAuthStore();

  useEffect(() => {
    if (session) {
      registerForPushNotificationsAsync();
      shareCoarseLocation();
      registerDevice();
    }
  }, [session]);

  useNotificationTaps(!!session);

  if (!initializing && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenLayout={({ children }) => (
        <View style={{ flex: 1 }}>
          <AmbientBackground />
          {children}
        </View>
      )}
      tabBar={(props) => <GlassTabBar {...(props as unknown as React.ComponentProps<typeof GlassTabBar>)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon(Home, 'house.fill') }} />
      <Tabs.Screen name="actividad" options={{ title: 'Actividad', tabBarIcon: tabIcon(ChartBar, 'chart.bar.fill') }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos', tabBarIcon: tabIcon(Users, 'person.3.fill') }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos', tabBarIcon: tabIcon(Calendar, 'calendar') }} />
      <Tabs.Screen name="canjes" options={{ title: 'Canjes', tabBarIcon: tabIcon(ShoppingBag, 'bag.fill') }} />
      {/* perfil se abre desde el avatar en el header, no es un tab de abajo. Y
          grupos/[groupId] es la pantalla de detalle de un grupo, no un tab propio.
          Sin declararlos acá, Expo Router los agrega solo al tab bar (bug real
          que se veía como "Grupos" duplicado y "perfil" suelto al final). */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="puntos" options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="grupos/[groupId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="editar-perfil" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="grupos/nuevo-desafio" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
    <CelebrationHost />
    </View>
  );
}
