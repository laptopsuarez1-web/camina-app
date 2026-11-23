import { AbsoluteFill, Img, staticFile } from 'remotion';
import './marca';

// CAMINA · Portada de campaña «Cada paso cuenta.» (1080 × 1350, imagen fija).
// Foto: generada con IA (Figma, gpt-image) a partir del brief de campaña — jóvenes caminando por una ciudad boliviana al
// atardecer, cielo morado y estelas verdes en el piso —, sin texto. Encima, el logotipo oficial de CAMINA (sin modificar)
// y el eslogan, compuestos aquí para que se lean perfectos.
// Exportar: npx remotion still PortadaCampana out/portada-campana.png
export const PortadaCampana = () => (
  <AbsoluteFill style={{ backgroundColor: '#200a52' }}>
    <Img src={staticFile('campana/foto-caminantes.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    {/* el cielo se oscurece arriba para que la marca respire y se lea */}
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(24,6,58,0.72) 0%, rgba(24,6,58,0.35) 30%, rgba(24,6,58,0) 46%)' }} />
    <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(12,4,28,0.55) 0%, rgba(12,4,28,0) 22%)' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 88, height: 88, filter: 'drop-shadow(0 0 24px rgba(98,240,182,0.55))' }} />
      <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ width: 720, marginTop: 20, filter: 'brightness(0) invert(1) drop-shadow(0 6px 30px rgba(20,4,50,0.55))' }} />
      <div style={{ marginTop: 18, fontFamily: 'Jakarta', fontWeight: 600, fontSize: 52, letterSpacing: '0.01em', color: '#ffffff', textShadow: '0 3px 20px rgba(20,4,50,0.6)' }}>
        Cada paso <span style={{ color: '#62f0b6' }}>cuenta.</span>
      </div>
    </div>
  </AbsoluteFill>
);
