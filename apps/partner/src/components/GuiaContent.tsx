// Contenido de la guía para comercios. Lo usan el panel (/guia) y la versión
// imprimible (/guia/imprimir) que se convierte en PDF.

const PASOS = [
  { t: 'La persona te muestra su código', d: 'Al canjear en la app de Camina le aparece un código de 6 dígitos con el nombre del beneficio.' },
  { t: 'Lo escribís en "Canjes"', d: 'En el panel, entrá a Canjes, escribí el código y tocá Confirmar. Se puede hacer desde el celular.' },
  { t: 'Revisás que coincida', d: 'El panel te muestra qué beneficio es. Verificá que sea el que ofrecés hoy y que esté dentro de su horario.' },
  { t: 'Entregás el beneficio', d: 'Una vez confirmado, entregás lo prometido. Cada código se confirma una sola vez.' },
];

const SI_FALLA = [
  ['El código venció', 'Los códigos duran 15 minutos. Si venció, la persona genera otro desde la app y se le devuelven los puntos.'],
  ['Dice "código no encontrado"', 'Revisá que lo hayas escrito bien (son 6 números). Si sigue, pedile que abra la app y lo genere de nuevo.'],
  ['Es de otro local', 'Cada código sirve solo en el comercio donde se canjeó. Avisale para que no pierda sus puntos.'],
  ['Ya lo confirmaron', 'Un código no se puede usar dos veces. Si hay dudas, escribinos por WhatsApp.'],
];

const REGLAS = [
  ['Lo que publicás es lo que entregás', 'El beneficio tiene que ser real, vigente y como está descrito (horario, días, condiciones). Si algo cambia, editalo o pausalo en "Mis beneficios".'],
  ['Sin consumo extra obligatorio', 'Un beneficio "gratis" no puede pedir que la persona compre otra cosa. Si tu descuento es sobre una compra, dejalo claro en la descripción.'],
  ['Un canje, una confirmación', 'Cada código se confirma una sola vez. No confirmes códigos por adelantado ni por terceros.'],
  ['Códigos de 15 minutos', 'El código dura 15 minutos. Si vence, se cancela y la persona recupera sus puntos.'],
  ['Una vez cada 14 días por comercio', 'Cada persona puede canjear en tu local una vez cada 14 días. Así el beneficio alcanza para más gente.'],
  ['Cupones por día', 'Elegís cuántos cupones das por día, o ilimitados. Cuando se agotan, el beneficio aparece como agotado hasta el día siguiente.'],
  ['Puntos justos', 'Como guía: algo de Bs 10 ronda los 20 puntos. En la app se gana 1 punto cada 1.000 pasos, con un máximo de 20 por día.'],
  ['Fotos para publicarte', 'Para aparecer en la app necesitamos tu logo y una foto de portada. Cada beneficio necesita su propia foto para poder guardarse.'],
  ['Avisos cercanos (Paso Adelante)', 'Hasta 3 por mes. Los revisamos antes de enviarlos, salen entre 8:00 y 21:00 y cada persona recibe como máximo 1 por semana. Nada de mensajes engañosos.'],
  ['Trato respetuoso', 'Las personas que canjean son clientes tuyos: atendelas como a cualquiera. Camina puede pausar comercios con quejas repetidas.'],
];

const FAQ = [
  ['¿Cómo cambio mi horario?', 'Perfil del local → Horarios. Marcás los días que abrís y la hora de apertura y cierre.'],
  ['¿Cómo subo o pauso un beneficio?', 'Mis beneficios → elegís el beneficio → "Activo" para pausarlo o reactivarlo.'],
  ['¿Puedo cambiar de plan?', 'Sí, cuando quieras desde Plan. Empezás gratis en Primer Paso.'],
  ['¿Dónde veo cuánta gente canjeó?', 'En Inicio y en Estadísticas (según tu plan).'],
  ['Necesito ayuda', 'Escribinos por WhatsApp al +591 627 14286.'],
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
