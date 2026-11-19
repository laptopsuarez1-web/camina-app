'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ETAPAS } from './data';

// Cómo funciona. Escritorio: un teléfono fijo cambia de pantalla según la etapa que pasa por el centro.
// Celular: cada etapa es una tarjeta con su pantalla, en un carrusel que se desliza con el dedo.
export default function Steps() {
  const [act, setAct] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const items = Array.from(ol.querySelectorAll<HTMLElement>('[data-step]'));
    const mobile = window.matchMedia('(max-width: 999px)');
    let io: IntersectionObserver | null = null;
    const setup = () => {
      io?.disconnect();
      io = new IntersectionObserver(
        (es) => es.forEach((e) => e.isIntersecting && setAct(Number((e.target as HTMLElement).dataset.step))),
        mobile.matches ? { root: ol, threshold: 0.6 } : { rootMargin: '-48% 0px -48% 0px' },
      );
      items.forEach((it) => io!.observe(it));
    };
    setup();
    mobile.addEventListener('change', setup);
    return () => {
      io?.disconnect();
      mobile.removeEventListener('change', setup);
    };
  }, []);

  const ir = (i: number) => {
    const it = list.current?.querySelectorAll<HTMLElement>('[data-step]')[i];
    it?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div className="hm-steps" style={{ ['--act' as string]: act }}>
      <div className="hm-steps-device" aria-hidden="true">
        <div className="hm-phone">
          <div className="hm-phone-screen">
            {ETAPAS.map((e, i) => (
              <Image key={e.n} className={`hm-steps-shot${act === i ? ' is-on' : ''}`} src={e.img} alt="" width={780} height={1688} sizes="340px" />
            ))}
          </div>
        </div>
      </div>
      <ol className="hm-steps-list" ref={list}>
        {ETAPAS.map((e, i) => (
          <li key={e.n} className={`hm-step${act === i ? ' is-on' : ''}`} data-step={i}>
            <span className="hm-step-n">Paso {i + 1} de 4</span>
            <h3>{e.t}</h3>
            <p>{e.d}</p>
            <p className="hm-step-dato">{e.dato}</p>
            <div className="hm-step-phone">
              <div className="hm-phone">
                <div className="hm-phone-screen">
                  <Image src={e.img} alt={e.alt} width={780} height={1688} sizes="64vw" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="hm-steps-dots" role="tablist" aria-label="Pasos">
        {ETAPAS.map((e, i) => (
          <button key={e.n} type="button" role="tab" aria-selected={act === i} aria-label={`Paso ${i + 1}: ${e.t}`} onClick={() => ir(i)} />
        ))}
      </div>
    </div>
  );
}
