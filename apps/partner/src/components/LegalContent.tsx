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
      <p className="text-muted text-[13px] mb-8">Última actualización: octubre de 2026.</p>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Términos de uso</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Camina te da Puntos por caminar (1 Punto cada 1.000 pasos, hasta 20 Puntos por día) para canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los 90 días de haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Al canjear o poner Puntos en juego se usan primero los que vencen antes. Los códigos de canje vencen a los 15 minutos de generados. Camina es para personas de 13 años o más. Los pasos ingresados a mano en Salud o Health Connect no suman Puntos. Nos reservamos el derecho de suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes. Los comercios adheridos son responsables de sus propios beneficios, stock y condiciones; Camina actúa como intermediario y no garantiza disponibilidad continua de ningún beneficio."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Política de privacidad</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tenés 13 años o más; nadie más la ve), foto de perfil (opcional), ciudad y barrio (opcionales), el token de notificaciones de tu teléfono y los pasos diarios que registrás desde Apple Salud o Google Health Connect: solo el total diario, no tu ubicación GPS histórica ni tu ruta."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Ubicación: cuando la autorizás, usamos tu ubicación en el momento para mostrarte comercios cercanos en el mapa y no la guardamos. Si dejás activados los avisos cercanos, guardamos solo una zona aproximada de unos 550 m, sin historial ni ruta; podés apagarlo en Perfil y se borra."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Tus pasos y tu nombre solo son visibles para otros usuarios si activás \"Aparecer en el ranking\" o dentro de un grupo al que te unís vos mismo. No vendemos tus datos a terceros. Para que la app funcione usamos estos proveedores: Supabase (base de datos y cuentas), Expo (envío de notificaciones), Google Maps (mapa), Google y Apple (inicio de sesión) y un servicio de reporte de errores."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Guardamos también un identificador de tu celular (un código técnico, no personal) para detectar varias cuentas de una misma persona y evitar trampas. Si no hay Salud o Health Connect disponible, en iPhone podemos leer el sensor de movimiento del teléfono para contar pasos."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Los mensajes de grupo se borran automáticamente cada semana; los resultados semanales de cada grupo (nombre, pasos y puesto) se conservan para mostrar el historial. Podés reportar y bloquear a otras personas dentro de la app."}
        </p>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Eliminación de tu cuenta: podés hacerlo cuando quieras desde Perfil > Editar > Eliminar cuenta. Se borran tu perfil, tus Puntos, tus canjes, tus pasos, tu foto y tus tokens de notificación. Se conservan, sin tu foto, los resultados semanales de grupo ya cerrados. Si no podés entrar a la app, escribinos a caminaappbo@gmail.com y la eliminamos."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Desafíos de grupo y puntos en juego</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Dentro de un grupo podés crear un desafío y elegir cuántos de tus propios puntos poner en juego (hasta 50). Los puntos de Camina solo se ganan caminando: no se compran ni se venden. Los puntos de todos los que se suman forman un pozo que se reparte en partes iguales entre quienes cumplan la meta diaria en al menos el 80% de los días del desafío; si nadie cumple, cada persona recupera los suyos. Camina no se queda con ninguna parte del pozo. Los resultados se calculan automáticamente con los pasos registrados en la app y Camina puede anular un resultado si detecta trampa, como pasos falsos o varias cuentas de una misma persona."}
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
          {"Los mensajes de grupo, las fotos de perfil, los nombres y los logos o fotos que suben los comercios son responsabilidad de quien los publica. Solo podés subir contenido propio o que tengas derecho a usar. No se permite acoso, insultos, contenido sexual, odio o discriminación, violencia, spam, ni imágenes de otras personas sin su permiso. Al publicar, nos das una licencia limitada y gratuita para mostrar ese contenido dentro de Camina. Podés reportar mensajes o fotos y bloquear personas desde la app; revisamos los reportes y podemos borrar contenido y suspender cuentas. Si creés que una imagen tuya o protegida por derechos de autor se usa sin permiso, escribinos a caminaappbo@gmail.com y la retiramos en pocos días."}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Datos de salud</h2>
        <p className="text-[13.5px] leading-6 text-muted mb-3">
          {"Si autorizás el acceso a Apple Salud o Google Health Connect, Camina lee únicamente tu conteo de pasos (el total del día y, para descartar los pasos escritos a mano, los registros individuales de pasos) y nunca escribe ni comparte esa información con nadie más. No accede a otros datos de salud. Podés revocar el acceso en cualquier momento desde los ajustes de Salud de tu teléfono."}
        </p>
      </section>
    </div>
  );
}
