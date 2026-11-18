'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LOCALES } from './data';

// Escena del héroe: huellas que avanzan hacia el teléfono, un contador de pasos que se vuelve Puntos
// y un premio real que se desbloquea al llegar a sus Puntos. Narra el concepto: caminar → sumar → canjear.
// Premio real de la base (locales.ts): Panchito gratis en Fripap's, 38 Puntos.
const LOCAL = LOCALES.find((l) => l.id === 'fripaps')!;
const PREMIO = LOCAL.premios.find((p) => p.nombre === 'Panchito')!;
const META = PREMIO.puntos; // 38 Puntos
const PASOS_META = META * 1000; // 1.000 pasos = 1 Punto
const N_HUELLAS = 11;
const CICLO = 7600; // ms
const CAMINAR = 5000; // ms en que se cuentan los pasos

// Recorrido en el sistema de coordenadas de la escena (viewBox 0 0 560 660).
const PATH = 'M -260 640 C -120 560, -40 690, 60 620 S 150 560, 190 600';

const fmt = (n: number) => n.toLocaleString('es-BO');
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export default function HeroScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const pasosRef = useRef<HTMLElement>(null);
  const puntosRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [huellas, setHuellas] = useState<{ x: number; y: number; a: number; r: boolean }[]>([]);

  // Coloca las huellas sobre el recorrido, alternando pie izquierdo y derecho.
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    const out = [];
    for (let i = 0; i < N_HUELLAS; i++) {
      const s = (L * (i + 0.5)) / N_HUELLAS;
      const a = p.getPointAtLength(s);
      const b = p.getPointAtLength(Math.min(L, s + 2));
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const off = i % 2 ? 9 : -9;
      out.push({ x: a.x - Math.sin(ang) * off, y: a.y + Math.cos(ang) * off, a: (ang * 180) / Math.PI + 90, r: i % 2 === 1 });
    }
    setHuellas(out);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || huellas.length === 0) return;
    const set = (pasos: number) => {
      const pts = Math.floor(pasos / 1000);
      if (pasosRef.current) pasosRef.current.textContent = fmt(pasos);
      if (puntosRef.current) puntosRef.current.textContent = String(pts);
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, pts / META)})`;
      return pts;
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      set(PASOS_META);
      el.dataset.fase = 'listo';
      el.style.setProperty('--paso', String(N_HUELLAS));
      return;
    }
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    let lastPts = -1;
    const coin = el.querySelector<HTMLElement>('.hm-coin');
    const tick = (now: number) => {
      raf = 0;
      const t = (now - t0) % CICLO;
      const k = Math.min(1, t / CAMINAR);
      const pts = set(Math.round(ease(k) * PASOS_META));
      el.style.setProperty('--paso', (ease(k) * N_HUELLAS).toFixed(2));
      if (pts !== lastPts && pts > 0 && pts % 5 === 0 && coin) {
        coin.classList.remove('go');
        void coin.offsetWidth;
        coin.classList.add('go');
      }
      lastPts = pts;
      el.dataset.fase = t < CAMINAR ? 'camina' : t < CICLO - 700 ? 'listo' : 'fin';
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
  }, [huellas]);

  return (
    <div className="hm-scene" ref={root} data-fase="camina">
      <svg className="hm-scene-route" viewBox="0 0 560 660" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <path ref={pathRef} d={PATH} />
        {huellas.map((h, i) => (
          <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.a})`}>
            <foreignObject x={-7} y={-14} width={14} height={28}>
              <i className={`hm-foot hm-foot-${h.r ? "R" : "L"} hm-hstep`} style={{ ['--i' as string]: i }} />
            </foreignObject>
          </g>
        ))}
      </svg>

      <div className="hm-scene-phone" data-tilt>
        {children}
      </div>

      {/* Anotaciones: los números son una demostración de la regla real (1.000 pasos = 1 Punto). */}
      <div className="hm-note hm-note-pasos" aria-hidden="true">
        <small>Pasos esta semana</small>
        <b ref={pasosRef}>0</b>
      </div>
      <div className="hm-note hm-note-puntos" aria-hidden="true">
        <small>Puntos</small>
        <b><span ref={puntosRef}>0</span></b>
        <span className="hm-coin">+5</span>
      </div>
      <div className="hm-note hm-note-premio" aria-hidden="true">
        <span className="hm-premio-logo" style={{ backgroundImage: `url(${LOCAL.logo})` }} />
        <span className="hm-premio-txt">
          <small>{LOCAL.nombre}</small>
          <b>{PREMIO.nombre} {PREMIO.detalle.toLowerCase()}</b>
          <span className="hm-premio-bar"><i ref={barRef} /></span>
        </span>
        <span className="hm-premio-pts">
          <em>{META} Puntos</em>
          <strong>Listo para canjear</strong>
        </span>
      </div>
      <p className="hm-sr">
        Ejemplo: {fmt(PASOS_META)} pasos en la semana son {META} Puntos, lo que cuesta {PREMIO.nombre.toLowerCase()} {PREMIO.detalle.toLowerCase()} en {LOCAL.nombre}.
      </p>
    </div>
  );
}
