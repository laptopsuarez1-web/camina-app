'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

// El panel de comercios (pantalla Inicio de caminaapp.com/inicio), hecho para la web y en vivo: cada pocos segundos
// entra un canje nuevo, sube "Lo que te trajo Camina", sube "Canjes este mes" y bajan los cupones de hoy.
// Mismos textos, colores y orden que el panel real (app/inicio/page.tsx). Local, premios y números de ejemplo.

const PREMIOS = ['Café gratis', '20% de descuento en tu plato', 'Postre gratis', '2x1 en jugos', '15% de descuento'];
const MENU = ['Inicio', 'Mi local', 'Mis premios', 'Canjes', 'Ruta del mes'];
type Canje = { id: number; premio: string; t: number };

export default function PanelLive() {
  const root = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0); // canjes que llegaron mientras se mira
  const [lista, setLista] = useState<Canje[]>([
    { id: -1, premio: PREMIOS[1], t: 6 },
    { id: -2, premio: PREMIOS[0], t: 19 },
    { id: -3, premio: PREMIOS[4], t: 47 },
  ]);
  const [toast, setToast] = useState<Canje | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    let k = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      k += 1;
      // Cupones de hoy: 6 por día. Al llegar a 0 la demo vuelve a empezar el día.
      setN((x) => (x >= 5 ? 0 : x + 1));
      const c = { id: k, premio: PREMIOS[(k + 1) % PREMIOS.length], t: 0 };
      setLista((l) => [c, ...l.map((x) => ({ ...x, t: x.t + 3 }))].slice(0, 4));
      setToast(c);
    }, 3400);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  const personas = 24 + n;
  const canjes = 31 + n;
  const cupones = 6 - n;

  return (
    <div className="cx-panel" ref={root} aria-label="Panel de comercios de Camina con datos de ejemplo" role="img">
      <div className="cx-panel-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>caminaapp.com/inicio</span>
      </div>
      <div className="cx-panel-body" aria-hidden="true">
        <aside className="cx-panel-side">
          <span className="cx-panel-brand">
            <Image src="/marca/logo-solo-transparente.png" alt="" width={26} height={26} />
            <span>
              CAMINA
              <small>Panel de comercios</small>
            </span>
          </span>
          {MENU.map((m, i) => (
            <span key={m} className={i === 0 ? 'is-on' : ''}>
              {m}
            </span>
          ))}
          <span className="cx-panel-plan">
            <small>Plan actual</small>
            Paso Firme
          </span>
        </aside>
        <div className="cx-panel-main">
          <div className="cx-panel-top">
            <b>Hola, Tu local</b>
            <small>Tus códigos y cómo viene tu local.</small>
          </div>
          <div className="cx-panel-trajo">
            <small>Lo que te trajo Camina este mes</small>
            <p>
              <b key={personas} className="cx-bump">
                {personas} personas
              </b>{' '}
              llegaron a tu local por Camina: <b>{15 + n} nuevas</b> y <b>9</b> que volvieron.
            </p>
          </div>
          <div className="cx-panel-row">
            <div className="cx-panel-code">
              <small>Código del local</small>
              <b>4821</b>
              <span>Díselo al cliente cuando canjea su premio.</span>
            </div>
            <div className="cx-panel-stats">
              <div>
                <b key={canjes} className="cx-bump">
                  {canjes}
                </b>
                <small>Canjes este mes</small>
              </div>
              <div>
                <b className="is-mint">
                  {cupones} de 6
                </b>
                <small>Cupones que quedan hoy</small>
              </div>
            </div>
          </div>
          <div className="cx-panel-list">
            <p>Últimos canjes</p>
            <ul>
              {lista.map((c) => (
                <li key={c.id} className={c.t === 0 ? 'is-new' : ''}>
                  <i />
                  <span>
                    {c.premio} <em>· código del local</em>
                  </span>
                  <time>{c.t === 0 ? 'ahora' : `hace ${c.t} min`}</time>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {toast ? (
        <div key={toast.id} className="cx-toast" aria-hidden="true">
          <i />
          <span>
            <b>Nuevo canje</b>
            {toast.premio}
          </span>
        </div>
      ) : null}
    </div>
  );
}
