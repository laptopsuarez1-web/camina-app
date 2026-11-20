import type { ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { C, Linea, Moneda, Pantalla, Telefono, titular, Toma, suave, useVertical } from './marca';
import { InicioVivo } from './InicioVivo';

// CAMINA · Video oficial de lanzamiento (35 s, 30 fps, 120 BPM). Vertical 1080×1920 y horizontal 1920×1080.
// 01 Tarija se mueve (0–5) · 02 Logo y «Cada paso cuenta» (5–10) · 03 Sumá puntos (10–16)
// 04 Disfrutá beneficios (16–23) · 05 Hay mucho más (23–29) · 06 Cierre de marca (29–35).
// Pantallas: capturas reales de la app con datos de ejemplo. Audio: scripts/sonido.py (música, efectos y voz Kokoro).

const S = (s: number) => Math.round(s * 30);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type Props = { voz: 'hombre' | 'mujer' };

export const Lanzamiento = ({ voz }: Props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.negro }}>
      <Sequence name="01 Tarija se mueve" durationInFrames={S(5)}>
        <Escena1 />
      </Sequence>
      <Sequence name="02 Cada paso cuenta" from={S(5)} durationInFrames={S(5)}>
        <Escena2 />
      </Sequence>
      <Sequence name="03 Sumá puntos" from={S(10)} durationInFrames={S(6)}>
        <Escena3 />
      </Sequence>
      <Sequence name="04 Disfrutá beneficios" from={S(16)} durationInFrames={S(7)}>
        <Escena4 />
      </Sequence>
      <Sequence name="05 Hay mucho más" from={S(23)} durationInFrames={S(6)}>
        <Escena5 />
      </Sequence>
      <Sequence name="06 Cierre" from={S(29)} durationInFrames={S(6)}>
        <Escena6 />
      </Sequence>
      <Destello en={S(5)} />
      <Destello en={S(29)} fuerte />
      <Audio name="Mezcla" src={staticFile(`audio/mezcla-${voz}.wav`)} />
    </AbsoluteFill>
  );
};

const Destello = ({ en, fuerte = false }: { en: number; fuerte?: boolean }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [en - 1, en, en + (fuerte ? 10 : 6)], [0, fuerte ? 0.55 : 0.35, 0], clamp);
  return <AbsoluteFill style={{ backgroundColor: '#eafff6', opacity: o, pointerEvents: 'none' }} />;
};

// ---------- Geometría del teléfono (grande, protagonista) ----------
const useTel = () => {
  const v = useVertical();
  const ancho = v ? 600 : 410;
  const borde = ancho * 0.028;
  const alto = (ancho * 1691) / 780 + borde * 2;
  const left = v ? (1080 - ancho) / 2 - borde : 1920 - 190 - ancho - borde * 2;
  const top = v ? 545 : (1080 - alto) / 2;
  // de coordenadas de la captura (780 de ancho) a coordenadas del video
  const a = (x: number, y: number) => ({ x: left + borde + (x * ancho) / 780, y: top + borde + (y * ancho) / 780 });
  return { v, ancho, borde, alto, left, top, a };
};

// Teléfono con entrada en 3D (gira levemente y sube) y flotación suave.
const Escenario = ({ children, entra = 0, giro = -14 }: { children: ReactNode; entra?: number; giro?: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ancho, left, top } = useTel();
  const sp = spring({ frame: f - entra, fps, config: { damping: 18, mass: 0.9 } });
  const ry = giro * (1 - sp) + Math.sin(f / 28) * 2.2;
  const rx = 6 * (1 - sp) + Math.cos(f / 33) * 1.2;
  return (
    <div style={{ position: 'absolute', left, top, perspective: 2200 }}>
      <div style={{ transform: `translateY(${(1 - sp) * 380}px) rotateY(${ry}deg) rotateX(${rx}deg)`, opacity: Math.min(1, sp * 1.6) }}>
        <Telefono ancho={ancho}>{children}</Telefono>
      </div>
    </div>
  );
};

