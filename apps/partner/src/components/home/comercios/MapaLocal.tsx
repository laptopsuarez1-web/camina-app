'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CAMINOS } from './caminos';

// Héroe de /comercios: el mapa de Canjes de la app (con los locales que ya están en Camina) y huellas de Camina que
// caminan por las calles hasta esos locales y hasta "Tu local". Cuando unas huellas llegan a "Tu local", el pin se
// ilumina. Es una ilustración del uso (no son datos reales).
// Con "reducir movimiento" se ven unas huellas quietas en cada camino.

// Punta del pin de "Tu local", en una calle libre del mapa.
const PIN = [505, 338] as const;
const W = 780;
const H = 775;
const PASO = 22; // distancia entre huellas, en unidades del mapa (780 × 775)
const LADO = 5.5; // separación entre pie izquierdo y derecho
const CADENCIA = 300; // ms entre un paso y el siguiente
const COLA = 7; // huellas visibles detrás de la última

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

// Comercios que se sumaron después de sacar la captura del mapa: se dibujan encima, en su ubicación real
// (latitud y longitud de la base). La fórmula pasa coordenadas a % de la imagen; se ajustó con los locales que ya
// se ven en la captura (error de unos pocos metros). Los pines se mantienen dentro del cuadro. Mush y ChaCha quedan
// casi encima de Fripap's y Elite Team cae en el borde, sobre Viviana: "dx" y "dy" los corren un poco (en % del
// cuadro) para que se vean todos los logos.
const NUEVOS = [
  { id: 'chacha', lat: -21.534813, lng: -64.732938, dx: -2.5 },
  { id: 'mush', lat: -21.5360499, lng: -64.7318748, dx: 14 },
  { id: 'elite', lat: -21.537755, lng: -64.719486, dx: 3, dy: 8 },
  { id: 'kava', lat: -21.540938, lng: -64.727812 },
  { id: 'armybox', lat: -21.541938, lng: -64.723062 },
].map((c: { id: string; lat: number; lng: number; dx?: number; dy?: number }) => ({
  ...c,
  x: Math.min(91, Math.max(6, (c.dx ?? 0) + 48.64 + 4496.8 * (c.lng + 64.73) - 841.2 * (c.lat + 21.535))),
  y: Math.min(99, (c.dy ?? 0) + 70.8 - 718.3 * (c.lng + 64.73) - 4662 * (c.lat + 21.535)),
}));

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
        img.style.opacity = edad < 0 || edad > COLA ? '0' : String(Math.pow(1 - edad / (COLA + 1), 1.4));
        img.classList.toggle('is-new', edad === 0);
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
        if (cab === h.length - 1 && CAMINOS[r].to === 'tulocal') setLlegada((x) => x + 1);
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
      <Image src="/web/app/mapa-canjes.webp" alt="" width={1170} height={1163} sizes="(max-width: 1100px) 100vw, 52vw" preload />
      <svg viewBox={`0 0 ${W} ${H}`} className="cx-map-svg">
        {RUTAS.map((h, r) =>
          h.map((p, i) => (
            <image
              key={`${r}-${i}`}
              ref={(e) => void (pies.current[r][i] = e)}
              href={p.der ? '/web/pie-R-mint.png' : '/web/pie-L-mint.png'}
              x={-5.5}
              y={-11}
              width={11}
              height={22}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.ang.toFixed(0)})`}
              className="cx-map-pie"
              style={{ opacity: 0 }}
            />
          )),
        )}
      </svg>
      {NUEVOS.map((c) => (
        <span key={c.id} className="cx-map-shop" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
          <Image src={`/web/locales/${c.id}-app.jpg`} alt="" width={96} height={96} sizes="12vw" />
        </span>
      ))}
      <div className="cx-map-pin" style={{ left: `${(PIN[0] / W) * 100}%`, top: `${(PIN[1] / H) * 100}%` }}>
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
