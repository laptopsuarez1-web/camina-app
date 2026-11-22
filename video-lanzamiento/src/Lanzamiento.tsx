import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { C, Linea, Moneda, Pantalla, Telefono, titular, Toma, suave } from './marca';
import { InicioVivo } from './InicioVivo';

// CAMINA · Video oficial de lanzamiento. Vertical 1080 × 1920, 35 s, 30 fps, música a 120 BPM.
// 01 Tarija se mueve (0–5) · 02 Logo → teléfono, «Cada paso cuenta» (5–10) · 03 Sumá puntos (10–16)
// 04 Disfrutá beneficios (16–23) · 05 Hay mucho más (23–29) · 06 Cierre: Camina, Caminá y ganá, Muy pronto (29–35).
// De 5 a 23 s el teléfono es uno solo (sin cortes): cambian las pantallas y la cámara acompaña cada escena.
// Pantallas: capturas reales de la app con datos de ejemplo. Audio: scripts/sonido.py y scripts/voz.py.

const S = (s: number) => Math.round(s * 30);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type Props = { voz: boolean };

export const Lanzamiento = ({ voz }: Props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.negro }}>
      <Sequence name="01 Tarija se mueve" durationInFrames={S(5)}>
        <Apertura />
      </Sequence>
      <Sequence name="Fondo de marca" from={S(5)} durationInFrames={S(18)}>
        <Fondo />
      </Sequence>
      <Sequence name="Teléfono (5–23 s)" from={S(5)} durationInFrames={S(18)}>
        <TelefonoCentral />
      </Sequence>
      <Sequence name="02 Cada paso cuenta" from={S(5)} durationInFrames={S(5)}>
        <LogoATelefono />
        <Titulos>
          <T entra={60} sale={142}>
            Cada paso
          </T>
          <T entra={66} sale={142} verde>
            cuenta
          </T>
        </Titulos>
      </Sequence>
      <Sequence name="03 Sumá puntos" from={S(10)} durationInFrames={S(6)}>
        <SumaPuntos />
      </Sequence>
      <Sequence name="04 Disfrutá beneficios" from={S(16)} durationInFrames={S(7)}>
        <Beneficios />
      </Sequence>
      <Sequence name="05 Hay mucho más" from={S(23)} durationInFrames={S(6)}>
        <MuchoMas />
      </Sequence>
      <Sequence name="06 Cierre" from={S(29)} durationInFrames={S(6)}>
        <Cierre />
      </Sequence>
      <Destello en={S(5)} />
      <Destello en={S(29)} fuerte />
      <Audio name="Mezcla" src={staticFile(`audio/mezcla-${voz ? 'con-voz' : 'sin-voz'}.wav`)} />
    </AbsoluteFill>
  );
};

const Destello = ({ en, fuerte = false }: { en: number; fuerte?: boolean }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [en - 1, en, en + (fuerte ? 10 : 6)], [0, fuerte ? 0.5 : 0.3, 0], clamp);
  return <AbsoluteFill style={{ backgroundColor: '#ffffff', opacity: o, pointerEvents: 'none' }} />;
};

// ---------- Geometría del teléfono ----------
const ANCHO = 600;
const BORDE = ANCHO * 0.028;
const LEFT = (1080 - ANCHO) / 2 - BORDE;
const TOP = 545;
// de coordenadas de la captura (780 de ancho) a coordenadas del video
const a = (x: number, y: number) => ({ x: LEFT + BORDE + (x * ANCHO) / 780, y: TOP + BORDE + (y * ANCHO) / 780 });

