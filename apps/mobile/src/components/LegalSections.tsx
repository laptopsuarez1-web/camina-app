import { View, Text } from 'react-native';
import { SUPPORT_EMAIL } from '@/constants/contact';

// Texto legal único: lo usan la pantalla de aceptación (auth/terminos) y la de lectura (/legal).
export const LEGAL_UPDATED = 'octubre de 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Términos de uso',
    body: `Camina te da Puntos por caminar (1 Punto cada 1.000 pasos, hasta 20 Puntos por día) para canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los 90 días de haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Al canjear o poner Puntos en juego se usan primero los que vencen antes. Los códigos de canje vencen a los 15 minutos de generados. Camina es para personas de 13 años o más. Los Puntos de tus pasos se cargan solo si abrís la app ese día; los pasos de días en que no la abriste se ven en Actividad pero no suman Puntos. Los pasos ingresados a mano en Salud o Health Connect no suman Puntos. Nos reservamos el derecho de suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes. Los comercios adheridos son responsables de sus propios beneficios, stock y condiciones; Camina actúa como intermediario y no garantiza disponibilidad continua de ningún beneficio.`,
  },
  {
    title: 'Política de privacidad',
    body: `Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tenés 13 años o más; nadie más la ve), foto de perfil (opcional), ciudad y barrio (opcionales), el token de notificaciones de tu teléfono y los pasos diarios que registrás desde Apple Salud o Google Health Connect: solo el total diario, no tu ubicación GPS histórica ni tu ruta.

Ubicación: cuando la autorizás, usamos tu ubicación en el momento para mostrarte comercios cercanos en el mapa y no la guardamos. Si dejás activados los avisos cercanos, guardamos solo una zona aproximada de unos 550 m, sin historial ni ruta; podés apagarlo en Perfil y se borra.

Tus pasos y tu nombre solo son visibles para otros usuarios si activás "Aparecer en el ranking" o dentro de un grupo al que te unís vos mismo. No vendemos tus datos a terceros. Para que la app funcione usamos estos proveedores: Supabase (base de datos y cuentas), Expo (envío de notificaciones), Google Maps (mapa), Google y Apple (inicio de sesión) y un servicio de reporte de errores.

Guardamos también un identificador de tu celular (un código técnico, no personal) para detectar varias cuentas de una misma persona y evitar trampas. Si no hay Salud o Health Connect disponible, en iPhone podemos leer el sensor de movimiento del teléfono para contar pasos.

Los mensajes de grupo se borran automáticamente cada semana; los resultados semanales de cada grupo (nombre, pasos y puesto) se conservan para mostrar el historial. Podés reportar y bloquear a otras personas dentro de la app.

Eliminación de tu cuenta: podés hacerlo cuando quieras desde Perfil > Editar > Eliminar cuenta. Se borran tu perfil, tus Puntos, tus canjes, tus pasos, tu foto y tus tokens de notificación. Se conservan, sin tu foto, los resultados semanales de grupo ya cerrados. Si no podés entrar a la app, escribinos a ${SUPPORT_EMAIL} y la eliminamos.`,
  },
  {
    title: 'Desafíos de grupo y puntos en juego',
    body: `Dentro de un grupo podés crear un desafío y elegir cuántos de tus propios puntos poner en juego (hasta 50). Los puntos de Camina solo se ganan caminando: no se compran ni se venden. Los puntos de todos los que se suman forman un pozo que se reparte en partes iguales entre quienes cumplan la meta diaria en al menos el 80% de los días del desafío; si nadie cumple, cada persona recupera los suyos. Camina no se queda con ninguna parte del pozo. Los resultados se calculan automáticamente con los pasos registrados en la app y Camina puede anular un resultado si detecta trampa, como pasos falsos o varias cuentas de una misma persona.`,
  },
  {
    title: 'Eventos y sorteos',
    body: `Los comercios pueden publicar eventos y sorteos dentro de la app, con aprobación previa de Camina. Cada sorteo indica su premio, sus fechas y su condición; los ganadores se eligen al azar entre quienes se anotaron y cumplieron la condición. El premio lo pone y lo entrega cada comercio, que es el único responsable de cumplirlo. Camina no se hace responsable por premios no entregados.`,
  },
  {
    title: 'Contenido de las personas',
    body: `Los mensajes de grupo, las fotos de perfil, los nombres y los logos o fotos que suben los comercios son responsabilidad de quien los publica. Solo podés subir contenido propio o que tengas derecho a usar. No se permite acoso, insultos, contenido sexual, odio o discriminación, violencia, spam, ni imágenes de otras personas sin su permiso. Al publicar, nos das una licencia limitada y gratuita para mostrar ese contenido dentro de Camina. Podés reportar mensajes o fotos y bloquear personas desde la app; revisamos los reportes y podemos borrar contenido y suspender cuentas. Si creés que una imagen tuya o protegida por derechos de autor se usa sin permiso, escribinos a ${SUPPORT_EMAIL} y la retiramos en pocos días.`,
  },
  {
    title: 'Datos de salud',
    body: `Si autorizás el acceso a Apple Salud o Google Health Connect, Camina lee únicamente tu conteo de pasos (el total del día y, para descartar los pasos escritos a mano, los registros individuales de pasos) y nunca escribe ni comparte esa información con nadie más. No accede a otros datos de salud. Podés revocar el acceso en cualquier momento desde los ajustes de Salud de tu teléfono.`,
  },
];

export function LegalSections() {
  return (
    <View>
      <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-4">Última actualización: {LEGAL_UPDATED}.</Text>
      {SECTIONS.map((s) => (
        <View key={s.title} className="mb-5">
          <Text accessibilityRole="header" className="font-bold text-[14px] mb-2 text-text-light dark:text-text-dark">{s.title}</Text>
          <Text className="text-[12.5px] leading-5 text-muted-light dark:text-muted-dark">{s.body}</Text>
        </View>
      ))}
    </View>
  );
}
