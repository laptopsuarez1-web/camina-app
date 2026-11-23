import { loadFont } from '@remotion/fonts';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { C } from './marca';
import { InicioVivo } from './InicioVivo';
import { Cierre } from './Lanzamiento';
import { bordes, INTRO, MONTAJE, TARJETA, TOMAS, type Medio, type Palabra, type Toma } from './ysiDatos';
export { DUR_YSI } from './ysiDatos';

// CAMINA · «¿Y si cada paso…?» — pieza de marca sin voz. Vertical 1080 × 1920, 35 s, 30 fps.
// Montaje con una o varias palabras por toma (90 BPM: 1 tiempo = 20 cuadros), todo a pantalla completa, con ráfagas
// rápidas de Tarija y de la app, y grano de película. Foco en Tarija; también La Paz y Santa Cruz.
// Material: tomas y fotos propias de Tarija, fotos libres de Wikimedia Commons (ver CREDITOS-y-si.md), pies y corredores de
// Mixkit (licencia libre), grabaciones y capturas reales de la app con datos de ejemplo. Los comercios aparecen solo al final.

loadFont({ family: 'Mono', url: staticFile('fonts/JetBrainsMono-Regular.ttf'), weight: '400' });
loadFont({ family: 'Serif', url: staticFile('fonts/newsreader-latin-400-normal.woff2'), weight: '400' });
loadFont({ family: 'Serif', url: staticFile('fonts/newsreader-latin-500-normal.woff2'), weight: '500' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;




export const YSi = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado }}>
      <Sequence name="Logo con huellas" durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      {TOMAS.map((x, i) => {
        const desde = bordes[i];
        const d = bordes[i + 1] - desde;
        const el = (
          <Sequence key={i} name={`${i + 1} ${x.palabras?.map((p) => p.t).join(' ') ?? x.leyenda ?? 'ráfaga'}`} from={desde} durationInFrames={d}>
            <TomaVista toma={x} i={i} />
          </Sequence>
        );
        return el;
      })}
      <Sequence name="Tarjeta: cada paso que damos" from={INTRO + MONTAJE} durationInFrames={TARJETA}>
        <Tarjeta />
      </Sequence>
      <Sequence name="Cierre" from={INTRO + MONTAJE + TARJETA}>
        <Cierre ritmo={0.55} />
      </Sequence>
      <Pelicula />
      <LuzFiltrada />
      <Audio name="Música" src={staticFile('audio/ysi-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// ---------- Look de película (capa de ambiente): grano fino, polvo y rayas, negros suaves, tono cálido, viñeta ----------
const Pelicula = () => {
  const fr = useCurrentFrame();
  const parpadeo = 0.01 * (random(`p${fr}`) - 0.5);
  const motas = Array.from({ length: 3 }, (_, k) => ({ x: random(`mx${fr}${k}`) * 1080, y: random(`my${fr}${k}`) * 1920, r: 1.5 + random(`mr${fr}${k}`) * 3.5, ver: random(`mv${fr}${k}`) < 0.55 }));
  const raya = random(`ry${Math.floor(fr / 3)}`) < 0.22 ? random(`rx${Math.floor(fr / 3)}`) * 1080 : null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'overlay' }}>
        <filter id={`g${fr}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={fr % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${fr})`} />
      </svg>
      {motas.map((m, k) => m.ver && <div key={k} style={{ position: 'absolute', left: m.x, top: m.y, width: m.r, height: m.r * (0.6 + random(`mh${fr}${k}`)), borderRadius: '50%', background: random(`mc${fr}${k}`) < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }} />)}
      {raya !== null && <div style={{ position: 'absolute', left: raya, top: 0, bottom: 0, width: 1.2, background: 'rgba(255,255,255,0.13)' }} />}
      <AbsoluteFill style={{ backgroundColor: '#120f16', mixBlendMode: 'lighten', opacity: 0.9 }} />
      <AbsoluteFill style={{ backgroundColor: 'rgba(255,170,100,0.07)', mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      <AbsoluteFill style={{ backgroundColor: parpadeo > 0 ? '#fff' : '#000', opacity: Math.abs(parpadeo) }} />
    </AbsoluteFill>
  );
};

// Destello de luz cálida (como una filtración de luz en la película) al empezar cada capítulo.
const CAPITULOS = [0, 4, 8, 15, 22, 26];
const LuzFiltrada = () => {
  const fr = useCurrentFrame();
  return (
    <>
      {CAPITULOS.map((k) => {
        const f0 = bordes[k];
        const o = interpolate(fr, [f0 - 2, f0 + 1, f0 + 12], [0, 0.55, 0], { ...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1) });
        if (o <= 0) return null;
        const lado = random(`lz${k}`) < 0.5 ? '0%' : '100%';
        return <AbsoluteFill key={k} style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: o, background: `radial-gradient(70% 55% at ${lado} 30%, rgba(255,150,70,0.95), rgba(255,60,90,0.35) 45%, transparent 75%)` }} />;
      })}
    </>
  );
};

