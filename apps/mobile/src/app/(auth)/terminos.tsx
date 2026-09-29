import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { consumePendingDeepLinks } from '@/lib/deep-links';
import { colors } from '@/theme/tokens';

// Paso obligatorio antes de entrar a la app (ver app/index.tsx: si hay sesión
// y perfil pero falta terms_accepted_at, se redirige acá). Sin esto, Apple y
// Google rechazan la app en review por no tener un consentimiento explícito
// a Términos y Política de Privacidad.
export default function TerminosScreen() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Términos de uso</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">
          Camina te da Puntos por caminar (1 Punto cada 1.000 pasos, hasta 20 Puntos por día) para
          canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los 90 días de
          haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Los
          códigos de canje vencen a los 15 minutos de generados. Camina es para personas de 13 años o
          más. Los pasos ingresados a mano en Salud o Health Connect no suman Puntos. Nos reservamos el derecho de
          suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes.
          Los comercios adheridos son responsables de sus propios beneficios, stock y condiciones;
          Camina actúa como intermediario y no garantiza disponibilidad continua de ningún beneficio.
        </Text>

        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Política de privacidad</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">
          Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tenés 13 años o
          más; nadie más la ve), foto de perfil (opcional), zona o barrio (opcional), el token de
          notificaciones de tu teléfono y los pasos diarios que registrás desde Apple Salud o Google
          Health Connect — solo el total diario, no tu ubicación GPS histórica ni tu ruta. Usamos tu ubicación aproximada, cuando
          la autorizás, únicamente para mostrarte comercios cercanos. Tus pasos y tu nombre solo son
          visibles para otros usuarios si activás &ldquo;Aparecer en el ranking&rdquo; o dentro de un grupo al
          que te unís vos mismo. No vendemos tus datos a terceros. Podés pedir la eliminación de tu
          cuenta y tus datos en cualquier momento desde Perfil.
        </Text>

        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Datos de salud</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-2">
          Si autorizás el acceso a Apple Salud o Google Health Connect, Camina lee únicamente tu
          conteo de pasos del día — no accede a otros datos de salud, y nunca escribe ni comparte
          esa información con nadie más. Podés revocar el acceso en cualquier momento desde los
          ajustes de Salud de tu teléfono.
        </Text>
      </ScrollView>

      <View className="px-6 py-4 border-t border-line-light dark:border-line-dark">
        <Pressable onPress={() => setAccepted((v) => !v)} className="flex-row items-center gap-2.5 mb-4">
          <View
            className="w-5 h-5 rounded-md items-center justify-center"
            style={{ borderWidth: 1.5, borderColor: accepted ? colors.aqua : colors.light.line, backgroundColor: accepted ? colors.aqua : 'transparent' }}
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
          style={{ backgroundColor: accepted ? colors.aqua : colors.light.line }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-bold text-[15px]" style={{ color: accepted ? '#fff' : colors.light.muted }}>
              Aceptar y continuar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
