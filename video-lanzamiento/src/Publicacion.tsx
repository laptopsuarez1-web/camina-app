import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import { Telefono, Tienda } from './Carrusel4';
import './marca';

// CAMINA · Primera publicación de Instagram (una sola imagen, 1080 × 1350).
// «Cada paso cuenta» y la línea de premios y descuentos; una mezcla de pantallas (el inicio adelante, la ruta del mes y
// el podio del grupo detrás), un camino de luz con pasos, la palabra CAMINA gigante y tenue de fondo, una etiqueta en
// cada pantalla de atrás
// y «Muy pronto en App Store y Google Play». Capturas con datos de ejemplo.
// Exportar: npx remotion still Publicacion1 out/publicacion-1.png
const MENTA = '#62f0b6';
const MORADO = '#200a52';

const Etiqueta = ({ x, y, rot, fondo, color, children }: { x: number; y: number; rot: number; fondo: string; color: string; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 26px 14px 16px', borderRadius: 60, background: fondo, color, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 30, transform: `rotate(${rot}deg)`, boxShadow: '0 18px 40px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>{children}</div>
);

const yCamino = (x: number) => 930 + 70 * Math.sin(x / 210 + 0.6) + 26 * Math.sin(x / 90);

export const Publicacion1 = () => {
  const pts: string[] = [];
  for (let x = -20; x <= 1100; x += 10) pts.push(`${x} ${yCamino(x)}`);
  const d = 'M' + pts.join(' L');
  const pasos: number[] = [];
  for (let x = 10; x < 1080; x += 58) pasos.push(x);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(75% 50% at 50% 64%, #24104a 0%, #0b0b0d 72%)', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(46% 30% at 50% 62%, rgba(98,240,182,0.24), transparent 75%)' }} />
      {/* palabra gigante de fondo */}
      <div style={{ position: 'absolute', left: -60, right: -60, top: 560, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 300, lineHeight: 1, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.07)', whiteSpace: 'nowrap' } as CSSProperties}>CAMINA</div>
      {/* camino de luz con pasos, por detrás de los teléfonos */}
      <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0 }}>
        <path d={d} stroke={MENTA} strokeOpacity={0.35} strokeWidth={20} fill="none" style={{ filter: 'blur(12px)' }} />
        <path d={d} stroke={MENTA} strokeOpacity={0.85} strokeWidth={3} fill="none" />
        {pasos.map((x) => (
          <circle key={x} cx={x} cy={yCamino(x)} r={5.5} fill={MENTA} />
        ))}
      </svg>
      {/* marca y titular */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 58, height: 58 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 36 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 160, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 118, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' }}>
        Cada paso
        <br />
        <span style={{ color: MENTA, textShadow: '0 0 50px rgba(98,240,182,0.45)' }}>cuenta</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 392, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 33, color: 'rgba(255,255,255,0.78)' }}>La app que convierte tus pasos en premios y descuentos</div>
      {/* mezcla de pantallas */}
      <Telefono src="yasi/app/eventos-ruta-v2-dark.jpg" cx={250} y={560} alto={590} rz={-22} brillo={MENTA} atras />
      <Telefono src="yasi/app/grupo-v4-dark.jpg" cx={830} y={560} alto={590} rz={22} brillo={MENTA} atras />
      <Telefono src="yasi/app/inicio-dark.jpg" cx={540} y={478} alto={690} brillo={MENTA} />
      {/* etiquetas */}
      <Etiqueta x={56} y={1030} rot={-6} fondo="#ffffff" color="#0b0b0d">Ruta del mes</Etiqueta>
      <Etiqueta x={700} y={1060} rot={5} fondo={MENTA} color={MORADO}>Ranking del grupo</Etiqueta>
      {/* tiendas */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, background: 'linear-gradient(180deg, rgba(11,11,13,0), rgba(11,11,13,0.9) 55%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1208, display: 'flex', justifyContent: 'center', gap: 20, transform: 'scale(0.86)' }}>
        <Tienda icono={<IconoApple />} nombre="App Store" />
        <Tienda icono={<IconoPlay />} nombre="Google Play" />
      </div>
    </AbsoluteFill>
  );
};
