'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import geo from './geo.json';
import { PLANS, WHATSAPP_NUMBER, LANZAMIENTO, CUPO_FUNDADOR_ABIERTO } from '@/lib/plans';
import { InView, Kinetic, Parallax } from './Motion';
import { LOCALES } from './locales';
import Trail from './Trail';

const WA_DUDA = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.')}`;
const W = geo.w;
const H = geo.h;
type P = [number, number];
const ROUTE = geo.route as P[];
const pct = (v: number, max: number) => `${(v / max) * 100}%`;
const L = (id: string) => LOCALES.find((l) => l.id === id)!;

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

// Huellas sobre la ruta real (calles de Tarija), alternando pie izquierdo y derecho.
function huellas(step = 40, lado = 9) {
  const out: { x: number; y: number; ang: number; der: boolean; t: number }[] = [];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    const d = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let k = 0;
  for (let s = step / 2; s < total - 8; s += step, k++) {
    let acc = 0;
    let i = 0;
    while (i < seg.length - 1 && acc + seg[i] < s) acc += seg[i++];
    const f = (s - acc) / seg[i];
    const [x0, y0] = ROUTE[i];
    const [x1, y1] = ROUTE[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const der = k % 2 === 1;
    const off = der ? lado : -lado;
    out.push({ x: x0 + dx * f + (-dy / len) * off, y: y0 + dy * f + (dx / len) * off, ang: (Math.atan2(dy, dx) * 180) / Math.PI + 90, der, t: s / total });
  }
  return out;
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

function Cap({ src, alt, sizes, priority }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} />;
}

/* ---------- 1. Portada animada ---------- */

export function HeroComercio() {
  const pasos = useMemo(() => huellas(), []);
  const frip = L('fripaps');
  const bloom = L('bloom');
  const coco = L('coco');
  const T = 11; // segundos por vuelta
  return (
    <section className="lp-hero cx-hero">
      <div className="wrap cx-hero-grid">
        <div className="copy">
          <Kinetic as="h1" text="Tus próximos clientes ya están *caminando.*" />
          <p className="sub">Camina premia a las personas por caminar y las lleva a los comercios de su zona.</p>
          <div className="lp-cta">
            <Link className="lp-btn mint cx-btn" href="/registro" data-medir="comercios_hero_sumar">Sumar mi comercio</Link>
            <span className="cx-free">Empieza gratis</span>
          </div>
        </div>

        <div className="cx-scene" role="img" aria-label="Animación: una persona camina por Tarija y llega a un comercio">
          <div className="cx-map" style={{ aspectRatio: `${W}/${H}`, ['--T' as string]: `${T}s` }}>
            <Image src="/web/mapa-tarija.jpg" alt="" width={W} height={H} priority sizes="(min-width:900px) 620px, 100vw" />
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              {pasos.map((h, i) => (
                <image
                  key={i}
                  className="cx-fp"
                  href={h.der ? '/web/pie-R-mint.png' : '/web/pie-L-mint.png'}
                  width={h.der ? 14.2 : 12.9}
                  height={27}
                  x={h.der ? -7.1 : -6.45}
                  y={-13.5}
                  transform={`translate(${h.x} ${h.y}) rotate(${h.ang})`}
                  style={{ animationDelay: `${(h.t * T * 0.42 + 0.4).toFixed(2)}s` }}
                />
              ))}
            </svg>
            <span className="cx-you" style={{ left: pct(geo.start[0], W), top: pct(geo.start[1], H) }}><i /></span>
            <span className="cx-pin gold" style={{ left: pct(geo.bloom[0], W), top: pct(geo.bloom[1], H), animationDelay: '.9s' }}><Image src={bloom.logo} alt="" width={64} height={64} /></span>
            <span className="cx-pin" style={{ left: pct(geo.coco[0] + 46, W), top: pct(geo.coco[1] + 70, H), animationDelay: '1.6s' }}><Image src={coco.logo} alt="" width={64} height={64} /></span>
            <span className="cx-pin big" style={{ left: pct(geo.frip[0], W), top: pct(geo.frip[1], H), animationDelay: `${(T * 0.5).toFixed(1)}s` }}><Image src={frip.logo} alt="" width={96} height={96} /></span>
            <span className="cx-pts p1">+1 Punto</span>
            <span className="cx-pts p2">+2 Puntos</span>
            <span className="cx-pts p3">+3 Puntos</span>
            <div className="cx-card" style={{ animationDelay: `${(T * 0.56).toFixed(1)}s` }}>
              <Image src={frip.logo} alt="" width={44} height={44} />
              <div><b>{frip.nombre}</b><span>{frip.premios[0].nombre} · {frip.premios[0].puntos} Puntos</span></div>
            </div>
          </div>
          <Parallax speed={0.05} className="cx-ph-wrap">
            <IPhone className="cx-float">
              <Cap src="/web/cap/canjes-dark.jpg" alt="Pantalla de la app: lista de canjes con comercios" sizes="(min-width:900px) 190px, 36vw" priority />
            </IPhone>
          </Parallax>
        </div>
      </div>
      <p className="wrap cx-attr">Mapa © colaboradores de OpenStreetMap · Animación ilustrativa con locales de ejemplo</p>
    </section>
  );
}

/* ---------- 2. Cómo conecta ---------- */

export function ConectaTres() {
  const pasos = [
    ['/web/pie-R-mint.png', 'Caminan', 'Cada 1.000 pasos, 1 Punto.'],
    ['coin', 'Suman Puntos', 'Los canjean en comercios aliados.'],
    ['', 'Llegan a tu local', 'Con tu descuento o regalo.'],
  ];
  return (
    <section className="cx-sec cx-conecta">
      <div className="wrap">
        <Kinetic text="Personas que caminan. Un negocio que *las* *recibe.*" />
        <InView className="cx-tres">
          <span className="cx-hilo" aria-hidden="true" />
          {pasos.map(([img, t, d], i) => (
            <div className="cx-paso" key={t} style={{ ['--i' as string]: i }}>
              <span className="cx-ico">
                {img === 'coin' ? (
                  <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#FFD166" /><circle cx="12" cy="12" r="7.4" fill="none" stroke="#F2B84B" strokeWidth="1.4" /><text x="12" y="16.4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#7A4B00" fontFamily="sans-serif">1</text></svg>
                ) : img ? <Image src={img} alt="" width={44} height={44} /> : (
                  <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.9 6.5 12.5 6.5 12.5S18.5 13.9 18.5 9A6.5 6.5 0 0 0 12 2.5Z" fill="#62F0B6" /><circle cx="12" cy="9" r="2.6" fill="#241748" /></svg>
                )}
              </span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </InView>
      </div>
    </section>
  );
}

/* ---------- Escaparate: iPhone que cambia solo entre pasos ---------- */

type Item = { t: string; d: string; vista: (activo: boolean) => ReactNode; rep?: boolean };

function Escaparate({ items, ms = 6500, nota, id }: { items: Item[]; ms?: number; nota?: string; id: string }) {
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
        <p className="cx-rep">{items[i].rep ? 'Representación del flujo, no es una captura' : 'Pantalla real de la app'}</p>
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

// Dos pantallas reales que se alternan solas.
function Alterna({ a, b, altA, altB, activo }: { a: string; b: string; altA: string; altB: string; activo: boolean }) {
  return (
    <>
      <div className={`alt a${activo ? ' go' : ''}`}><Cap src={a} alt={altA} sizes="260px" /></div>
      <div className={`alt b${activo ? ' go' : ''}`}><Cap src={b} alt={altB} sizes="260px" /></div>
    </>
  );
}

// Representación: escribir el código del local.
function PantallaCodigo({ activo }: { activo: boolean }) {
  return (
    <div className={`fake code${activo ? ' go' : ''}`}>
      <p className="ft">Código del local</p>
      <p className="fs">Pídelo en el local y escríbelo</p>
      <div className="digits">{['4', '8', '2', '1'].map((d, k) => <i key={k} style={{ animationDelay: `${0.5 + k * 0.5}s` }}>{d}</i>)}</div>
      <div className="ok"><span>✓</span> Canje confirmado</div>
    </div>
  );
}

// Representación: tarjeta de fidelidad de 5 sellos.
function PantallaTarjeta({ activo }: { activo: boolean }) {
  return (
    <div className={`fake card${activo ? ' go' : ''}`}>
      <p className="ft">Tarjeta de fidelidad</p>
      <p className="fs">5 canjes en cualquier comercio</p>
      <div className="stamps">{[0, 1, 2, 3, 4].map((k) => <i key={k} style={{ animationDelay: `${0.4 + k * 0.45}s` }}><Image src="/web/pie-R-mint.png" alt="" width={20} height={38} /></i>)}</div>
      <div className="ok gift">Elige tu premio gratis</div>
    </div>
  );
}

export function Funciones() {
  const items: Item[] = [
    { t: 'Te encuentran', d: 'Tu local aparece en el mapa y en la lista de canjes.', vista: () => <Cap src="/web/cap/canjes-dark.jpg" alt="Pantalla de la app: lista de canjes" sizes="260px" /> },
    { t: 'Tu ficha', d: 'Fotos, horarios, tus descuentos y cómo llegar.', vista: () => <Cap src="/web/cap/ficha-local-dark.jpg" alt="Pantalla de la app: ficha del local" sizes="260px" /> },
    { t: 'Canje con código', d: 'La persona escribe el código de 4 números de tu local y el canje queda confirmado.', rep: true, vista: (a) => <PantallaCodigo activo={a} /> },
    { t: 'Reseña e historia', d: 'Si quiere, califica tu local en Google Maps y sube una historia a Instagram.', vista: (a) => <Alterna a="/web/cap/canje-calificar-v3-dark.jpg" b="/web/cap/canje-historia-v3-dark.jpg" altA="Pantalla de la app: invitación a calificar" altB="Pantalla de la app: subir una historia" activo={a} /> },
    { t: 'Tarjeta de fidelidad', d: 'Con 5 canjes en cualquier comercio, la persona elige un premio gratis y el tuyo puede estar entre las opciones. Planes Paso Firme y Paso Adelante.', rep: true, vista: (a) => <PantallaTarjeta activo={a} /> },
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

function VideoRuta({ n, activo }: { n: string; activo: boolean }) {
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
    { t: 'Ella participa', d: 'Cada mes toca «Participar» y recibe 3 locales sorpresa en su mapa.', vista: (a) => <VideoRuta n="ruta-participar" activo={a} /> },
    { t: 'Tu local puede ser uno', d: 'Si compra, escribe tu código y tú confirmas con un toque.', vista: (a) => <VideoRuta n="ruta-local-sumado" activo={a} /> },
    { t: 'Queda en su álbum', d: 'Tu local sale en sus fotos e historias del mes.', vista: (a) => <VideoRuta n="ruta-album" activo={a} /> },
  ];
  return (
    <section className="cx-sec cx-ruta" id="ruta">
      <div className="wrap">
        <p className="kick">Ruta del mes</p>
        <Kinetic text="Tu local, entre los *3* *sorpresa.*" />
        <p className="cx-lead"><b>Sin pagar plan.</b> Es una oportunidad de visibilidad, no una garantía de visitas ni de compras.</p>
        <Escaparate id="esc-ruta" items={items} ms={7500} nota="Videos de la app real; los locales y las fotos son de ejemplo." />
      </div>
    </section>
  );
}

/* ---------- 5. Niveles e insignias ---------- */

const NIVEL_LOOK = {
  visitante: { ring: ['#B98CF0', '#8B4FD1'], pill: ['#9B5FE0', '#7A3FC4'], text: '#fff', nombre: 'Visitante' },
  habitual: { ring: ['#8DF7CB', '#3FD69B'], pill: ['#7FF2C2', '#3FD69B'], text: '#12281F', nombre: 'Habitual' },
  fan: { ring: ['#FFE08A', '#62F0B6'], pill: ['#FFE08A', '#F2B84B'], text: '#3B1450', nombre: 'Fan' },
} as const;

function Insignia({ nivel, encendida, logo }: { nivel: keyof typeof NIVEL_LOOK; encendida: boolean; logo: string }) {
  const k = NIVEL_LOOK[nivel];
  return (
    <div className={`cx-ins ${nivel}${encendida ? ' on' : ''}`}>
      <span className="ring" style={{ background: `linear-gradient(135deg, ${k.ring[0]}, ${k.ring[1]})` }}>
        <Image src={logo} alt="" width={72} height={72} />
      </span>
      <em style={{ background: `linear-gradient(90deg, ${k.pill[0]}, ${k.pill[1]})`, color: k.text }}>{k.nombre}</em>
    </div>
  );
}

export function Niveles() {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useVisto(ref, 0.4);
  const reducida = useReducida();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducida) {
      setV(20);
      return;
    }
    if (!visto) return;
    let raf = 0;
    const DUR = 7000;
    const PAUSA = 2600;
    let t0 = performance.now();
    const tick = (t: number) => {
      const k = (t - t0) / DUR;
      if (k >= 1) {
        setV(20);
        if (t - t0 > DUR + PAUSA) t0 = t;
      } else {
        setV(Math.round(20 * k));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visto, reducida]);
  const nivel = v >= 20 ? 'Fan' : v >= 10 ? 'Habitual' : v >= 1 ? 'Visitante' : '—';
  const logo = L('bloom').logo;
  const fuentes = [
    ['+2', 'Canje confirmado'],
    ['+2', 'Visita de la Ruta'],
    ['+1', 'Calificar tu local'],
    ['+1', 'Historia aprobada'],
  ];
  return (
    <section className="cx-sec cx-niveles" id="niveles">
      <div className="wrap cx-niv-grid">
        <div ref={ref}>
          <p className="kick">Clientes fieles</p>
          <Kinetic text="Cada visita los acerca a *Fan.*" />
          <p className="cx-lead">Suben de nivel en tu local con puntos de nivel. No son Puntos de Camina.</p>
          <div className="cx-track" aria-label={`Ejemplo de progreso: ${v} puntos de nivel, ${nivel}`}>
            <div className="cx-score"><b>{v}</b><span>puntos de nivel</span><em>{nivel}</em></div>
            <div className="cx-rail"><i style={{ width: `${(v / 20) * 100}%` }} /></div>
            <div className="cx-nodos">
              <div style={{ left: '5%' }}><Insignia nivel="visitante" encendida={v >= 1} logo={logo} /><small>1</small></div>
              <div style={{ left: '50%' }}><Insignia nivel="habitual" encendida={v >= 10} logo={logo} /><small>10</small></div>
              <div style={{ left: '100%' }}><Insignia nivel="fan" encendida={v >= 20} logo={logo} /><small>20</small></div>
            </div>
          </div>
          <ul className="cx-fuentes">{fuentes.map(([p, t]) => <li key={t}><b>{p}</b>{t}</li>)}</ul>
        </div>
        <Parallax speed={0.05}>
          <IPhone className="cx-float">
            <Cap src="/web/cap/perfil-insignias-dark.jpg" alt="Pantalla de la app: perfil con insignias de locales" sizes="(min-width:900px) 260px, 60vw" />
          </IPhone>
          <p className="cx-rep">Pantalla real de la app</p>
        </Parallax>
      </div>
    </section>
  );
}

/* ---------- 6. Pines: normal vs destacado ---------- */

export function Pines() {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useVisto(ref, 0.4);
  const reducida = useReducida();
  const [oro, setOro] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (!visto || manual || reducida) return;
    const id = setTimeout(() => setOro((x) => !x), 4200);
    return () => clearTimeout(id);
  }, [visto, manual, reducida, oro]);
  const tu = ROUTE[11];
  const bloom = L('bloom');
  const coco = L('coco');
  const frip = L('fripaps');
  const otros: { logo: string; x: number; y: number }[] = [
    { logo: coco.logo, x: ROUTE[4][0] + 70, y: ROUTE[4][1] - 50 },
    { logo: frip.logo, x: geo.frip[0] - 90, y: geo.frip[1] + 10 },
  ];
  return (
    <section className="cx-sec cx-pines" id="pines">
      <div className="wrap" ref={ref}>
        <p className="kick">En el mapa</p>
        <Kinetic text="Que te vean *primero.*" />
        <div className="cx-toggle" role="group" aria-label="Tipo de pin">
          <button type="button" className={!oro ? 'on' : ''} onClick={() => { setManual(true); setOro(false); }}>Plan gratuito</button>
          <button type="button" className={oro ? 'on gold' : ''} onClick={() => { setManual(true); setOro(true); }}>Paso Adelante</button>
        </div>
        <div className={`cx-mapa${oro ? ' oro' : ''}`} style={{ aspectRatio: `${W}/${H}` }}>
          <Image src="/web/mapa-tarija.jpg" alt="" width={W} height={H} sizes="(min-width:900px) 900px, 100vw" />
          {otros.map((o, i) => (
            <span className="cx-pin2 otro" key={i} style={{ left: pct(o.x, W), top: pct(o.y, H) }}><Image src={o.logo} alt="" width={64} height={64} /></span>
          ))}
          <span className="cx-pin2 tu" style={{ left: pct(tu[0], W), top: pct(tu[1], H) }}>
            <i className="onda" /><i className="onda o2" />
            <Image src={bloom.logo} alt="Tu local" width={96} height={96} />
            <b className="etq">{oro ? 'Primero en tu categoría' : 'Tu local'}</b>
          </span>
        </div>
        <p className="cx-cap" aria-live="polite">{oro ? 'Pin más grande y dorado, y sales primero en tu categoría.' : 'Apareces en el mapa con tu pin. Incluido en el plan gratuito.'}</p>
        <p className="cx-rep">Representación sobre el mapa de Tarija · Mapa © colaboradores de OpenStreetMap</p>
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

function VisualPlan({ id }: { id: string }) {
  if (id === 'primer_paso') {
    return (
      <div className="pv pv1" aria-hidden="true">
        <span className="pin"><Image src={L('bloom').logo} alt="" width={64} height={64} /></span>
        <i className="sombra" />
      </div>
    );
  }
  if (id === 'paso_firme') {
    return (
      <div className="pv pv2" aria-hidden="true">
        <div className="bars">{[38, 62, 46, 84, 58, 72].map((h, k) => <i key={k} style={{ height: `${h}%`, animationDelay: `${k * 0.12}s` }} />)}</div>
        <div className="sellos">{[0, 1, 2, 3, 4].map((k) => <i key={k} style={{ animationDelay: `${k * 0.35}s` }} />)}</div>
      </div>
    );
  }
  return (
    <div className="pv pv3" aria-hidden="true">
      <span className="pin gold"><i className="onda" /><Image src={L('bloom').logo} alt="" width={64} height={64} /></span>
      <span className="aviso">🔔 Avisos a quienes caminan cerca</span>
    </div>
  );
}

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
              <VisualPlan id={p.id} />
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
        <p className="cx-rep">Ilustraciones de cada plan.</p>
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
