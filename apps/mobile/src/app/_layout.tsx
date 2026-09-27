import '@/theme/global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { setColorScheme } = useNativewindColorScheme();
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    initAuthListener();
  }, []);

  useEffect(() => {
    setColorScheme(profile?.dark_mode ? 'dark' : 'light');
  }, [profile?.dark_mode, setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
