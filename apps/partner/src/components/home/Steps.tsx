'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ETAPAS } from './data';

// Cómo funciona: un teléfono que te acompaña y cambia de pantalla según la etapa.
// Escritorio: el teléfono queda fijo a un lado y las etapas pasan al otro.
// Celular: el teléfono y el texto quedan fijos en pantalla; al bajar cambian juntos (sin carrusel).
export default function Steps() {
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-step]'));
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setAct(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: '-48% 0px -48% 0px' },
    );
    items.forEach((it) => io.observe(it));
    return () => io.disconnect();
  }, []);

  const pantallas = (
    <div className="hm-phone">
      <div className="hm-phone-screen">
        {ETAPAS.map((e, i) => (
          <Image
            key={e.n}
            className={`hm-steps-shot${act === i ? ' is-on' : act > i ? ' is-past' : ''}`}
            src={e.img}
            alt={act === i ? e.alt : ''}
            width={780}
            height={1688}
            sizes="(max-width: 999px) 52vw, 340px"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="hm-steps" ref={box} style={{ ['--act' as string]: act }}>
      {/* Escritorio */}
      <div className="hm-steps-device">{pantallas}</div>
      <ol className="hm-steps-list">
        {ETAPAS.map((e, i) => (
          <li key={e.n} className={`hm-step${act === i ? ' is-on' : ''}`} data-step={i}>
            <span className="hm-step-n">{e.n}</span>
            <h3>{e.t}</h3>
            <p>{e.d}</p>
            <p className="hm-step-dato">{e.dato}</p>
          </li>
        ))}
      </ol>

      {/* Celular */}
      <div className="hm-steps-m">
        <div className="hm-steps-m-stick">
          <div className="hm-steps-m-phone">{pantallas}</div>
          <div className="hm-steps-m-txt" aria-live="polite">
            <div className="hm-steps-m-bar" aria-hidden="true">
              {ETAPAS.map((e, i) => (
                <i key={e.n} className={i <= act ? 'is-on' : ''} />
              ))}
            </div>
            {ETAPAS.map((e, i) => (
              <div key={e.n} className={`hm-steps-m-item${act === i ? ' is-on' : ''}`} aria-hidden={act !== i}>
                <span className="hm-step-n">{e.n}</span>
                <h3>{e.t}</h3>
                <p>{e.d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="hm-steps-m-room" aria-hidden="true">
          {ETAPAS.map((e, i) => (
            <div key={e.n} data-step={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
