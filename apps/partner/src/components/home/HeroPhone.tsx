'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Coin } from './ui';

// El héroe muestra la pantalla Inicio de la app "en vivo": los pasos suben solos y, cada vez que se cruzan
// 1.000 pasos, se suma 1 Punto (la regla real). El aro grande de atrás muestra cuánto falta para el próximo Punto.
// La captura (inicio-app.jpg) es la pantalla Inicio de la versión actual de la app, sin los datos de la persona
// (barra de estado, saldo, foto, saludo, aros, pasos y racha): esos se dibujan encima con datos de ejemplo.
// Aro grueso de afuera = avance hacia la meta del día; aro fino de adentro = avance hacia el próximo Punto.
// Con "reducir movimiento" todo queda quieto.
const INICIO = 1912;
const META = 5000;
const SALDO = 247; // Puntos de ejemplo en la pastilla de arriba
const CX = 591;
const CY = 840;
const arc = (r: number, k: number) => {
  const a = k * 2 * Math.PI;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
};
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
  const prog = (steps % 1000) / 1000;
  const dot = arc(240, prog);

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
          <Image src="/web/cap/inicio-app.jpg" alt="" width={780} height={1691} sizes="(max-width: 1000px) 64vw, 340px" preload />
          <div className="hm-live">
            <svg viewBox="0 0 1179 2556" className="hm-live-svg">
              <circle cx={CX} cy={CY} r="324" className="hm-live-trk" strokeWidth="78" />
              <circle cx={CX} cy={CY} r="324" className="hm-live-meta" strokeWidth="78" transform={`rotate(-90 ${CX} ${CY})`} pathLength={100} strokeDasharray={`${Math.min(100, (steps / META) * 100)} 100`} />
              <circle cx={CX} cy={CY} r="240" className="hm-live-trk2" strokeWidth="20" />
              <circle cx={CX} cy={CY} r="240" className="hm-live-next" strokeWidth="20" transform={`rotate(-90 ${CX} ${CY})`} pathLength={100} strokeDasharray={`${prog * 100} 100`} />
              <circle cx={dot.x} cy={dot.y} r="34" className="hm-live-halo" />
              <circle cx={dot.x} cy={dot.y} r="14" fill="#fff" />
            </svg>
            <span className="hm-live-saldo">
              <Coin size={24} />
              {fmt(SALDO + pts - Math.floor(INICIO / 1000))}
            </span>
            <span className="hm-live-av">V</span>
            <span className="hm-live-hola">Buen día, Valentina</span>
            <b className="hm-live-n">{fmt(steps)}</b>
            <span className="hm-live-l">pasos hoy</span>
            <span key={pts} className={`hm-live-chip${burst > 0 ? ' is-pop' : ''}`}>
              <Coin size={24} />+{pts} {pts === 1 ? 'Punto' : 'Puntos'}
            </span>
            <span className="hm-live-racha">
              <i>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 3c1 8 12 13 12 25a12 12 0 0 1-24 0c0-5 2.5-8 5-10 .3 3 1.5 5 3.5 6C19 17 21 9 24 3z" fill="#3fbf95" />
                  <path d="M24 25c1.5 3.5 6 5 6 10a6 6 0 0 1-12 0c0-3 1.5-4.5 3-5.5.2 1.5.8 2.2 1.8 2.7C23 30 23 27 24 25z" fill="#a8eeb0" />
                </svg>
                12
              </i>
              días de racha
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
