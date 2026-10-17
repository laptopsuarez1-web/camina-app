'use client';

import { useEffect, useRef, useState } from 'react';
import MapMock from './MapMock';

type Paso = { t: string; d: string; vista: 'inicio' | 'mapa' | 'canjes' | 'ficha' | 'codigo' };

const PASOS: Paso[] = [
  { vista: 'inicio', t: 'Salís a caminar', d: 'La app cuenta tus pasos. Cada 1.000 son 1 punto, hasta 20 por día. Tu meta y tu racha te acompañan.' },
  { vista: 'mapa', t: 'Mirás qué hay cerca', d: 'En el mapa ves los comercios de tu barrio con premios para canjear.' },
  { vista: 'canjes', t: 'Elegís tu premio', d: 'Filtrás por categoría, ves qué está disponible ahora y cuántos puntos necesitás.' },
  { vista: 'ficha', t: 'Conocés el local', d: 'Fotos, horarios, redes y cómo llegar. Todo antes de salir de casa.' },
  { vista: 'codigo', t: 'Mostrás tu código', d: 'Te aparece un código de 6 dígitos que dura 15 minutos. El comercio lo confirma y te entrega el premio.' },
];

function Pantalla({ v }: { v: Paso['vista'] }) {
  if (v === 'mapa') return <MapMock />;
  if (v === 'codigo')
    return (
      <div className="code-screen">
        <small>Tu código de canje</small>
        <b>482 917</b>
        <em>Válido 15 minutos</em>
        <p>Mostrá este código en el local.</p>
      </div>
    );
  const src = { inicio: '/web/app-inicio.jpg', canjes: '/web/app-canjes.jpg', ficha: '/web/app-ficha.jpg' }[v];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}

export default function Story() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setI(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="story">
      <div className="story-phone" aria-hidden="true">
        <div className="phone big">
          {PASOS.map((p, k) => (
            <div key={p.vista} className={`screen${k === i ? ' show' : ''}`}><Pantalla v={p.vista} /></div>
          ))}
        </div>
      </div>
      <ol className="story-steps">
        {PASOS.map((p, k) => (
          <li key={p.t} data-i={k} ref={(el) => { refs.current[k] = el; }} className={k === i ? 'act' : ''}>
            <span className="num">{k + 1}</span>
            <h3>{p.t}</h3>
            <p>{p.d}</p>
            <div className="phone inline" aria-hidden="true"><Pantalla v={p.vista} /></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
