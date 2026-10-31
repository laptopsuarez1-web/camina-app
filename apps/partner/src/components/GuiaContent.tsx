// Contenido de la guía para comercios. Lo usan el panel (/guia) y la versión
// imprimible (/guia/imprimir) que se convierte en PDF.

const PASOS = [
  { t: 'La persona elige el premio en la app', d: 'En tu local toca Canjear y la app le pide el código de 4 números de tu local.' },
  { t: 'Le dices tu código', d: 'Dile el código de tu local (lo ves en Canjes, arriba). No hace falta que abras el panel ni el celular.' },
  { t: 'La app confirma al instante', d: 'La persona escribe el código estando en tu local y ve "Canje confirmado". El canje queda registrado en Canjes con su premio.' },
  { t: 'Entregas el beneficio', d: 'Entrega lo prometido. Cada persona puede canjear una vez cada 7 días en tu local.' },
];

const SI_FALLA = [
  ['La app dice "Ese código no es"', 'Revisa en Canjes cuál es el código actual de tu local (son 4 números) y vuelve a decírselo.'],
  ['La app dice que está lejos', 'La persona tiene que estar a menos de 300 m de tu local. Pedile que active la ubicación; si tu local aparece mal en el mapa, escríbenos por WhatsApp.'],
  ['Se filtró tu código', 'En Canjes toca "Cambiar código": el anterior deja de servir. Avísale el nuevo a tu equipo.'],
  ['Quiere canjear otra vez', 'Cada persona puede canjear en tu local una vez cada 7 días. La app se lo avisa.'],
];

const REGLAS = [
  ['Lo que publicas es lo que entregas', 'El beneficio tiene que ser real, vigente y como está descrito (horario, días, condiciones). Si algo cambia, edítalo o páusalo en "Mis beneficios".'],
  ['Sin consumo extra obligatorio', 'Un beneficio "gratis" no puede pedir que la persona compre otra cosa. Si tu descuento es sobre una compra, déjalo claro en la descripción.'],
  ['Un canje, una entrega', 'Cada canje se entrega una sola vez. No des tu código a quien no esté en tu local.'],
  ['El código es de tu local', 'Tu código de 4 números sirve solo en tu comercio. Cámbialo desde Canjes cuando quieras.'],
  ['Una vez cada 7 días por comercio', 'Cada persona puede canjear en tu local una vez cada 7 días. Así el beneficio alcanza para más gente.'],
  ['Tarjeta de fidelidad (Paso Firme y Paso Adelante)', 'Cada canje confirmado en tu local suma un sello. Al completar 5, el siguiente canje del premio que elijas en la sección Tarjeta de fidelidad sale gratis: el premio lo pones tú y a la persona no se le descuentan Puntos. Después la tarjeta vuelve a empezar.'],
  ['Cupones por día', 'Eliges cuántos cupones das por día, o ilimitados. Cuando se agotan, el beneficio aparece como agotado hasta el día siguiente.'],
  ['Puntos justos', 'Como guía: 2,5 puntos equivalen a Bs 1, o sea que algo de Bs 10 ronda los 25 puntos. En la app se gana 1 punto cada 1.000 pasos, con un máximo de 20 por día.'],
  ['Fotos para publicarte', 'Para aparecer en la app necesitamos tu logo y una foto de portada. Cada beneficio necesita su propia foto para poder guardarse.'],
  ['Avisos cercanos (Paso Adelante)', 'Hasta 3 por mes. Los revisamos antes de enviarlos, salen entre 8:00 y 21:00 y cada persona recibe como máximo 1 por semana. Nada de mensajes engañosos.'],
  ['Trato respetuoso', 'Las personas que canjean son clientes tuyos: atendelas como a cualquiera. Camina puede pausar comercios con quejas repetidas.'],
];

const FAQ = [
  ['¿Cómo cambio mi horario?', 'Perfil del local → Horarios. Marcas los días que abres y la hora de apertura y cierre.'],
  ['¿Cómo subo o pauso un beneficio?', 'Mis beneficios → eliges el beneficio → "Activo" para pausarlo o reactivarlo.'],
  ['¿Puedo cambiar de plan?', 'Sí, cuando quieras desde Plan. Empiezas gratis en Primer Paso.'],
  ['¿Dónde veo cuánta gente canjeó?', 'En Inicio y en Estadísticas (según tu plan).'],
  ['¿Y los premios online (WhatsApp y redes)?', 'Esos canjes generan un código de 6 números que dura 7 días. La persona te lo manda y lo confirmas en Canjes → "Confirmar código".'],
  ['Necesito ayuda', 'Escríbenos por WhatsApp al +591 627 14286.'],
];

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 break-inside-avoid-page">
      <h2 className="font-extrabold text-[18px] mb-3.5" style={{ color: '#241748' }}>{title}</h2>
      {children}
    </section>
  );
}

export function GuiaContent() {
  return (
    <div>
      <Section id="canje" title="Cómo validar un canje">
        <ol className="flex flex-col gap-2.5 list-none p-0 m-0">
          {PASOS.map((p, i) => (
            <li key={p.t} className="flex gap-3 bg-white border border-line rounded-xl p-3.5 break-inside-avoid">
              <span
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[14px]"
                style={{ background: '#62F0B6', color: '#241748' }}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-[14px]">{p.t}</p>
                <p className="text-muted text-[13px] leading-5 mt-0.5">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="font-bold text-[14px] mt-5 mb-2">Si algo no sale</p>
        <div className="flex flex-col gap-2">
          {SI_FALLA.map(([t, d]) => (
            <div key={t} className="bg-white border border-line rounded-xl px-3.5 py-3 break-inside-avoid">
              <p className="font-semibold text-[13.5px]">{t}</p>
              <p className="text-muted text-[12.5px] leading-5">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="reglas" title="Reglas a considerar">
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {REGLAS.map(([t, d]) => (
            <li key={t} className="bg-white border border-line rounded-xl px-3.5 py-3 break-inside-avoid">
              <p className="font-semibold text-[13.5px]">{t}</p>
              <p className="text-muted text-[12.5px] leading-5">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="preguntas" title="Preguntas frecuentes">
        <div className="flex flex-col gap-2">
          {FAQ.map(([t, d]) => (
            <div key={t} className="bg-white border border-line rounded-xl px-3.5 py-3 break-inside-avoid">
              <p className="font-semibold text-[13.5px]">{t}</p>
              <p className="text-muted text-[12.5px] leading-5">{d}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
