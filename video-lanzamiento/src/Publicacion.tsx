import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import { Telefono, Tienda } from './Carrusel4';
import './marca';

// CAMINA · Primera publicación de Instagram (una sola imagen, 1080 × 1350).
// Marca, promesa, producto y cuándo llega: «Cada paso cuenta», la línea de premios y descuentos, el teléfono entero
// con el inicio y «Muy pronto en App Store y Google Play».
// Exportar: npx remotion still Publicacion1 out/publicacion-1.png
const MENTA = '#62f0b6';
export const Publicacion1 = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(70% 45% at 50% 62%, #1d1238 0%, #0b0b0d 70%)', overflow: 'hidden' }}>
    <AbsoluteFill style={{ background: 'radial-gradient(42% 30% at 50% 60%, rgba(98,240,182,0.26), transparent 75%)' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
      <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 58, height: 58 }} />
      <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 36 }} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 162, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 118, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' }}>
      Cada paso
      <br />
      <span style={{ color: MENTA }}>cuenta</span>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 386, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 33, color: 'rgba(255,255,255,0.75)' }}>La app que convierte tus pasos en premios y descuentos</div>
    <Telefono src="yasi/app/inicio-dark.jpg" cx={540} y={462} alto={690} brillo={MENTA} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1196, display: 'flex', justifyContent: 'center', gap: 20, transform: 'scale(0.9)' }}>
      <Tienda icono={<IconoApple />} nombre="App Store" />
      <Tienda icono={<IconoPlay />} nombre="Google Play" />
    </div>
  </AbsoluteFill>
);