// Fondo de marca: negro, brillo verde que respira y morado abajo.
const Fondo = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 40% at ${50 + Math.sin(f / 45) * 8}% ${62 + Math.cos(f / 50) * 4}%, rgba(98,240,182,0.12), transparent 70%), radial-gradient(80% 55% at 15% 105%, rgba(32,10,82,0.95), transparent 70%), radial-gradient(60% 40% at 100% 0%, rgba(32,10,82,0.6), transparent 70%), ${C.negro}`,
      }}
    />
  );
};

const Titulos = ({ children }: { children: ReactNode }) => <div style={{ position: 'absolute', left: 80, right: 80, top: 150 }}>{children}</div>;

const T = ({ children, entra, sale, verde = false, size = 132 }: { children: ReactNode; entra: number; sale?: number; verde?: boolean; size?: number }) => (
  <Linea entra={entra} sale={sale} style={{ ...titular, fontSize: size, color: verde ? C.verde : C.blanco }}>
    {children}
  </Linea>
);

// ---------- 01 · Tarija se mueve ----------
// Tomas reales de Tarija (con permiso del autor), cortadas en vertical a más resolución que el cuadro: nítidas.
const Apertura = () => {
  const f = useCurrentFrame();
  const negro = interpolate(f, [0, 6], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <Sequence name="Loma de San Juan" durationInFrames={S(2)}>
        <Toma src="tarija/v/aerea.mp4" zoom={[1.0, 1.07]} oscurecer={0.1} />
      </Sequence>
      <Sequence name="Plaza con gente" from={S(2)} durationInFrames={S(1)}>
        <Toma src="tarija/v/gente-plaza.mp4" zoom={[1.03, 1.08]} oscurecer={0.1} />
      </Sequence>
      <Sequence name="Fuente de la plaza" from={S(3)} durationInFrames={S(2)}>
        <Toma src="tarija/v/fuente.mp4" zoom={[1.0, 1.08]} oscurecer={0.1} />
      </Sequence>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(11,11,13,0.7) 100%)' }} />
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 430, textAlign: 'center' }}>
        <Linea entra={6} style={{ ...titular, fontSize: 230, letterSpacing: `${interpolate(f, [6, 150], [0.12, 0.02], clamp)}em`, textShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
          Tarija
        </Linea>
        <Linea entra={16} style={{ ...titular, fontSize: 124, color: C.verde, textShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
          se mueve
        </Linea>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.negro, opacity: negro }} />
    </AbsoluteFill>
  );
};

// ---------- 02 · Logo que entra en el teléfono ----------
// El logo aparece al centro y vuela hasta la pantalla del teléfono, que lo recibe como pantalla de bienvenida.
const LOGO = 420;
const LOGO_TEL = 230;
const centroTel = a(390, 845);
const LogoATelefono = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f > 60) return null;
  const pop = spring({ frame: f, fps, config: { damping: 12, mass: 0.7 } });
  const vuela = interpolate(f, [30, 56], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const aro = interpolate(f, [0, 26], [0, 1], { ...clamp, easing: suave });
  const x = 540 + (centroTel.x - 540) * vuela;
  const y = 960 + (centroTel.y - 960) * vuela;
  const tam = LOGO + (LOGO_TEL - LOGO) * vuela;
  const o = interpolate(f, [52, 58], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: x - tam / 2, top: y - tam / 2, width: tam, height: tam, opacity: o, transform: `scale(${0.6 + 0.4 * pop}) rotate(${(1 - pop) * -10}deg)` }}>
        {aro < 1 && <div style={{ position: 'absolute', inset: -tam * 0.22, borderRadius: '50%', border: `${2 + 8 * (1 - aro)}px solid rgba(255,255,255,${0.5 * (1 - aro)})`, transform: `scale(${0.75 + 0.55 * aro})` }} />}
        <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: '0 30px 120px rgba(0,0,0,0.6), 0 0 120px rgba(110,70,230,0.45)' }} />
        <Brillo f={f} desde={12} />
      </div>
    </AbsoluteFill>
  );
};

// Reflejo de luz que cruza el logo una vez.
const Brillo = ({ f, desde }: { f: number; desde: number }) => {
  const p = interpolate(f, [desde, desde + 18], [-60, 160], clamp);
  if (p <= -60 || p >= 160) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', left: `${p}%`, width: '30%', transform: 'translateX(-50%) rotate(20deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }} />
    </div>
  );
};

// ---------- Teléfono de 5 a 23 s ----------
// g: cuadro local (0 = 5 s). La escena 3 empieza en g=150 (10 s) y la 4 en g=330 (16 s).
const E3 = 150;
const E4 = 330;
const LISTA_H = 2361; // canjes-lista.jpg: 780 × 2361, Fripap's (premio en y≈1021) y debajo Bloom

// Pasos del Inicio: suben con suavidad hasta completar el aro (2.000 pasos); recién ahí se suma el Punto.
const pasosEn = (g: number) => {
  const l = g - E3;
  if (l < 0) return interpolate(g, [60, E3], [1584, 1620], clamp);
  if (l < 60) return interpolate(l, [6, 54], [1620, 2000], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return interpolate(l, [64, 140], [2000, 2036], { ...clamp, easing: Easing.out(Easing.quad) });
};
const COMPLETO = E3 + 54; // el aro se completa
const SALDO = E3 + 80; // la moneda llega al saldo

const TelefonoCentral = () => {
  const g = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: g - 30, fps, config: { damping: 18, mass: 0.9 } });
  // golpe de cámara en cada cambio de escena (va y vuelve, sin saltos)
  const golpe = (en: number) => (g < en ? 0 : Math.sin(Math.PI * interpolate(g, [en, en + 24], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) })));
  const k3 = golpe(E3);
  const k4 = golpe(E4);
  const ry = -16 * (1 - entra) + Math.sin(g / 28) * 2.2 + 7 * k3 - 7 * k4;
  const rx = 7 * (1 - entra) + Math.cos(g / 33) * 1.2;
  const sc = 1 + 0.03 * k3 + 0.03 * k4;

  // Inicio en vivo
  const pasos = pasosEn(g);
  const l = g - E3;
  const lleno = g >= COMPLETO ? interpolate(l, [62, 74], [1, 0], clamp) : 0;
  const brillo = interpolate(l, [54, 58, 74], [0, 1, 0], clamp);
  const pop = interpolate(l, [56, 62, 78], [0, 1, 0], clamp);
  const bump = interpolate(g, [SALDO, SALDO + 4, SALDO + 16], [0, 1, 0], clamp);
  const saldo = g >= SALDO ? 248 : 247;
  const bienvenida = interpolate(g, [60, 72], [1, 0], clamp);
  const act = interpolate(l, [100, 114], [0, 1], { ...clamp, easing: suave });
  const pts = interpolate(l, [140, 154], [0, 1], { ...clamp, easing: suave });
  const zoomPts = interpolate(l, [154, 180], [1, 1.28], { ...clamp, easing: suave });

  // Beneficios
  const m = g - E4;
  const mapa = interpolate(m, [0, 14], [0, 1], { ...clamp, easing: suave });
  const lista = interpolate(m, [30, 44], [0, 1], { ...clamp, easing: suave });
  const zoomIn = interpolate(m, [54, 78], [0, 1], { ...clamp, easing: suave });
  const zoomOut = interpolate(m, [100, 114], [0, 1], { ...clamp, easing: suave });
  const z = 1 + 0.55 * zoomIn * (1 - zoomOut);
  const scroll = interpolate(m, [100, 126], [0, 560], { ...clamp, easing: suave });
  const hoja = interpolate(m, [130, 142], [0, 1], { ...clamp, easing: suave });
  const conf = interpolate(m, [168, 174], [0, 1], { ...clamp, easing: suave });

  const capa = (children: ReactNode, x: number, y = 0, sombra = true) => (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `translate(${x * 100}%, ${y * 100}%)`, boxShadow: sombra ? '-24px 0 50px rgba(0,0,0,0.55)' : undefined }}>{children}</div>
  );

  return (
    <div style={{ position: 'absolute', left: LEFT, top: TOP, perspective: 2200 }}>
      <div style={{ transform: `translateY(${(1 - entra) * 420}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${sc})`, opacity: Math.min(1, entra * 1.8) }}>
        <Telefono ancho={ANCHO}>
          {/* Escenas 2 y 3: bienvenida → Inicio → Actividad → Tus Puntos */}
          {mapa < 1 && (
            <>
              {capa(<InicioVivo pasos={pasos} saldo={saldo} pop={pop} lleno={lleno} brillo={brillo} bump={bump} />, -0.3 * act, 0, false)}
              {bienvenida > 0 && (
                <AbsoluteFill style={{ background: '#200a52', opacity: bienvenida, justifyContent: 'center', alignItems: 'center' }}>
                  <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: LOGO_TEL, height: LOGO_TEL, borderRadius: '50%', opacity: interpolate(g, [50, 57], [0, 1], clamp), transform: `scale(${1 + 0.08 * (1 - bienvenida)})` }} />
                </AbsoluteFill>
              )}
              {act > 0 && capa(<Pantalla src="app/actividad-248.jpg" />, 1 - act - 0.3 * pts)}
              {pts > 0 && capa(<Pantalla src="app/puntos-248.jpg" style={{ transform: `scale(${zoomPts})`, transformOrigin: '22% 12%' }} />, 1 - pts)}
            </>
          )}
          {/* Escena 4: mapa de comercios → lista de canjes (Fripap's, Bloom) → código → canje confirmado */}
          {mapa > 0 && lista < 1 && capa(<Pantalla src="app/mapa-comercios.jpg" />, 1 - mapa)}
          {lista > 0 &&
            capa(
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#16131f' }}>
                <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: '42% 60%' }}>
                  <Img src={staticFile('app/canjes-lista.jpg')} style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(-${(scroll / LISTA_H) * 100}%)` }} />
                </div>
              </div>,
              0,
              1 - lista,
            )}
          {hoja > 0 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: hoja }} />}
          {hoja > 0 && conf === 0 && (
            <Img src={staticFile('app/hoja-codigo.jpg')} style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - hoja) * 100}%)` }} />
          )}
          {conf > 0 && (
            <Img src={staticFile('app/hoja-confirmado.jpg')} style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - conf) * 40}%)` }} />
          )}
        </Telefono>
      </div>
    </div>
  );
};

