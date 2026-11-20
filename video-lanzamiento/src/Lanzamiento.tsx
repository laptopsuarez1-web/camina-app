import type { ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { C, fmt, Linea, Moneda, Pantalla, Telefono, titular, Toma, suave, useVertical } from './marca';
import { InicioVivo } from './InicioVivo';

// CAMINA · Video oficial de lanzamiento (35 s, 30 fps). Funciona en vertical 1080×1920 y en horizontal 1920×1080.
// Guion: 01 Tarija (0–3,5) · 02 El movimiento (3,5–7) · 03 Te presentamos Camina (7–10) · 04 Caminá (10–14,5)
// 05 Sumá puntos (14,5–18,5) · 06 Disfrutá beneficios (18,5–24) · 06b Y mucho más (24–27) · 07 Cierre de marca (27–35).
// Todas las pantallas son capturas reales de la app con datos de ejemplo. Música y efectos: originales (scripts/musica.py).

const S = (s: number) => Math.round(s * 30);

export const Lanzamiento = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.negro }}>
      <Sequence name="01 Tarija" from={0} durationInFrames={S(3.5)}>
        <Escena01 />
      </Sequence>
      <Sequence name="02 El movimiento" from={S(3.5)} durationInFrames={S(3.5)}>
        <Escena02 />
      </Sequence>
      <Sequence name="03 Te presentamos Camina" from={S(7)} durationInFrames={S(3)}>
        <Escena03 />
      </Sequence>
      <Sequence name="04 Caminá" from={S(10)} durationInFrames={S(4.5)}>
        <Escena04 />
      </Sequence>
      <Sequence name="05 Sumá puntos" from={S(14.5)} durationInFrames={S(4)}>
        <Escena05 />
      </Sequence>
      <Sequence name="06 Disfrutá beneficios" from={S(18.5)} durationInFrames={S(5.5)}>
        <Escena06 />
      </Sequence>
      <Sequence name="06b Y mucho más" from={S(24)} durationInFrames={S(27.05) - S(24)}>
        <EscenaMas />
      </Sequence>
      <Sequence name="07 Cierre" from={S(27.05)} durationInFrames={S(35) - S(27.05)}>
        <Escena07 />
      </Sequence>
      <Destello en={S(3.5)} />
      <Destello en={S(7)} />
      <Destello en={S(27.05)} />
      <Audio name="Música" src={staticFile('audio/musica.wav')} />
      <Audio name="Efectos" src={staticFile('audio/sfx.wav')} />
    </AbsoluteFill>
  );
};

// Destello breve en los cortes grandes (blanco cálido, muy corto).
const Destello = ({ en }: { en: number }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [en - 2, en, en + 6], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ backgroundColor: '#fff6e8', opacity: o, pointerEvents: 'none' }} />;
};

// Bloque de textos de cada escena: abajo en vertical (zona segura de Reels/TikTok), a la izquierda en horizontal.
const Textos = ({ children, centro = false }: { children: ReactNode; centro?: boolean }) => {
  const v = useVertical();
  return (
    <AbsoluteFill
      style={{
        justifyContent: centro ? 'center' : v ? 'flex-start' : 'center',
        alignItems: centro ? 'center' : 'flex-start',
        textAlign: centro ? 'center' : 'left',
        padding: v ? '190px 90px 0' : '0 120px',
      }}
    >
      <div style={{ maxWidth: v ? 900 : 760 }}>{children}</div>
    </AbsoluteFill>
  );
};

const Numero = ({ n, entra }: { n: string; entra: number }) => {
  const v = useVertical();
  return (
    <Linea entra={entra} style={{ ...titular, fontSize: v ? 44 : 38, color: C.verde, letterSpacing: '0.12em', marginBottom: 14 }}>
      Paso {n}
    </Linea>
  );
};

const Sub = ({ children, entra }: { children: ReactNode; entra: number }) => {
  const v = useVertical();
  return (
    <Linea entra={entra} style={{ fontFamily: 'Mona', fontWeight: 500, fontSize: v ? 46 : 40, lineHeight: 1.25, color: '#d9dbe0', marginTop: 22 }}>
      {children}
    </Linea>
  );
};

