import '@/theme/global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
import { startAuthLinkListener } from '@/lib/auth-links';
import { Sentry, setMonitoringUser } from '@/lib/monitoring';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { useGlassStore } from '@/store/useGlassStore';

const queryClient = new QueryClient();

function RootLayout() {
  const { setColorScheme } = useNativewindColorScheme();
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    initAuthListener();
    startAuthLinkListener();
    useGlassStore.getState().hydrate();
  }, []);

  useEffect(() => {
    setMonitoringUser(profile?.id ?? null);
  }, [profile?.id]);

  useEffect(() => {
    setColorScheme(profile?.dark_mode ? 'dark' : 'light');
  }, [profile?.dark_mode, setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ForceUpdateGate>
            <Stack screenOptions={{ headerShown: false }} />
          </ForceUpdateGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