// Moneda que vuela de un punto a otro (los Puntos que se suman o que se usan).
const Vuela = ({ desde, hasta, en, dur = 22, size = 64 }: { desde: { x: number; y: number }; hasta: { x: number; y: number }; en: number; dur?: number; size?: number }) => {
  const f = useCurrentFrame();
  if (f < en || f > en + dur + 4) return null;
  const k = interpolate(f, [en, en + dur], [0, 1], { ...clamp, easing: suave });
  const arco = Math.sin(k * Math.PI) * -140;
  const x = desde.x + (hasta.x - desde.x) * k;
  const y = desde.y + (hasta.y - desde.y) * k + arco;
  const o = interpolate(f, [en, en + 3, en + dur, en + dur + 4], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, opacity: o, transform: `scale(${1 - 0.35 * k}) rotate(${k * 360}deg)`, filter: 'drop-shadow(0 0 18px rgba(98,240,182,0.8))' }}>
      <Moneda size={size} />
    </div>
  );
};

// Pastilla "+1 Punto" que sale del aro cuando se completa.
const MasUno = ({ en, x, y }: { en: number; x: number; y: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < en || f > en + 44) return null;
  const sp = spring({ frame: f - en, fps, config: { damping: 11, mass: 0.6 } });
  const o = interpolate(f, [en + 34, en + 44], [1, 0], clamp);
  const dy = interpolate(f, [en, en + 44], [20, -80], { ...clamp, easing: suave });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + dy,
        transform: `translateX(-50%) scale(${0.5 + 0.5 * sp})`,
        opacity: o * Math.min(1, sp * 2),
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 30px 10px 10px',
        borderRadius: 999,
        background: C.verde,
        color: '#12281f',
        fontFamily: 'Jakarta',
        fontWeight: 800,
        fontSize: 48,
        whiteSpace: 'nowrap',
        boxShadow: '0 0 0 14px rgba(98,240,182,0.18), 0 24px 60px -18px rgba(98,240,182,0.9)',
      }}
    >
      <Moneda size={62} />
      +1 Punto
    </div>
  );
};

