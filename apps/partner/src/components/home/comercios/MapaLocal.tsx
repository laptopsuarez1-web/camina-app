'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CAMINOS } from './caminos';

// Héroe de /comercios: el mapa real de la app y huellas de Camina que caminan por las calles hasta "Tu local".
// Cada vez que unas huellas llegan, el pin se ilumina. Es una ilustración del uso (no son datos reales).
// Con "reducir movimiento" se ven unas huellas quietas en cada camino.

// Punta del pin de "Tu local" (va donde estaba un pin de la captura, que queda tapado).
const PIN = [496, 548] as const;
const PASO = 34; // distancia entre huellas, en unidades del mapa (1180 × 860)
const LADO = 9; // separación entre pie izquierdo y derecho
const CADENCIA = 340; // ms entre un paso y el siguiente
const COLA = 6; // huellas visibles detrás de la última

type Huella = { x: number; y: number; ang: number; der: boolean };

// Huellas cada PASO unidades a lo largo de una polilínea "M x y L x y ...", alternando pie, con la punta hacia adelante.
function huellas(d: string): Huella[] {
  const pts = d
    .replace('M', '')
    .split(' L')
    .map((p) => p.trim().split(' ').map(Number) as [number, number]);
  const out: Huella[] = [];
  let resto = PASO / 2;
  let k = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!len) continue;
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    let s = resto;
    while (s <= len) {
      const der = k % 2 === 1;
      const off = der ? LADO : -LADO;
      out.push({ x: x0 + ux * s - uy * off, y: y0 + uy * s + ux * off, ang: (Math.atan2(uy, ux) * 180) / Math.PI + 90, der });
      s += PASO;
      k++;
    }
    resto = s - len;
  }
  return out;
}

const RUTAS = CAMINOS.map((c) => huellas(c.d));

export default function MapaLocal() {
  const root = useRef<HTMLDivElement>(null);
  const pies = useRef<(SVGImageElement | null)[][]>(RUTAS.map(() => []));
  const [llegada, setLlegada] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pinta = (r: number, cab: number) => {
      pies.current[r].forEach((img, i) => {
        if (!img) return;
        const edad = cab - i;
        img.style.opacity = edad < 0 || edad > COLA ? '0' : String(1 - edad / (COLA + 1));
      });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      RUTAS.forEach((h, r) => pinta(r, Math.floor(h.length * (0.35 + ((r * 0.29) % 0.45)))));
      return;
    }
    // Cada recorrido sale a su hora; al llegar, espera un rato y vuelve a empezar.
    const espera = 7;
    const largo = RUTAS.map((h) => h.length + COLA + espera);
    const desfase = RUTAS.map((_, r) => (r * 7) % 23);
    let visible = true;
    let paso = 0;
    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      paso++;
      RUTAS.forEach((h, r) => {
        const t = paso - desfase[r];
        if (t < 0) return;
        const cab = t % largo[r];
        pinta(r, cab);
        if (cab === h.length - 1) setLlegada((x) => x + 1);
      });
    }, CADENCIA);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
    };
  }, []);

  return (
    <div className="cx-map" ref={root} aria-hidden="true">
      <Image src="/web/app/hero-mapa.webp" alt="" width={1180} height={860} sizes="(max-width: 1100px) 100vw, 64vw" preload />
      <svg viewBox="0 0 1180 860" className="cx-map-svg">
        {RUTAS.map((h, r) =>
          h.map((p, i) => (
            <image
              key={`${r}-${i}`}
              ref={(e) => void (pies.current[r][i] = e)}
              href={p.der ? '/web/pie-R-mint.png' : '/web/pie-L-mint.png'}
              x={-8}
              y={-16}
              width={16}
              height={32}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.ang.toFixed(0)})`}
              className="cx-map-pie"
              style={{ opacity: 0 }}
            />
          )),
        )}
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