const vibra = (fr: number) => `translate(${(random(`x${fr}`) - 0.5) * 1.2}px, ${(random(`y${fr}`) - 0.5) * 1.2}px)`;

// ---------- CAMINA que se arma letra por letra (con fallas) ----------
// Las letras aparecen desde el centro con símbolos que parpadean hasta fijarse, y al final una barra (\\) que acompaña.
const SIMB = '\\/·#×+▮';
const LETRAS = 'CAMINA';
const PalabraArmada = ({ fr, dur = 26, size = 120, barra = 0 }: { fr: number; dur?: number; size?: number; barra?: number }) => {
  const visibles = Math.floor(interpolate(fr, [0, dur], [1, LETRAS.length], clamp));
  const armando = fr < dur + 4;
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Mona', fontWeight: 780, fontStretch: '118%', fontSize: size, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>
      {LETRAS.split('').map((l, i) => {
        if (i >= visibles) return null;
        const fija = (i / (LETRAS.length - 1)) * dur + 4;
        if (i === 3 && barra > 0) {
          // la «I» se convierte en una barra que se estira (como en la apertura de la referencia)
          return <span key={i} style={{ display: 'inline-block', width: 0.3 * size + barra, height: 0.72 * size, marginRight: '0.08em', background: C.verde, clipPath: 'polygon(6% 0, 100% 0, 94% 100%, 0 100%)' }} />;
        }
        const ch = SIMB[Math.floor(random(`l${i}${Math.floor(fr / 2)}`) * SIMB.length)];
        return (
          <span key={i} style={{ position: 'relative', color: fr < fija ? 'transparent' : '#fff' }}>
            {l}
            {fr < fija && <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: C.verde }}>{ch}</span>}
          </span>
        );
      })}
      {armando && <span style={{ color: C.verde, marginLeft: '0.05em' }}>{'\\'}</span>}
    </div>
  );
};

