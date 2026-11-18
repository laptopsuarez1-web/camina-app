'use client';

import Image from 'next/image';
import { useRef, useState, type KeyboardEvent } from 'react';
import { COMUNIDAD } from './data';

// Comunidad agrupada en tres pestañas (no un catálogo): cada una con dos pantallas reales en profundidad.
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
    <div className="hm-com">
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
        <span className="hm-tabs-pill" style={{ ['--k' as string]: act }} aria-hidden="true" />
      </div>

      <div className="hm-com-stage">
        {COMUNIDAD.map((g, i) => (
          <div
            key={g.id}
            role="tabpanel"
            id={`panel-${g.id}`}
            aria-labelledby={`tab-${g.id}`}
            className={`hm-com-panel${act === i ? ' is-on' : ''}`}
            hidden={act !== i}
          >
            <div className="hm-com-copy">
              <h3>{g.t}</h3>
              <p>{g.d}</p>
              <dl>
                {g.items.map(([t, d]) => (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hm-com-phones">
              {g.imgs.map((src, k) => (
                <div className={`hm-phone hm-com-ph hm-com-ph-${k}`} key={src}>
                  <div className="hm-phone-screen">
                    <Image src={src} alt={`Pantalla de Camina: ${g.items[k][0]}`} width={780} height={1688} sizes="(max-width: 760px) 46vw, 300px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
