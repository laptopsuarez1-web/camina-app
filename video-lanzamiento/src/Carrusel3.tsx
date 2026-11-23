import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram, versión 3 (10 láminas de 1080 × 1350).
// Más sobrio: cada lámina con un solo color liso (negro, blanco, morado o menta), un titular grande y un solo teléfono
// que asoma desde abajo, como en la portada. No nombra ni muestra comercios: solo «comercios de tu ciudad», y las
// pantallas elegidas no muestran ningún local (capturas con datos de ejemplo, sin personas reales).
// Exportar: npx remotion still Carrusel3-1 out/carrusel-3/01.png (… hasta Carrusel3-10).

export const LAMINAS3 = 10;
const MENTA = '#62f0b6';
const MORADO = '#200a52';
const NEGRO = '#0b0b0d';
const BLANCO = '#f5f4f0';
type Tema = 'negro' | 'blanco' | 'morado' | 'menta';
const FONDO: Record<Tema, string> = { negro: NEGRO, blanco: BLANCO, morado: MORADO, menta: MENTA };
const tinta = (t: Tema) => (t === 'blanco' ? NEGRO : t === 'menta' ? MORADO : '#ffffff');
const acento = (t: Tema) => (t === 'blanco' ? '#5b2bd6' : t === 'menta' ? '#ffffff' : MENTA);
const A = (s: string) => `yasi/app/${s}.jpg`;

