'use client';

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';
import { LOCALES } from './data';
import { Coin } from './ui';

// Escena del héroe, hecha con la app real: el mapa de la Ruta del mes tal como se ve en Camina (captura de la
// grabación de la app) y el recorrido a pie que traza la app entre los locales, dibujándose como en el celular.
// Mientras se camina suben los pasos; cada 1.000 pasos se gana 1 Punto (regla real) y al llegar a 38 Puntos se
// habilita un premio real: Panchito gratis en Fripap's. Los números son un ejemplo y así se rotula.
const FRIP = LOCALES.find((l) => l.id === 'fripaps')!;
const PREMIO = FRIP.premios.find((p) => p.nombre === 'Panchito')!;
const META = PREMIO.puntos; // 38
const INICIO_PTS = META - 2;
const PASOS = 2480; // pasos de ejemplo de este recorrido
const CAMINAR = 6400;
const CICLO = 10000;
// Recorrido que dibuja la app (medido sobre la grabación; sistema de coordenadas del mapa, 1180 × 860).
const RUTA = 'M180 362 L324 416 L396 488 L420 496 L492 565 L588 604 L636 614 L660 630 L732 651 L744 649 L768 622 L804 561 L816 552 L984 603 L1008 603';
const ARO = 2 * Math.PI * 30;

const fmt = (n: number) => n.toLocaleString('es-BO');
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export default function HeroScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const trazo = useRef<SVGPathElement>(null);
  const aro = useRef<SVGCircleElement>(null);
  const pasosRef = useRef<HTMLElement>(null);
  const puntosRef = useRef<HTMLElement>(null);
  const ganadosRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    const p = trazo.current;
    if (!el || !p) return;
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L}`;

    const pintar = (k: number) => {
      const pasos = Math.round(k * PASOS);
      const ganados = Math.floor(pasos / 1000);
      const pts = INICIO_PTS + ganados;
      p.style.strokeDashoffset = `${L * (1 - k)}`;
      if (aro.current) aro.current.style.strokeDashoffset = `${ARO * (1 - Math.min(1, k))}`;
      if (pasosRef.current) pasosRef.current.textContent = fmt(pasos);
      if (puntosRef.current) puntosRef.current.textContent = String(pts);
      if (ganadosRef.current) ganadosRef.current.textContent = ganados === 1 ? 'Ganaste 1 Punto' : `Ganaste ${ganados} Puntos`;
      el.dataset.ganados = String(ganados);
      el.dataset.listo = pts >= META ? 'si' : 'no';
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pintar(1);
      return;
    }
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const t = (now - t0) % CICLO;
      pintar(t < CICLO - 500 ? easeInOut(Math.min(1, t / CAMINAR)) : 0);
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(el);
    const onVis = () => {
      if (!document.hidden && visible) {
        t0 = performance.now();
        start();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hm-scene" ref={root} data-ganados="0" data-listo="no">
      <figure className="hm-map">
        <Image className="hm-map-img" src="/web/app/hero-mapa.webp" alt="" width={1180} height={860} sizes="(max-width: 1000px) 92vw, 640px" preload />
        <svg className="hm-map-svg" viewBox="0 0 1180 860" aria-hidden="true">
          <defs>
            <mask id="hm-trazo" maskUnits="userSpaceOnUse" x="0" y="0" width="1180" height="860">
              <path ref={trazo} d={RUTA} fill="none" stroke="#fff" strokeWidth="96" strokeLinecap="round" strokeLinejoin="round" />
            </mask>
          </defs>
          <image href="/web/app/hero-ruta.webp" width="1180" height="860" mask="url(#hm-trazo)" />
        </svg>
        <figcaption className="hm-map-cap">Mapa de la Ruta en la app. Recorrido de ejemplo.</figcaption>
      </figure>

      {/* Tarjeta de pasos y Puntos con las piezas de la app: el aro de pasos, la moneda y el aviso de Puntos ganados. */}
      <div className="hm-today" aria-hidden="true">
        <span className="hm-aro">
          <svg viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" className="hm-aro-bg" />
            <circle cx="36" cy="36" r="30" className="hm-aro-fg" ref={aro} style={{ strokeDasharray: ARO, strokeDashoffset: ARO }} />
          </svg>
          <span>
            <b ref={pasosRef}>0</b>
            <small>pasos</small>
          </span>
        </span>
        <span className="hm-today-pts">
          <span className="hm-today-total">
            <Coin size={30} />
            <b ref={puntosRef}>{INICIO_PTS}</b>
          </span>
          <em ref={ganadosRef}>Ganaste 0 Puntos</em>
        </span>
      </div>

      <div className="hm-scene-phone" data-tilt>
        {children}
      </div>

      {/* Tarjeta de premio igual a la de la app (ficha de Fripap's > Premios disponibles). */}
      <div className="hm-prize" aria-hidden="true">
        <span className="hm-prize-local">
          <Image src={FRIP.logo} alt="" width={28} height={28} />
          {FRIP.nombre}
        </span>
        <div className="hm-prize-card">
          <div className="hm-prize-row">
            <Image className="hm-prize-img" src="/web/locales/fripaps-panchito.jpg" alt="" width={80} height={80} />
            <span className="hm-prize-txt">
              <b>{PREMIO.nombre}</b>
              <small>{PREMIO.detalle}</small>
              <span className="hm-prize-pts">
                <Coin size={22} />
                {META}
              </span>
            </span>
          </div>
          <span className="hm-prize-btn">Canjear</span>
        </div>
      </div>

      <p className="hm-sr">
        Ejemplo: caminando {fmt(PASOS)} pasos por Tarija se ganan 2 Puntos y se llega a {META}, lo que cuesta {PREMIO.nombre.toLowerCase()}{' '}
        {PREMIO.detalle?.toLowerCase()} en {FRIP.nombre}.
      </p>
    </div>
  );
}
