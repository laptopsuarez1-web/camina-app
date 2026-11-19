import Image from 'next/image';
import { CAP } from './data';
import { Coin } from './ui';

// El héroe muestra una sola pantalla: Inicio de la app, con su aro de pasos. Detrás, el mismo aro en grande se
// llena una vez al cargar. Las demás pantallas (Actividad, Puntos, mapa, Canjes) se muestran más abajo, en Cómo funciona.
export default function HeroPhone() {
  return (
    <div className="hm-heroph" aria-hidden="true">
      <svg className="hm-heroph-ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" className="hm-heroph-ring-bg" />
        <circle cx="100" cy="100" r="92" className="hm-heroph-ring-fg" pathLength={100} />
      </svg>
      {/* Puntos que se ganan: suben desde el aro, uno tras otro (la regla real: 1.000 pasos = 1 Punto). */}
      <div className="hm-heroph-pts">
        {[0, 1, 2].map((k) => (
          <span key={k} style={{ ['--k' as string]: k }}>
            <Coin size={20} />
            +1 Punto
          </span>
        ))}
      </div>
      <div className="hm-phone">
        <div className="hm-phone-screen">
          <Image src={CAP.inicio} alt="" width={780} height={1688} sizes="(max-width: 1000px) 64vw, 340px" preload />
        </div>
      </div>
    </div>
  );
}