const Pildora = ({ entra, sale, children }: { entra: number; sale?: number; children: ReactNode }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [entra, entra + 14], [0, 1], { ...clamp, easing: suave });
  const o = sale === undefined ? 1 : interpolate(f, [sale, sale + 8], [1, 0], clamp);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 16,
        marginTop: 28,
        padding: '14px 30px 14px 14px',
        borderRadius: 999,
        background: 'rgba(98,240,182,0.14)',
        boxShadow: 'inset 0 0 0 2px rgba(98,240,182,0.45)',
        color: '#fff',
        fontFamily: 'Jakarta',
        fontWeight: 800,
        fontSize: 44,
        opacity: p * o,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      {children}
    </div>
  );
};

// ---------- 03 · Sumá puntos ----------
const SumaPuntos = () => {
  const aro = a(390, 556);
  const saldo = a(110, 178);
  const l = COMPLETO - E3;
  return (
    <AbsoluteFill>
      <Titulos>
        <T entra={0} sale={172}>
          Sumá
        </T>
        <T entra={6} sale={172} verde>
          puntos
        </T>
        <Pildora entra={16} sale={172}>
          <Moneda size={58} />
          1.000 pasos = 1 Punto
        </Pildora>
      </Titulos>
      <MasUno en={l + 2} x={aro.x + ANCHO * 0.36} y={aro.y - 150} />
      <Vuela desde={aro} hasta={saldo} en={l + 6} dur={20} />
    </AbsoluteFill>
  );
};

