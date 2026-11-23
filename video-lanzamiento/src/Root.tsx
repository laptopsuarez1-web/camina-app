import { Composition } from 'remotion';
import { Lanzamiento } from './Lanzamiento';
import { DUR_YSI, YSi } from './YSi';
import { DUR_HORIZONTE, Horizonte } from './Horizonte';

// Videos de Camina, vertical 1080 × 1920 a 30 fps (Reels, TikTok, Facebook).
// Lanzamiento: 35 s; `voz`: false = versión A (música y efectos), true = versión B (con locución).
// YSiCadaPaso: pieza de marca «¿Y si cada paso…?», sin voz, 35 s.
// HorizonteCamina: teaser «Siempre hay más por caminar», sin voz, ≈ 20 s.
export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Lanzamiento" component={Lanzamiento} durationInFrames={1050} fps={30} width={1080} height={1920} defaultProps={{ voz: false }} />
      <Composition id="YSiCadaPaso" component={YSi} durationInFrames={DUR_YSI} fps={30} width={1080} height={1920} />
      <Composition id="HorizonteCamina" component={Horizonte} durationInFrames={DUR_HORIZONTE} fps={30} width={1080} height={1920} />
    </>
  );
};
