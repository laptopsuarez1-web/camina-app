'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CAMINOS } from './caminos';

// Punta del pin de "Tu local" (va donde estaba un pin de la captura, que queda tapado).
const PIN = [496, 548] as const;

// Héroe de /comercios: el mapa real de la app con gente caminando por las calles hacia "Tu local".
// Cada vez que alguien llega, el pin se ilumina. Es una ilustración del uso (no son datos reales).
// Con "reducir movimiento" los puntos quedan quietos en su camino.
const VEL = 62; // unidades del mapa por segundo
const COLA = 70; // largo de la estela

export default function MapaLocal() {
  const root = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const trails = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const [llegada, setLlegada] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const n = CAMINOS.length;
    const L = paths.current.map((p) => p?.getTotalLength() ?? 0);
    const place = (i: number, k: number) => {
      const p = paths.current[i];
      const g = dots.current[i];
      const t = trails.current[i];
      if (!p || !g || !t) return;
      const s = L[i] * k;
      const pt = p.getPointAtLength(s);
      g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      g.style.opacity = k <= 0 || k >= 1 ? '0' : String(Math.min(1, k * 8, (1 - k) * 14));
      t.style.strokeDasharray = `${Math.min(COLA, s)} ${L[i] + COLA}`;
      t.style.strokeDashoffset = `${-Math.max(0, s - COLA)}`;
      t.style.opacity = g.style.opacity;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < n; i++) place(i, 0.35 + ((i * 0.37) % 0.5));
      return;
    }
    // Cada caminante sale a una hora distinta y, al llegar, espera un rato antes de volver a salir.
    const dur = L.map((l) => (l / VEL) * 1000);
    const ciclo = dur.map((d) => d + 2600);
    const desfase = dur.map((_, i) => (i * 1900) % 9000);
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let reloj = 0;
    const llego = new Array(n).fill(-1);
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (visible && !document.hidden) reloj += Math.min(dt, 60);
      for (let i = 0; i < n; i++) {
        const t = reloj - desfase[i];
        if (t < 0) {
          place(i, 0);
          continue;
        }
        const vuelta = Math.floor(t / ciclo[i]);
        const k = (t % ciclo[i]) / dur[i];
        place(i, Math.min(1, k));
        if (k >= 1 && llego[i] !== vuelta) {
          llego[i] = vuelta;
          setLlegada((x) => x + 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <div className="cx-map" ref={root} aria-hidden="true">
      <Image src="/web/app/hero-mapa.webp" alt="" width={1180} height={860} sizes="(max-width: 1100px) 100vw, 64vw" preload />
      <svg viewBox="0 0 1180 860" className="cx-map-svg">
        <defs>
          <radialGradient id="cx-halo">
            <stop offset="0" stopColor="#62f0b6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#62f0b6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {CAMINOS.map((c, i) => (
          <g key={i}>
            <path ref={(e) => void (paths.current[i] = e)} d={c.d} fill="none" stroke="none" />
            <path ref={(e) => void (trails.current[i] = e)} d={c.d} className="cx-map-trail" />
            <g ref={(e) => void (dots.current[i] = e)} style={{ opacity: 0 }}>
              <circle r="22" fill="url(#cx-halo)" />
              <circle r="7.5" className="cx-map-dot" />
            </g>
          </g>
        ))}
      </svg>
      <div className="cx-map-pin" style={{ left: `${(PIN[0] / 1180) * 100}%`, top: `${(PIN[1] / 860) * 100}%` }}>
        <b className="cx-map-pin-label">Tu local</b>
        {llegada > 0 ? <i key={llegada} className="cx-map-ring" /> : null}
        <span className={`cx-map-pin-box${llegada > 0 ? ' is-hit' : ''}`} key={`b${llegada}`}>
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <path d="M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10c0 1.5 1.3 2.5 2.7 2.5S9.3 11.5 9.3 10c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.6 2.5S20 11.5 20 10M10 19v-4h4v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
