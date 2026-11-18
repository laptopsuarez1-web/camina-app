'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Icon } from './ui';

// La misma pantalla real en modo oscuro y claro: arrastra el control para comparar.
export default function Compare({ dark, light }: { dark: string; light: string }) {
  const [v, setV] = useState(50);
  return (
    <div className="hm-compare" style={{ ['--v' as string]: `${v}%` }}>
      <div className="hm-phone">
        <div className="hm-phone-screen">
          <Image src={dark} alt="Inicio de Camina en modo oscuro" width={780} height={1688} sizes="(max-width: 760px) 70vw, 320px" />
          <div className="hm-compare-top" aria-hidden="true">
            <Image src={light} alt="" width={780} height={1688} sizes="(max-width: 760px) 70vw, 320px" />
          </div>
          <span className="hm-compare-handle" aria-hidden="true">
            <span>
              <Icon name="swap" />
            </span>
          </span>
        </div>
      </div>
      <label className="hm-compare-range">
        <span className="hm-sr">Comparar modo claro y oscuro</span>
        <input type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} />
      </label>
    </div>
  );
}
