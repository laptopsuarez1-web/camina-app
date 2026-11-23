import { AbsoluteFill, Img, staticFile } from 'remotion';
import './marca';

// CAMINA · Portada de campaña «Cada paso cuenta.» (1080 × 1350, imagen fija).
// Fotos: generadas con IA (Figma, gpt-image), sin gente y sin texto: la ciudad de noche desde el aire con una ruta verde,
// una calle empedrada vacía con una línea de luz verde y una estela verde sobre piso mojado. Encima, el logotipo oficial de CAMINA (sin modificar) y el
// eslogan, compuestos aquí para que se lean perfectos.
// Exportar: npx remotion still PortadaCampana-ciudad out/portada-campana-ciudad.png (ciudad, calle, estela)
export const PORTADAS = {
  ciudad: { foto: 'campana/foto-ciudad.png', escala: 0.82, arriba: 40 },
  calle: { foto: 'campana/foto-calle.png', escala: 0.95, arriba: 120 },
  estela: { foto: 'campana/foto-estela.png', escala: 1.12, arriba: 190 },
} as const;
export type Portada = keyof typeof PORTADAS;

export const PortadaCampana = ({ v }: { v: Portada }) => {
  const { foto, escala: e, arriba } = PORTADAS[v];
  return (
    <AbsoluteFill style={{ backgroundColor: '#200a52' }}>
      <Img src={staticFile(foto)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* el cielo se oscurece arriba para que la marca respire y se lea */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(24,6,58,0.72) 0%, rgba(24,6,58,0.35) 28%, rgba(24,6,58,0) 44%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(12,4,28,0.55) 0%, rgba(12,4,28,0) 22%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: arriba, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 88 * e, height: 88 * e, filter: 'drop-shadow(0 0 24px rgba(98,240,182,0.55))' }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ width: 720 * e, marginTop: 20 * e, filter: 'brightness(0) invert(1) drop-shadow(0 6px 30px rgba(20,4,50,0.55))' }} />
        <div style={{ marginTop: 18 * e, fontFamily: 'Jakarta', fontWeight: 600, fontSize: 52 * e, letterSpacing: '0.01em', color: '#ffffff', textShadow: '0 3px 20px rgba(20,4,50,0.6)' }}>
          Cada paso <span style={{ color: '#62f0b6' }}>cuenta.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