// ---------- 04 · Disfrutá beneficios ----------
const Beneficios = () => {
  const premio = a(330, 1021);
  return (
    <AbsoluteFill>
      <Titulos>
        <T entra={0} sale={202} size={120}>
          Disfrutá
        </T>
        <T entra={6} sale={202} verde size={120}>
          beneficios
        </T>
      </Titulos>
      {/* Los Puntos se usan en el premio */}
      <Vuela desde={{ x: 140, y: 470 }} hasta={premio} en={62} />
      <Vuela desde={{ x: 240, y: 470 }} hasta={premio} en={69} />
      <Vuela desde={{ x: 340, y: 470 }} hasta={premio} en={76} />
    </AbsoluteFill>
  );
};

// ---------- 05 · Hay mucho más ----------
// Pasos en primera persona (1 s) → una pantalla protagonista por vez (1 s cada una, al ritmo) → la ciudad (1 s).
const MAS = [
  ['app/ruta.jpg', 'Ruta del mes'],
  ['app/grupo-chat.jpg', 'Grupos y chat'],
  ['app/ranking.jpg', 'Ranking semanal'],
  ['app/perfil.jpg', 'Tu perfil e insignias'],
] as const;
const MuchoMas = () => {
  const h = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = h - 30;
  const i = Math.max(0, Math.min(MAS.length - 1, Math.floor(s / 30)));
  const t = i === 0 ? 1 : interpolate(s - i * 30, [0, 12], [0, 1], { ...clamp, easing: suave });
  const entra = spring({ frame: s + 2, fps, config: { damping: 16, mass: 0.7 } });
  const giro = i === 0 ? 0 : Math.sin(Math.PI * interpolate(s - i * 30, [0, 20], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }));
  const ry = -14 * (1 - entra) + (i % 2 ? 1 : -1) * 6 * giro + Math.sin(h / 28) * 2;
  return (
    <AbsoluteFill>
      {h < 30 && <Toma src="tarija/v/pov.mp4" zoom={[1.0, 1.05]} oscurecer={0.15} />}
      {h < 30 && <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,13,0.6) 0%, transparent 45%)' }} />}
      {h >= 30 && h < 150 && (
        <>
          <Fondo />
          <div style={{ position: 'absolute', left: LEFT, top: TOP + 60, perspective: 2200 }}>
            <div style={{ transform: `translateY(${(1 - entra) * 500}px) rotateY(${ry}deg)` }}>
              <Telefono ancho={ANCHO}>
                {i > 0 && (
                  <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-30 * t}%)`, filter: `brightness(${1 - 0.4 * t})` }}>
                    <Pantalla src={MAS[i - 1][0]} />
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - t) * 100}%)`, boxShadow: '-24px 0 50px rgba(0,0,0,0.55)' }}>
                  <Pantalla src={MAS[i][0]} />
                </div>
              </Telefono>
            </div>
          </div>
        </>
      )}
      {h >= 150 && <Toma src="tarija/v/ciudad.mp4" zoom={[1.0, 1.06]} oscurecer={0.12} />}
      {h < 150 && (
        <Titulos>
          <T entra={0} sale={142} size={112}>
            Hay mucho
          </T>
          <T entra={5} sale={142} verde size={112}>
            más
          </T>
          {h >= 30 && (
            <div style={{ marginTop: 22, height: 70, overflow: 'hidden', opacity: interpolate(h, [142, 150], [1, 0], clamp) }}>
              <div key={i} style={{ fontFamily: 'Mona', fontWeight: 700, fontStretch: '110%', fontSize: 58, color: '#fff', transform: `translateY(${interpolate(s - i * 30, [0, 10], [60, 0], { ...clamp, easing: suave })}px)` }}>
                {MAS[i][1]}
              </div>
            </div>
          )}
        </Titulos>
      )}
    </AbsoluteFill>
  );
};

