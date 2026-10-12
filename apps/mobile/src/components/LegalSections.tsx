import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SUPPORT_EMAIL } from '@/constants/contact';
import { POINTS_PER_STEP_UNIT, DAILY_POINTS_CAP, POINTS_TTL_DAYS, REDEMPTION_CODE_TTL_MINUTES, BUSINESS_REDEMPTION_COOLDOWN_DAYS } from '@/constants/business-rules';

// Texto legal único: lo usan la pantalla de aceptación (auth/terminos) y la de lectura (/legal).
export const LEGAL_UPDATED = 'octubre de 2026';

// 1000 → "1.000" (a mano: no depende del soporte de Intl del teléfono).
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Términos de uso',
    body: `Camina te da Puntos por caminar (1 Punto cada ${miles(POINTS_PER_STEP_UNIT)} pasos, hasta ${DAILY_POINTS_CAP} Puntos por día) para canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los ${POINTS_TTL_DAYS} días de haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Al canjear o poner Puntos en juego se usan primero los que vencen antes. Los códigos de canje vencen a los ${REDEMPTION_CODE_TTL_MINUTES} minutos de generados. Camina es para personas de 13 años o más. Los Puntos de tus pasos se cargan solo si abrís la app ese día; los pasos de días en que no la abriste se ven en Actividad pero no suman Puntos, ni cuentan para tu meta, tu racha ni los rankings. Los pasos ingresados a mano en Salud o Health Connect no suman Puntos. Nos reservamos el derecho de suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes. Los comercios adheridos son responsables de sus propios beneficios, stock y condiciones; Camina actúa como intermediario y no garantiza disponibilidad continua de ningún beneficio.`,
  },
  {
    title: 'Política de privacidad',
    body: `Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tenés 13 años o más; nadie más la ve), foto de perfil (opcional), ciudad y barrio (opcionales), el token de notificaciones de tu teléfono y los pasos diarios que registrás desde Apple Salud o Google Health Connect: solo el total diario, no tu ubicación GPS histórica ni tu ruta. Los pasos de un día se guardan en nuestros servidores solo si abrís la app ese día; los de días en que no la abriste los lee tu teléfono desde Salud para mostrártelos en Actividad, pero no los guardamos.

Ubicación: cuando la autorizás, usamos tu ubicación en el momento para mostrarte comercios cercanos en el mapa y no la guardamos. Si dejás activados los avisos cercanos, guardamos solo una zona aproximada de unos 550 m, sin historial ni ruta; podés apagarlo en Perfil y se borra.

Tus pasos y tu nombre solo son visibles para otros usuarios si activás "Aparecer en el ranking" o dentro de un grupo al que te unís vos mismo. No vendemos tus datos a terceros. Para que la app funcione usamos estos proveedores: Supabase (base de datos y cuentas), Expo (envío de notificaciones), Google Maps (mapa), Google y Apple (inicio de sesión) y un servicio de reporte de errores.

Guardamos también un identificador de tu celular (un código técnico, no personal) para detectar varias cuentas de una misma persona y evitar trampas. Si no hay Salud o Health Connect disponible, en iPhone podemos leer el sensor de movimiento del teléfono para contar pasos.

Los mensajes de grupo se borran automáticamente cada semana; los resultados semanales de cada grupo (nombre, pasos y puesto) se conservan para mostrar el historial. Podés reportar y bloquear a otras personas dentro de la app.

Eliminación de tu cuenta: podés hacerlo cuando quieras desde Perfil > Editar perfil > Eliminar cuenta. Se borran tu perfil, tus Puntos, tus canjes, tus pasos, tu foto y tus tokens de notificación. Se conservan, sin tu foto, los resultados semanales de grupo ya cerrados. Si no podés entrar a la app, escribinos a ${SUPPORT_EMAIL} y la eliminamos.`,
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
  {
    title: 'Aviso de salud',
    body: `Camina te anima a caminar, pero no es un servicio médico ni da consejos de salud. Antes de aumentar tu actividad física, consultá con un profesional de la salud, sobre todo si tenés alguna condición médica. Caminás bajo tu propia responsabilidad y por tu cuenta y riesgo: no caminés distraído por la calle ni por lugares peligrosos, y respetá el tránsito. Camina no se hace responsable por lesiones o daños que te pasen mientras caminás, en la máxima medida que permita la ley.`,
  },
  {
    title: 'Conteo de pasos y sincronización',
    body: `Tus pasos los cuentan Apple Salud, Google Health Connect o el sensor de tu teléfono, no Camina. Camina no se responsabiliza por errores, retrasos o diferencias en el conteo, por fallas del teléfono, del sistema operativo o de esos servicios, ni por Puntos que no se carguen por eso. Si ves un error comprobable, escribinos a ${SUPPORT_EMAIL} y lo revisamos. Esto no limita los derechos que la ley te reconoce como consumidor.`,
  },
  {
    title: 'Trampas y suspensiones',
    body: `Está prohibido simular pasos (agitar el teléfono, usar aparatos o apps que generen movimiento, alterar el sensor o la ubicación), crear varias cuentas, afectar la seguridad de la app o usarla para fines ilegales. Si detectamos irregularidades, podemos suspender la cuenta, anular Puntos y canjes pendientes, sacarte de desafíos y rankings, o cerrar la cuenta. Si creés que fue un error, escribinos a ${SUPPORT_EMAIL} y revisamos cada caso.`,
  },
  {
    title: 'Canjes',
    body: `El comercio confirma el código en el local y recién ahí se descuentan tus Puntos. Si el código vence sin confirmarse, no se descuentan. Podés canjear una vez por comercio cada ${BUSINESS_REDEMPTION_COOLDOWN_DAYS} días, y cada beneficio puede tener cupos diarios y horarios. Si el comercio confirmó el canje y no te entregó el premio, escribinos a ${SUPPORT_EMAIL} y lo gestionamos con el comercio; si corresponde, te devolvemos los Puntos. Los reclamos por calidad, cantidad, stock o daños del premio se dirigen al comercio que lo ofreció, sin perjuicio de tus derechos como consumidor.`,
  },
  {
    title: 'Puntos y cambios de las reglas',
    body: `Los Puntos no tienen valor en dinero, no se compran, no se venden, no se transfieren y vencen a los ${POINTS_TTL_DAYS} días. Podemos cambiar el valor de los Puntos, las reglas o los beneficios. Te avisamos dentro de la app antes de que el cambio empiece a regir, y los Puntos que ya tenés conservan su vencimiento original. Si seguís usando la app después del aviso, aceptás el cambio.`,
  },
  {
    title: 'Menores de edad',
    body: `Camina es para personas de 13 años o más. Si sos menor de edad, usá la app con el conocimiento de tu madre, padre o tutor.`,
  },
  {
    title: 'Datos y comercios',
    body: `Los comercios no ven tu cuenta ni tus pasos. Solo ven lo necesario para el canje (el código y el premio) y, si ganás un sorteo, tu nombre para entregarte el premio. A comercios o patrocinadores solo les damos estadísticas agregadas, que no te identifican. Los datos de pasos y de salud se usan solo para sumar tus Puntos y mostrártelos, y nunca para publicidad. Tu ubicación aproximada se usa solo para los avisos de comercios cercanos, si los activaste. Podés pedir ver, corregir o borrar tus datos desde Perfil > Editar perfil > Eliminar cuenta o escribiendo a ${SUPPORT_EMAIL}.`,
  },
  {
    title: 'Ley aplicable',
    body: `Estos términos se rigen por las leyes de Bolivia.`,
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
