import { useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Home, Activity, Users, Calendar, ShoppingBag } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';

export default function TabsLayout() {
  const { session, initializing } = useAuthStore();

  useEffect(() => {
    if (session) registerForPushNotificationsAsync();
  }, [session]);

  if (!initializing && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.aqua,
        tabBarInactiveTintColor: '#9C8FC2',
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="actividad" options={{ title: 'Actividad', tabBarIcon: ({ color, size }) => <Activity color={color} size={size} /> }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <Tabs.Screen name="canjes" options={{ title: 'Canjes', tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} /> }} />
      {/* perfil se abre desde el avatar en el header, no es un tab de abajo. Y
          grupos/[groupId] es la pantalla de detalle de un grupo, no un tab propio.
          Sin declararlos acá, Expo Router los agrega solo al tab bar (bug real
          que se veía como "Grupos" duplicado y "perfil" suelto al final). */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="puntos" options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="grupos/[groupId]" options={{ href: null }} />
    </Tabs>
  );
}
