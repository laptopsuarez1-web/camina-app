import { Composition } from 'remotion';
import { Lanzamiento } from './Lanzamiento';
import { DUR_YSI, YSi } from './YSi';
import { DUR_HORIZONTE, Horizonte } from './Horizonte';
import { Carrusel, LAMINAS } from './Carrusel';
import { Carrusel2, LAMINAS2 } from './Carrusel2';
import { Carrusel3, LAMINAS3 } from './Carrusel3';
import { Carrusel4, LAMINAS4 } from './Carrusel4';
import { Publicacion1 } from './Publicacion';
import { PiezaComercios, PiezaGrupos, PiezaRachas, PiezaRuta } from './Piezas';
import { LAMINAS_PRES, Presentacion } from './Presentacion';
import { Regresiva3, Regresiva7, RegresivaHoy, SaludComer, SaludOms, SaludPasos } from './Campana';
import { PORTADAS, PortadaCampana, type Portada } from './PortadaCampana';
import { BienvenidaA, BienvenidaB, DUR_BIENVENIDA } from './Bienvenida';

// Videos de Camina, vertical 1080 × 1920 a 30 fps (Reels, TikTok, Facebook).
// Lanzamiento: 35 s; `voz`: false = versión A (música y efectos), true = versión B (con locución).
// YSiCadaPaso: pieza de marca «¿Y si cada paso…?», sin voz, 35 s.
// Carrusel-1 … Carrusel-9: carrusel de Instagram con el horizonte curvo (imágenes fijas 1080 × 1350).
// Carrusel3-1 … Carrusel3-10: carrusel de Instagram v3 (sobrio: un color, un titular, un teléfono; sin nombrar locales).
// Carrusel4-1 … Carrusel4-11: carrusel de Instagram v4 (teléfonos 3D, lupas y camino de luz).
// Regresiva-* y Salud-*: cuenta regresiva y datos de salud (estilo del círculo).
// Presentacion-1 … Presentacion-9: carrusel de presentación de la app con el estilo del círculo.
// PiezaComercios, PiezaRuta, PiezaGrupos, PiezaRachas: publicaciones sueltas con el estilo del círculo.
// Publicacion1: primera publicación de Instagram (una sola imagen 1080 × 1350).
// BienvenidaA / BienvenidaB: pantalla de bienvenida de la app (9:16, 3 s, 100 % gráfica).
// PortadaCampana-*: portada de campaña «Cada paso cuenta.» (imagen fija 1080 × 1350).
// Carrusel2-1 … Carrusel2-11: carrusel de Instagram, identidad «Paso a paso» (negro, blanco, morado y menta; huellas que cruzan las láminas).
// HorizonteCamina: teaser «Siempre hay más por caminar», sin voz, ≈ 20 s.
export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Lanzamiento" component={Lanzamiento} durationInFrames={1050} fps={30} width={1080} height={1920} defaultProps={{ voz: false }} />
      <Composition id="YSiCadaPaso" component={YSi} durationInFrames={DUR_YSI} fps={30} width={1080} height={1920} />
      <Composition id="HorizonteCamina" component={Horizonte} durationInFrames={DUR_HORIZONTE} fps={30} width={1080} height={1920} />
      {Array.from({ length: LAMINAS }, (_, i) => (
        <Composition key={i} id={`Carrusel-${i + 1}`} component={Carrusel} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ n: i + 1 }} />
      ))}
      <Composition id="Publicacion1" component={Publicacion1} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="PiezaComercios" component={PiezaComercios} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="PiezaRuta" component={PiezaRuta} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="PiezaGrupos" component={PiezaGrupos} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="PiezaRachas" component={PiezaRachas} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Regresiva-7" component={Regresiva7} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Regresiva-3" component={Regresiva3} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Regresiva-hoy" component={RegresivaHoy} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Salud-oms" component={SaludOms} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Salud-pasos" component={SaludPasos} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="Salud-comer" component={SaludComer} durationInFrames={1} fps={30} width={1080} height={1350} />
      {Array.from({ length: LAMINAS_PRES }, (_, i) => (
        <Composition key={`p${i}`} id={`Presentacion-${i + 1}`} component={Presentacion} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ n: i + 1 }} />
      ))}
      <Composition id="BienvenidaA" component={BienvenidaA} durationInFrames={DUR_BIENVENIDA} fps={30} width={1080} height={1920} />
      <Composition id="BienvenidaB" component={BienvenidaB} durationInFrames={DUR_BIENVENIDA} fps={30} width={1080} height={1920} />
      {(Object.keys(PORTADAS) as Portada[]).map((v) => (
        <Composition key={v} id={`PortadaCampana-${v}`} component={PortadaCampana} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ v }} />
      ))}
      {Array.from({ length: LAMINAS2 }, (_, i) => (
        <Composition key={`b${i}`} id={`Carrusel2-${i + 1}`} component={Carrusel2} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ n: i + 1 }} />
      ))}
      {Array.from({ length: LAMINAS3 }, (_, i) => (
        <Composition key={`c${i}`} id={`Carrusel3-${i + 1}`} component={Carrusel3} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ n: i + 1 }} />
      ))}
      {Array.from({ length: LAMINAS4 }, (_, i) => (
        <Composition key={`d${i}`} id={`Carrusel4-${i + 1}`} component={Carrusel4} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{ n: i + 1 }} />
      ))}
    </>
  );
};
