'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PLANS, WHATSAPP_NUMBER, LANZAMIENTO, CUPO_FUNDADOR_ABIERTO } from '@/lib/plans';
import { InView, Kinetic } from './Motion';
import Trail from './Trail';

const WA_DUDA = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.')}`;

/* ---------- utilidades ---------- */

// true mientras el elemento está en pantalla (entra y sale).
function useVisto(ref: React.RefObject<HTMLElement | null>, threshold = 0.3) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return v;
}

function useReducida() {
  const [r, setR] = useState(false);
  useEffect(() => {
    setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  return r;
}

// Marco de iPhone con isla dinámica. Dentro va una captura real o una representación.
function IPhone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ip ${className}`}>
      <div className="ip-screen">
        <span className="ip-island" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function Cap({ src, alt, sizes, priority }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} />;
}

/* ---------- 1. Portada: la app real, pantalla por pantalla ---------- */

const HERO_PANTALLAS: Pantalla[] = [
  { src: '/web/cap/mapa-locales-dark.jpg', t: 'Te ven en el mapa', d: 'Tu local aparece en el mapa y en «Locales cerca tuyo».', alt: 'Pantalla real de Camina: mapa con locales de Tarija' },
  { src: '/web/cap/ficha-bloom-nivel-dark.jpg', t: 'Abren tu ficha', d: 'Tu foto, tu logo, tu horario y tus redes.', alt: 'Pantalla real de Camina: ficha de Bloom' },
  { src: '/web/cap/premios-bloom-dark.jpg', t: 'Canjean tus premios', d: 'Usan sus Puntos en tus premios y descuentos.', alt: 'Pantalla real de Camina: premios de Bloom' },
]

type Pantalla = { src: string; t: string; d: string; alt: string };

// Portada con un iPhone que pasa solo entre pantallas reales.
export function HeroApp({ kick, titulo, sub, cta, pantallas }: { kick: string; titulo: string; sub: string; cta: ReactNode; pantallas: Pantalla[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const visto = useVisto(ref, 0.25);
  const reducida = useReducida();
  const MS = 4600;
  useEffect(() => {
    if (!visto || reducida) return;
    const t = setTimeout(() => setI((x) => (x + 1) % pantallas.length), MS);
    return () => clearTimeout(t);
  }, [i, visto, reducida, pantallas.length]);
  return (
    <section className="lp-hero cx-hero">
      <div className="wrap cx-hero-grid">
        <div className="copy">
          <p className="kick">{kick}</p>
          <Kinetic as="h1" text={titulo} />
          <p className="sub">{sub}</p>
          <div className="lp-cta">{cta}</div>
        </div>

        <div className="cx-hshow" ref={ref} style={{ ['--ms' as string]: `${MS}ms` }}>
          <div className="cx-hphone">
            <IPhone>
              {pantallas.map((p, k) => (
                <div className={`scr${k === i ? ' on' : ''}`} key={p.src} aria-hidden={k !== i}>
                  <Cap src={p.src} alt={p.alt} sizes="(min-width:900px) 280px, 62vw" priority={k === 0} />
                </div>
              ))}
            </IPhone>
          </div>
          <ol className="cx-hpasos">
            {pantallas.map((p, k) => (
              <li key={p.src}>
                <button type="button" className={k === i ? 'on' : ''} aria-current={k === i} onClick={() => setI(k)}>
                  <b>{p.t}</b>
                  <span>{p.d}</span>
                  {k === i && !reducida && <i className="bar" key={`${i}-${visto}`} />}
                </button>
              </li>
            ))}
          </ol>
          <p className="cx-hdesc" aria-live="polite">{pantallas[i].d}</p>
        </div>
      </div>
    </section>
  );
}

export function HeroComercio() {
  return (
    <HeroApp
      kick="Para comercios"
      titulo="Tus próximos clientes ya están *caminando.*"
      sub="En Camina, las personas ganan Puntos por caminar y los canjean en comercios de su zona. Suma el tuyo."
      cta={<Link className="lp-btn mint cx-btn" href="/registro" data-medir="comercios_hero_sumar">Sumar mi comercio</Link>}
      pantallas={HERO_PANTALLAS}
    />
  );
}

/* ---------- Escaparate: iPhone que cambia solo entre pasos ---------- */

export type Item = { t: string; d: string; vista: (activo: boolean) => ReactNode };

export function Escaparate({ items, ms = 6500, nota, id }: { items: Item[]; ms?: number; nota?: string; id: string }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visto = useVisto(ref, 0.35);
  const reducida = useReducida();
  useEffect(() => {
    if (!visto || pausa || reducida) return;
    const id = setTimeout(() => setI((x) => (x + 1) % items.length), ms);
    return () => clearTimeout(id);
  }, [i, visto, pausa, reducida, ms, items.length]);
  return (
    <div ref={ref} id={id} className={`cx-esc${pausa ? ' paused' : ''}`} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} style={{ ['--ms' as string]: `${ms}ms` }}>
      <div className="cx-stage">
        <IPhone className="cx-float">
          {items.map((it, k) => (
            <div className={`scr${k === i ? ' on' : ''}`} key={it.t} aria-hidden={k !== i}>{it.vista(k === i && visto)}</div>
          ))}
        </IPhone>
      </div>
      <ol className="cx-tabs">
        {items.map((it, k) => (
          <li key={it.t}>
            <button type="button" className={k === i ? 'on' : ''} aria-current={k === i} onClick={() => setI(k)}>
              <span className="n">{k + 1}</span>
              <span className="tx"><b>{it.t}</b><span className="d">{it.d}</span></span>
              {k === i && !reducida && <i className="bar" key={`${i}-${visto}`} />}
            </button>
          </li>
        ))}
      </ol>
      {nota && <p className="cx-nota">{nota}</p>}
    </div>
  );
}

export function Funciones() {
  const items: Item[] = [
    { t: 'Tu ficha', d: 'Fotos, horario, dirección y tus redes.', vista: () => <Cap src="/web/cap/ficha-fripaps-v2-dark.jpg" alt="Pantalla de la app: ficha de Fripap's" sizes="260px" /> },
    { t: 'Tus premios', d: 'Tus premios y descuentos, con los Puntos que cuestan.', vista: () => <Cap src="/web/cap/premios-fripaps-dark.jpg" alt="Pantalla de la app: premios de Fripap's" sizes="260px" /> },
    { t: 'Te califican', d: 'Después del canje, la app invita a calificar tu local en Google Maps. Es opcional.', vista: () => <Cap src="/web/cap/canje-calificar-v3-dark.jpg" alt="Pantalla de la app: invitación a calificar" sizes="260px" /> },
    { t: 'Te mencionan', d: 'Si quiere, la persona sube una historia a Instagram con tu local.', vista: () => <Cap src="/web/cap/canje-historia-v3-dark.jpg" alt="Pantalla de la app: subir una historia" sizes="260px" /> },
  ];
  return (
    <section className="cx-sec" id="funciones">
      <div className="wrap">
        <p className="kick">Así funciona</p>
        <Kinetic text="Míralo *en* *acción.*" />
        <Escaparate id="esc-funciones" items={items} />
      </div>
    </section>
  );
}

/* ---------- 4. Ruta del mes (videos reales de la app) ---------- */

export function VideoRuta({ n, activo }: { n: string; activo: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reducida = useReducida();
  useEffect(() => {
    const v = ref.current;
    if (!v || reducida) return;
    if (activo) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [activo, reducida]);
  return <video ref={ref} className="vid" src={`/web/vid/${n}.mp4`} poster={`/web/vid/${n}.jpg`} muted loop playsInline preload="none" aria-label="Video de la app: Ruta del mes" />;
}

export function RutaMes() {
  const items: Item[] = [
    { t: 'Su ruta del mes', d: 'Cada mes la persona recibe 3 locales sorpresa para visitar.', vista: () => <Cap src="/web/cap/eventos-ruta-nov-dark.jpg" alt="Pantalla de la app: Tu ruta de noviembre" sizes="260px" /> },
    { t: 'Tu local puede ser uno', d: 'Los ve en su mapa y marca la visita cuando llega.', vista: () => <Cap src="/web/cap/ruta-mapa-nov-dark.jpg" alt="Pantalla de la app: mapa de la ruta del mes" sizes="260px" /> },
    { t: 'Queda en su álbum', d: 'Tu local sale en sus fotos e historias del mes.', vista: (a) => <VideoRuta n="ruta-album" activo={a} /> },
  ];
  return (
    <section className="cx-sec cx-ruta" id="ruta">
      <div className="wrap">
        <p className="kick">Ruta del mes</p>
        <Kinetic text="Tu local, entre los *3* *sorpresa.*" />
        <p className="cx-lead">Tu local puede ser parte de la ruta del mes, <b>sin pagar plan.</b></p>
        <Escaparate id="esc-ruta" items={items} ms={7500} nota="Pantallas y video de la app real." />
      </div>
    </section>
  );
}

/* ---------- 7. Planes ---------- */

// Textos de esta página para tres puntos de los planes. Precios, planes y reglas no cambian.
const TEXTO_PLAN: Record<string, [string, string]> = {
  'Mínimo 3 cupones por día': ['Mínimo 3 cupos por día', 'Cupos disponibles, no clientes garantizados.'],
  '1 premio gratis y, con él, 1 más': ['1 premio gratis y 1 descuento', 'Primero el gratis, después el descuento. Máximo 2.'],
  'Tarjeta de fidelidad Camina: tu premio entre las opciones de todos los clientes': ['Tarjeta de fidelidad Camina', 'Tu premio entre las opciones de todos los clientes.'],
};

export function PlanesComercio() {
  return (
    <section className="cx-sec cx-planes" id="planes">
      <div className="wrap">
        <p className="kick">Planes</p>
        <Kinetic text="Empieza *gratis.*" />
        <p className="cx-lead">Aparecer en Camina no cuesta. Los planes de pago suman herramientas y beneficios extra.</p>
        {CUPO_FUNDADOR_ABIERTO && (
          <div className="cx-fund">
            <div><b>Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.</b><span>Desde que salga la app. Te lo confirmamos cuando aprobamos tu local.</span></div>
            <Link className="lp-btn dark cx-btn" href="/registro?fundador=1" data-medir="comercios_fundador">Pedir mi cupo fundador</Link>
          </div>
        )}
        <div className="cx-planes-grid">
          {PLANS.map((p, i) => (
            <InView as="article" key={p.id} className={`cx-plan${p.featured ? ' feat' : ''}${p.id === 'paso_adelante' ? ' gold' : ''}`} delay={i * 120}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              {p.id !== 'primer_paso' && <p className="launch">{LANZAMIENTO}</p>}
              <p className="blurb">{p.blurb}</p>
              <ul>
                {p.features.map((f) => {
                  const [t, e] = TEXTO_PLAN[f] ?? [f, ''];
                  return <li key={f}>{t}{e ? <small>{e}</small> : null}</li>;
                })}
              </ul>
              <Link className={`lp-btn ${p.id === 'primer_paso' ? 'dark' : 'mint'} cx-btn plan-cta`} href={`/registro?plan=${p.id}`}>
                {p.id === 'primer_paso' ? 'Registrarme gratis' : 'Registrarme y elegir este plan'}
              </Link>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. Preguntas y cierre ---------- */

const DUDAS_COM = [
  ['¿Qué es Camina?', 'Una app gratis que cuenta los pasos de las personas y los convierte en Puntos. Esos Puntos se canjean por descuentos o regalos en los comercios aliados de su ciudad.'],
  ['¿Cómo se incorpora mi negocio?', 'Te registras, cargas tu local, tu logo, tus fotos y tu primer descuento o regalo. El equipo de Camina lo revisa y, al aprobarlo, apareces en la app.'],
  ['¿Cuánto cuesta?', 'Primer Paso es gratis. Paso Firme cuesta Bs 99/mes y Paso Adelante Bs 299/mes (precio de lanzamiento). Se paga con QR y mandas el comprobante por WhatsApp. Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.'],
  ['¿Quién define los descuentos?', 'Tú. Eliges si das un descuento o un regalo, cuántos cupones por día y en qué días y horarios vale.'],
  ['¿Cómo se usan los beneficios?', 'La persona canjea en la app y llega a tu local. Tú le dices el código de 4 números de tu local, lo escribe y el canje queda confirmado. Nadie puede volver a canjear en el mismo local hasta pasados 14 días.'],
  ['¿Qué necesito para participar?', 'Los datos de tu local, tu logo, algunas fotos y tu primer descuento o regalo. Todo se hace desde el panel web, sin instalar nada.'],
];

export function DudasComercio() {
  return (
    <section className="cx-sec" id="dudas">
      <div className="wrap">
        <p className="kick">Dudas rápidas</p>
        <Kinetic text="Lo que todos *preguntan.*" />
        <div className="dudas">
          {DUDAS_COM.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <details>
            <summary>¿Cómo puedo registrarme?</summary>
            <p>Toca «Sumar mi comercio», crea tu cuenta y arma tu ficha. Si te queda una duda, <a href={WA_DUDA}>escríbenos por WhatsApp</a>.</p>
          </details>
        </div>
      </div>
    </section>
  );
}

export function CierreNegocio() {
  return (
    <section className="lp-final cx-cierre">
      <Trail className="hero-trail" n={18} flat />
      <div className="wrap">
        <Kinetic text="Suma tu negocio a la comunidad que *camina.*" />
        <p>Empieza gratis y elige tu plan cuando quieras.</p>
        <div className="lp-cta">
          <Link className="lp-btn mint cx-btn" href="/registro" data-medir="comercios_cierre_sumar">Sumar mi comercio</Link>
        </div>
      </div>
    </section>
  );
}
