'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

// Mapa de la Ruta del mes tal como se ve en la app (tomado de una grabación de la app oficial) y el recorrido a pie
// que traza la app entre los 3 locales. El recorrido se dibuja cada vez que el mapa entra en pantalla.
// Coordenadas del mapa: 1180 × 860.
const RUTA = 'M180 362 L324 416 L396 488 L420 496 L492 565 L588 604 L636 614 L660 630 L732 651 L744 649 L768 622 L804 561 L816 552 L984 603 L1008 603';
const DURACION = 2600;

export default function RouteMap() {
  const box = useRef<HTMLDivElement>(null);
  const trazo = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = box.current;
    const p = trazo.current;
    if (!el || !p) return;
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      p.style.strokeDashoffset = '0';
      el.dataset.done = '1';
      return;
    }
    p.style.strokeDashoffset = `${L}`;
    let raf = 0;
    const play = () => {
      cancelAnimationFrame(raf);
      el.dataset.done = '';
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / DURACION);
        const e = 1 - Math.pow(1 - k, 3);
        p.style.strokeDashoffset = `${L * (1 - e)}`;
        if (k < 1) raf = requestAnimationFrame(tick);
        else el.dataset.done = '1';
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && play(), { threshold: 0.45 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hm-routemap" ref={box} data-done="">
      <Image src="/web/app/hero-mapa.webp" alt="Mapa de la Ruta del mes en la app, con Coco Barber, Fripap's y Viviana" width={1180} height={860} sizes="(max-width: 1000px) 94vw, 720px" />
      <svg viewBox="0 0 1180 860" aria-hidden="true">
        <defs>
          <mask id="hm-ruta-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1180" height="860">
            <path ref={trazo} d={RUTA} fill="none" stroke="#fff" strokeWidth="96" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
        </defs>
        <image href="/web/app/hero-ruta.webp" width="1180" height="860" mask="url(#hm-ruta-mask)" />
      </svg>
      <span className="hm-routemap-chip">
        <b>Ruta de noviembre</b> 3 locales sorpresa
      </span>
    </div>
  );
}
