'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Eye, PlayCircle } from 'lucide-react';
import { PresentarLocal, type VistaLocal } from '@/components/PresentarLocal';
import { PLANS, PLAN_EXPLICA } from '@/lib/plans';
import { partnersWa } from '@/lib/partners';

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
  ['"¿Cuánto cuesta?"', 'Empezar es gratis y sin contrato. Los primeros comercios tienen 3 meses gratis de Paso Firme. Lo único que cuesta es el premio que usted elige, y solo cuando alguien lo canjea. Si después quiere más, hay planes opcionales: Paso Firme (Bs 99 al mes) y Paso Adelante (Bs 299 al mes).'],
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

// Local de ejemplo para mostrar cómo se ve en la app, a pantalla completa y deslizando.
const EJEMPLO: VistaLocal = {
  name: "Fripap's",
  category: 'Comida rápida',
  description: 'Salchipapas, hamburguesas y papas fritas hechas al momento en el centro de Tarija.',
  address: 'Centro',
  hours_text: 'Lun a Sáb 12:00 - 22:00',
  instagram: 'fripaps.tarija',
  phone: '70000000',
  logo_url: '/web/locales/fripaps-logo.jpg',
  cover_url: '/web/locales/fripaps-cover.jpg',
  lat: -21.5349,
  lng: -64.7311,
  premio: { name: 'Salchipapa clásica', description: 'Con tu compra de una bebida.', cost: 25, image_url: '/web/locales/fripaps-b1.jpg', kind: 'gratis' },
};

