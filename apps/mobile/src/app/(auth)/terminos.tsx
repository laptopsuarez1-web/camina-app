import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Check } from '@/components/icons';
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
          haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Al canjear o poner Puntos en juego se usan primero los que vencen antes. Los
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
          la autorizás, para mostrarte comercios cercanos y, si dejás activados los avisos cercanos, para avisarte de promociones de comercios que estén cerca (guardamos solo una zona aproximada de unos 550 m, sin historial ni ruta; podés apagarlo en Perfil y se borra). Tus pasos y tu nombre solo son
          visibles para otros usuarios si activás &ldquo;Aparecer en el ranking&rdquo; o dentro de un grupo al
          que te unís vos mismo. No vendemos tus datos a terceros. Podés pedir la eliminación de tu
          cuenta y tus datos en cualquier momento desde Perfil. Guardamos también un identificador de tu celular (un código técnico, no personal) para detectar varias cuentas de una misma persona y evitar trampas. Los mensajes de grupo se borran automáticamente cada semana; los resultados semanales de cada grupo (nombre, pasos y puesto) se conservan para mostrar el historial. Podés reportar y bloquear a otras personas dentro de la app.
        </Text>

        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Desafíos de grupo y puntos en juego</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">
          Dentro de un grupo podés crear un desafío y elegir cuántos de tus propios puntos poner en juego (hasta 50). Los puntos de Camina solo se ganan caminando: no se compran ni se venden. Los puntos de todos los que se suman forman un pozo que se reparte en partes iguales entre quienes cumplan la meta diaria en al menos el 80% de los días del desafío; si nadie cumple, cada persona recupera los suyos. Camina no se queda con ninguna parte del pozo. Los resultados se calculan automáticamente con los pasos registrados en la app y Camina puede anular un resultado si detecta trampa, como pasos falsos o varias cuentas de una misma persona.
        </Text>

        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Eventos y sorteos</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">
          Los comercios pueden publicar eventos y sorteos dentro de la app, con aprobación previa de Camina. Cada sorteo indica su premio, sus fechas y su condición; los ganadores se eligen al azar entre quienes se anotaron y cumplieron la condición. El premio lo pone y lo entrega cada comercio, que es el único responsable de cumplirlo. Camina no se hace responsable por premios no entregados.
        </Text>

        <Text className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">Contenido de las personas</Text>
        <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark mb-4">
          Los mensajes de grupo, las fotos de perfil, los nombres y los logos o fotos que suben los comercios son responsabilidad de quien los publica. Solo podés subir contenido propio o que tengas derecho a usar. No se permite acoso, insultos, contenido sexual, odio o discriminación, violencia, spam, ni imágenes de otras personas sin su permiso. Al publicar, nos das una licencia limitada y gratuita para mostrar ese contenido dentro de Camina. Podés reportar mensajes o fotos y bloquear personas desde la app; revisamos los reportes y podemos borrar contenido y suspender cuentas. Los mensajes de grupo se borran automáticamente cada semana. Si creés que una imagen tuya o protegida por derechos de autor se usa sin permiso, escribinos a caminaappbo@gmail.com y la retiramos en pocos días. Camina es para mayores de 13 años.
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
            style={{ borderWidth: 1.5, borderColor: accepted ? colors.aquaDeep : colors.light.line, backgroundColor: accepted ? colors.aquaDeep : 'transparent' }}
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
          style={{ backgroundColor: accepted ? colors.aquaDeep : colors.light.line }}
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
