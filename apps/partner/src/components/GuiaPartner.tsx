'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          // sin portapapeles: la persona puede seleccionar el texto a mano
        }
      }}
      className="mt-2.5 inline-flex items-center gap-1.5 bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-lg px-3.5 py-2 text-[13px] font-bold"
    >
      {ok ? <Check size={14} /> : <Copy size={14} />}
      {ok ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function Frase({ children, texto }: { children: React.ReactNode; texto: string }) {
  return (
    <div className="bg-purple-light rounded-2xl px-4 py-3.5 mb-3 text-[15px] leading-relaxed text-text">
      {children}
      <div><Copiar texto={texto} /></div>
    </div>
  );
}

const G1 = 'Hola, buenas tardes. Soy [tu nombre], de Camina, una app de Tarija que premia a la gente por caminar. La gente junta puntos con sus pasos y los canjea en locales como el suyo.\n\nUsted elige el premio (un café, un descuento, lo que quiera), los días, la hora y cuántos da por día. Lo pone justo en las horas en que el local está más tranquilo. Es gratis para empezar y sin contrato.\n\n¿Le muestro en 2 minutos cómo se ve en el celular?';
const G2 = 'Hola, soy [tu nombre], de Camina, una app de Tarija que premia con puntos a la gente por caminar, y se canjean en locales. Pasé por [local] y me gustaría mostrarle cómo sumarlo (es gratis y toma unos 5 minutos). ¿Qué día y hora le queda cómodo?';
const G3 = 'Claro. ¿Me da su WhatsApp y le mando un resumen? Le escribo el [día] para ver qué decidió.';
const G4 = 'Perfecto. Lo dejamos andando ahora con su celular. Son unos 5 minutos: elegimos su premio, tomamos una foto y queda listo para revisión.';
const G5 = 'No le puedo asegurar ventas. Lo que sí le aseguro es que no hay contrato, que usted controla el premio y que puede pausarlo cuando quiera.';

const DUDAS: [string, string][] = [
  ['"No tengo tiempo."', 'Lo entiendo. Por eso lo cargamos ahora mismo, en 5 minutos, desde su celular, y yo le ayudo. Después no tiene que hacer casi nada: solo entregar el premio cuando alguien venga. ¿Lo hacemos ahora o paso el [día]?'],
  ['"Ya tengo tarjeta de fidelidad."', 'Perfecto, y no la cambia. Una tarjeta premia a quien ya viene; Camina le trae personas nuevas que todavía no son sus clientes. Pueden convivir.'],
  ['"No entiendo de tecnología."', 'No instala nada. Es una página web que abre desde su celular, como cuando abre Facebook. Yo le ayudo a cargarlo ahora, y los pasos son siempre los mismos.'],
  ['"¿Cuánto cuesta?"', 'Empezar es gratis y sin contrato. Los primeros comercios tienen 3 meses gratis de un plan completo. Lo único que cuesta es el premio que usted elige, y solo cuando alguien lo canjea. Más adelante hay planes de pago opcionales: Bs 100 y Bs 300 al mes.'],
  ['"Me van a pedir gratis todo el día."', 'Usted decide cuántos cupones da por día, qué días y a qué hora. En su hora pico, el premio no se puede canjear. Y la misma persona solo puede volver a canjear en su local después de 7 días.'],
  ['"¿Cuánta gente usa la app?"', 'Es nueva, se lanza el 1 de diciembre en Tarija. Por eso estamos sumando primero a los locales: los primeros son los que más se van a ver.'],
  ['"¿Y si alguien hace trampa?"', 'El cliente tiene que estar en su local y escribir el código de su local. Cada canje queda guardado con fecha y hora en su panel. Si quiere cambiar el código, hay un botón "Cambiar código".'],
  ['"¿Me van a cobrar después?"', 'No. Hoy empezar es gratis. Si algún día quiere más (premios sin límite, que lo destaquen), hay planes opcionales y usted decide. Sin contrato: lo pausa o lo cancela cuando quiera.'],
  ['"Lo voy a pensar."', G3],
];

type Paso = { t: string; s?: string };
const MINUTOS: { titulo: string; pasos: Paso[] }[] = [
  { titulo: 'Minuto 0 a 1: crear la cuenta', pasos: [
    { t: 'En el celular del dueño abre caminaapp.com/alta', s: 'Elige "Soy un comercio" y luego "Tienda física".' },
    { t: 'Pon nombre del local, tipo de comercio, ciudad, dirección y su WhatsApp' },
    { t: 'Pon su correo y una clave que él recuerde. Toca "Crear cuenta"', s: 'Entra directo al panel. El correo de verificación le llega después, no hay que esperarlo.' },
  ] },
  { titulo: 'Minuto 1 a 2: datos del local', pasos: [
    { t: 'En Perfil del local, escribe la descripción (qué ofrece y qué lo hace especial)', s: 'Entre 15 y 500 letras. Dos frases bastan.' },
    { t: 'Pon el horario: días y hora de apertura y cierre' },
    { t: 'Ubicación: parado dentro del local, toca "Usar mi ubicación actual" y acepta el permiso', s: 'Sin esto el local no sale en el mapa de la app.' },
  ] },
  { titulo: 'Minuto 2 a 4: el premio', pasos: [
    { t: 'Menú Beneficio. Elige "Gratis" (regala algo) o "Descuento" (un % o 2x1)', s: 'Lo elige el dueño, no tú. Sugerencia: algo que le cueste poco y traiga gente en su hora floja.' },
    { t: 'Pon nombre y descripción cortos del premio' },
    { t: 'Toma ahí mismo la foto cuadrada del premio (es obligatoria)', s: 'De día, cerca de una ventana, sin texto encima.' },
    { t: 'Define cupones por día, días y horario', s: 'Aquí va la hora floja. Pregúntale: "¿cuándo está más vacío su local?"' },
  ] },
  { titulo: 'Minuto 4 a 5: cerrar', pasos: [
    { t: 'Muéstrale el código del local (4 números)', s: 'Es el que los clientes escriben en la app. Si quiere otro, "Cambiar código".' },
    { t: 'Pega el afiche "Aquí se canjea" en el mostrador' },
    { t: 'Repórtalo en "Reportar un local"', s: 'Sin este paso no se registra que lo trajiste tú.' },
  ] },
];

function Reloj() {
  const [left, setLeft] = useState(300);
  const [run, setRun] = useState(false);
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!run) return;
    t.current = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => { if (t.current) clearInterval(t.current); };
  }, [run]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <div className="flex items-center justify-between gap-3 bg-auth-bg rounded-2xl px-4 py-3.5 mb-4">
      <span className="text-mint font-extrabold text-[32px] tabular-nums">{m}:{String(s).padStart(2, '0')}</span>
      <button
        type="button"
        onClick={() => { if (run) { setRun(false); setLeft(300); } else setRun(true); }}
        className="bg-mint text-mint-dark rounded-lg px-4 py-2.5 text-[14px] font-bold"
      >
        {run ? 'Reiniciar' : 'Empezar reloj'}
      </button>
    </div>
  );
}

