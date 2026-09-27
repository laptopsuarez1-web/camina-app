import { Tabs, Redirect } from 'expo-router';
import { Home, Activity, Users, Calendar, ShoppingBag } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { session, initializing } = useAuthStore();
  if (!initializing && !session) return <Redirect href="/(auth)/login" />;

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
    </Tabs>
  );
}
