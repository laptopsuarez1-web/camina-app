'use client';

import Image from 'next/image';
import { useRef, useState, type KeyboardEvent } from 'react';
import { COMUNIDAD } from './data';

// Comunidad: cuatro funciones en pestañas, cada una con su pantalla real a buen tamaño.
export default function Comunidad() {
  const [act, setAct] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (act + d + COMUNIDAD.length) % COMUNIDAD.length;
    setAct(n);
    tabs.current[n]?.focus();
  };

  return (
    <div className="hm-com" style={{ ['--k' as string]: act }}>
      <div className="hm-tabs" role="tablist" aria-label="Comunidad" onKeyDown={onKey}>
        {COMUNIDAD.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${g.id}`}
            aria-selected={act === i}
            aria-controls={`panel-${g.id}`}
            tabIndex={act === i ? 0 : -1}
            onClick={() => setAct(i)}
          >
            {g.tab}
          </button>
        ))}
        <span className="hm-tabs-pill" aria-hidden="true" />
      </div>

      <div className="hm-com-stage">
        {COMUNIDAD.map((g, i) => (
          <div key={g.id} role="tabpanel" id={`panel-${g.id}`} aria-labelledby={`tab-${g.id}`} className={`hm-com-panel${act === i ? ' is-on' : ''}`} hidden={act !== i}>
            <div className="hm-com-copy">
              <h3>{g.t}</h3>
              <p>{g.d}</p>
            </div>
            <div className="hm-phone hm-com-phone">
              <div className="hm-phone-screen">
                <Image src={g.img} alt={g.alt} width={780} height={1688} sizes="(max-width: 760px) 72vw, 340px" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
