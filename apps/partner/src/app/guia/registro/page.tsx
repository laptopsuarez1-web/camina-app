// Guía de registro para comercios, en hojas A4. De aquí sale el PDF public/guia-registro-comercios.pdf
// (se imprime con Chromium: tamaño A4, sin márgenes, con fondos). Las capturas están en public/guia-registro/.
// Colores fijos (no los del tema): la guía se imprime siempre en claro.

const C = { tinta: '#241748', texto: '#291C47', suave: '#6E5F8F', linea: '#E1D2F5', fondo: '#F7F3FC', menta: '#62F0B6', aqua: '#2E9E7C' };
const IMG = '/guia-registro/';
const TOTAL = 9;

function Hoja({ n, etiqueta, titulo, bajada, children }: { n: number; etiqueta?: string; titulo?: string; bajada?: string; children: React.ReactNode }) {
  return (
    <section
      style={{ width: '210mm', height: '297mm', padding: '14mm 14mm 12mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', breakAfter: 'page', background: '#fff', color: C.texto, overflow: 'hidden' }}
    >
      {etiqueta && (
        <span style={{ alignSelf: 'flex-start', background: C.tinta, color: C.menta, fontWeight: 800, fontSize: 10, letterSpacing: 1.2, padding: '4px 10px', borderRadius: 99 }}>{etiqueta}</span>
      )}
      {titulo && <h2 style={{ fontSize: 26, fontWeight: 800, color: C.tinta, margin: '10px 0 4px' }}>{titulo}</h2>}
      {bajada && <p style={{ fontSize: 13.5, color: C.suave, margin: '0 0 12px', lineHeight: 1.45 }}>{bajada}</p>}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.linea}`, paddingTop: 6, marginTop: 8, fontSize: 9.5, color: C.suave }}>
        <span>Camina · Guía de registro para comercios</span>
        <span>
          {n} de {TOTAL}
        </span>
      </div>
    </section>
  );
}

function Captura({ src, alt, alto }: { src: string; alt: string; alto?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={IMG + src} alt={alt} style={{ width: '100%', height: alto ? `${alto}mm` : 'auto', objectFit: 'cover', objectPosition: 'top', borderRadius: 10, border: `1px solid ${C.linea}`, display: 'block' }} />
  );
}

function Nota({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.45 }}>
      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 99, background: C.menta, color: C.tinta, fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <span>{children}</span>
    </div>
  );
}

function Tarjeta({ titulo, plan, children, img, alto = 82 }: { titulo: string; plan?: string; children: React.ReactNode; img: string; alto?: number }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 7, background: C.fondo }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <p style={{ fontWeight: 800, fontSize: 13.5, color: C.tinta, margin: 0 }}>{titulo}</p>
        {plan && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8B4FD1', whiteSpace: 'nowrap' }}>{plan}</span>}
      </div>
      <p style={{ fontSize: 12, color: C.suave, margin: 0, lineHeight: 1.4 }}>{children}</p>
      <Captura src={img} alt={titulo} alto={alto} />
    </div>
  );
}

function Telefono({ src, texto }: { src: string; texto: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMG + src} alt={texto} style={{ width: '100%', height: 'auto', borderRadius: 14, border: `1px solid ${C.linea}` }} />
      <p style={{ fontSize: 11, color: C.suave, margin: 0, lineHeight: 1.35 }}>{texto}</p>
    </div>
  );
}

export default function GuiaRegistroPage() {
  return (
    <div style={{ background: '#e9e4f3' }}>
      <style>{'@page { size: A4; margin: 0 } html, body { margin: 0; padding: 0 } @media screen { section { margin: 0 auto 12px } }'}</style>

      {/* 1. Portada */}
      <section style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '22mm 18mm', background: C.tinta, color: '#fff', display: 'flex', flexDirection: 'column', breakAfter: 'page' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo-solo-transparente.png" alt="" style={{ width: '34mm', height: '34mm' }} />
        <p style={{ color: C.menta, fontWeight: 900, fontSize: 15, letterSpacing: 3, margin: '10mm 0 2mm' }}>CAMINA</p>
        <h1 style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, margin: 0 }}>Registra tu comercio en Camina</h1>
        <p style={{ fontSize: 15, color: '#D9D0F2', margin: '5mm 0 0', lineHeight: 1.45 }}>
          Guía paso a paso con capturas del panel: cuenta, fotos, mapa, premios, canjes y herramientas.
        </p>
        <p style={{ display: 'inline-block', alignSelf: 'flex-start', marginTop: '8mm', background: C.menta, color: C.tinta, fontWeight: 800, fontSize: 15, padding: '8px 18px', borderRadius: 99 }}>caminaapp.com/registro</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', marginTop: '14mm' }}>
          {[
            ['Opción 1', 'Te registras tú mismo siguiendo esta guía. Te lleva unos 15 minutos.'],
            ['Opción 2', 'Te creamos la cuenta nosotros: mándanos los datos y las fotos por WhatsApp al +591 627 14286.'],
          ].map(([t, d]) => (
            <div key={t} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '5mm' }}>
              <p style={{ color: C.menta, fontWeight: 800, fontSize: 14, margin: 0 }}>{t}</p>
              <p style={{ fontSize: 13, color: '#E4DDF7', margin: '2mm 0 0', lineHeight: 1.45 }}>{d}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '6mm', fontSize: 13, color: '#D9D0F2', lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>
            <b style={{ color: '#fff' }}>Camina sale el 1 de diciembre.</b> Si te registras ahora, tu local queda listo desde el primer día.
          </p>
          <p style={{ margin: '2mm 0 0' }}>
            <b style={{ color: '#E0B43A' }}>Cupo fundador:</b> los primeros 20 comercios tienen 3 meses gratis de Paso Firme desde que sale la app.
          </p>
        </div>
      </section>

      {/* 2. Crear la cuenta */}
      <Hoja n={2} etiqueta="PASO 1" titulo="Crea tu cuenta" bajada="Entra a caminaapp.com/registro (o, en la entrada del panel, toca «¿Todavía no tienes cuenta? Sumar mi comercio») y sigue los pasos.">
        <div style={{ display: 'flex', gap: '4mm' }}>
          <Telefono src="r1-login.jpg" texto="La entrada del panel. Si todavía no tienes cuenta, toca «Sumar mi comercio»." />
          <Telefono src="r2-tipo.jpg" texto="«Soy un comercio» y si atiendes en una tienda física o solo online." />
          <Telefono src="r3-plan.jpg" texto="Elige tu plan. Puedes cambiarlo cuando quieras, sin permanencia." />
          <Telefono src="r4-datos.jpg" texto="Logo (opcional), nombre, tipo, ciudad, dirección y WhatsApp. Al final, tu correo y una contraseña de 8 caracteres o más." />
        </div>
        <Nota n={1}>Si eliges un plan de pago, antes de tus datos te mostramos el QR para pagar. Manda el comprobante por WhatsApp y te activamos el plan.</Nota>
        <Nota n={2}>Al tocar «Crear cuenta» entras directo al panel y te recibe una guía rápida. Te llega un correo con un código de 6 números: escríbelo en Mi cuenta para verificar tu correo.</Nota>
        <Nota n={3}>El equipo de Camina revisa tu local antes de publicarlo en la app. Te avisamos por correo apenas esté publicado.</Nota>
      </Hoja>

      {/* 3. Datos y fotos */}
      <Hoja n={3} etiqueta="PASO 2" titulo="Datos del local y fotos" bajada="Menú Perfil del local: es lo que la gente ve en la ficha de tu local en la app. Más abajo cargas tus horarios (con «Horario partido» si cierras al mediodía), tu WhatsApp y tus redes.">
        <Captura src="p-perfil.jpg" alt="Perfil del local" alto={140} />
        <div style={{ background: C.fondo, borderRadius: 10, padding: '8px 10px', fontSize: 10.5, color: C.suave, lineHeight: 1.45 }}>
          <b style={{ color: C.texto }}>Tamaños:</b> logo cuadrado (mínimo unos 500 × 500 px) · portada horizontal 16:9 (por ejemplo 1600 × 900) · fotos del local hasta 1600 px · foto del premio cuadrada (por ejemplo 1000 × 1000). PNG o JPG: la app las achica sola. Sácalas de día, cerca de una ventana y sin texto encima.
        </div>
        <Nota n={1}>Logo: aparece en un círculo junto a tu nombre, en las listas y en el mapa.</Nota>
        <Nota n={2}>Portada: va arriba de tu ficha. Usa tu mejor foto, con lo importante al centro.</Nota>
        <Nota n={3}>Más fotos del local: hasta 8. La gente las ve tocando la portada.</Nota>
        <Nota n={4}>Descripción: de 15 a 500 letras. Es lo primero que lee la gente: cuenta qué ofreces y qué te hace especial.</Nota>
      </Hoja>

      {/* 4. Mapa */}
      <Hoja n={4} etiqueta="PASO 3" titulo="Ubica tu local en el mapa" bajada="En Perfil del local, «Dónde estás». Sin ubicación, tu local no aparece en el mapa de la app.">
        <Captura src="p-mapa.jpg" alt="Ubicación en el mapa" alto={165} />
        <Nota n={1}>Lo más fácil: parado en tu local, toca «Usar mi ubicación actual».</Nota>
        <Nota n={2}>Desde el mapa: acerca el mapa y toca la puerta de tu local. Puedes arrastrar el pin para ajustarlo.</Nota>
        <Nota n={3}>Con Google Maps: toca «Prefiero pegar un link de Google Maps» y pega el link de tu local.</Nota>
        <Nota n={4}>¿Vendes solo por internet? Marca «Es un emprendimiento virtual» y no necesitas dirección.</Nota>
      </Hoja>

      {/* 5. Primer premio */}
      <Hoja n={5} etiqueta="PASO 4" titulo="Tu primer premio" bajada="Menú Mis beneficios → «Agregar beneficio». Es lo que la gente canjea con los Puntos que gana caminando. El formulario va en 5 pasos, de arriba hacia abajo.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
          <Captura src="p-form2.jpg" alt="Cómo lo ofreces" alto={74} />
          <Captura src="p-form3.jpg" alt="Cuánto cuesta" alto={74} />
        </div>
        <Nota n={1}>Tu premio: foto (obligatoria), nombre y una descripción corta.</Nota>
        <Nota n={2}>
          Cómo lo ofreces: <b>Gratis</b> (se lo lleva sin pagar), <b>Regalo con compra</b> (por ejemplo «De regalo llevando 2 salchipapas») o <b>Descuento</b> (un % o un texto como «2x1»).
        </Nota>
        <Nota n={3}>Cuánto cuesta: como guía, 2,5 Puntos equivalen a Bs 1 (algo de Bs 10 ronda los 25 Puntos). Escribe cuánto vale en Bs y el panel te sugiere los Puntos.</Nota>
        <Nota n={4}>Cuándo vale: días y horario. Tip: si vale en tus horas flojas, la gente llega justo cuando más la necesitas.</Nota>
        <Nota n={5}>Con el plan gratis tienes 1 premio gratis y, con él, 1 descuento. Con los planes de pago, varios premios a la vez y cupones ilimitados.</Nota>
        <Captura src="p-beneficios.jpg" alt="Mis beneficios" alto={58} />
      </Hoja>

      {/* 6. Canjes */}
      <Hoja n={6} etiqueta="PASO 5" titulo="Atiende los canjes" bajada="Tu local tiene un código de 4 números. Lo ves en Inicio y en Canjes.">
        <Captura src="p-inicio.jpg" alt="Inicio del panel" alto={100} />
        <Nota n={1}>La persona elige su premio en la app y, estando en tu local, toca «Canjear».</Nota>
        <Nota n={2}>Le dices el código de tu local. Ella lo escribe en la app y el canje se confirma al instante: no hace falta que abras el panel.</Nota>
        <Nota n={3}>Entregas el premio. Cada persona puede canjear en tu local una vez cada 14 días (dos semanas).</Nota>
        <Nota n="!">
          ¿Se filtró tu código? En Canjes toca «Cambiar código» y avísale el nuevo a tu equipo. Los premios online usan otro sistema: la persona te manda un código de 6 números y lo confirmas en Canjes.
        </Nota>
        <Captura src="p-canjes.jpg" alt="Canjes" alto={62} />
      </Hoja>

      {/* 7. Herramientas */}
      <Hoja n={7} etiqueta="HERRAMIENTAS" titulo="Lo que trae el panel" bajada="Menú de la izquierda (en el celular, el botón de arriba).">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
          <Tarjeta titulo="Ruta del mes" img="p-ruta.jpg">
            Cada mes la gente arma una ruta de locales y la recorre. Dale el código de la Ruta a quien viene por la Ruta cuando paga y confirma su visita.
          </Tarjeta>
          <Tarjeta titulo="Catálogo o menú" img="p-catalogo.jpg">
            Pega el link de tu catálogo (WhatsApp, web o Drive), sube un PDF o carga tus productos con foto y precio. En la app sale «Ver catálogo».
          </Tarjeta>
          <Tarjeta titulo="Mi equipo" img="p-equipo.jpg">
            Dale acceso a tus cajeros: solo ven el código del local y los canjes, sin tu contraseña. Hasta 5 cajeros.
          </Tarjeta>
          <Tarjeta titulo="Plan" img="p-plan.jpg">
            Empiezas gratis con Primer Paso. Cambias cuando quieras, sin permanencia: si bajas o cancelas, el cambio rige al terminar el mes pagado.
          </Tarjeta>
        </div>
      </Hoja>

      {/* 8. Más herramientas */}
      <Hoja n={8} etiqueta="HERRAMIENTAS" titulo="Más herramientas" bajada="Algunas son de los planes de pago: en el menú se ven con un candado.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
          <Tarjeta titulo="Tarjeta de fidelidad" plan="Paso Firme y Paso Adelante" img="p-tarjeta.jpg">
            Cada canje en cualquier comercio suma un sello. Con 5 sellos, la persona elige un premio gratis entre los locales que participan: tú eliges cuál ofreces.
          </Tarjeta>
          <Tarjeta titulo="Estadísticas" plan="Paso Firme y Paso Adelante" img="p-estadisticas.jpg">
            Cómo te va en los últimos 30 días: canjes por día, el premio más canjeado y las horas con más visitas.
          </Tarjeta>
          <Tarjeta titulo="Avisos cercanos" plan="Paso Adelante" img="p-avisos.jpg">
            Una notificación a quienes caminan cerca de tu local. Hasta 3 por mes, revisados por Camina antes de salir.
          </Tarjeta>
          <Tarjeta titulo="Desafíos y eventos" img="p-eventos.jpg">
            Publica un evento o un desafío dentro de la app (Bs 200 por publicación). Camina lo revisa antes de mostrarlo.
          </Tarjeta>
        </div>
      </Hoja>

      {/* 9. Guía, cuenta y lista final */}
      <Hoja n={9} etiqueta="MANUAL Y CUENTA" titulo="Guía y reglas, y Mi cuenta" bajada="Dentro del panel tienes el manual para atender canjes, y puedes cambiar tu correo y tu contraseña.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm' }}>
          <Tarjeta titulo="Guía y reglas" img="p-guia.jpg" alto={70}>
            Cómo validar un canje, qué hacer si algo falla, las reglas y preguntas frecuentes. Desde ahí también abres la guía rápida.
          </Tarjeta>
          <Tarjeta titulo="Mi cuenta" img="p-cuenta.jpg" alto={70}>
            Verifica tu correo con el código de 6 números, cámbialo cuando quieras y cambia tu contraseña.
          </Tarjeta>
        </div>
        <div style={{ border: `1.5px solid ${C.menta}`, borderRadius: 14, padding: '10px 14px', marginTop: 4 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: C.tinta, margin: '0 0 6px' }}>Lista final</p>
          {['Cuenta creada y correo verificado', 'Logo, foto de portada y descripción', 'Categoría, ciudad, dirección y horarios', 'Pin del local en el mapa', 'Un premio activo con su foto', 'Tu equipo sabe el código del local'].map((t) => (
            <p key={t} style={{ fontSize: 12, margin: '4px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 13, height: 13, border: `1.5px solid ${C.aqua}`, borderRadius: 3, display: 'inline-block' }} />
              {t}
            </p>
          ))}
        </div>
        <p style={{ background: C.tinta, color: '#fff', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, margin: 0 }}>
          <b style={{ color: C.menta }}>¿Te ayudamos?</b> Escríbenos por WhatsApp al +591 627 14286: mándanos tus datos y fotos y cargamos todo nosotros.
        </p>
      </Hoja>
    </div>
  );
}
