import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import { ARCO, Base, CY, LILA, MENTA, MORADO, PiezaGrupos, PiezaRachas, PiezaRuta, R } from './Piezas';
import './marca';

// CAMINA · Carrusel de presentación de la app (9 láminas de 1080 × 1350) con el estilo del círculo: el horizonte curvo
// con el anillo de pasos en arco y el título en serifa curvado; dentro de la cúpula, cada función.
// Datos de ejemplo; no nombra comercios ni inventa premios.
// Exportar: npx remotion still Presentacion-1 out/presentacion/01.png (… hasta Presentacion-9).

export const LAMINAS_PRES = 9;

const Cifra = ({ y, n, sub }: { y: number; n: string; sub: string }) => (
  <>
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 112, lineHeight: 1, letterSpacing: '-0.01em' }}>{n}</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: y + 122, textAlign: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34 }}>{sub}</div>
  </>
);
const Pastilla = ({ y, children }: { y: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 28px 10px 16px', borderRadius: 40, background: 'rgba(98,240,182,0.14)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 34 }}>{children}</div>
  </div>
);
// posiciones sobre un arco concéntrico con la cúpula
const enArco = (r: number, n: number, paso: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((i - (n - 1) / 2) * paso) / r;
    return { x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a), giro: (a * 180) / Math.PI };
  });

const Tienda = ({ icono, nombre }: { icono: ReactNode; nombre: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px 14px 22px', borderRadius: 24, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.32)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 34, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);

export const Presentacion = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return (
        <Base etiqueta="Presentamos Camina" linea="La app que convierte tus pasos en premios y descuentos" titulo="Cada paso" acento="cuenta">
          <Cifra y={ARCO + 175} n="6.840" sub="pasos hoy" />
          <Pastilla y={ARCO + 380}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 42, height: 42 }} />
            +6 Puntos
          </Pastilla>
        </Base>
      );
    case 2: {
      const pasos = enArco(R - 210, 3, 300);
      const t = [
        ['1', 'Caminas'],
        ['2', 'Sumas Puntos'],
        ['3', 'Canjeas'],
      ];
      return (
        <Base etiqueta="Cómo funciona" linea="Caminas como siempre y la app hace el resto" titulo="Así de" acento="simple">
          {pasos.map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x - 150, top: p.y - 62, width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 124, height: 124, borderRadius: '50%', background: i === 2 ? MENTA : 'rgba(98,240,182,0.14)', boxShadow: `0 0 0 4px ${MENTA}, 0 0 34px rgba(98,240,182,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 2 ? MORADO : MENTA, fontFamily: 'Mona', fontWeight: 900, fontSize: 60 }}>{t[i][0]}</div>
              <div style={{ marginTop: 20, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 36, color: '#fff', textAlign: 'center' }}>{t[i][1]}</div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: 120, right: 120, top: ARCO + 440, textAlign: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32, lineHeight: 1.3 }}>En los comercios que se suman a Camina</div>
        </Base>
      );
    }
    case 3: {
      const alto = [0.26, 0.6, 0.94, 0.55, 0.52, 0.96, 1];
      const meta = [false, false, true, false, false, true, true];
      const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'Hoy'];
      const base = ARCO + 360;
      return (
        <Base etiqueta="Tus pasos" linea="Meta diaria, rachas y tu actividad de la semana" titulo="Se cuentan" acento="solos">
          {alto.map((h, i) => {
            const x = 540 + (i - 3) * 104 - 38;
            const H = 180 * h;
            return (
              <div key={i}>
                <div style={{ position: 'absolute', left: x, top: base - H, width: 76, height: H, borderRadius: 22, background: meta[i] ? 'linear-gradient(180deg, #a8f5d4, #5fe0a8)' : 'linear-gradient(180deg, #3d4c70, #2a3656)', boxShadow: i === 6 ? '0 0 0 4px #e9fff5' : 'none' }} />
                <div style={{ position: 'absolute', left: x - 12, width: 100, top: base + 14, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: i === 6 ? 800 : 500, fontSize: 28, color: i === 6 ? '#fff' : LILA }}>{dias[i]}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 0, right: 0, top: base + 70, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 56, color: '#fff' }}>
            32.917 <span style={{ fontWeight: 500, fontSize: 34, color: LILA }}>pasos esta semana</span>
          </div>
        </Base>
      );
    }
    case 4:
      return (
        <Base etiqueta="Puntos" linea="Caminas, cumples tu meta y tus Puntos crecen" titulo="Cada día suma" acento="Puntos" tam={82}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 165, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 120, height: 120 }} />
            <div style={{ color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 130, lineHeight: 1 }}>1.139</div>
          </div>
          <Pastilla y={ARCO + 330}>Ganaste 7 Puntos hoy</Pastilla>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 425, textAlign: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32 }}>Para canjear por premios y descuentos</div>
        </Base>
      );
    case 5:
      return <PiezaRuta />;
    case 6:
      return <PiezaGrupos />;
    case 7:
      return <PiezaRachas />;
    case 8: {
      const sellos = enArco(R - 200, 5, 175);
      return (
        <Base etiqueta="Canjes" linea="Usa tus Puntos en los comercios que se suman a Camina" titulo="Canjea en tu" acento="ciudad" tam={96}>
          {sellos.map((p, i) =>
            i < 4 ? (
              <Img key={i} src={staticFile('marca/sello-oro.png')} style={{ position: 'absolute', left: p.x - 66, top: p.y - 66, width: 132, height: 132, transform: `rotate(${p.giro}deg)` }} />
            ) : (
              <div key={i} style={{ position: 'absolute', left: p.x - 60, top: p.y - 60, width: 120, height: 120, borderRadius: '50%', border: '5px dashed rgba(185,168,224,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 44 }}>5</div>
            ),
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 320, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 60 }}>Premios y descuentos</div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 405, textAlign: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32 }}>Y cada canje suma un sello en tu tarjeta</div>
        </Base>
      );
    }
    default:
      return (
        <Base linea="Camina llega a Tarija. Síguenos para enterarte primero" titulo="Muy" acento="pronto" tam={112}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 190, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, filter: 'drop-shadow(0 0 26px rgba(98,240,182,0.35))' }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 100, height: 100 }} />
            <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 68, filter: 'brightness(0) invert(1)' }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 370, display: 'flex', justifyContent: 'center', gap: 18 }}>
            <Tienda icono={<IconoApple />} nombre="App Store" />
            <Tienda icono={<IconoPlay />} nombre="Google Play" />
          </div>
        </Base>
      );
  }
};
