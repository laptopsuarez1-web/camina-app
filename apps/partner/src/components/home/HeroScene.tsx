'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import geo from '@/components/landing/geo.json';
import { LOCALES } from './data';
import { Coin } from './ui';

// Escena del héroe: una caminata por calles reales del centro de Tarija (mapa y recorrido de landing/geo.json)
// hasta un comercio real. Mientras se camina, suben los pasos; al pasar los 1.000 pasos se gana 1 Punto
// (regla real) y con ese Punto se desbloquea un premio real de ese comercio: Panchito gratis en Fripap's, 38 Puntos.
// Los números de la caminata son un ejemplo y así se rotula.
type P = [number, number];
const W = geo.w;
const H = geo.h;
// El recorrido de geo.json (compartido con /comercios) se pasa del borde del mapa y vuelve; aquí termina en la puerta
// de Fripap's bajando por la calle, sin salir del cuadro.
const ROUTE: P[] = [...(geo.route as P[]).slice(0, 18), [766.3, 548]];
const FRIP = LOCALES.find((l) => l.id === 'fripaps')!;
const COCO = LOCALES.find((l) => l.id === 'coco')!;
const BLOOM = LOCALES.find((l) => l.id === 'bloom')!;
const PREMIO = FRIP.premios.find((p) => p.nombre === 'Panchito')!;
const META = PREMIO.puntos; // 38
const PASOS = 1240; // pasos de ejemplo de esta caminata
const N = 18; // huellas a lo largo del recorrido
const CAMINAR = 6200;
const CICLO = 9400;

const fmt = (n: number) => n.toLocaleString('es-BO');
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// Largo acumulado del recorrido para ubicar puntos y huellas.
function medir() {
  const acc = [0];
  for (let i = 1; i < ROUTE.length; i++) acc.push(acc[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
  return acc;
}
function punto(acc: number[], s: number) {
  let i = 1;
  while (i < acc.length - 1 && acc[i] < s) i++;
  const f = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
  const [x0, y0] = ROUTE[i - 1];
  const [x1, y1] = ROUTE[i];
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, a: Math.atan2(y1 - y0, x1 - x0) };
}
const pct = (v: number, t: number) => `${((v / t) * 100).toFixed(2)}%`;

export default function HeroScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const progRef = useRef<SVGPathElement>(null);
  const walkerRef = useRef<HTMLSpanElement>(null);
  const pasosRef = useRef<HTMLElement>(null);
  const puntosRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);

  const { d, huellas, total } = useMemo(() => {
    const acc = medir();
    const L = acc[acc.length - 1];
    const hs = Array.from({ length: N }, (_, i) => {
      const p = punto(acc, (L * (i + 0.6)) / N);
      const off = i % 2 ? 10 : -10;
      return { x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off, r: (p.a * 180) / Math.PI + 90, der: i % 2 === 1 };
    });
    return { d: 'M' + ROUTE.map(([x, y]) => `${x} ${y}`).join(' L'), huellas: hs, total: L };
  }, []);

  useEffect(() => {
    const el = root.current;
    const prog = progRef.current;
    if (!el || !prog) return;
    const acc = medir();
    prog.style.strokeDasharray = `${total}`;

    const pintar = (k: number) => {
      const pasos = Math.round(k * PASOS);
      const pts = META - 1 + (pasos >= 1000 ? 1 : 0);
      prog.style.strokeDashoffset = `${total * (1 - k)}`;
      el.style.setProperty('--k', (k * N).toFixed(2));
      const p = punto(acc, k * total);
      if (walkerRef.current) {
        walkerRef.current.style.left = pct(p.x, W);
        walkerRef.current.style.top = pct(p.y, H);
      }
      if (pasosRef.current) pasosRef.current.textContent = fmt(pasos);
      if (puntosRef.current) puntosRef.current.textContent = String(pts);
      if (barRef.current) barRef.current.style.transform = `scaleX(${(pts / META).toFixed(3)})`;
      el.dataset.punto = pasos >= 1000 ? 'si' : 'no';
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pintar(1);
      el.dataset.fase = 'listo';
      return;
    }
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const t = (now - t0) % CICLO;
      pintar(easeInOut(Math.min(1, t / CAMINAR)));
      el.dataset.fase = t < CAMINAR ? 'camina' : t < CICLO - 600 ? 'listo' : 'fin';
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
  }, [total]);

  return (
    <div className="hm-scene" ref={root} data-fase="camina" data-punto="no">
      <figure className="hm-map">
        <Image className="hm-map-img" src="/web/mapa-tarija.jpg" alt="" width={900} height={730} sizes="(max-width: 1000px) 92vw, 640px" />
        <svg className="hm-map-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path className="hm-map-route" d={d} />
          <path className="hm-map-prog" d={d} ref={progRef} />
          {huellas.map((h, i) => (
            <image
              key={i}
              href={h.der ? '/web/pie-R-mint.png' : '/web/pie-L-mint.png'}
              width={18}
              height={36}
              className="hm-map-step"
              transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.r.toFixed(1)}) translate(-9 -18)`}
              style={{ ['--i' as string]: i }}
            />
          ))}
        </svg>
        <span className="hm-pin" style={{ left: pct(geo.coco[0], W), top: pct(geo.coco[1], H) }}>
          <Image src={COCO.logo} alt="" width={40} height={40} />
        </span>
        <span className="hm-pin" style={{ left: pct(geo.bloom[0] + 76, W), top: pct(geo.bloom[1] + 48, H) }}>
          <Image src={BLOOM.logo} alt="" width={40} height={40} />
        </span>
        <span className="hm-pin hm-pin-dest" style={{ left: pct(geo.frip[0], W), top: pct(geo.frip[1], H) }}>
          <Image src={FRIP.logo} alt="" width={56} height={56} />
        </span>
        <span className="hm-walker" ref={walkerRef} aria-hidden="true" />
        <figcaption className="hm-map-cap">Ejemplo de caminata por el centro de Tarija</figcaption>
      </figure>

      <div className="hm-scene-phone" data-tilt>
        {children}
      </div>

      <div className="hm-readout" aria-hidden="true">
        <div>
          <small>Pasos</small>
          <b ref={pasosRef}>0</b>
        </div>
        <div className="hm-readout-pts">
          <small>Puntos</small>
          <span className="hm-readout-val">
            <Coin size={26} />
            <b ref={puntosRef}>{META - 1}</b>
          </span>
          <span className="hm-plus">
            <Coin size={16} />
            +1
          </span>
        </div>
      </div>

      <div className="hm-reward" aria-hidden="true">
        <Image className="hm-reward-logo" src={FRIP.logo} alt="" width={44} height={44} />
        <span className="hm-reward-txt">
          <small>{FRIP.nombre}</small>
          <b>
            {PREMIO.nombre} {PREMIO.detalle.toLowerCase()}
          </b>
          <span className="hm-reward-bar">
            <i ref={barRef} />
          </span>
        </span>
        <span className="hm-reward-state">
          <em>
            <Coin size={18} />
            {META} Puntos
          </em>
          <strong>Listo para canjear</strong>
        </span>
      </div>

      <p className="hm-sr">
        Ejemplo: una caminata de {fmt(PASOS)} pasos por el centro de Tarija suma 1 Punto. Con {META} Puntos se canjea {PREMIO.nombre.toLowerCase()}{' '}
        {PREMIO.detalle.toLowerCase()} en {FRIP.nombre}.
      </p>
    </div>
  );
}