export const Carrusel3 = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return <Portada />;
    case 2:
      return (
        <Lamina n={2} tema="blanco">
          <Titulo tema="blanco" etiqueta="Cómo funciona" top={250} tam={104}>
            Caminas
            <br />
            Sumas Puntos
            <br />
            <Ac tema="blanco">Canjeas</Ac>
          </Titulo>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 720, display: 'flex', flexDirection: 'column', gap: 34 }}>
            {[
              ['01', 'La app cuenta tus pasos sola, todos los días'],
              ['02', 'Cada día que caminas, ganas Puntos'],
              ['03', 'Los usas en comercios de tu ciudad'],
            ].map(([num, t]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'baseline', gap: 30, borderTop: `2px solid rgba(11,11,13,0.12)`, paddingTop: 26 }}>
                <span style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 44, color: '#5b2bd6' }}>{num}</span>
                <span style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 40, color: NEGRO }}>{t}</span>
              </div>
            ))}
          </div>
        </Lamina>
      );
    case 3:
      return (
        <Lamina n={3} tema="morado">
          <Titulo tema="morado" etiqueta="Tus pasos" top={250}>
            Se cuentan <Ac tema="morado">solos</Ac>
          </Titulo>
          <Texto tema="morado" top={460}>Meta diaria, rachas y tu actividad de la semana</Texto>
          <Asoma src={A('actividad-dark')} tema="morado" />
        </Lamina>
      );
    case 4:
      return (
        <Lamina n={4} tema="menta">
          <Titulo tema="menta" etiqueta="Puntos" top={250}>
            Cada día suma <Ac tema="menta">Puntos</Ac>
          </Titulo>
          <Texto tema="menta" top={460}>Caminas, cumples tu meta y tus Puntos crecen</Texto>
          <Asoma src="app/puntos-248.jpg" tema="menta" />
        </Lamina>
      );
    case 5:
      return (
        <Lamina n={5} tema="negro">
          <Titulo tema="negro" etiqueta="Evento del mes" top={250}>
            Cada mes, una <Ac tema="negro">ruta nueva</Ac>
          </Titulo>
          <Texto tema="negro" top={460}>Te tocan 3 lugares de tu ciudad. Complétala y gana Día doble, insignia y boleto del sorteo</Texto>
          <Asoma src={A('eventos-ruta-v2-dark')} tema="negro" top={680} />
        </Lamina>
      );
    case 6:
      return (
        <Lamina n={6} tema="blanco">
          <Titulo tema="blanco" etiqueta="Grupos y ranking" top={250}>
            Camina con tus <Ac tema="blanco">amigos</Ac>
          </Titulo>
          <Texto tema="blanco" top={460}>Metas de grupo, podio y ranking semanal</Texto>
          <Asoma src={A('grupo-v4-dark')} tema="blanco" />
        </Lamina>
      );
    case 7:
      return (
        <Lamina n={7} tema="morado">
          <Titulo tema="morado" etiqueta="Chat y desafíos" top={250}>
            Organícense y <Ac tema="morado">rétense</Ac>
          </Titulo>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 520, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <Burbuja quien="Camila">¿Quién se anota a la caminata del sábado por la plaza?</Burbuja>
            <Burbuja quien="Lucía" yo>Yo voy, salgo a las 7</Burbuja>
            <Burbuja quien="Joaquín">Cuenten conmigo. Ayer hice 13 mil, ya me van a alcanzar</Burbuja>
          </div>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 1120, display: 'flex', alignItems: 'center', gap: 20, padding: '26px 32px', borderRadius: 34, background: MENTA, color: MORADO }}>
            <span style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 40, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>+5 Puntos</span>
            <span style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 28, lineHeight: 1.25 }}>por cada amigo que invitas y se suma</span>
          </div>
        </Lamina>
      );
    case 8:
      return (
        <Lamina n={8} tema="negro">
          <Titulo tema="negro" etiqueta="Canjes" top={250}>
            Tus Puntos valen en tu <Ac tema="negro">ciudad</Ac>
          </Titulo>
          <Texto tema="negro" top={560}>Canjéalos en los comercios que se suman a Camina. Y cada canje suma un sello en tu tarjeta de fidelidad</Texto>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 800, padding: '40px 44px', borderRadius: 44, background: '#17121f', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 38 }}>
              Tarjeta de fidelidad
              <span style={{ padding: '8px 22px', borderRadius: 30, background: 'rgba(160,130,255,0.22)', color: '#c9b8ff', fontSize: 30 }}>4 de 5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 34 }}>
              {[0, 1, 2, 3].map((i) => (
                <Img key={i} src={staticFile('marca/sello-oro.png')} style={{ width: 142, height: 142 }} />
              ))}
              <div style={{ width: 134, height: 134, margin: 4, borderRadius: '50%', border: '5px dashed rgba(185,168,224,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 46 }}>5</div>
            </div>
          </div>
        </Lamina>
      );
    case 9:
      return (
        <Lamina n={9} tema="morado" sinNumero>
          <Img src={staticFile('yasi/f/t-plaza-luis-de-fuentes.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,13,0.05) 30%, rgba(11,11,13,0.92) 80%)' }} />
          <Titulo tema="negro" etiqueta="Tarija, Bolivia" top={860} tam={112}>
            Hecho en <Ac tema="negro">Tarija</Ac>
          </Titulo>
          <Texto tema="negro" top={1110}>Nació caminando estas calles</Texto>
        </Lamina>
      );
    default:
      return (
        <Lamina n={10} tema="negro" sinNumero sinMarca>
          <AbsoluteFill style={{ background: 'radial-gradient(55% 35% at 50% 40%, rgba(98,240,182,0.16), transparent 70%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 170, height: 170 }} />
            <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 116 }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 530, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 104, lineHeight: 0.95, textTransform: 'uppercase', color: '#fff' }}>Muy pronto</div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 700, display: 'flex', justifyContent: 'center', gap: 22 }}>
            <Tienda icono={<IconoApple />} nombre="App Store" />
            <Tienda icono={<IconoPlay />} nombre="Google Play" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.72)' }}>Síguenos para enterarte primero</div>
        </Lamina>
      );
  }
};

