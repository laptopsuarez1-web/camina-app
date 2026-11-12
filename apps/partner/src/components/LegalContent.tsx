import Link from 'next/link';

// Mismo texto que apps/mobile/src/components/LegalSections.tsx (pantalla de
// aceptación y de lectura dentro de la app) — esta página es la versión
// pública, con URL fija, que piden Apple y Google al revisar la app.
export function LegalContent() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <Link href="/" className="text-aqua text-[13px] font-semibold">
        ← Camina
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-1">Términos y Privacidad</h1>
      <p className="text-muted text-[13px] mb-8">Última actualización: noviembre de 2026.</p>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Términos de uso</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Camina te da Puntos por caminar (1 Punto cada 1.000 pasos, hasta 20 Puntos por día) para canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los 90 días de haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Al canjear o poner Puntos en juego se usan primero los que vencen antes. Para canjear en un local, escribes en la app el código de 4 números del local estando en el local (usamos tu ubicación solo en ese momento) y el canje se confirma al instante; los códigos de premios online vencen a los 7 días. Camina es para personas de 13 años o más. Los Puntos de tus pasos se cargan solo si abres la app ese día; los pasos de días en que no la abriste se ven en Actividad pero no suman Puntos, ni cuentan para tu meta, tu racha ni los rankings. Los pasos ingresados a mano en Salud o Health Connect no suman Puntos. Nos reservamos el derecho de suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes. Los comercios adheridos son responsables de sus propios beneficios, stock y condiciones; Camina actúa como intermediario y no garantiza disponibilidad continua de ningún beneficio."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Política de privacidad</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tienes 13 años o más; nadie más la ve), foto de perfil (opcional), ciudad y zona (opcionales), el token de notificaciones de tu teléfono y los pasos diarios que registras desde Apple Salud o Google Health Connect: solo el total diario, no tu ubicación GPS histórica ni tu ruta. Los pasos de un día se guardan en nuestros servidores solo si abres la app ese día; los de días en que no la abriste los lee tu teléfono desde Salud para mostrártelos en Actividad, pero no los guardamos."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Ubicación: cuando la autorizas, usamos tu ubicación en el momento para mostrarte comercios cercanos y confirmar canjes y visitas de la Ruta, y no guardamos tu ubicación exacta. Para avisarte de comercios cercanos guardamos solo una zona aproximada de unos 550 m, sin historial ni ruta. Si quitas el permiso de ubicación de Camina en tu teléfono, esa zona se borra, y se borra también cuando eliminas tu cuenta."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Quién ve tu actividad: en el ranking global apareces con tu nombre, tu foto y tus pasos de la semana; si no quieres aparecer, apágalo cuando quieras en Perfil > Aparecer en el ranking. Tus amigos (solo las personas cuya amistad aceptaste) ven tus pasos, tu racha y tu historial, y en los grupos a los que te unes los demás miembros ven tus pasos y tus mensajes. No vendemos tus datos a terceros. Para que la app funcione usamos estos proveedores: Supabase (base de datos y cuentas), Expo (envío de notificaciones), Google Maps (mapa), Google y Apple (inicio de sesión) y Sentry (reporte de errores de la app: datos técnicos del error y del teléfono, sin tu nombre, correo ni pasos)."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Guardamos también un identificador de tu celular (un código técnico, no personal) para detectar varias cuentas de una misma persona y evitar trampas. Si no hay Salud o Health Connect disponible, en iOS podemos leer el sensor de movimiento del teléfono para contar pasos."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Cámara y fotos: solo si lo autorizas, usamos la cámara para sacar la foto de tu historia en un local y tu galería para elegir tu foto de perfil, tu portada o las fotos de la Ruta. Solo subimos las fotos que eliges; no miramos el resto de tu galería. Si mandas una historia de Instagram por un canje, guardamos esa foto y tu usuario de Instagram para que el equipo de Camina la revise y te acredite los Puntos. Si guardas en tu teléfono la imagen de tu resumen, la app solo escribe esa imagen en tu galería."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Avisos: si das permiso, te mandamos notificaciones sobre tu racha, tu puesto en el ranking, Puntos por vencer, mensajes e invitaciones de tus grupos y amigos, tus canjes, eventos y comercios cercanos. Puedes apagarlas cuando quieras desde la configuración de notificaciones de tu teléfono."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Ruta del mes: cuando marcas una visita a un local de la Ruta, guardamos el local, la fecha y la distancia a la que estabas del local (en metros) para confirmar que fuiste en persona. No guardamos tus coordenadas. El local ve tu primer nombre para confirmar la visita."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los mensajes de grupo se borran automáticamente cada mes; los resultados semanales de cada grupo (nombre, pasos y puesto) se conservan para mostrar el historial. Puedes reportar y bloquear a otras personas dentro de la app."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Eliminación de tu cuenta: puedes hacerlo cuando quieras desde Perfil > Editar perfil > Eliminar cuenta. Se borran tu perfil, tus Puntos, tus canjes, tus pasos, tus fotos (perfil, portada, fotos de la Ruta e historias), tu zona aproximada y tus tokens de notificación. Se conservan, sin tu foto, los resultados semanales de grupo ya cerrados. Si no puedes entrar a la app, escríbenos a soporte@caminaapp.com desde el correo de tu cuenta y la eliminamos en un plazo máximo de 7 días. Los datos borrados desaparecen también de nuestras copias de seguridad automáticas en un máximo de 30 días."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Desafíos de grupo y Puntos en juego</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Dentro de un grupo puedes crear un desafío y elegir cuántos de tus propios Puntos poner en juego (hasta 50). Los Puntos de Camina solo se ganan caminando: no se compran ni se venden. Los Puntos de todos los que se suman forman un pozo: quien termina primero (cumpliendo la meta diaria en al menos el 80% de los días del desafío) se lleva la mitad y la otra mitad se reparte en partes iguales entre los demás que terminan; si termina una sola persona, se lleva todo el pozo, y si nadie termina, cada persona recupera los suyos. Camina no se queda con ninguna parte del pozo. Los resultados se calculan automáticamente con los pasos registrados en la app y Camina puede anular un resultado si detecta trampa, como pasos falsos o varias cuentas de una misma persona."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Eventos y sorteos</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los comercios pueden publicar eventos y sorteos dentro de la app, con aprobación previa de Camina. Cada sorteo indica su premio, sus fechas y su condición; los ganadores se eligen al azar entre quienes se anotaron y cumplieron la condición. El premio lo pone y lo entrega cada comercio, que es el único responsable de cumplirlo. Camina no se hace responsable por premios no entregados."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Contenido de las personas</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los mensajes de grupo, las fotos de perfil, los nombres y los logos o fotos que suben los comercios son responsabilidad de quien los publica. Solo puedes subir contenido propio o que tengas derecho a usar. No se permite acoso, insultos, contenido sexual, odio o discriminación, violencia, spam, ni imágenes de otras personas sin su permiso. Al publicar, nos das una licencia limitada y gratuita para mostrar ese contenido dentro de Camina. Puedes reportar mensajes o fotos y bloquear personas desde la app; revisamos los reportes y podemos borrar contenido y suspender cuentas. Si crees que una imagen tuya o protegida por derechos de autor se usa sin permiso, escríbenos a soporte@caminaapp.com y la retiramos en pocos días."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Datos de salud</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Si autorizas el acceso a Apple Salud o Google Health Connect, Camina lee únicamente tu conteo de pasos (el total del día y, para descartar los pasos escritos a mano, los registros individuales de pasos) y nunca escribe ni comparte esa información con nadie más. No accede a otros datos de salud. Puedes revocar el acceso en cualquier momento desde los ajustes de Salud de tu teléfono."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Aviso de salud</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Camina te anima a caminar, pero no es un servicio médico ni da consejos de salud. Antes de aumentar tu actividad física, consulta con un profesional de la salud, sobre todo si tienes alguna condición médica. Caminas bajo tu propia responsabilidad y por tu cuenta y riesgo: no camines distraído por la calle ni por lugares peligrosos, y respeta el tránsito. Camina no se hace responsable por lesiones o daños que te pasen mientras caminas, en la máxima medida que permita la ley."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Conteo de pasos y sincronización</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Tus pasos los cuentan Apple Salud, Google Health Connect o el sensor de tu teléfono, no Camina. Camina no se responsabiliza por errores, retrasos o diferencias en el conteo, por fallas del teléfono, del sistema operativo o de esos servicios, ni por Puntos que no se carguen por eso. Si ves un error comprobable, escríbenos a soporte@caminaapp.com y lo revisamos. Esto no limita los derechos que la ley te reconoce como consumidor."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Trampas y suspensiones</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Está prohibido simular pasos (agitar el teléfono, usar aparatos o apps que generen movimiento, alterar el sensor o la ubicación), crear varias cuentas, afectar la seguridad de la app o usarla para fines ilegales. Si detectamos irregularidades, podemos suspender la cuenta, anular Puntos y canjes pendientes, sacarte de desafíos y rankings, o cerrar la cuenta. Si crees que fue un error, escríbenos a soporte@caminaapp.com y revisamos cada caso."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Canjes</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"En el local, el canje se confirma al instante cuando escribes el código del local, y recién ahí se descuentan tus Puntos. En los premios online, el comercio confirma tu código; si vence sin confirmarse, no se descuentan. Algunos premios son «de regalo con tu compra»: el comercio te lo entrega cuando compras lo que indica el premio, y esa compra la pagas tú en el local. Puedes canjear una vez por comercio cada 14 días (dos semanas), y cada beneficio puede tener cupos diarios y horarios. Camina tiene una tarjeta de fidelidad general: cada canje confirmado, en cualquier comercio, suma un sello y, al completar los 5 sellos, eliges un premio gratis entre los que ofrecen los comercios que participan (el comercio pone el premio y no se descuentan Puntos). Tienes 30 días desde que completas la tarjeta para canjear el premio en el local; si no lo canjeas, la tarjeta vence y empiezas una nueva. Si el canje se confirmó y el comercio no te entregó el premio, escríbenos a soporte@caminaapp.com y lo gestionamos con el comercio; si corresponde, te devolvemos los Puntos. Los reclamos por calidad, cantidad, stock o daños del premio se dirigen al comercio que lo ofreció, sin perjuicio de tus derechos como consumidor."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Puntos y cambios de las reglas</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los Puntos no tienen valor en dinero, no se compran, no se venden, no se transfieren y vencen a los 90 días. Podemos cambiar el valor de los Puntos, las reglas o los beneficios. Te avisamos dentro de la app antes de que el cambio empiece a regir, y los Puntos que ya tienes conservan su vencimiento original. Si sigues usando la app después del aviso, aceptas el cambio."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Menores de edad</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Camina es para personas de 13 años o más. Si eres menor de edad, usa la app con el conocimiento de tu madre, padre o tutor."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Datos y comercios</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los comercios no ven tu cuenta ni tus pasos. Solo ven lo necesario para atenderte: tu primer nombre junto a los canjes y visitas que hiciste en su local y tu nivel de cliente ahí, el código y el premio y, si ganas un sorteo, tu nombre para entregarte el premio. A comercios o patrocinadores solo les damos estadísticas agregadas, que no te identifican. Los datos de pasos y de salud se usan solo para sumar tus Puntos y mostrártelos, y nunca para publicidad. Tu zona aproximada se usa solo para avisarte de comercios cercanos. Puedes pedir ver, corregir o borrar tus datos desde Perfil > Editar perfil > Eliminar cuenta o escribiendo a soporte@caminaapp.com."}
        </p>
      </section>

      <section id="comercios" className="mb-8 scroll-mt-6">
        <h2 className="font-bold text-[15px] mb-2">Para comercios</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Esta sección es para los comercios que usan el panel de Camina. Al registrar tu comercio declaras que los datos que cargas (nombre, dirección, ubicación, horarios, fotos y logo) son reales y que tienes derecho a usarlos. El equipo de Camina revisa cada comercio antes de publicarlo y puede pedirte cambios, no publicarlo o pausarlo si no cumple estas reglas o recibe quejas repetidas."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Premios: lo que publicas es lo que entregas. Cada premio tiene que ser real y vigente, y respetar sus días, horarios, cupos y condiciones. Un premio «Gratis» no puede pedir que la persona compre otra cosa; si quieres pedir una compra, usa «Regalo con compra», que la app muestra claro. El premio, su calidad y su entrega son responsabilidad del comercio. Si algo cambia, edítalo o páusalo en Mis beneficios."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Canjes: cada canje se entrega una sola vez. El código de tu local es solo para personas que están en tu local; si se filtra, cámbialo desde Canjes. Los Puntos no se cambian por dinero: Camina no le paga al comercio por los canjes ni el comercio le paga a Camina por cada canje."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Datos de las personas: solo ves el primer nombre de quien canjea o visita tu local, su nivel de cliente y, en los sorteos, el nombre del ganador. Usa esos datos solo para atender en tu local; no puedes copiarlos, venderlos ni usarlos para otros fines."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Planes y pagos: Primer Paso es gratis. Paso Firme (Bs 99 por mes) y Paso Adelante (Bs 299 por mes) se pagan por mes, por transferencia con el QR del panel, mandando el comprobante por WhatsApp; el plan se activa cuando el equipo de Camina confirma el pago. Si un mes no llega el pago, te escribimos o te visitamos para coordinar contigo: puedes pagar, cambiar de plan o seguir en el plan gratis Primer Paso. Puedes cancelar tu plan o bajar a uno más barato cuando quieras: el cambio rige al terminar el mes que ya pagaste y, hasta ese día, sigues con todo lo de tu plan. Los meses ya pagados no se devuelven. Los precios de lanzamiento y el cupo fundador (3 meses gratis de Paso Firme desde que sale la app) valen según lo que se te confirmó al registrarte. Podemos cambiar los precios o lo que incluye cada plan avisándote antes por el panel o por correo; el cambio rige desde tu siguiente mes."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Avisos cercanos y eventos (según tu plan): el equipo de Camina los revisa antes de enviarlos o publicarlos. No se permiten mensajes engañosos. Los premios de los sorteos los pone y los entrega cada comercio."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Puedes dejar de usar Camina cuando quieras: borra la cuenta de tu comercio desde Perfil del local > Eliminar cuenta y negocio de Camina, o escríbenos por WhatsApp o a soporte@caminaapp.com."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Ley aplicable</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Estos términos se rigen por las leyes de Bolivia."}
        </p>
      </section>
    </div>
  );
}
