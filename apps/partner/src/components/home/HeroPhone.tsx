'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CAP } from './data';

// Un solo teléfono en el héroe que muestra la app real: Inicio → Actividad → Tus Puntos → Canjes.
// Cada pantalla entra deslizándose desde abajo. Con "reducir movimiento" queda fija en Inicio.
const PANTALLAS = [
  { src: CAP.inicio, t: 'Tus pasos de hoy' },
  { src: CAP.actividad, t: 'Tu semana' },
  { src: CAP.puntos, t: 'Tus Puntos' },
  { src: CAP.canjes, t: 'Tus premios' },
];

export default function HeroPhone() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let id = 0;
    const start = () => {
      window.clearInterval(id);
      id = window.setInterval(() => !document.hidden && setI((v) => (v + 1) % PANTALLAS.length), 3200);
    };
    start();
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hm-heroph" aria-hidden="true">
      <div className="hm-phone">
        <div className="hm-phone-screen">
          {PANTALLAS.map((p, k) => (
            <Image
              key={p.src}
              className={`hm-heroph-shot${k === i ? ' is-on' : k === (i - 1 + PANTALLAS.length) % PANTALLAS.length ? ' is-past' : ''}`}
              src={p.src}
              alt=""
              width={780}
              height={1688}
              sizes="(max-width: 1000px) 62vw, 320px"
              preload={k === 0}
            />
          ))}
        </div>
      </div>
      <div className="hm-heroph-tabs">
        {PANTALLAS.map((p, k) => (
          <span key={p.src} className={k === i ? 'is-on' : ''}>
            {p.t}
          </span>
        ))}
      </div>
    </div>
  );
}