const ASI = 'Así se ve su local en la app. Aparece en el mapa y en la lista de Canjes, con su logo, su portada y su premio. La persona llega, escribe el código de su local y usted le entrega el premio. Después la app le invita a dejarle una reseña en Google Maps y a subir una historia a Instagram.';

const VISTAS: { img: string; titulo: string; texto: string }[] = [
  { img: 'canjes-dark', titulo: '1. Aparece en Canjes', texto: 'Su local sale en la lista y en el mapa de la app, con su portada, su logo y el premio. Así lo encuentran las personas cerca.' },
  { img: 'mapa-dark', titulo: '2. En el mapa, con sus premios', texto: 'Su logo aparece como pin en el mapa. La persona lo toca y ve sus premios con el botón Ver local y premios.' },
  { img: 'canje-calificar-v3-dark', titulo: '3. Después del canje', texto: 'Cuando canjea, la app invita a dejar una reseña en Google Maps. Eso le trae más visibilidad al local.' },
  { img: 'canje-historia-v3-dark', titulo: '4. Historia en Instagram', texto: 'La persona puede subir una historia etiquetando a @caminaapp. Eso muestra el local a más gente.' },
];

function AsiSeVe() {
  return (
    <>
      <p className="text-muted text-[13.5px] mb-3">Muéstrale esto al dueño desde tu celular. Son capturas reales de locales ya publicados en la app (ejemplo: Bloom).</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1">
        {VISTAS.map((v) => (
          <figure key={v.img} className="snap-center shrink-0 w-[236px] bg-card border border-line rounded-2xl p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/partners/${v.img}.jpg`} alt={v.titulo} width={780} height={1691} loading="lazy" className="w-full h-auto rounded-xl" />
            <figcaption className="px-1 pt-2.5 pb-1">
              <p className="font-bold text-text text-[14px] mb-1">{v.titulo}</p>
              <p className="text-muted text-[12.5px] leading-snug">{v.texto}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mt-2 mb-1.5">Qué decirle mientras se lo muestras</p>
      <Frase texto={ASI}>{ASI}</Frase>
      <div className="bg-card border border-line rounded-2xl px-4 py-3.5 text-[14px] text-text">
        <p className="font-semibold mb-1">Cómo canjea la persona en su local</p>
        <ul className="list-disc pl-5 space-y-1 text-muted">
          <li>Va a su local, elige el premio en la app y toca &quot;Canjear&quot;.</li>
          <li>Escribe el <b className="text-text">código del local</b> (4 números). Tiene que estar ahí, en el local.</li>
          <li>El canje queda guardado con fecha y hora, y el dueño entrega el premio.</li>
        </ul>
      </div>
    </>
  );
}

const TABS = [
  { id: 'decir', label: 'Qué decir' },
  { id: 'asi', label: 'Así se ve un local' },
  { id: 'dudas', label: 'Dudas del dueño' },
  { id: 'carga', label: 'Cargar en 5 min' },
  { id: 'prometer', label: 'No prometer' },
  { id: 'donde', label: 'Dónde ir' },
] as const;

export function GuiaPartner() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('decir');
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});

  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">Guía y qué decir</h1>
      <p className="text-muted text-[13.5px] mb-4">Ábrela en el celular durante la visita. No hace falta aprender nada de memoria: lee el guion.</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1" role="tablist">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold ${tab === x.id ? 'bg-[var(--c-btn-bg)] text-[var(--c-btn-text)]' : 'bg-purple-light text-muted'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="max-w-[640px]">
        {tab === 'decir' && (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Guion de 30 segundos</p>
            <Frase texto={G1}>
              <p>Hola, buenas tardes. Soy <b>[tu nombre]</b>, de <b>Camina</b>, una app de Tarija que premia a la gente por caminar. La gente junta puntos con sus pasos y los canjea en locales como el suyo.</p>
              <p className="mt-3">Usted elige el premio (un café, un descuento, lo que quiera), los días, la hora y cuántos da por día. Lo pone justo en las <b>horas en que el local está más tranquilo</b>. Es gratis para empezar y sin contrato.</p>
              <p className="mt-3">¿Le muestro en 2 minutos cómo se ve en el celular?</p>
            </Frase>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Si no está el dueño (WhatsApp)</p>
            <Frase texto={G2}>{G2}</Frase>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Para mostrar en 20 segundos</p>
            <div className="bg-card border border-line rounded-2xl px-4 py-3.5 mb-3 text-[14px] text-text">
              <ul className="list-disc pl-5 space-y-1">
                <li>La persona camina y gana Puntos.</li>
                <li>Viene a su local y escribe el <b>código de su local</b> (4 números) en la app. Tiene que estar ahí.</li>
                <li>El canje queda registrado con fecha y hora. Usted entrega el premio.</li>
              </ul>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Si dice &quot;lo pienso&quot;</p>
            <Frase texto={G3}>{G3}</Frase>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Cierre cuando dice que sí</p>
            <Frase texto={G4}>{G4}</Frase>
          </>
        )}

        {tab === 'asi' && <AsiSeVe />}

        {tab === 'dudas' && (
          <div className="flex flex-col gap-2.5">
            {DUDAS.map(([q, a]) => (
              <details key={q} className="bg-card border border-line rounded-2xl">
                <summary className="px-4 py-3.5 font-semibold text-text text-[14.5px] cursor-pointer">{q}</summary>
                <div className="px-4 pb-4">
                  <Frase texto={a}>{a}</Frase>
                </div>
              </details>
            ))}
          </div>
        )}

        {tab === 'carga' && (
          <>
            <p className="text-muted text-[13.5px] mb-3">Primero solo lo mínimo para que el local salga. El logo y la portada se suben después, el mismo día. Los nombres de los botones pueden cambiar un poco, pero el orden es este.</p>
            <Reloj />
            {MINUTOS.map((bloque) => (
              <div key={bloque.titulo} className="mb-4">
                <p className="text-purple-text text-[12px] font-extrabold tracking-wider uppercase mb-2" style={{ color: 'var(--c-purple-text)' }}>{bloque.titulo}</p>
                <div className="bg-card border border-line rounded-2xl divide-y divide-line">
                  {bloque.pasos.map((p) => (
                    <label key={p.t} className="flex gap-3 px-4 py-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!marcados[p.t]}
                        onChange={(e) => setMarcados({ ...marcados, [p.t]: e.target.checked })}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#8b4fd1]"
                      />
                      <span className="min-w-0">
                        <span className="block text-text text-[14.5px]">{p.t}</span>
                        {p.s && <span className="block text-muted text-[12.5px] mt-0.5">{p.s}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-card border border-line rounded-2xl px-4 py-3.5 mb-3 text-[14px] text-text">
              <p className="font-semibold mb-1">Después, el mismo día</p>
              <ul className="list-disc pl-5 space-y-1 text-muted">
                <li>Sube el logo (o una foto de la fachada) y la portada (foto horizontal del local).</li>
                <li>Si tiene Instagram, Facebook o link de Google Maps, agrégalos.</li>
                <li>El local queda en revisión y Camina lo aprueba, normalmente el mismo día.</li>
              </ul>
            </div>
            <p className="text-[13px] rounded-xl px-4 py-3" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>
              Si algo falla, no sigas improvisando: saca una captura de pantalla y mándala al WhatsApp de Camina.
            </p>
          </>
        )}

        {tab === 'prometer' && (
          <>
            <div className="rounded-2xl px-4 py-3.5 mb-3" style={{ background: 'var(--c-aqua-light)' }}>
              <p className="font-bold mb-1.5" style={{ color: 'var(--c-ok-text)' }}>Sí puedes decir</p>
              <ul className="list-disc pl-5 space-y-1 text-text text-[14.5px]">
                <li>Es gratis para empezar y sin contrato.</li>
                <li>Usted elige el premio, los días, la hora y los cupones.</li>
                <li>Cada canje queda registrado con fecha y hora.</li>
                <li>La persona tiene que estar en su local y poner el código.</li>
                <li>Es una app nueva que se lanza el 1 de diciembre en Tarija.</li>
              </ul>
            </div>
            <div className="rounded-2xl px-4 py-3.5 mb-3" style={{ background: 'var(--c-danger-light)' }}>
              <p className="font-bold mb-1.5" style={{ color: 'var(--c-danger-text)' }}>Nunca prometas</p>
              <ul className="list-disc pl-5 space-y-1 text-text text-[14.5px]">
                <li>&quot;Va a vender más&quot; o &quot;se va a llenar de clientes&quot;.</li>
                <li>Cuánto dinero va a ganar.</li>
                <li>Cantidad de usuarios, descargas o canjes.</li>
                <li>Funciones o fechas que hoy no están en la app.</li>
                <li>Que nunca va a pagar nada, para siempre.</li>
              </ul>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Cuando te presionen</p>
            <Frase texto={G5}>{G5}</Frase>
            <div className="rounded-2xl px-4 py-3.5" style={{ background: 'var(--c-danger-light)' }}>
              <p className="font-bold mb-1.5" style={{ color: 'var(--c-danger-text)' }}>Reglas que te sacan del programa</p>
              <ul className="list-disc pl-5 space-y-1 text-text text-[14.5px]">
                <li>Cargar un local sin que el dueño lo sepa, o poner un premio que él no eligió.</li>
                <li>Canjear tú (o tu familia) en un local que trajiste.</li>
                <li>Crear cuentas falsas. Un celular, una cuenta.</li>
              </ul>
            </div>
          </>
        )}

        {tab === 'donde' && (
          <>
            <div className="bg-card border border-line rounded-2xl px-4 py-3.5 mb-3">
              <p className="font-semibold text-text mb-1.5">Qué tipo de local</p>
              <p className="text-muted text-[14px]">Cafeterías y heladerías, pastelerías, barberías y peluquerías, gimnasios, comida rápida, fotocopiadoras y librerías cerca de universidades. Un premio barato en una hora floja funciona mejor.</p>
            </div>
            <div className="bg-card border border-line rounded-2xl px-4 py-3.5 mb-3">
              <p className="font-semibold text-text mb-1.5">Dónde empezar</p>
              <p className="text-muted text-[14px]">El Centro y alrededor de la plaza (muchos locales juntos), cerca de las universidades, avenidas con muchos locales seguidos y tu propio barrio, donde conoces a los dueños.</p>
            </div>
            <div className="bg-card border border-line rounded-2xl px-4 py-3.5">
              <p className="font-semibold text-text mb-1.5">Mejor momento y a quién evitar</p>
              <p className="text-muted text-[14px]">Visita entre 15:00 y 18:00, lejos de la hora de almuerzo, y pregunta siempre por el dueño o quien decide. Evita al inicio las cadenas y franquicias, y los locales donde nunca está el dueño.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