// ---------- piezas ----------
const Lamina = ({ n, tema, children, sinNumero, sinMarca }: { n: number; tema: Tema; children: ReactNode; sinNumero?: boolean; sinMarca?: boolean }) => (
  <AbsoluteFill style={{ background: FONDO[tema], overflow: 'hidden' }}>
    {children}
    {!sinMarca && (
      <div style={{ position: 'absolute', left: 80, top: 92, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 48, height: 48, filter: tema === 'menta' ? 'brightness(0.25) saturate(2) hue-rotate(200deg)' : 'none' }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 30, filter: tema === 'blanco' || tema === 'menta' ? 'brightness(0)' : 'brightness(0) invert(1)' }} />
      </div>
    )}
    {!sinNumero && <div style={{ position: 'absolute', right: 80, top: 100, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, color: tinta(tema), opacity: 0.5 }}>{String(n).padStart(2, '0')} / {LAMINAS3}</div>}
  </AbsoluteFill>
);
const Titulo = ({ tema, etiqueta, top, tam = 100, children }: { tema: Tema; etiqueta: string; top: number; tam?: number; children: ReactNode }) => (
  <>
    <div style={{ position: 'absolute', left: 80, top: top - 74, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.16em', textTransform: 'uppercase', color: tema === 'menta' ? MORADO : tema === 'blanco' ? '#5b2bd6' : MENTA }}>{etiqueta}</div>
    <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: tam, lineHeight: 0.92, letterSpacing: '-0.015em', textTransform: 'uppercase', color: tinta(tema) }}>{children}</div>
  </>
);
const Ac = ({ tema, children }: { tema: Tema; children: ReactNode }) => <span style={{ color: acento(tema) }}>{children}</span>;
const Texto = ({ tema, top, children }: { tema: Tema; top: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, right: 120, top, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 38, lineHeight: 1.3, color: tinta(tema), opacity: 0.85 }}>{children}</div>
);

// un solo teléfono que asoma desde abajo, centrado, y se funde con el fondo
const Asoma = ({ src, tema, top = 640 }: { src: string; tema: Tema; top?: number }) => {
  const alto = 1180;
  const ancho = alto * (780 / 1688);
  const brillo = tema === 'menta' ? 'rgba(32,10,82,0.35)' : tema === 'blanco' ? 'rgba(32,10,82,0.25)' : 'rgba(98,240,182,0.28)';
  return (
    <>
      <div style={{ position: 'absolute', left: 540 - (ancho + 32) / 2, top, width: ancho + 32, height: alto + 32, borderRadius: 78, background: '#0d0a18', padding: 16, boxShadow: `0 -20px 110px ${brillo}, inset 0 0 0 2px rgba(255,255,255,0.16)` }}>
        <div style={{ width: ancho, height: alto, borderRadius: 62, overflow: 'hidden' }}>
          <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: `linear-gradient(180deg, transparent, ${FONDO[tema]} 88%)` }} />
    </>
  );
};

const Burbuja = ({ quien, yo, children }: { quien: string; yo?: boolean; children: ReactNode }) => (
  <div style={{ alignSelf: yo ? 'flex-end' : 'flex-start', maxWidth: 720, padding: '24px 30px', borderRadius: yo ? '34px 34px 8px 34px' : '34px 34px 34px 8px', background: yo ? MENTA : '#ffffff', color: yo ? MORADO : NEGRO }}>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 700, fontSize: 24, opacity: 0.55, marginBottom: 6 }}>{quien}</div>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 36, lineHeight: 1.25 }}>{children}</div>
  </div>
);

const Tienda = ({ icono, nombre }: { icono: ReactNode; nombre: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 32px 18px 26px', borderRadius: 26, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.35)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);

// ---------- portada (la misma de la versión «Paso a paso») ----------
const Portada = () => {
  const alto = 1180;
  const ancho = alto * (780 / 1688);
  const estilo: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 168, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' };
  return (
    <AbsoluteFill style={{ background: NEGRO, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(45% 30% at 50% 88%, rgba(98,240,182,0.4), rgba(98,240,182,0.06) 60%, transparent 80%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 62, height: 62 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 40 }} />
      </div>
      <div style={estilo}>
        Cada
        <br />
        paso
        <br />
        <span style={{ color: MENTA }}>cuenta</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 680, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, color: 'rgba(255,255,255,0.72)' }}>La app que convierte tus pasos en Puntos</div>
      <div style={{ position: 'absolute', left: 540 - (ancho + 32) / 2, top: 780, width: ancho + 32, height: alto + 32, borderRadius: 78, background: '#0d0a18', padding: 16, boxShadow: '0 -20px 120px rgba(98,240,182,0.25), inset 0 0 0 2px rgba(255,255,255,0.16)' }}>
        <div style={{ width: ancho, height: alto, borderRadius: 62, overflow: 'hidden' }}>
          <Img src={staticFile(A('inicio-dark'))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, background: `linear-gradient(180deg, rgba(11,11,13,0), ${NEGRO} 85%)` }} />
    </AbsoluteFill>
  );
};
