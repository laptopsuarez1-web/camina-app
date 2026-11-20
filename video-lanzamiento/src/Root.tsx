import { Composition } from 'remotion';
import { Lanzamiento } from './Lanzamiento';

// Video oficial de lanzamiento de Camina: vertical (Reels, TikTok, Facebook) y horizontal (YouTube, pantallas).
// La voz se elige con la prop `voz` (hombre o mujer).
export const RemotionRoot = () => {
  return (
    <>
      <Composition id="LanzamientoVertical" component={Lanzamiento} durationInFrames={1050} fps={30} width={1080} height={1920} defaultProps={{ voz: 'hombre' as const }} />
      <Composition id="LanzamientoHorizontal" component={Lanzamiento} durationInFrames={1050} fps={30} width={1920} height={1080} defaultProps={{ voz: 'hombre' as const }} />
    </>
  );
};
