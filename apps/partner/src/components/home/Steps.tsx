'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ETAPAS as ETAPAS_GENTE } from './data';

type Etapa = { n: string; t: string; d: string; dato: string; img: string; alt: string };

// Cómo funciona: un teléfono que te acompaña y cambia de pantalla según la etapa.
// Escritorio: el teléfono queda fijo a un lado y las etapas pasan al otro.
// Celular: el teléfono y el texto quedan fijos en pantalla; al bajar cambian juntos (sin carrusel).
export default function Steps({ etapas = ETAPAS_GENTE }: { etapas?: readonly Etapa[] }) {
  const ETAPAS = etapas;
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const mobile = window.matchMedia('(max-width: 999px)');
    const m = el.querySelector<HTMLElement>('.hm-steps-m');
    const stick = el.querySelector<HTMLElement>('.hm-steps-m-stick');
    const items = Array.from(el.querySelectorAll<HTMLElement>('.hm-steps-list [data-step]'));
    let io: IntersectionObserver | null = null;
    let raf = 0;

    // Celular: la etapa sale del avance real del bloque fijo. Mientras el teléfono no quedó fijo arriba,
    // se ve la etapa 1; luego cada etapa ocupa la misma cantidad de recorrido.
    const paint = () => {
      raf = 0;
      if (!m || !stick) return;
      const r = m.getBoundingClientRect();
      const travel = m.offsetHeight - stick.offsetHeight;
      const top = parseFloat(getComputedStyle(stick).top) || 0;
      const p = travel > 0 ? (top - r.top) / travel : 0;
      setAct(Math.max(0, Math.min(ETAPAS.length - 1, Math.floor(p * ETAPAS.length))));
    };
    const on = () => !raf && (raf = requestAnimationFrame(paint));

    const setup = () => {
      io?.disconnect();
      window.removeEventListener('scroll', on);
      if (mobile.matches) {
        paint();
        window.addEventListener('scroll', on, { passive: true });
      } else {
        io = new IntersectionObserver(
          (es) => es.forEach((e) => e.isIntersecting && setAct(Number((e.target as HTMLElement).dataset.step))),
          { rootMargin: '-48% 0px -48% 0px' },
        );
        items.forEach((it) => io!.observe(it));
      }
    };
    setup();
    mobile.addEventListener('change', setup);
    window.addEventListener('resize', on);
    return () => {
      io?.disconnect();
      mobile.removeEventListener('change', setup);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ETAPAS.length]);

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
          {ETAPAS.map((e) => (
            <div key={e.n} />
          ))}
        </div>
      </div>
    </div>
  );
}