// ---------- Intro: huellas que suben, aparece el logo y CAMINA se arma con fallas ----------
const Intro = () => {
  const fr = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: fr - 40, fps, config: { damping: 13, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((k) => {
        const en = k * 9;
        const o = interpolate(fr, [en, en + 3, 40, 46], [0, 1, 1, 0], clamp);
        return <Img key={k} src={staticFile(k % 2 ? 'marca/pie-R-mint.png' : 'marca/pie-L-mint.png')} style={{ position: 'absolute', left: 540 + (k % 2 ? 46 : -46) - 40, top: 1500 - k * 170 - 70, width: 80, opacity: o }} />;
      })}
      <div style={{ position: 'absolute', top: 640, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: 300, height: 300, borderRadius: '50%', transform: `scale(${logo})`, opacity: Math.min(1, logo * 2), boxShadow: '0 0 120px rgba(110,70,230,0.5)' }} />
        <div style={{ marginTop: 60, height: 170 }}>{fr >= 44 && <PalabraArmada fr={fr - 44} dur={16} size={150} />}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Una toma ----------
const grade = 'contrast(1.04) saturate(0.95) sepia(0.1) brightness(1.02)';
const suaveP = Easing.bezier(0.4, 0, 0.2, 1); // curva única del video (estilo «Premium»: sin rebote)
const cubre: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

const MedioVista = ({ m, p }: { m: Medio; p: number }) => {
  if (m.tipo === 'video') return <Video src={staticFile(m.src)} trimBefore={m.desde ?? 0} muted objectFit="cover" style={{ ...cubre, filter: grade }} />;
  if (m.tipo === 'app') return <Img src={staticFile(m.src)} style={{ ...cubre, objectPosition: 'center 18%', transform: `scale(${1.04 + 0.04 * p})` }} />;
  return <Img src={staticFile(m.src)} style={{ ...cubre, objectPosition: m.origen ?? 'center', filter: grade }} />;
};

const TomaVista = ({ toma, i: n }: { toma: Toma; i: number }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = fr / durationInFrames;
  // cámara: cada toma con un movimiento distinto y suave (acercar, alejar, paneo), nunca lineal
  const q = suaveP(Math.min(1, p));
  const tipoMov = Math.floor(random(`cam${n}`) * 5);
  const camara = [
    `scale(${1.03 + 0.07 * q})`,
    `scale(${1.1 - 0.07 * q})`,
    `scale(1.09) translateX(${2.2 - 4.4 * q}%)`,
    `scale(1.09) translateX(${-2.2 + 4.4 * q}%)`,
    `scale(1.09) translateY(${1.8 - 3.6 * q}%)`,
  ][tipoMov];
  let fondo: ReactNode = null;
  if (toma.rafaga) {
    const i = Math.min(toma.rafaga.length - 1, Math.floor(fr / (toma.cada ?? 5)));
    fondo = <MedioVista m={toma.rafaga[i]} p={p} />;
  } else if (toma.inicio) {
    const pasos = interpolate(fr, [0, 12], [1962, 2000], { ...clamp, easing: Easing.out(Easing.cubic) });
    const pop = interpolate(fr, [12, 15, 20], [0, 1, 0.6], clamp);
    fondo = (
      <AbsoluteFill style={{ backgroundColor: '#1b1229', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -60, top: 150, width: 1200, height: (1200 * 2556) / 1179, transform: `scale(${1.15 + 0.08 * p})`, transformOrigin: '50% 33%' }}>
          <InicioVivo pasos={pasos} saldo={fr >= 16 ? 248 : 247} lleno={fr >= 12 ? 1 : 0} brillo={pop} pop={pop} />
        </div>
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1b1229 0%, #1b1229 26%, rgba(27,18,41,0) 40%)' }} />
      </AbsoluteFill>
    );
  } else if (toma.medio) {
    fondo = <MedioVista m={toma.medio} p={p} />;
  }
  const esApp = toma.inicio || toma.medio?.tipo === 'app' || toma.medio?.src.includes('/app-');
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <AbsoluteFill style={{ transform: `${vibra(fr)} ${esApp ? '' : camara}` }}>
        {fondo}
        {!esApp && <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.22, filter: 'blur(16px) brightness(1.15) saturate(1.3)' }}>{fondo}</AbsoluteFill>}
      </AbsoluteFill>
      {toma.palabras?.map((w, k) => <PalabraVista key={k} p={w} />)}
      {toma.leyenda && <Leyenda texto={toma.leyenda} abajo={!!toma.palabras} />}
    </AbsoluteFill>
  );
};