// ---------- 06 · Cierre de marca ----------
// Íconos de Apple y Google Play (Simple Icons, CC0), en blanco. La app todavía no está publicada: «Muy pronto en».
export const IconoApple = () => (
  <svg viewBox="0 0 24 24" width={50} height={50} fill="#fff" aria-hidden="true">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.090-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);
export const IconoPlay = () => (
  <svg viewBox="0 0 24 24" width={46} height={46} fill="#fff" aria-hidden="true">
    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
  </svg>
);

export const Tienda = ({ en, icono, nombre }: { en: number; icono: ReactNode; nombre: string }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: f - en, fps, config: { damping: 14, mass: 0.6 } });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '18px 34px 18px 26px',
        borderRadius: 26,
        background: 'rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.32)',
        opacity: Math.min(1, sp * 1.5),
        transform: `translateY(${(1 - sp) * 40}px) scale(${0.85 + 0.15 * sp})`,
      }}
    >
      {icono}
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', color: '#fff' }}>
        <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
        <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{nombre}</span>
      </div>
    </div>
  );
};

// ritmo < 1 acelera las entradas (para cierres más cortos).
export const Cierre = ({ ritmo = 1 }: { ritmo?: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f, fps, config: { damping: 13, mass: 0.8 } });
  const aro = interpolate(f, [0, 26 * ritmo], [0, 1], { ...clamp, easing: suave });
  const tam = 300;
  const respira = 1 + 0.015 * Math.sin(f / 20);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 34%, rgba(32,10,82,1), ${C.negro} 78%)`, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: tam, height: tam, transform: `scale(${(0.45 + 0.55 * logo) * respira}) rotate(${(1 - logo) * -12}deg)`, opacity: Math.min(1, logo * 1.6) }}>
          {aro < 1 && (
            <div style={{ position: 'absolute', inset: -tam * 0.2, borderRadius: '50%', border: `${2 + 8 * (1 - aro)}px solid rgba(255,255,255,${0.45 * (1 - aro)})`, transform: `scale(${0.75 + 0.7 * aro})` }} />
          )}
          <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: '0 30px 100px rgba(0,0,0,0.55), 0 0 140px rgba(110,70,230,0.5)' }} />
          <Brillo f={f} desde={14 * ritmo} />
        </div>
        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Linea entra={22 * ritmo} style={{ ...titular, fontSize: 156, letterSpacing: `${interpolate(f, [22, 180], [0.14, 0.07], clamp)}em`, marginRight: '-0.07em' }}>
            Camina
          </Linea>
          <Linea entra={44 * ritmo} style={{ ...titular, fontSize: 88, color: C.verde, marginTop: 10 }}>
            Caminá y ganá
          </Linea>
          <Linea entra={78 * ritmo} style={{ fontFamily: 'Mona', fontWeight: 760, fontStretch: '115%', fontSize: 56, color: '#fff', letterSpacing: '0.2em', marginTop: 74, marginRight: '-0.2em' }}>
            MUY PRONTO
          </Linea>
          <div style={{ display: 'flex', gap: 24, marginTop: 30 }}>
            <Tienda en={90 * ritmo} icono={<IconoApple />} nombre="App Store" />
            <Tienda en={96 * ritmo} icono={<IconoPlay />} nombre="Google Play" />
          </div>
          <Linea entra={110 * ritmo} style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 46, color: C.gris, marginTop: 40 }}>
            caminaapp.com
          </Linea>
        </div>
      </div>
    </AbsoluteFill>
  );
};
