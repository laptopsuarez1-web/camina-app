'use client';

import Link from 'next/link';
import { Kinetic } from './Motion';
import { HeroApp, Escaparate, Cap, VideoRuta, type Item } from './ComerciosShow';

/* Página para personas: mismas piezas que /comercios, solo pantallas reales de la app. */

export function HeroPersonas() {
  return (
    <HeroApp
      kick="Gratis para todos"
      titulo="Camina, suma puntos y *gana* *premios.*"
      sub="Camina cuenta tus pasos y los convierte en Puntos que canjeas en comercios de tu ciudad."
      cta={
        <>
          <a className="lp-btn mint cx-btn" href="#descargar" data-medir="inicio_quiero_usar">Quiero usar Camina</a>
          <Link className="lp-btn ghost cx-btn" href="/comercios" data-medir="inicio_tengo_comercio">Tengo un comercio</Link>
        </>
      }
      pantallas={[
        { src: '/web/cap/inicio-dark.jpg', t: 'Caminas', d: 'Cada 1.000 pasos, 1 Punto.', alt: 'Pantalla de la app: pasos de hoy' },
        { src: '/web/cap/mapa-locales-dark.jpg', t: 'Encuentras locales', d: 'Los comercios cerca tuyo, en el mapa.', alt: 'Pantalla de la app: mapa con locales' },
        { src: '/web/cap/premios-bloom-dark.jpg', t: 'Canjeas', d: 'Usas tus Puntos en premios y descuentos.', alt: 'Pantalla de la app: premios de un local' },
      ]}
    />
  );
}

export function RutaPersonas() {
  const items: Item[] = [
    { t: '3 locales sorpresa', d: 'Cada mes recibes tu ruta con 3 locales para visitar.', vista: () => <Cap src="/web/cap/eventos-ruta-nov-dark.jpg" alt="Pantalla de la app: Tu ruta de noviembre" sizes="260px" /> },
    { t: 'Los ves en tu mapa', d: 'Llegas y marcas tu visita en cada uno.', vista: () => <Cap src="/web/cap/ruta-mapa-nov-dark.jpg" alt="Pantalla de la app: mapa de la ruta" sizes="260px" /> },
    { t: 'Tu álbum del mes', d: 'Tus fotos de la ruta, listas para compartir.', vista: (a) => <VideoRuta n="ruta-album" activo={a} /> },
  ];
  return (
    <section className="cx-sec cx-ruta" id="ruta">
      <div className="wrap">
        <p className="kick">Ruta del mes</p>
        <Kinetic text="Cada mes, una ruta *nueva.*" />
        <Escaparate id="esc-ruta-p" items={items} ms={7000} />
      </div>
    </section>
  );
}

export function TodoSuma() {
  const items: Item[] = [
    { t: 'Tus Puntos', d: 'Tu saldo, tus movimientos y tu tarjeta de fidelidad: con 5 canjes eliges un premio gratis.', vista: () => <Cap src="/web/cap/puntos-nuevo-dark.jpg" alt="Pantalla de la app: tus Puntos" sizes="260px" /> },
    { t: 'Tu racha', d: 'Cada día con 5.000 pasos o más suma a tu racha.', vista: () => <Cap src="/web/cap/rachas-dark.jpg" alt="Pantalla de la app: rachas" sizes="260px" /> },
    { t: 'Tus grupos', d: 'Caminen juntos: meta compartida, podio y chat.', vista: () => <Cap src="/web/cap/grupo-v4-dark.jpg" alt="Pantalla de la app: un grupo" sizes="260px" /> },
    { t: 'Tu nivel en cada local', d: 'Mientras más vuelves, más sube tu nivel.', vista: () => <Cap src="/web/cap/ficha-bloom-nivel-dark.jpg" alt="Pantalla de la app: nivel en un local" sizes="260px" /> },
  ];
  return (
    <section className="cx-sec" id="funciones">
      <div className="wrap">
        <p className="kick">Todo suma</p>
        <Kinetic text="Más motivos para *caminar.*" />
        <Escaparate id="esc-suma" items={items} />
      </div>
    </section>
  );
}
