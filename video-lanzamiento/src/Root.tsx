import { Composition } from 'remotion';
import { Lanzamiento } from './Lanzamiento';

// Video oficial de lanzamiento de Camina: vertical para Reels/TikTok/Facebook y horizontal para YouTube y pantallas.
export const RemotionRoot = () => {
  return (
    <>
      <Composition id="LanzamientoVertical" component={Lanzamiento} durationInFrames={1050} fps={30} width={1080} height={1920} />
      <Composition id="LanzamientoHorizontal" component={Lanzamiento} durationInFrames={1050} fps={30} width={1920} height={1080} />
    </>
  );
};
