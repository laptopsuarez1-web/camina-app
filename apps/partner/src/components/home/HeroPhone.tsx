'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Coin } from './ui';

// El héroe muestra la pantalla Inicio de la app "en vivo": los pasos suben solos y, cada vez que se cruzan
// 1.000 pasos, se suma 1 Punto (la regla real). El aro grande de atrás muestra cuánto falta para el próximo Punto.
// La captura (inicio-live.jpg) es la real sin el número, la etiqueta y la pastilla de Puntos: esos se dibujan encima.
// Datos de ejemplo. Con "reducir movimiento" todo queda quieto en 6.912 pasos.
const INICIO = 6912;
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function HeroPhone() {
  const root = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState(INICIO);
  const [burst, setBurst] = useState(0);
  const [live, setLive] = useState(false);
  const cur = useRef(INICIO);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = true;
    let timer = 0;
    // Empieza cuando el aro grande terminó de llenarse.
    const start = window.setTimeout(() => {
      setLive(true);
      timer = window.setInterval(() => {
        if (!visible || document.hidden) return;
        const s = cur.current;
        const n = s + 1 + Math.floor(Math.random() * 3);
        cur.current = n;
        if (Math.floor(n / 1000) > Math.floor(s / 1000)) setBurst((b) => b + 1);
        setSteps(n);
      }, 80);
    }, 2900);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
      io.disconnect();
    };
  }, []);

  const pts = Math.floor(steps / 1000);
  const offset = 100 - (steps % 1000) / 10;

  return (
    <div className="hm-heroph" aria-hidden="true" ref={root}>
      <svg className="hm-heroph-ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" className="hm-heroph-ring-bg" />
        <circle
          cx="100"
          cy="100"
          r="92"
          className={`hm-heroph-ring-fg${live ? ' is-live' : ''}`}
          pathLength={100}
          style={live ? { strokeDashoffset: offset, transition: steps % 1000 < 3 ? 'none' : undefined } : undefined}
        />
      </svg>
      {burst > 0 ? (
        <span key={burst} className="hm-heroph-pt">
          <Coin size={22} />
          +1 Punto
        </span>
      ) : null}
      <div className="hm-phone">
        <div className="hm-phone-screen">
          <Image src="/web/cap/inicio-live.jpg" alt="" width={780} height={1688} sizes="(max-width: 1000px) 64vw, 340px" preload />
          <div className="hm-live">
            <b className="hm-live-n">{fmt(steps)}</b>
            <span className="hm-live-l">pasos hoy</span>
            <span key={pts} className={`hm-live-chip${burst > 0 ? ' is-pop' : ''}`}>
              <Coin size={24} />+{pts} Puntos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
