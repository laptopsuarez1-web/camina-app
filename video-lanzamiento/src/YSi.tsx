import { loadFont } from '@remotion/fonts';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { C, suave } from './marca';
import { InicioVivo } from './InicioVivo';
import { Cierre } from './Lanzamiento';

// CAMINA · «¿Y si cada paso…?» — pieza de marca sin voz. Vertical 1080 × 1920, 35 s, 30 fps.
// Montaje de una palabra por toma (90 BPM: 1 tiempo = 20 cuadros), con grano de película.
// Material: tomas propias de Tarija, fotos de Tarija, fotos libres de Bolivia (Wikimedia Commons, CC0 / dominio público / CC BY,
// ver CREDITOS.md), fotos de los comercios de Camina, pies y corredores de Mixkit (licencia libre) y pantallas reales de la app.

loadFont({ family: 'Mono', url: staticFile('fonts/JetBrainsMono-Regular.ttf'), weight: '400' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const T = 20; // un tiempo

type Palabra = { t: string; x?: number; y?: number; size?: number; verde?: boolean };
type Toma = {
  tipo: 'video' | 'foto' | 'tarjeta' | 'app' | 'inicio';
  src?: string;
  dur?: number; // en tiempos
  palabra?: Palabra;
  leyenda?: string;
  origen?: string; // object-position / transform-origin
};

const v = (src: string, palabra?: Palabra, leyenda?: string, dur = 1): Toma => ({ tipo: 'video', src: `yasi/v/${src}.mp4`, palabra, leyenda, dur });
const f = (src: string, palabra?: Palabra, leyenda?: string, origen = 'center'): Toma => ({ tipo: 'foto', src: `yasi/f/${src}`, palabra, leyenda, origen, dur: 1 });
const t = (src: string, palabra?: Palabra, leyenda?: string): Toma => ({ tipo: 'tarjeta', src, palabra, leyenda, dur: 1 });

const TOMAS: Toma[] = [
  // ¿Cuántos pasos das por día?
  v('t-parque', { t: '¿Cuántos', x: 0.5, y: 0.4, size: 150 }),
  v('t-palmeras', { t: 'pasos', x: 0.3, y: 0.3, size: 170 }),
  v('m32616', { t: 'das', x: 0.7, y: 0.55, size: 170 }),
  v('pov', { t: 'por día?', x: 0.5, y: 0.36, size: 160 }),
  // ¿Y si cada uno contara?
  v('m14766', { t: '¿Y si', x: 0.36, y: 0.34, size: 150 }),
  v('m40765', { t: 'cada uno', x: 0.55, y: 0.62, size: 150 }),
  v('m609', { t: 'contara?', x: 0.5, y: 0.46, size: 210, verde: true }, undefined, 2),
  // ¿Y si caminar te llevara más lejos? — Bolivia
  f('isla-del-sol-camino.jpg', { t: '¿Y si', x: 0.5, y: 0.3, size: 150 }, 'Isla del Sol · La Paz'),
  f('uyuni-hexagonos.jpg', { t: 'caminar', x: 0.5, y: 0.42, size: 170 }, 'Salar de Uyuni · Potosí'),
  f('laguna-colorada.jpg', { t: 'te llevara', x: 0.5, y: 0.3, size: 140 }, 'Laguna Colorada · Potosí', '62% center'),
  f('tiwanaku-puerta-del-sol.jpg', { t: 'más', x: 0.3, y: 0.28, size: 180 }, 'Tiwanaku · La Paz'),
  f('titicaca-terrazas.jpg', { t: 'lejos?', x: 0.5, y: 0.42, size: 210, verde: true }, 'Lago Titicaca'),
  f('banderas-bolivia.jpg', undefined, 'Bolivia'),
  f('potosi-plaza.jpg', undefined, 'Potosí'),
  // ¿Y si tu ciudad te lo devolviera? — Tarija
  v('aerea', { t: '¿Y si', x: 0.5, y: 0.3, size: 150 }, 'Tarija'),
  f('chunchos-san-roque.jpg', { t: 'tu', x: 0.25, y: 0.3, size: 200 }, 'Chunchos de San Roque · Tarija', '58% center'),
  t('yasi/f/san-roque-calle.jpg', { t: 'ciudad', x: 0.5, y: 0.16, size: 170 }, 'Calle La Madrid · Tarija'),
  v('gente-plaza', { t: 'te lo', x: 0.65, y: 0.32, size: 160 }, 'Plaza Luis de Fuentes · Tarija'),
  f('san-roque-iglesia.jpg', { t: 'devolviera?', x: 0.5, y: 0.84, size: 150, verde: true }, undefined, 'center 30%'),
  // ráfaga de Tarija (medio tiempo cada una)
  { ...f('parque-bolivar-tarija.jpg', undefined, 'Parque Bolívar · Tarija'), dur: 0.5 },
  { ...t('yasi/f/puente-aereo.jpg', undefined, 'Tarija'), dur: 0.5 },
  { ...t('yasi/f/cartel-tarija.webp', undefined, 'Tarija'), dur: 0.5 },
  { ...t('yasi/f/calle-colores-gente.jpg', undefined, 'Tarija'), dur: 0.5 },
  // En los locales de tu barrio — comercios de Camina
  t('yasi/locales/fripaps-letrero.jpg', { t: 'En', x: 0.5, y: 0.2, size: 170 }, "Fripap's"),
  t('yasi/locales/coco-cover.jpg', { t: 'los locales', x: 0.5, y: 0.2, size: 150 }, 'Coco Barber'),
  f('mercado-central-tarija.jpg', { t: 'de', x: 0.5, y: 0.3, size: 190 }, 'Mercado Central · Tarija'),
  t('yasi/locales/cancheritos-cover.jpg', { t: 'tu', x: 0.5, y: 0.2, size: 190 }, 'Cancheritos Fútbol Club'),
  t('yasi/locales/sabor-app.jpg', { t: 'barrio', x: 0.5, y: 0.17, size: 200, verde: true }, 'Sabor y Vida'),
  t('yasi/locales/bloom-cover.jpg', undefined, 'Bloom'),
  // Cada paso cuenta — la app
  { tipo: 'inicio', palabra: { t: 'Cada', x: 0.5, y: 0.1, size: 170 }, leyenda: '1.000 pasos = 1 Punto', dur: 1 },
  v('m4915', { t: 'paso', x: 0.5, y: 0.3, size: 180 }),
  { tipo: 'app', src: 'app/ruta.jpg', palabra: { t: 'cuenta', x: 0.5, y: 0.14, size: 200, verde: true }, leyenda: 'Ruta del mes · Tarija', origen: '55% 45%', dur: 1 },
  { tipo: 'app', src: 'app/mapa-comercios.jpg', leyenda: 'Comercios en el mapa', origen: '45% 35%', dur: 1 },
  { tipo: 'app', src: 'app/actividad-248.jpg', leyenda: 'Tu actividad', origen: '40% 25%', dur: 1 },
  { tipo: 'app', src: 'app/puntos-248.jpg', leyenda: 'Tus Puntos', origen: '25% 12%', dur: 1 },
];

const INTRO = 4 * T; // 0–80
const MONTAJE = TOMAS.reduce((s, x) => s + (x.dur ?? 1) * T, 0); // 80–760
const TARJETA = 8 * T; // 760–920
export const DUR_YSI = INTRO + MONTAJE + TARJETA + 130;

export const YSi = () => {
  let desde = INTRO;
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado }}>
      <Sequence name="Logo con huellas" durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      {TOMAS.map((x, i) => {
        const d = (x.dur ?? 1) * T;
        const el = (
          <Sequence key={i} name={`${i + 1} ${x.palabra?.t ?? x.leyenda ?? x.src}`} from={desde} durationInFrames={d}>
            <TomaVista toma={x} />
          </Sequence>
        );
        desde += d;
        return el;
      })}
      <Sequence name="Tarjeta: cada paso que damos" from={INTRO + MONTAJE} durationInFrames={TARJETA}>
        <Tarjeta />
      </Sequence>
      <Sequence name="Cierre" from={INTRO + MONTAJE + TARJETA}>
        <Cierre ritmo={0.62} />
      </Sequence>
      <Pelicula />
      <Audio name="Música" src={staticFile('audio/ysi-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// ---------- Look de película: grano, vibración del cuadro, viñeta, parpadeo ----------
const Pelicula = () => {
  const fr = useCurrentFrame();
  const parpadeo = 0.035 * (random(`p${fr}`) - 0.5);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.16, mixBlendMode: 'overlay' }}>
        <filter id={`g${fr}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={fr % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${fr})`} />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      <AbsoluteFill style={{ backgroundColor: parpadeo > 0 ? '#fff' : '#000', opacity: Math.abs(parpadeo) }} />
    </AbsoluteFill>
  );
};