// ---------- 01 · Tarija despierta ----------
const Escena01 = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  const negro = interpolate(f, [0, 20], [1, 0], { extrapolateRight: 'clamp' });
  const esp = interpolate(f, [20, 98], [0.5, 0.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const o = interpolate(f, [22, 40, 96, 105], [0, 1, 1, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Toma src="tarija/aerea.mp4" zoom={[1.0, 1.12]} posicion={v ? '62% center' : 'center'} oscurecer={0.2} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...titular, fontSize: v ? 190 : 210, letterSpacing: `${esp}em`, opacity: o, textShadow: '0 10px 60px rgba(0,0,0,0.45)', paddingLeft: `${esp}em` }}>
          Tarija
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.negro, opacity: negro }} />
    </AbsoluteFill>
  );
};

// ---------- 02 · El movimiento ----------
const Escena02 = () => {
  const v = useVertical();
  return (
    <AbsoluteFill>
      <Sequence name="Pies en la calle" durationInFrames={35}>
        <Toma src="tarija/pies-gente.mp4" desde={60} zoom={[1.1, 1.18]} oscurecer={0.3} />
      </Sequence>
      <Sequence name="Pies (primera persona)" from={35} durationInFrames={35}>
        <Toma src="tarija/pies-pov.mp4" desde={10} zoom={[1.05, 1.12]} oscurecer={0.3} />
      </Sequence>
      <Sequence name="Plaza" from={70} durationInFrames={35}>
        <Toma src="tarija/plaza.mp4" desde={20} zoom={[1.12, 1.2]} posicion={v ? '45% center' : 'center'} oscurecer={0.35} />
      </Sequence>
      <AbsoluteFill style={{ background: v ? 'linear-gradient(180deg, rgba(11,11,13,0.78) 0%, rgba(11,11,13,0.35) 38%, transparent 55%)' : 'linear-gradient(90deg, rgba(11,11,13,0.75) 0%, transparent 55%)' }} />
      <Textos>
        <Linea entra={8} style={{ ...titular, fontSize: v ? 96 : 84 }}>
          Una nueva forma
        </Linea>
        <Linea entra={14} style={{ ...titular, fontSize: v ? 96 : 84 }}>
          de vivir
        </Linea>
        <Linea entra={20} style={{ ...titular, fontSize: v ? 96 : 84, color: C.verde }}>
          tu ciudad.
        </Linea>
      </Textos>
    </AbsoluteFill>
  );
};

// Fondo de marca para las escenas de la app: negro con un brillo morado y verde.
const FondoMarca = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 45% at ${50 + Math.sin(f / 40) * 6}% 62%, rgba(98,240,182,0.16), transparent 70%), radial-gradient(70% 50% at 10% 100%, rgba(32,10,82,0.9), transparent 70%), ${C.negro}`,
      }}
    />
  );
};

// Teléfono ubicado según el formato: abajo al centro en vertical, a la derecha en horizontal.
const Escenario = ({ children, entra = 0, escala = 1, foco = [50, 50] }: { children: ReactNode; entra?: number; escala?: number; foco?: [number, number] }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const sp = spring({ frame: f - entra, fps, config: { damping: 200 } });
  const ancho = v ? 500 : 360;
  const y = (1 - sp) * 260;
  return (
    <AbsoluteFill style={{ justifyContent: v ? 'flex-end' : 'center', alignItems: v ? 'center' : 'flex-end', padding: v ? '0 0 110px' : '0 210px 0 0' }}>
      <div style={{ transform: `translateY(${y}px) scale(${escala})`, transformOrigin: `${foco[0]}% ${foco[1]}%`, opacity: sp }}>
        <Telefono ancho={ancho}>{children}</Telefono>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 03 · Te presentamos Camina ----------
const Escena03 = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  // En el teléfono: primero el logo (como al abrir la app) y después el Inicio.
  const logo = interpolate(f, [38, 50], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoEsc = interpolate(f, [0, 30], [0.75, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  return (
    <AbsoluteFill>
      <FondoMarca />
      <Textos>
        <Linea entra={4} style={{ ...titular, fontSize: v ? 92 : 78 }}>
          Te presentamos
        </Linea>
        <Linea entra={10} style={{ ...titular, fontSize: v ? 132 : 128, color: C.verde }}>
          Camina.
        </Linea>
      </Textos>
      <Escenario entra={0}>
        <InicioVivo pasos={1912} saldo={247} />
        <AbsoluteFill style={{ backgroundColor: C.morado, opacity: logo, justifyContent: 'center', alignItems: 'center' }}>
          <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: '46%', transform: `scale(${logoEsc})` }} />
        </AbsoluteFill>
      </Escenario>
    </AbsoluteFill>
  );
};

// Ficha "+1 Punto" que sale del teléfono, como en la app.
const MasUno = ({ en, x, y }: { en: number; x: number; y: number }) => {
  const f = useCurrentFrame();
  const v = useVertical();
  const p = interpolate(f, [en, en + 10, en + 40, en + 55], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dy = interpolate(f, [en, en + 55], [40, -70], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  if (f < en || f > en + 56) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translateY(${dy}px) scale(${0.8 + 0.2 * p})`,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 26px 8px 8px',
        borderRadius: 999,
        background: C.verde,
        color: '#12281f',
        fontFamily: 'Jakarta',
        fontWeight: 800,
        fontSize: v ? 40 : 34,
        boxShadow: '0 0 0 12px rgba(98,240,182,0.16), 0 20px 50px -18px rgba(98,240,182,0.8)',
      }}
    >
      <Moneda size={v ? 56 : 48} />+1 Punto
    </div>
  );
};

