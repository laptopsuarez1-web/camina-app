import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Check } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { consumePendingDeepLinks } from '@/lib/deep-links';
import { LegalSections } from '@/components/LegalSections';
import { colors } from '@/theme/tokens';
import { useColorScheme } from 'nativewind';

// Paso obligatorio antes de entrar a la app (ver app/index.tsx: si hay sesión
// y perfil pero falta terms_accepted_at, se redirige acá). Sin esto, Apple y
// Google rechazan la app en review por no tener un consentimiento explícito
// a Términos y Política de Privacidad.
export default function TerminosScreen() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDark = useColorScheme().colorScheme === 'dark';

  async function accept() {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await useAuthStore.getState().refreshProfile();
      const { joinedGroupId } = await consumePendingDeepLinks();
      if (Platform.OS === 'android') {
        router.replace({ pathname: '/(auth)/salud', params: joinedGroupId ? { group: joinedGroupId } : {} });
        return;
      }
      router.replace(joinedGroupId ? { pathname: '/(tabs)/grupos/[groupId]', params: { groupId: joinedGroupId } } : '/(tabs)');
    } catch (e) {
      Alert.alert('Algo salió mal', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark pt-14">
      <Text className="text-xl font-bold px-6 mb-1 text-text-light dark:text-text-dark">
        Términos y Privacidad
      </Text>
      <Text className="text-muted-light dark:text-muted-dark text-[13px] px-6 mb-4">
        Antes de seguir, necesitamos que leas y aceptes esto.
      </Text>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-4">
        <LegalSections />
      </ScrollView>

      <View className="px-6 py-4 border-t border-line-light dark:border-line-dark">
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((v) => !v)} className="flex-row items-center gap-2.5 mb-4">
          <View
            className="w-5 h-5 rounded-md items-center justify-center"
            style={{ borderWidth: 1.5, borderColor: accepted ? colors.aquaDeep : isDark ? colors.dark.line : colors.light.line, backgroundColor: accepted ? colors.aquaDeep : 'transparent' }}
          >
            {accepted && <Check size={13} color="#fff" />}
          </View>
          <Text className="flex-1 text-[12.5px] text-text-light dark:text-text-dark">
            Leí y acepto los Términos de uso y la Política de privacidad de Camina.
          </Text>
        </Pressable>
        <Pressable
          onPress={accept}
          disabled={!accepted || loading}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: accepted ? colors.aquaDeep : isDark ? colors.dark.line : colors.light.line }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-bold text-[15px]" style={{ color: accepted ? '#fff' : isDark ? colors.dark.muted : colors.light.muted }}>
              Aceptar y continuar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