// Texto como en las películas de marca: serif, blanco, aparece por corte (con un leve desenfoque) en distintos lugares.
const PalabraVista = ({ p }: { p: Palabra }) => {
  const fr = useCurrentFrame() - (p.en ?? 0);
  const { durationInFrames } = useVideoConfig();
  if (fr < 0) return null;
  // que nunca se salga de la pantalla: ancho aproximado de la serif ≈ 0,56 em por letra
  const size = Math.min(p.size ?? 118, Math.floor(940 / (p.t.length * 0.56)));
  const ancho = p.t.length * 0.56 * size;
  const cx = Math.min(1080 - 50 - ancho / 2, Math.max(50 + ancho / 2, p.x * 1080));
  const o = interpolate(fr, [0, 3], [0, 1], clamp);
  const crece = p.efecto === 'crecer';
  const grande = (p.size ?? 118) >= 200;
  const blur = interpolate(fr, [0, crece ? 7 : 5], [crece ? 10 : 6, 0], { ...clamp, easing: suaveP });
  const sube = interpolate(fr, [0, 12], [10, 0], { ...clamp, easing: suaveP });
  const escala = crece ? interpolate(fr, [0, durationInFrames], [0.92, 1.06], { ...clamp, easing: suaveP }) : 1;
  const ca = grande ? interpolate(fr, [0, 9], [7, 0], { ...clamp, easing: suaveP }) : 0;
  const sombra = '0 0 2px rgba(0,0,0,0.35), 0 0 24px rgba(255,255,255,0.16), 0 6px 34px rgba(0,0,0,0.4)';
  const aberracion = ca > 0.2 ? `, ${-ca}px 0 rgba(255,70,80,0.55), ${ca}px 0 rgba(70,200,255,0.55)` : '';
  const estilo: CSSProperties = {
    position: 'absolute',
    left: cx,
    top: `${p.y * 100}%`,
    transform: `translate(-50%, calc(-50% + ${sube}px)) scale(${escala})`,
    opacity: o,
    filter: `blur(${blur}px)`,
    fontFamily: 'Serif',
    fontWeight: grande ? 500 : 400,
    fontSize: size,
    letterSpacing: grande ? '-0.02em' : '-0.005em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    color: p.verde ? C.verde : '#fff',
    textShadow: sombra + aberracion,
  };
  if (p.efecto === 'juntar') {
    // letras sueltas por la pantalla que se juntan hasta formar la palabra
    const k = interpolate(fr, [0, 7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return (
      <div style={{ ...estilo, filter: 'none', opacity: 1 }}>
        {p.t.split('').map((l, i) => {
          const dx = (random(`jx${p.t}${i}`) - 0.5) * 520;
          const dy = (random(`jy${p.t}${i}`) - 0.5) * 420;
          return (
            <span key={i} style={{ display: 'inline-block', transform: `translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) scale(${0.55 + 0.45 * k})`, opacity: interpolate(fr, [0, 2], [0, 1], clamp) }}>
              {l}
            </span>
          );
        })}
      </div>
    );
  }
  // sombra muy suave detrás de la palabra para que se lea sobre fondos claros (sin que se vea una caja)
  const halo = (
    <div style={{ position: 'absolute', left: cx, top: `${p.y * 100}%`, width: ancho * 1.6 + 120, height: size * 2.2, transform: 'translate(-50%, -50%)', background: 'radial-gradient(closest-side, rgba(0,0,0,0.32), rgba(0,0,0,0) 100%)', opacity: o }} />
  );
  return (
    <>
      {halo}
      <div style={estilo}>{p.t}</div>
    </>
  );
};

const Leyenda = ({ texto, abajo }: { texto: string; abajo: boolean }) => {
  const fr = useCurrentFrame();
  const n = Math.floor(interpolate(fr, [2, 10], [0, texto.length], clamp));
  if (n === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: abajo ? 1460 : 940, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 16px rgba(0,0,0,0.75)' }}>
      {`\\  ${texto.slice(0, n)}  \\`}
    </div>
  );
};

// ---------- Tarjeta: «Cada paso que damos, [local] mueve a Tarija» (los 8 comercios de Camina) ----------
const LOGOS = ['fripaps-logo', 'bloom-logo', 'coco-logo', 'cancheritos-logo', 'galera-logo', 'viviana-logo', 'sabor-logo', 'luzdevida-app'];
const Tarjeta = () => {
  const fr = useCurrentFrame();
  const l1 = interpolate(fr, [0, 10], [0, 1], clamp);
  const l3 = interpolate(fr, [8, 18], [0, 1], clamp);
  const ciclo = fr < 14 ? -1 : Math.floor((fr - 14) / 7);
  const enCamina = ciclo >= LOGOS.length * 2;
  const idx = ciclo < 0 ? 0 : ciclo % LOGOS.length;
  const { durationInFrames } = useVideoConfig();
  const salida = interpolate(fr, [durationInFrames - 10, durationInFrames], [1, 0], clamp);
  const linea: CSSProperties = { fontFamily: 'Serif', fontWeight: 400, fontSize: 92, letterSpacing: '-0.015em', color: '#fff', textAlign: 'center', lineHeight: 1.1 };
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado, alignItems: 'center', justifyContent: 'center', opacity: salida }}>
      <div style={{ ...linea, opacity: l1 }}>Cada paso que damos,</div>
      <div style={{ margin: '44px 0', width: 220, height: 220, borderRadius: 40, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', opacity: interpolate(fr, [10, 16], [0, 1], clamp), background: '#fff' }}>
        {enCamina ? (
          <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Img src={staticFile(`yasi/locales/${LOGOS[idx]}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <div style={{ ...linea, opacity: l3 }}>
        mueve a <span style={{ color: C.verde }}>Tarija</span>
      </div>
    </AbsoluteFill>
  );
};