// Huellas que caminan junto al teléfono (motion graphic de pasos).
const Huellas = ({ desde, n = 8 }: { desde: number; n?: number }) => {
  const f = useCurrentFrame();
  const v = useVertical();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const en = desde + i * 9;
        const o = interpolate(f, [en, en + 4, en + 40, en + 60], [0, 0.9, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const izq = i % 2 === 0;
        const x = v ? 150 + (izq ? 0 : 46) : 760 + i * 70;
        const y = v ? 1720 - i * 95 : 860 - (izq ? 0 : 40);
        return (
          <Img
            key={i}
            src={staticFile(izq ? 'marca/pie-L.png' : 'marca/pie-R.png')}
            style={{ position: 'absolute', left: x, top: y, width: 34, opacity: o, transform: v ? 'rotate(0deg)' : 'rotate(90deg)' }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- 04 · Caminá ----------
const Escena04 = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  // Los pasos suben de 1.912 a 2.040: al cruzar 2.000 se suma 1 Punto (regla real: 1.000 pasos = 1 Punto).
  const pasos = Math.round(interpolate(f, [0, 90], [1912, 2040], { extrapolateRight: 'clamp' }));
  const cruce = 2000;
  const fCruce = Math.ceil(((cruce - 1912) / (2040 - 1912)) * 90);
  const pop = interpolate(f, [fCruce, fCruce + 6, fCruce + 18], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const act = interpolate(f, [100, 114], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  return (
    <AbsoluteFill>
      <FondoMarca />
      <Huellas desde={2} n={10} />
      <Textos>
        <Numero n="1" entra={0} />
        <Linea entra={4} style={{ ...titular, fontSize: v ? 128 : 128 }}>
          Caminá.
        </Linea>
        <Sub entra={12}>Tus pasos diarios cuentan.</Sub>
      </Textos>
      <Escenario entra={-20}>
        <InicioVivo pasos={pasos} saldo={247 + (pasos >= cruce ? 1 : 0)} pop={pop} />
        {act > 0 && (
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - act) * 100}%)`, boxShadow: '-20px 0 40px rgba(0,0,0,0.5)' }}>
            <Pantalla src="app/actividad-dark.jpg" />
          </div>
        )}
      </Escenario>
      <MasUno en={fCruce} x={v ? 640 : 1520} y={v ? 1060 : 330} />
    </AbsoluteFill>
  );
};

// ---------- 05 · Sumá puntos ----------
const Escena05 = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  const zoom = interpolate(f, [10, 70], [1, 1.22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  return (
    <AbsoluteFill>
      <FondoMarca />
      <Textos>
        <Numero n="2" entra={0} />
        <Linea entra={4} style={{ ...titular, fontSize: v ? 92 : 104 }}>
          Sumá <span style={{ color: C.verde }}>puntos.</span>
        </Linea>
        <Sub entra={16}>Convertí tu actividad en recompensas.</Sub>
        <Regla entra={40} />
      </Textos>
      <Escenario entra={-20}>
        <Pantalla src="app/puntos-nuevo-dark.jpg" style={{ transform: `scale(${zoom})`, transformOrigin: '18% 10%' }} />
      </Escenario>
      <MasUno en={S(1.0)} x={v ? 730 : 1560} y={v ? 1150 : 300} />
      <MasUno en={S(1.7)} x={v ? 760 : 1600} y={v ? 1250 : 380} />
      <MasUno en={S(2.4)} x={v ? 730 : 1560} y={v ? 1350 : 460} />
    </AbsoluteFill>
  );
};

// La regla real de Camina, en una pastilla.
const Regla = ({ entra }: { entra: number }) => {
  const f = useCurrentFrame();
  const v = useVertical();
  const p = interpolate(f, [entra, entra + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        marginTop: 34,
        padding: '14px 26px 14px 14px',
        borderRadius: 999,
        background: 'rgba(98,240,182,0.12)',
        boxShadow: 'inset 0 0 0 2px rgba(98,240,182,0.35)',
        color: '#fff',
        fontFamily: 'Jakarta',
        fontWeight: 700,
        fontSize: v ? 38 : 32,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <Moneda size={v ? 52 : 44} />
      1.000 pasos = 1 Punto
    </div>
  );
};

// ---------- 06 · Disfrutá beneficios ----------
const Escena06 = () => {
  const f = useCurrentFrame();
  const a = (x: number, y: number) => interpolate(f, [x, y], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Mapa → lista de Canjes (baja) → hoja «Pídele al local su código» → «¡Canje confirmado!».
  const lista = a(36, 44);
  const baja = interpolate(f, [46, 74], [0, -16], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const hoja = interpolate(f, [92, 106], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const confirmado = a(128, 134);
  return (
    <AbsoluteFill>
      <FondoMarca />
      <Textos>
        <Numero n="3" entra={0} />
        <Linea entra={4} style={{ ...titular, fontSize: 96 }}>
          Disfrutá
        </Linea>
        <Linea entra={9} style={{ ...titular, fontSize: 96, color: C.verde }}>
          beneficios.
        </Linea>
        <Sub entra={16}>Tus puntos te acercan a nuevos beneficios.</Sub>
      </Textos>
      <Escenario entra={-20}>
        <Pantalla src="app/mapa-comercios.jpg" />
        {lista > 0 && (
          <div style={{ position: 'absolute', inset: 0, opacity: lista, overflow: 'hidden', background: '#1a1033' }}>
            <Pantalla src="app/canjes.jpg" style={{ transform: `translateY(${baja}%)`, height: '118%' }} />
          </div>
        )}
        {hoja > 0 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: hoja }} />}
        {hoja > 0 && confirmado < 1 && (
          <Img
            src={staticFile('app/hoja-codigo.jpg')}
            style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - hoja) * 100}%)`, opacity: 1 - confirmado }}
          />
        )}
        {confirmado > 0 && (
          <Img
            src={staticFile('app/hoja-confirmado.jpg')}
            style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', borderRadius: '7% 7% 0 0 / 5% 5% 0 0', transform: `translateY(${(1 - confirmado) * 8}%)`, opacity: confirmado }}
          />
        )}
      </Escenario>
    </AbsoluteFill>
  );
};

// ---------- 06b · Y mucho más: Ruta del mes, Ranking y Perfil ----------
const MAS = [
  ['app/ruta.jpg', 'Ruta del mes'],
  ['app/ranking.jpg', 'Ranking semanal'],
  ['app/perfil.jpg', 'Tu perfil e insignias'],
] as const;

const EscenaMas = () => {
  const f = useCurrentFrame();
  const v = useVertical();
  const i = Math.min(2, Math.floor(f / 30));
  return (
    <AbsoluteFill>
      <FondoMarca />
      <Textos>
        <Linea entra={0} style={{ ...titular, fontSize: v ? 96 : 84 }}>
          Y mucho <span style={{ color: C.verde }}>más.</span>
        </Linea>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MAS.map(([, t], k) => (
            <div
              key={t}
              style={{
                fontFamily: 'Mona',
                fontWeight: 600,
                fontSize: v ? 44 : 38,
                color: k === i ? C.verde : 'rgba(255,255,255,0.4)',
                opacity: interpolate(f, [k * 30, k * 30 + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                transform: `translateX(${k === i ? 0 : -6}px)`,
              }}
            >
              {k === i ? '● ' : '○ '}
              {t}
            </div>
          ))}
        </div>
      </Textos>
      <Escenario entra={-20}>
        {MAS.map(([src], k) => (
          <div key={src} style={{ position: 'absolute', inset: 0, opacity: k === 0 ? 1 : interpolate(f, [k * 30, k * 30 + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            <Pantalla src={src} style={{ transform: `scale(${interpolate(f, [k * 30, k * 30 + 40], [1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }} />
          </div>
        ))}
      </Escenario>
    </AbsoluteFill>
  );
};

// ---------- 07 · Cierre de marca ----------
const Escena07 = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const corte = S(2.9); // plaza → negro con el logo (en el golpe de la música, 30 s)
  const plaza = interpolate(f, [corte - 8, corte], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lf = f - corte;
  const logo = spring({ frame: lf, fps, config: { damping: 14, mass: 0.8 } });
  const aro = interpolate(lf, [0, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const final = interpolate(lf, [S(3.4), S(3.4) + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const tam = v ? 300 : 230;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: plaza }}>
        <Toma src="tarija/fuente.mp4" zoom={[1.08, 1.16]} oscurecer={0.5} posicion={v ? '50% center' : 'center'} />
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Linea entra={10} style={{ ...titular, fontSize: v ? 120 : 112 }}>
              Tarija
            </Linea>
            <Linea entra={16} style={{ ...titular, fontSize: v ? 120 : 112, color: C.verde }}>
              ya camina.
            </Linea>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      {lf >= 0 && (
        <AbsoluteFill style={{ background: `radial-gradient(55% 40% at 50% 42%, rgba(32,10,82,0.95), ${C.negro} 75%)`, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v ? 56 : 36, transform: `translateY(${v ? -60 : -20}px)` }}>
            <div style={{ position: 'relative', width: tam, height: tam, transform: `scale(${0.6 + 0.4 * logo})`, opacity: Math.min(1, logo * 1.4) }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -tam * 0.18,
                  borderRadius: '50%',
                  boxShadow: `0 0 0 ${2 + 10 * (1 - aro)}px rgba(98,240,182,${0.5 * (1 - aro)})`,
                  transform: `scale(${0.8 + 0.5 * aro})`,
                  opacity: 1 - aro,
                }}
              />
              <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: '0 0 120px rgba(98,240,182,0.25)' }} />
            </div>
            <div style={{ textAlign: 'center', opacity: 1 - final }}>
              <Linea entra={corte + 8} style={{ ...titular, fontSize: v ? 104 : 84, color: '#fff' }}>
                Ahora, cada
              </Linea>
              <Linea entra={corte + 13} style={{ ...titular, fontSize: v ? 104 : 84, color: '#fff' }}>
                paso <span style={{ color: C.verde }}>cuenta.</span>
              </Linea>
            </div>
          </div>
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: final }}>
            <div style={{ textAlign: 'center', transform: `translateY(${v ? 260 : 210}px)` }}>
              <div style={{ ...titular, fontSize: v ? 120 : 96, letterSpacing: '0.08em' }}>Camina</div>
              <div style={{ ...titular, fontSize: v ? 52 : 42, color: C.verde, marginTop: 18, letterSpacing: '0.04em' }}>Caminá y ganá.</div>
              <div style={{ fontFamily: 'Jakarta', fontWeight: 700, fontSize: v ? 34 : 28, color: C.gris, marginTop: v ? 60 : 36 }}>
                Muy pronto en App Store y Google Play
              </div>
              <div style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: v ? 40 : 32, color: '#fff', marginTop: 12 }}>caminaapp.com</div>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export { fmt };
