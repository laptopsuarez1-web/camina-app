'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { LOCALES } from './data';
import { Coin } from './ui';

// Carrusel de premios en 3D: la tarjeta del centro queda de frente y las de los costados giran hacia atrás.
// Se desliza con el dedo, con la rueda o con las flechas del teclado. Datos reales de la app (locales.ts / data.ts).
// Pocos y destacados: un premio por comercio con foto de portada.
const DESTACADOS: [string, string][] = [
  ['bloom', 'Retirado de gel / acrílico'],
  ['elite', 'Día de entrenamiento'],
  ['fripaps', 'Panchito'],
  ['luzdevida', 'Sesión de fisioterapia'],
  ['coco', 'Lavado de cabello'],
  ['viviana', 'Lavado y planchado'],
  ['cancheritos', 'Clase'],
];
const PREMIOS = DESTACADOS.flatMap(([id, nombre]) => {
  const local = LOCALES.find((l) => l.id === id);
  const p = local?.premios.find((x) => x.nombre === nombre);
  return local && p ? [{ ...p, local }] : [];
});

export default function Carrusel() {
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      cards.forEach((c) => {
        const center = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.max(-1.6, Math.min(1.6, (center - mid) / c.offsetWidth));
        c.style.setProperty('--d', d.toFixed(3));
        c.style.setProperty('--ad', Math.abs(d).toFixed(3));
      });
    };
    const on = () => !raf && (raf = requestAnimationFrame(paint));
    paint();
    if (reduce) return;
    el.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    // Empieza en la segunda tarjeta para que se vea que hay más a los dos lados.
    const second = cards[1];
    if (second) el.scrollLeft = second.offsetLeft + second.offsetWidth / 2 - el.clientWidth / 2;
    return () => {
      el.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const mover = (dir: number) => {
    const el = track.current;
    const c = el?.children[0] as HTMLElement | undefined;
    if (el && c) el.scrollBy({ left: dir * c.offsetWidth, behavior: 'smooth' });
  };

  return (
    <div className="hm-carr">
      <ul className="hm-carr-track" ref={track} tabIndex={0} aria-label="Premios de los comercios (desliza para ver más)">
        {PREMIOS.map((p) => (
          <li key={p.local.id + p.nombre} className="hm-carr-card">
            <div className="hm-carr-cover">
              {p.local.portada ? <Image src={p.local.portada} alt="" width={420} height={240} sizes="300px" /> : <span className="hm-carr-cover-fill" />}
              <span className="hm-carr-logo">
                <Image src={p.local.logo} alt="" width={64} height={64} />
              </span>
            </div>
            <div className="hm-carr-body">
              <small>{p.local.nombre}</small>
              <b>{p.nombre}</b>
              <span className="hm-carr-row">
                <span className="hm-pts">
                  <Coin size={22} />
                  <b>{p.puntos}</b>
                </span>
                {p.detalle ? <em>{p.detalle}</em> : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hm-carr-nav">
        <button type="button" onClick={() => mover(-1)} aria-label="Premio anterior">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" onClick={() => mover(1)} aria-label="Premio siguiente">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