function AsiSeVe() {
  const [ver, setVer] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setVer(true)} className="flex items-center justify-center gap-2 w-full bg-mint text-mint-dark rounded-2xl py-4 font-bold text-[15px] mb-2">
        <Eye size={18} /> Ver un local de ejemplo como en la app
      </button>
      <p className="text-muted text-[12.5px] mb-4 text-center">Se abre a pantalla completa: desliza con el dedo para pasar del mapa a Canjes, la ficha del local y su premio. Para mostrar el local del dueño con sus fotos, usa “Mostrar al dueño” en Cargar un local.</p>
      {ver && <PresentarLocal vista={EJEMPLO} onClose={() => setVer(false)} />}
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">Capturas reales de la app</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1">
        {VISTAS.map((v) => (
          <figure key={v.img} className="snap-center shrink-0 w-[min(78vw,280px)] bg-card border border-line rounded-2xl p-2.5">
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

// Los beneficios que importan al dueño, dichos simple. Sin prometer ventas.
const GANA: { t: string; d: string }[] = [
  { t: 'Gente nueva que llega caminando', d: 'La app muestra su local en el mapa y en la lista de Canjes a personas que caminan cerca. Muchos todavía no son sus clientes.' },
  { t: 'Paga solo cuando alguien canjea', d: 'Empezar es gratis y sin contrato. Lo único que pone es el premio, y solo cuando una persona viene a buscarlo.' },
  { t: 'Él controla todo', d: 'Elige el premio, los días, la hora y cuántos da por día. Lo puede poner en su hora floja, cuando el local está vacío.' },
  { t: 'Su local se ve lindo en la app', d: 'Con logo, portada, fotos del premio, horario, WhatsApp, Instagram y el botón Cómo llegar.' },
  { t: 'Reseñas y publicidad gratis', d: 'Después de canjear, la app invita a dejar una reseña en Google Maps y a subir una historia en Instagram mostrando su local.' },
  { t: 'Clientes que vuelven', d: 'Cada local tiene su insignia: la persona sube de nivel cada vez que vuelve a canjear o lo califica.' },
  { t: 'Seguro y sin trampas', d: 'Para canjear hay que estar en el local y escribir su código de 4 números. Cada canje queda guardado con fecha y hora.' },
];

const PASOS_VISITA: { t: string; d: string; link?: { href: string; label: string } }[] = [
  { t: 'Entra y pregunta por el dueño', d: 'Si no está, pide su WhatsApp y usa el mensaje de "Si no está el dueño". Mejor entre las 15:00 y las 18:00.' },
  { t: 'Di el guion de 30 segundos', d: 'Está en "Qué decir". Léelo tal cual, sin apurarte.' },
  { t: 'Muéstrale el video para comercios', d: 'Dura un minuto y explica todo por ti.', link: { href: '/partners/panel/material', label: 'Abrir videos' } },
  { t: 'Muéstrale cómo quedaría su local', d: 'En "Cargar un local" pon el nombre y toca "Mostrar al dueño". Si todavía no quiere, usa el local de ejemplo de "Así se ve un local".', link: { href: '/partners/panel/reportar', label: 'Cargar un local' } },
  { t: 'Explícale qué gana (3 cosas)', d: 'Gente nueva que llega caminando, paga solo cuando alguien canjea y él elige el premio y la hora. El resto está en "Qué gana el local".' },
  { t: 'Responde sus dudas', d: 'Las respuestas listas están en "Dudas del dueño". Nunca prometas ventas.' },
  { t: 'Si dice que sí, cárgalo en 5 minutos', d: 'Con su celular, siguiendo "Cargar en 5 min". Que él elija el premio.' },
  { t: 'Cierra bien', d: 'Pega el afiche "Aquí se canjea", guarda el local en tu panel y despídete con tu WhatsApp por si tiene dudas.' },
];

// Links para instalar la app antes del lanzamiento (los pasa Camina).
const LINK_ANDROID = 'https://play.google.com/store/apps/details?id=bo.camina.app';
const LINK_TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';
const LINK_IOS = 'https://testflight.apple.com/join/FhPvhKSr';

const MSG_ANDROID = 'Hola! Para instalar Camina en Android pásame el correo de Gmail que usas en tu Play Store (el de tu celular). Con ese correo te habilitamos y te mando el link oficial de descarga.';
const MSG_IOS = `Hola! Para instalar Camina en iPhone:\n1. Descarga TestFlight de la App Store: ${LINK_TESTFLIGHT_APP}\n2. Después abre este link y toca Aceptar e Instalar: ${LINK_IOS || '[link de Camina]'}`;

function Descargar() {
  const [correo, setCorreo] = useState('');
  const pedido = `Hola! Soy partner de Camina. Por favor habiliten este correo de Play Store para descargar la app en Android: ${correo.trim()}`;
  return (
    <>
      <p className="text-muted text-[13.5px] mb-4">Antes del lanzamiento la app se instala con un link especial. Primero pregunta: <b className="text-text">¿tu celular es Android o iPhone?</b></p>

      <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-purple-text)' }}>Android</p>
      <ol className="flex flex-col gap-2 mb-3">
        {[
          ['Pídele el correo de Gmail que usa en Play Store', 'Es el correo con el que entra a la Play Store de ese celular (Play Store → su foto arriba a la derecha).'],
          ['Mándanos ese correo', 'Escríbelo abajo y toca el botón: nos llega por WhatsApp y lo habilitamos.'],
          ['Pásale el link oficial de descarga', 'Con el correo habilitado, abre el link en su celular, toca "Aceptar" y luego "Descargar" en Play Store.'],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3 bg-card border border-line rounded-2xl px-4 py-3">
            <span className="w-6 h-6 rounded-full bg-mint text-mint-dark font-extrabold text-[12px] flex items-center justify-center shrink-0">{i + 1}</span>
            <div><p className="font-semibold text-text text-[14px]">{t}</p><p className="text-muted text-[12.5px] mt-0.5">{d}</p></div>
          </li>
        ))}
      </ol>
      <div className="bg-card border border-line rounded-2xl p-3.5 mb-3">
        <input value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="correo@gmail.com" aria-label="Correo de Play Store" className="w-full rounded-xl p-3 border border-line bg-[var(--c-bg)] text-text" />
        <a href={/\S+@\S+\.\S+/.test(correo) ? partnersWa(pedido) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!/\S+@\S+\.\S+/.test(correo)}
          className={`mt-2.5 block text-center rounded-xl py-3 font-bold text-[14px] ${/\S+@\S+\.\S+/.test(correo) ? 'bg-mint text-mint-dark' : 'bg-purple-light text-muted pointer-events-none'}`}>
          Mandar el correo a Camina
        </a>
      </div>
      <a href={LINK_ANDROID} target="_blank" rel="noopener noreferrer" className="block text-center rounded-xl py-3 mb-2 font-bold text-[13.5px] bg-[var(--c-btn-bg)] text-[var(--c-btn-text)]">Abrir el link de descarga (Android)</a>
      <Frase texto={`Ya te habilitamos. Descarga Camina desde este link oficial (ábrelo en tu celular, con la misma cuenta de Gmail): ${LINK_ANDROID}`}>
        <p className="text-[13px] text-muted mb-1">Mensaje con el link, para cuando ya esté habilitado:</p>
        <p className="break-all">Ya te habilitamos. Descarga Camina desde este link oficial (ábrelo en tu celular, con la misma cuenta de Gmail): {LINK_ANDROID}</p>
      </Frase>
      <Frase texto={MSG_ANDROID}>{MSG_ANDROID}</Frase>

      <p className="text-[12px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--c-purple-text)' }}>iPhone</p>
      <ol className="flex flex-col gap-2 mb-3">
        {[
          ['Que descargue TestFlight', 'Es la app oficial de Apple para probar apps. Está gratis en la App Store.'],
          ['Que abra el link de Camina', 'Se abre en TestFlight: toca "Aceptar" y luego "Instalar".'],
          ['Listo', 'Camina queda instalada como cualquier app. Las actualizaciones llegan solas por TestFlight.'],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3 bg-card border border-line rounded-2xl px-4 py-3">
            <span className="w-6 h-6 rounded-full bg-mint text-mint-dark font-extrabold text-[12px] flex items-center justify-center shrink-0">{i + 1}</span>
            <div><p className="font-semibold text-text text-[14px]">{t}</p><p className="text-muted text-[12.5px] mt-0.5">{d}</p></div>
          </li>
        ))}
      </ol>
      <div className="flex gap-2 mb-3">
        <a href={LINK_TESTFLIGHT_APP} target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-xl py-3 font-bold text-[13.5px] bg-[var(--c-btn-bg)] text-[var(--c-btn-text)]">1. Bajar TestFlight</a>
        {LINK_IOS ? <a href={LINK_IOS} target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-xl py-3 font-bold text-[13.5px] bg-mint text-mint-dark">2. Instalar Camina</a> : null}
      </div>
      <Frase texto={MSG_IOS}><p className="whitespace-pre-line break-all">{MSG_IOS}</p></Frase>
    </>
  );
}

const TABS = [
  { id: 'ofrecer', label: 'Cómo ofrecer' },
  { id: 'gana', label: 'Qué gana el local' },
  { id: 'planes', label: 'Planes' },
  { id: 'app', label: 'Descargar la app' },
  { id: 'decir', label: 'Qué decir' },
  { id: 'asi', label: 'Así se ve un local' },
  { id: 'dudas', label: 'Dudas del dueño' },
  { id: 'carga', label: 'Cargar en 5 min' },
  { id: 'prometer', label: 'No prometer' },
  { id: 'donde', label: 'Dónde ir' },
] as const;

export function GuiaPartner() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('ofrecer');
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
        {tab === 'ofrecer' && (
          <>
            <p className="text-muted text-[13.5px] mb-3">La visita completa dura unos 10 minutos. Sigue estos pasos en orden.</p>
            <ol className="flex flex-col gap-2.5">
              {PASOS_VISITA.map((p, i) => (
                <li key={p.t} className="flex gap-3 bg-card border border-line rounded-2xl px-4 py-3.5">
                  <span className="w-7 h-7 rounded-full bg-mint text-mint-dark font-extrabold text-[13px] flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-text text-[14.5px] leading-tight">{p.t}</p>
                    <p className="text-muted text-[13px] leading-snug mt-1">{p.d}</p>
                    {p.link && (
                      <Link href={p.link.href} className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-bold" style={{ color: 'var(--c-purple-text)' }}>
                        <PlayCircle size={15} /> {p.link.label}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        {tab === 'gana' && (
          <>
            <p className="text-muted text-[13.5px] mb-3">Explícalo con tus palabras. Lo más importante va primero.</p>
            <div className="flex flex-col gap-2.5 mb-5">
              {GANA.map((g) => (
                <div key={g.t} className="bg-card border border-line rounded-2xl px-4 py-3.5">
                  <p className="font-semibold text-text text-[14.5px]">{g.t}</p>
                  <p className="text-muted text-[13px] leading-snug mt-0.5">{g.d}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setTab('planes')} className="w-full text-left bg-card border border-line rounded-2xl px-4 py-3.5 mb-3">
              <p className="font-semibold text-text text-[14.5px]">Ver los planes y todo lo que incluye cada uno →</p>
              <p className="text-muted text-[12.5px] mt-0.5">Gratis, Bs 99 y Bs 299 al mes.</p>
            </button>
            <p className="text-[13px] rounded-xl px-4 py-3 mb-3" style={{ background: 'var(--c-aqua-light)', color: 'var(--c-ok-text)' }}>
              <b>Cupo fundador:</b> los primeros comercios tienen 3 meses gratis de Paso Firme. Después pueden seguir gratis con Primer Paso.
            </p>
            <p className="text-muted text-[12.5px]">Para la explicación completa, manda el dossier desde “Material para mostrar”.</p>
          </>
        )}

        {tab === 'app' && <Descargar />}

        {tab === 'planes' && (
          <>
            <p className="text-muted text-[13.5px] mb-3">Todo lo que trae cada plan, explicado simple. Empezar es gratis; el dueño elige si quiere más.</p>
            <div className="flex flex-col gap-3 mb-4">
              {PLANS.map((pl) => (
                <div key={pl.id} className={`rounded-2xl px-4 py-4 border ${pl.featured ? 'border-[#62f0b6]/60 bg-card' : 'border-line bg-card'}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-text text-[17px]">{pl.name}</p>
                    <p className="font-extrabold text-[16px]" style={{ color: 'var(--c-purple-text)' }}>{pl.price}</p>
                  </div>
                  <p className="text-muted text-[13px] mt-0.5 mb-2.5">{pl.blurb}</p>
                  <ul className="flex flex-col gap-2">
                    {pl.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <Check size={16} className="text-aqua shrink-0 mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-text text-[14px] leading-snug">{f}</span>
                          {PLAN_EXPLICA[f] && <span className="block text-muted text-[12.5px] leading-snug">{PLAN_EXPLICA[f]}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-[13px] rounded-xl px-4 py-3" style={{ background: 'var(--c-aqua-light)', color: 'var(--c-ok-text)' }}>
              <b>Cupo fundador:</b> los primeros comercios tienen 3 meses gratis de Paso Firme. Después pueden seguir gratis con Primer Paso.
            </p>
          </>
        )}

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
              <p className="text-muted text-[14px]">El Centro y alrededor de la plaza (muchos locales juntos), cerca de las universidades, avenidas con muchos locales seguidos y tu propia zona, donde conoces a los dueños.</p>
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
