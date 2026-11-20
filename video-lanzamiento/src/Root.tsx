import { Composition } from 'remotion';
import { Lanzamiento } from './Lanzamiento';

// Video oficial de lanzamiento de Camina: vertical 1080 × 1920 (Reels, TikTok, Facebook), 35 s a 30 fps.
// `voz`: false = versión A (música y efectos), true = versión B (con locución).
export const RemotionRoot = () => {
  return <Composition id="Lanzamiento" component={Lanzamiento} durationInFrames={1050} fps={30} width={1080} height={1920} defaultProps={{ voz: false }} />;
};