// Fondo de marca: negro, brillo verde que respira y morado abajo (parallax suave).
const Fondo = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 40% at ${50 + Math.sin(f / 45) * 8}% ${62 + Math.cos(f / 50) * 4}%, rgba(98,240,182,0.18), transparent 70%), radial-gradient(80% 55% at 15% 105%, rgba(32,10,82,0.95), transparent 70%), radial-gradient(60% 40% at 100% 0%, rgba(32,10,82,0.6), transparent 70%), ${C.negro}`,
      }}
    />
  );
};

// Bloque de títulos: arriba en vertical, a la izquierda en horizontal.
const Titulos = ({ children }: { children: ReactNode }) => {
  const v = useVertical();
  return (
    <div style={v ? { position: 'absolute', left: 80, right: 80, top: 150 } : { position: 'absolute', left: 130, width: 900, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {children}
    </div>
  );
};

const T = ({ children, entra, verde = false, size }: { children: ReactNode; entra: number; verde?: boolean; size?: number }) => {
  const v = useVertical();
  return (
    <Linea entra={entra} style={{ ...titular, fontSize: size ?? (v ? 132 : 120), color: verde ? C.verde : C.blanco }}>
      {children}
    </Linea>
  );
};

// ---------- 01 · Tarija se mueve ----------
const Escena1 = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  const negro = interpolate(f, [0, 14], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <Sequence name="Aérea" durationInFrames={S(2)}>
        <Toma src="tarija/aerea.mp4" zoom={[1.0, 1.1]} posicion={v ? '62% center' : 'center'} oscurecer={0.25} />
      </Sequence>
      <Sequence name="Pies" from={S(2)} durationInFrames={S(1.5)}>
        <Toma src="tarija/pies-gente.mp4" desde={60} zoom={[1.12, 1.2]} oscurecer={0.3} />
      </Sequence>
      <Sequence name="Plaza" from={S(3.5)} durationInFrames={S(1.5)}>
        <Toma src="tarija/plaza.mp4" desde={20} zoom={[1.1, 1.18]} posicion={v ? '45% center' : 'center'} oscurecer={0.3} />
      </Sequence>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(11,11,13,0.75) 100%)' }} />
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: v ? 420 : 170, textAlign: 'center' }}>
        <Linea entra={8} style={{ ...titular, fontSize: v ? 230 : 210, letterSpacing: `${interpolate(f, [8, 140], [0.12, 0.02], clamp)}em` }}>
          Tarija
        </Linea>
        <Linea entra={22} style={{ ...titular, fontSize: v ? 120 : 110, color: C.verde }}>
          se mueve.
        </Linea>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.negro, opacity: negro }} />
    </AbsoluteFill>
  );
};

// ---------- 02 · Logo → teléfono · Cada paso cuenta ----------
const Escena2 = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const v = useVertical();
  const pop = spring({ frame: f, fps, config: { damping: 11, mass: 0.7 } });
  const sale = interpolate(f, [40, 62], [0, 1], { ...clamp, easing: suave });
  const aro = interpolate(f, [0, 30], [0, 1], { ...clamp, easing: suave });
  const tam = v ? 420 : 380;
  return (
    <AbsoluteFill>
      <Fondo />
      {f < 66 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: tam,
              height: tam,
              transform: `translate(${sale * (v ? 0 : width * 0.18)}px, ${sale * (v ? height * 0.12 : 0)}px) scale(${(0.55 + 0.45 * pop) * (1 - 0.6 * sale)})`,
              opacity: 1 - sale,
            }}
          >
            <div style={{ position: 'absolute', inset: -tam * 0.25, borderRadius: '50%', border: `${3 + 12 * (1 - aro)}px solid rgba(98,240,182,${0.6 * (1 - aro)})`, transform: `scale(${0.7 + 0.6 * aro})` }} />
            <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: '0 0 160px rgba(98,240,182,0.35)' }} />
          </div>
        </AbsoluteFill>
      )}
      <Titulos>
        <T entra={50}>Cada paso</T>
        <T entra={56} verde>
          cuenta.
        </T>
      </Titulos>
      <Escenario entra={44}>
        <InicioVivo pasos={1912} saldo={247} />
      </Escenario>
    </AbsoluteFill>
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

// Pastilla "+1 Punto" que sale del aro.
const MasUno = ({ en, x, y }: { en: number; x: number; y: number }) => {
  const f = useCurrentFrame();
  const v = useVertical();
  if (f < en || f > en + 40) return null;
  const p = interpolate(f, [en, en + 8, en + 30, en + 40], [0, 1, 1, 0], clamp);
  const dy = interpolate(f, [en, en + 40], [30, -90], { ...clamp, easing: suave });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + dy,
        transform: `translateX(-50%) scale(${0.7 + 0.3 * p})`,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 30px 10px 10px',
        borderRadius: 999,
        background: C.verde,
        color: '#12281f',
        fontFamily: 'Jakarta',
        fontWeight: 800,
        fontSize: v ? 48 : 40,
        whiteSpace: 'nowrap',
        boxShadow: '0 0 0 14px rgba(98,240,182,0.18), 0 24px 60px -18px rgba(98,240,182,0.9)',
      }}
    >
      <Moneda size={v ? 62 : 54} />+1 Punto
    </div>
  );
};

const Pildora = ({ entra, children }: { entra: number; children: ReactNode }) => {
  const f = useCurrentFrame();
  const v = useVertical();
  const p = interpolate(f, [entra, entra + 14], [0, 1], { ...clamp, easing: suave });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
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
        fontSize: v ? 44 : 38,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      {children}
    </div>
  );
};

// ---------- 03 · Sumá puntos ----------
const Escena3 = () => {
  const f = useCurrentFrame();
  const { a, ancho } = useTel();
  const v = useVertical();
  // Los pasos suben de 1.945 a 2.030: al cruzar 2.000 se suma 1 Punto (regla real: 1.000 pasos = 1 Punto).
  const pasos = Math.round(interpolate(f, [6, 70], [1945, 2030], clamp));
  const fCruce = 6 + Math.ceil(((2000 - 1945) / 85) * 64);
  const pop = interpolate(f, [fCruce, fCruce + 6, fCruce + 18], [0, 1, 0], clamp);
  const act = interpolate(f, [96, 110], [0, 1], { ...clamp, easing: suave });
  const pts = interpolate(f, [138, 152], [0, 1], { ...clamp, easing: suave });
  const zoom = interpolate(f, [150, 180], [1, 1.28], { ...clamp, easing: suave });
  const aro = a(390, 556);
  const saldo = a(110, 178);
  return (
    <AbsoluteFill>
      <Fondo />
      <Titulos>
        <T entra={0}>Sumá</T>
        <T entra={6} verde>
          puntos.
        </T>
        <Pildora entra={16}>
          <Moneda size={v ? 58 : 50} />
          1.000 pasos = 1 Punto
        </Pildora>
      </Titulos>
      <Escenario entra={-18}>
        <InicioVivo pasos={pasos} saldo={247 + (pasos >= 2000 ? 1 : 0)} pop={pop} />
        {act > 0 && (
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - act) * 100}%)`, boxShadow: '-24px 0 50px rgba(0,0,0,0.55)' }}>
            <Pantalla src="app/actividad-dark.jpg" />
          </div>
        )}
        {pts > 0 && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `translateX(${(1 - pts) * 100}%)`, boxShadow: '-24px 0 50px rgba(0,0,0,0.55)' }}>
            <Pantalla src="app/puntos-nuevo-dark.jpg" style={{ transform: `scale(${zoom})`, transformOrigin: '22% 12%' }} />
          </div>
        )}
      </Escenario>
      <MasUno en={fCruce} x={aro.x + ancho * (v ? 0.36 : 0.5)} y={aro.y - 150} />
      <Vuela desde={aro} hasta={saldo} en={fCruce + 6} dur={20} />
    </AbsoluteFill>
  );
};

