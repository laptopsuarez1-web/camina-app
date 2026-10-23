'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import geo from './geo.json';
import { LOCALES } from './locales';

type P = [number, number];
const W = geo.w;
const H = geo.h;
const ROUTE = geo.route as P[];

// Recorre la ruta real (calles de Tarija) y pone una huella cada STEP unidades, alternando pie izquierdo y derecho,
// con la punta apuntando hacia donde se camina.
function huellas(step = 34, lado = 9) {
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
    const nx = -dy / len;
    const ny = dx / len;
    const der = k % 2 === 1;
    const off = der ? lado : -lado;
    out.push({
      x: x0 + dx * f + nx * off,
      y: y0 + dy * f + ny * off,
      ang: (Math.atan2(dy, dx) * 180) / Math.PI + 90, // las huellas (las del logo) apuntan hacia arriba
      der,
      t: s / total,
    });
  }
  return out;
}

const pct = (v: number, max: number) => `${(v / max) * 100}%`;

export default function RealMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const pasos = useMemo(() => huellas(), []);
  const fripaps = LOCALES.find((l) => l.id === 'fripaps')!;
  const bloom = LOCALES.find((l) => l.id === 'bloom')!;
  const coco = LOCALES.find((l) => l.id === 'coco')!;

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const recorrido = r.height - window.innerHeight;
      setP(Math.min(1, Math.max(0, -r.top / (recorrido || 1))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const walk = Math.min(1, p / 0.7); // 0 a 0,7: caminando
  const llego = p > 0.72;
  const fase = p < 0.12 ? 0 : p < 0.45 ? 1 : p < 0.72 ? 2 : 3;
  const textos = [
    ['Salís a caminar', 'Tu recorrido de todos los días ya cuenta: cada 1.000 pasos, 1 punto.'],
    ['Pasás por locales de tu barrio', 'En el mapa de Camina ves los comercios que tienen premios para vos.'],
    ['Elegís a dónde ir', 'Con tus puntos, canjeás en el local que más te gusta.'],
    ['Llegás y canjeás', "Mostrás tu código de 6 dígitos y te dan tu premio."],
  ][fase];

  return (
    <div className="rm" ref={wrap}>
      <div className="rm-stick">
        <div className="rm-text" aria-live="polite">
          <h3 key={fase}>{textos[0]}</h3>
          <p key={`p${fase}`}>{textos[1]}</p>
        </div>

        <div className="rm-map" style={{ aspectRatio: `${W}/${H}` }}>
          <Image src="/web/mapa-tarija.jpg" alt="Mapa de Tarija con el recorrido hasta Fripap's" width={W} height={H} priority={false} />
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {pasos.map((h, i) => (
              <image
                key={i}
                href={h.der ? '/web/pie-R-mint.png' : '/web/pie-L-mint.png'}
                width={h.der ? 14.2 : 12.9}
                height={27}
                x={h.der ? -7.1 : -6.45}
                y={-13.5}
                transform={`translate(${h.x} ${h.y}) rotate(${h.ang})`}
                opacity={h.t <= walk ? 0.95 : 0}
                style={{ transition: 'opacity .25s' }}
              />
            ))}
          </svg>

          <div className="you-dot" style={{ left: pct(geo.start[0], W), top: pct(geo.start[1], H) }}>
            <span />
          </div>

          <div className={`rm-pin side r${p > 0.12 ? ' on' : ''}`} style={{ left: pct(geo.coco[0], W), top: pct(geo.coco[1], H) }}>
            <Image src={coco.logo} alt="" width={96} height={96} />
            <b>{coco.nombre}</b>
          </div>
          <div className={`rm-pin gold side l${p > 0.2 ? ' on' : ''}`} style={{ left: pct(geo.bloom[0], W), top: pct(geo.bloom[1], H) }}>
            <Image src={bloom.logo} alt="" width={96} height={96} />
            <b>{bloom.nombre}</b>
          </div>
          <div className={`rm-pin big${llego ? ' on' : ''}`} style={{ left: pct(geo.frip[0], W), top: pct(geo.frip[1], H) }}>
            <Image src={fripaps.logo} alt="" width={96} height={96} />
            <b>{fripaps.nombre}</b>
          </div>
        </div>

        <div className={`rm-card${llego ? ' on' : ''}`}>
          <Image src={fripaps.logo} alt="" width={56} height={56} />
          <div>
            <b>{fripaps.nombre}</b>
            <span>{fripaps.direccion}</span>
            <ul>
              {fripaps.premios.map((x) => (
                <li key={x.nombre}>
                  <i>{x.nombre}</i> · {x.detalle} · <u>{x.puntos} puntos</u>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="rm-attr">Mapa © colaboradores de OpenStreetMap</p>
      </div>
    </div>
  );
}