const vibra = (fr: number) => `translate(${(random(`x${fr}`) - 0.5) * 4}px, ${(random(`y${fr}`) - 0.5) * 4}px)`;

// ---------- Intro: huellas que suben y arman el logo ----------
const Intro = () => {
  const fr = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pasos = [0, 1, 2, 3];
  const logo = spring({ frame: fr - 40, fps, config: { damping: 13, mass: 0.7 } });
  const LETRAS = 'CAMINA';
  const SIMB = '\\/·#×+';
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado, alignItems: 'center', justifyContent: 'center' }}>
      {pasos.map((k) => {
        const en = k * 9;
        const o = interpolate(fr, [en, en + 3, 40, 46], [0, 1, 1, 0], clamp);
        const y = 1500 - k * 170;
        const x = 540 + (k % 2 ? 46 : -46);
        return <Img key={k} src={staticFile(k % 2 ? 'marca/pie-R-mint.png' : 'marca/pie-L-mint.png')} style={{ position: 'absolute', left: x - 40, top: y - 70, width: 80, opacity: o }} />;
      })}
      <div style={{ position: 'absolute', top: 640, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: 300, height: 300, borderRadius: '50%', transform: `scale(${logo})`, opacity: Math.min(1, logo * 2), boxShadow: '0 0 120px rgba(110,70,230,0.5)' }} />
        <div style={{ marginTop: 60, height: 170, display: 'flex', fontFamily: 'Mona', fontWeight: 780, fontStretch: '118%', fontSize: 150, letterSpacing: '0.08em', color: '#fff' }}>
          {LETRAS.split('').map((l, i) => {
            const fija = 50 + i * 3;
            if (fr < 44 + i * 2) return <span key={i} style={{ opacity: 0 }}>{l}</span>;
            // la letra real ocupa su lugar (invisible) y encima pasan símbolos hasta que se fija
            const ch = SIMB[Math.floor(random(`l${i}${fr}`) * SIMB.length)];
            return (
              <span key={i} style={{ position: 'relative', color: fr < fija ? 'transparent' : '#fff' }}>
                {l}
                {fr < fija && <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: C.verde }}>{ch}</span>}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Una toma del montaje ----------
const TomaVista = ({ toma }: { toma: Toma }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = fr / durationInFrames;
  const zoom = 1.02 + 0.07 * p;
  const media: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: toma.origen ?? 'center' };
  const grade = 'contrast(1.07) saturate(1.05) sepia(0.06)';
  let fondo: ReactNode = null;
  if (toma.tipo === 'video') {
    fondo = <Video src={staticFile(toma.src!)} muted objectFit="cover" style={{ ...media, filter: grade }} />;
  } else if (toma.tipo === 'foto') {
    fondo = <Img src={staticFile(toma.src!)} style={{ ...media, filter: grade }} />;
  } else if (toma.tipo === 'tarjeta') {
    // fotos chicas: fondo desenfocado y la foto nítida al centro, como una copia impresa
    fondo = (
      <>
        <Img src={staticFile(toma.src!)} style={{ ...media, filter: 'blur(40px) brightness(0.45) saturate(1.1)', transform: 'scale(1.3)' }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Img src={staticFile(toma.src!)} style={{ width: 900, maxHeight: 1100, objectFit: 'cover', borderRadius: 18, boxShadow: '0 40px 90px rgba(0,0,0,0.6)', transform: `rotate(${(random(toma.src!) - 0.5) * 3}deg)`, filter: grade }} />
        </AbsoluteFill>
      </>
    );
  } else if (toma.tipo === 'app') {
    fondo = <Img src={staticFile(toma.src!)} style={{ ...media, transform: `scale(${1.25 + 0.1 * p})`, transformOrigin: toma.origen, filter: 'contrast(1.05)' }} />;
  } else if (toma.tipo === 'inicio') {
    const pasos = interpolate(fr, [0, 12], [1962, 2000], { ...clamp, easing: Easing.out(Easing.cubic) });
    const lleno = fr >= 12 ? 1 : 0;
    const pop = interpolate(fr, [12, 15, 20], [0, 1, 0.6], clamp);
    fondo = (
      <AbsoluteFill style={{ backgroundColor: '#1b1229', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -60, top: 150, width: 1200, height: (1200 * 2556) / 1179, transform: `scale(${1.15 + 0.08 * p})`, transformOrigin: '50% 33%' }}>
          <InicioVivo pasos={pasos} saldo={fr >= 16 ? 248 : 247} lleno={lleno} brillo={pop} pop={pop} />
        </div>
        {/* el encabezado de la app se funde con el fondo para que la palabra quede limpia */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1b1229 0%, #1b1229 26%, rgba(27,18,41,0) 40%)' }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <AbsoluteFill style={{ transform: `${vibra(fr)} scale(${toma.tipo === 'app' || toma.tipo === 'inicio' ? 1 : zoom})` }}>{fondo}</AbsoluteFill>
      {toma.palabra && <PalabraVista p={toma.palabra} />}
      {toma.leyenda && <Leyenda texto={toma.leyenda} conPalabra={!!toma.palabra} />}
    </AbsoluteFill>
  );
};

const PalabraVista = ({ p }: { p: Palabra }) => {
  const fr = useCurrentFrame();
  const o = interpolate(fr, [0, 3], [0, 1], clamp);
  const blur = interpolate(fr, [0, 5], [12, 0], clamp);
  const s = interpolate(fr, [0, 8], [1.06, 1], { ...clamp, easing: suave });
  return (
    <div
      style={{
        position: 'absolute',
        left: `${(p.x ?? 0.5) * 100}%`,
        top: `${(p.y ?? 0.4) * 100}%`,
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: o,
        filter: `blur(${blur}px)`,
        fontFamily: 'Mona',
        fontWeight: 640,
        fontStretch: '105%',
        fontSize: p.size ?? 160,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: p.verde ? C.verde : '#fff',
        textShadow: '0 6px 40px rgba(0,0,0,0.45)',
      }}
    >
      {p.t}
    </div>
  );
};

const Leyenda = ({ texto, conPalabra }: { texto: string; conPalabra: boolean }) => {
  const fr = useCurrentFrame();
  const n = Math.floor(interpolate(fr, [2, 10], [0, texto.length], clamp));
  if (n === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: conPalabra ? 1450 : 920, textAlign: 'center', fontFamily: 'Mono', fontSize: 34, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
      {`\\  ${texto.slice(0, n)}  \\`}
    </div>
  );
};

// ---------- Tarjeta: «Cada paso que damos, [local] mueve a Tarija» ----------
const LOGOS = ['fripaps-logo', 'bloom-logo', 'coco-logo', 'cancheritos-logo', 'galera-logo', 'viviana-logo', 'sabor-logo', 'luzdevida-app'];
const Tarjeta = () => {
  const fr = useCurrentFrame();
  const l1 = interpolate(fr, [0, 10], [0, 1], { ...clamp, easing: suave });
  const l3 = interpolate(fr, [8, 18], [0, 1], { ...clamp, easing: suave });
  // los logos pasan cada 7 cuadros y al final queda el de Camina
  const ciclo = fr < 14 ? -1 : Math.floor((fr - 14) / 7);
  const enCamina = ciclo >= LOGOS.length * 2;
  const idx = ciclo < 0 ? 0 : ciclo % LOGOS.length;
  const salida = interpolate(fr, [150, 160], [1, 0], clamp);
  const linea: CSSProperties = { fontFamily: 'Mona', fontWeight: 620, fontStretch: '105%', fontSize: 86, letterSpacing: '-0.02em', color: '#fff', textAlign: 'center', lineHeight: 1.1 };
  return (
    <AbsoluteFill style={{ backgroundColor: C.morado, alignItems: 'center', justifyContent: 'center', opacity: salida }}>
      <div style={{ ...linea, opacity: l1, transform: `translateY(${(1 - l1) * 30}px)` }}>Cada paso que damos,</div>
      <div style={{ margin: '44px 0', width: 220, height: 220, borderRadius: 40, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', opacity: interpolate(fr, [10, 16], [0, 1], clamp), background: '#fff' }}>
        {enCamina ? (
          <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Img src={staticFile(`yasi/locales/${LOGOS[idx]}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <div style={{ ...linea, opacity: l3, transform: `translateY(${(1 - l3) * 30}px)` }}>
        mueve a <span style={{ color: C.verde }}>Tarija</span>
      </div>
    </AbsoluteFill>
  );
};