// ---------- 04 · Disfrutá beneficios ----------
// canjes-lista.jpg: 780 × 2361. Fripap's (premio en y≈1021) y debajo Bloom (desde y≈1093).
const LISTA_H = 2361;
const Escena4 = () => {
  const f = useCurrentFrame();
  const { a } = useTel();
  const v = useVertical();
  const zoomIn = interpolate(f, [36, 60], [0, 1], { ...clamp, easing: suave });
  const zoomOut = interpolate(f, [78, 96], [0, 1], { ...clamp, easing: suave });
  const z = 1 + 0.55 * zoomIn * (1 - zoomOut);
  const scroll = interpolate(f, [80, 108], [0, 560], { ...clamp, easing: suave });
  const hoja = interpolate(f, [112, 126], [0, 1], { ...clamp, easing: suave });
  const conf = interpolate(f, [156, 162], [0, 1], { ...clamp, easing: suave });
  const premio = a(330, 1021);
  return (
    <AbsoluteFill>
      <Fondo />
      <Titulos>
        <T entra={0} size={v ? 120 : 108}>
          Disfrutá
        </T>
        <T entra={6} verde size={v ? 120 : 108}>
          beneficios.
        </T>
      </Titulos>
      <Escenario entra={-18}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#16131f' }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: '42% 60%' }}>
            <Img
              src={staticFile('app/canjes-lista.jpg')}
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(-${(scroll / LISTA_H) * 100}%)` }}
            />
          </div>
        </div>
        {hoja > 0 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: hoja }} />}
        {hoja > 0 && conf === 0 && (
          <Img
            src={staticFile('app/hoja-codigo.jpg')}
            style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - hoja) * 100}%)` }}
          />
        )}
        {conf > 0 && (
          <Img
            src={staticFile('app/hoja-confirmado.jpg')}
            style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - conf) * 40}%)` }}
          />
        )}
      </Escenario>
      {/* Los Puntos se usan en el premio */}
      <Vuela desde={{ x: v ? 140 : 300, y: v ? 470 : 760 }} hasta={premio} en={48} />
      <Vuela desde={{ x: v ? 240 : 420, y: v ? 470 : 800 }} hasta={premio} en={55} />
      <Vuela desde={{ x: v ? 340 : 540, y: v ? 470 : 840 }} hasta={premio} en={62} />
    </AbsoluteFill>
  );
};

// ---------- 05 · Hay mucho más (carrusel) ----------
const MAS = [
  ['app/ruta.jpg', 'Ruta del mes'],
  ['app/mapa-comercios.jpg', 'Mapa de comercios'],
  ['app/grupo.jpg', 'Grupos'],
  ['app/grupo-chat.jpg', 'Chat del grupo'],
  ['app/ranking.jpg', 'Ranking semanal'],
  ['app/perfil.jpg', 'Tu perfil'],
] as const;

const Escena5 = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const { ancho, top, left } = useTel();
  const i = Math.min(MAS.length - 1, Math.floor(f / 30));
  // posición continua del carrusel con un resorte por cada paso
  let pos = 0;
  for (let k = 1; k < MAS.length; k++) pos += spring({ frame: f - k * 30 + 6, fps, config: { damping: 20, mass: 0.7 } });
  const paso = v ? 640 : 520;
  return (
    <AbsoluteFill>
      <Fondo />
      <Titulos>
        <T entra={0} size={v ? 112 : 100}>
          Hay mucho
        </T>
        <T entra={5} verde size={v ? 112 : 100}>
          más.
        </T>
        <div style={{ marginTop: 22, height: v ? 70 : 60, overflow: 'hidden' }}>
          <div key={i} style={{ fontFamily: 'Mona', fontWeight: 700, fontStretch: '110%', fontSize: v ? 58 : 50, color: '#fff', transform: `translateY(${interpolate(f - i * 30, [0, 10], [60, 0], { ...clamp, easing: suave })}px)` }}>
            {MAS[i][1]}
          </div>
        </div>
      </Titulos>
      {MAS.map(([src], k) => {
        const d = k - pos;
        if (Math.abs(d) > 1.6) return null;
        const sc = 1 - Math.min(1, Math.abs(d)) * 0.28;
        return (
          <div
            key={src}
            style={{
              position: 'absolute',
              left: left + d * paso,
              top: top + (v ? 40 : 0),
              perspective: 2000,
              zIndex: 10 - Math.round(Math.abs(d) * 4),
              opacity: 1 - Math.min(1, Math.abs(d)) * 0.45,
            }}
          >
            <div style={{ transform: `scale(${sc}) rotateY(${-d * 22}deg)` }}>
              <Telefono ancho={ancho}>
                <Pantalla src={src} />
              </Telefono>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- 06 · Cierre de marca ----------
const Escena6 = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const logo = spring({ frame: f, fps, config: { damping: 12, mass: 0.8 } });
  const aro = interpolate(f, [0, 34], [0, 1], { ...clamp, easing: suave });
  const tam = v ? 330 : 240;
  const brillo = 0.5 + 0.5 * Math.sin(f / 12);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% ${v ? 36 : 40}%, rgba(32,10,82,0.95), ${C.negro} 75%)`, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: v ? 330 : 120, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: tam, height: tam, transform: `scale(${0.5 + 0.5 * logo})`, opacity: Math.min(1, logo * 1.5) }}>
          {[0, 1].map((r) => {
            const k = Math.max(0, aro - r * 0.25);
            return (
              <div key={r} style={{ position: 'absolute', inset: -tam * 0.2, borderRadius: '50%', border: `${2 + 10 * (1 - k)}px solid rgba(98,240,182,${0.55 * (1 - k)})`, transform: `scale(${0.75 + 0.8 * k})` }} />
            );
          })}
          <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: `0 0 ${120 + 60 * brillo}px rgba(98,240,182,${0.25 + 0.1 * brillo})` }} />
        </div>
        <div style={{ marginTop: v ? 70 : 40, textAlign: 'center' }}>
          <Linea entra={24} style={{ ...titular, fontSize: v ? 150 : 120, letterSpacing: '0.06em' }}>
            Camina.
          </Linea>
          <Linea entra={54} style={{ ...titular, fontSize: v ? 84 : 66, color: C.verde, marginTop: 10 }}>
            Caminá y ganá.
          </Linea>
          <Linea entra={90} style={{ fontFamily: 'Mona', fontWeight: 700, fontStretch: '115%', fontSize: v ? 56 : 44, color: '#fff', letterSpacing: '0.16em', marginTop: v ? 70 : 36 }}>
            MUY PRONTO
          </Linea>
          <Linea entra={102} style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: v ? 44 : 36, color: C.gris, marginTop: 14 }}>
            caminaapp.com
          </Linea>
        </div>
      </div>
    </AbsoluteFill>
  );
};
