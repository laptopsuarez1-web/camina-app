import { useEffect } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import { View } from 'react-native';
import { TabGlyph, type TabKind } from '@/components/ui/TabGlyph';
import { useAuthStore } from '@/store/useAuthStore';
import { registerForPushNotificationsAsync, useNotificationTaps } from '@/lib/push-notifications';
import { shareCoarseLocation } from '@/lib/coarse-location';
import { registerDevice } from '@/lib/device';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassTabBar } from '@/components/ui/GlassTabBar';
import { CelebrationHost } from '@/components/CelebrationHost';

// Íconos de la barra: el mismo dibujo en todos los teléfonos, y cada uno hace un gesto corto al tocarlo (ver TabGlyph).
// Son componentes fijos (no se crean en cada render) para que la animación no se reinicie.
function glyph(kind: TabKind) {
  return function TabIcon({ color, focused, tick }: { color: import('react-native').ColorValue; focused: boolean; tick?: number }) {
    return <TabGlyph kind={kind} color={color as string} focused={focused} tick={tick} />;
  };
}
const HomeIcon = glyph('home');
const ActivityIcon = glyph('activity');
const GroupsIcon = glyph('groups');
const EventsIcon = glyph('events');
const CanjesIcon = glyph('canjes');

export default function TabsLayout() {
  const { session, initializing, passwordRecovery } = useAuthStore();

  useEffect(() => {
    if (session) {
      registerForPushNotificationsAsync();
      shareCoarseLocation();
      registerDevice();
    }
  }, [session]);

  // Entró con el link de "olvidé mi contraseña": se abre directo el formulario para elegir la nueva.
  useEffect(() => {
    if (session && passwordRecovery) router.push('/(tabs)/editar-perfil?nueva=1');
  }, [session, passwordRecovery]);

  useNotificationTaps(!!session);

  if (!initializing && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      // Volver atrás regresa a la pantalla anterior (Permisos → Perfil → …), no siempre al Inicio.
      backBehavior="history"
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
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="actividad" options={{ title: 'Actividad', tabBarIcon: ActivityIcon }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos', tabBarIcon: GroupsIcon }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos', tabBarIcon: EventsIcon }} />
      <Tabs.Screen name="canjes" options={{ title: 'Canjes', tabBarIcon: CanjesIcon }} />
      {/* perfil se abre desde el avatar en el header, no es un tab de abajo. Y
          grupos/[groupId] es la pantalla de detalle de un grupo, no un tab propio.
          Sin declararlos aquí, Expo Router los agrega solo al tab bar (bug real
          que se veía como "Grupos" duplicado y "perfil" suelto al final). */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="puntos" options={{ href: null }} />
      <Tabs.Screen name="tarjetas" options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="grupos/[groupId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="editar-perfil" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="grupos/nuevo-desafio" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="grupos/nuevo" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="grupos/agregar" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="ranking" options={{ href: null }} />
      <Tabs.Screen name="amigos/index" options={{ href: null }} />
      <Tabs.Screen name="amigos/[userId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
    <CelebrationHost />
    </View>
  );
}
