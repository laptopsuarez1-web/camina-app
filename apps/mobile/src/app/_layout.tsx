import '@/theme/global.css';
import '@/lib/web-alert';
import '@/lib/background-steps';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
import { startAuthLinkListener } from '@/lib/auth-links';
import { queryClient } from '@/lib/query-client';
import { Sentry, setMonitoringUser } from '@/lib/monitoring';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { useGlassStore } from '@/store/useGlassStore';
import { setBrandFontsReady, useBrandFonts } from '@/theme/fonts';

// El splash se queda hasta que carga la tipografía de marca (o pasan 4 s: sin la fuente la app igual abre, con la del sistema).
SplashScreen.preventAutoHideAsync().catch(() => {});
const FONT_TIMEOUT_MS = 4000;

// Último modo oscuro conocido ('1' / '0'), para pintar bien desde el primer cuadro sin esperar al perfil.
const DARK_MODE_KEY = 'camina_dark_mode';

function RootLayout() {
  const [fontsLoaded, fontsError] = useBrandFonts();
  const [fontsGaveUp, setFontsGaveUp] = useState(false);
  // Se marca antes de pintar el primer Text, para que ninguno salga con la fuente del sistema.
  setBrandFontsReady(fontsLoaded);
  const fontsSettled = fontsLoaded || !!fontsError || fontsGaveUp;
  const { setColorScheme } = useNativewindColorScheme();
  const profile = useAuthStore((s) => s.profile);
  const darkMode = profile ? profile.dark_mode : null;
  const signedOut = useAuthStore((s) => !s.initializing && !s.session);

  useEffect(() => {
    const t = setTimeout(() => setFontsGaveUp(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync().catch(() => {});
  }, [fontsSettled]);

  useEffect(() => {
    initAuthListener();
    startAuthLinkListener();
    useGlassStore.getState().hydrate();
    // En web el documento sale con lang="en"; la app está en español.
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = 'es';
  }, []);

  useEffect(() => {
    setMonitoringUser(profile?.id ?? null);
  }, [profile?.id]);

  // Mientras no cargó el perfil se usa el último modo guardado (o el del sistema); no se fuerza 'light'.
  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY)
      .then((v) => {
        if (v && useAuthStore.getState().initializing) setColorScheme(v === '1' ? 'dark' : 'light');
      })
      .catch(() => {});
  }, [setColorScheme]);

  useEffect(() => {
    if (darkMode === null) return;
    setColorScheme(darkMode ? 'dark' : 'light');
    AsyncStorage.setItem(DARK_MODE_KEY, darkMode ? '1' : '0').catch(() => {});
  }, [darkMode, setColorScheme]);

  // Al cerrar sesión se borra el modo guardado y se vuelve al del sistema.
  useEffect(() => {
    if (!signedOut) return;
    AsyncStorage.removeItem(DARK_MODE_KEY).catch(() => {});
    setColorScheme('system');
  }, [signedOut, setColorScheme]);

  if (!fontsSettled) return null;

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
