import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram, versión 3 (11 láminas de 1080 × 1350).
// Sobrio: cada lámina con un solo color liso (negro, blanco, morado o menta), un titular compacto y uno o dos teléfonos
// enteros (capturas con datos de ejemplo, sin personas reales). Muestra el mapa, fichas y la ruta, pero el texto no
// nombra ningún comercio: solo «los comercios que se suman a Camina».
// Exportar: npx remotion still Carrusel3-1 out/carrusel-3/01.png (… hasta Carrusel3-11).

export const LAMINAS3 = 11;
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
          <Titulo tema="morado" etiqueta="Tus pasos" top={236} tam={86}>
            Se cuentan <Ac tema="morado">solos</Ac>
          </Titulo>
          <Texto tema="morado" top={410}>Meta diaria, rachas y tu actividad de la semana</Texto>
          <Uno src={A('actividad-dark')} />
        </Lamina>
      );
    case 4:
      return (
        <Lamina n={4} tema="menta">
          <Titulo tema="menta" etiqueta="Puntos" top={236} tam={86}>
            Cada día suma <Ac tema="menta">Puntos</Ac>
          </Titulo>
          <Texto tema="menta" top={410}>Caminas, cumples tu meta y tus Puntos crecen</Texto>
          <Uno src="app/puntos-248.jpg" />
        </Lamina>
      );
    case 5:
      return (
        <Lamina n={5} tema="negro">
          <Titulo tema="negro" etiqueta="Evento del mes" top={236} tam={86}>
            Cada mes, una <Ac tema="negro">ruta nueva</Ac>
          </Titulo>
          <Texto tema="negro" top={410}>Complétala y gana Día doble, insignia y boleto del sorteo</Texto>
          <Dos a={A('eventos-ruta-v2-dark')} b={A('ruta-mapa-nov-dark')} />
        </Lamina>
      );
    case 6:
      return (
        <Lamina n={6} tema="blanco">
          <Titulo tema="blanco" etiqueta="Grupos y ranking" top={236} tam={86}>
            Camina con tus <Ac tema="blanco">amigos</Ac>
          </Titulo>
          <Texto tema="blanco" top={410}>Metas de grupo, podio y ranking semanal</Texto>
          <Dos a={A('ranking-nuevo-dark')} b={A('grupo-v4-dark')} />
        </Lamina>
      );
    case 7:
      return (
        <Lamina n={7} tema="morado">
          <Titulo tema="morado" etiqueta="Chat y desafíos" top={236} tam={86}>
            Organícense y <Ac tema="morado">rétense</Ac>
          </Titulo>
          <Texto tema="morado" top={410}>Chat del grupo, desafíos y +5 Puntos por cada amigo que invitas</Texto>
          <Dos a={A('grupo-chat-dark')} b={A('grupos-v2-dark')} />
        </Lamina>
      );
    case 8:
      return (
        <Lamina n={8} tema="negro">
          <Titulo tema="negro" etiqueta="Canjes" top={236} tam={86}>
            Canjea en tu <Ac tema="negro">ciudad</Ac>
          </Titulo>
          <Texto tema="negro" top={410}>Usa tus Puntos en los comercios que se suman a Camina</Texto>
          <Dos a={A('mapa-locales-dark')} b={A('ficha-galera-dark')} />
        </Lamina>
      );
    case 9:
      return (
        <Lamina n={9} tema="menta">
          <Titulo tema="menta" etiqueta="Insignias y niveles" top={236} tam={86}>
            Hazte fan de tus <Ac tema="menta">lugares</Ac>
          </Titulo>
          <Texto tema="menta" top={410}>Visitante, Habitual, Fan y Leyenda del mes. Y cada canje suma un sello</Texto>
          <Dos a={A('ficha-bloom-nivel-dark')} b={A('perfil-insignias-dark')} />
        </Lamina>
      );
    case 10:
      return (
        <Lamina n={10} tema="morado" sinNumero>
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
        <Lamina n={11} tema="negro" sinNumero sinMarca>
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

// teléfono entero con una captura de la app
const Telefono = ({ src, x, y, alto, rot = 0 }: { src: string; x: number; y: number; alto: number; rot?: number }) => {
  const ancho = alto * (780 / 1688);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho + 28, height: alto + 28, borderRadius: 62, background: '#0d0a18', padding: 14, boxShadow: '0 40px 90px rgba(8,2,24,0.45), inset 0 0 0 2px rgba(255,255,255,0.16)', transform: `rotate(${rot}deg)` }}>
      <div style={{ width: ancho, height: alto, borderRadius: 50, overflow: 'hidden' }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
};
const Uno = ({ src }: { src: string }) => <Telefono src={src} x={540 - (770 * (780 / 1688) + 28) / 2} y={540} alto={770} />;
const Dos = ({ a, b }: { a: string; b: string }) => (
  <>
    <Telefono src={a} x={146} y={572} alto={730} rot={-4} />
    <Telefono src={b} x={570} y={552} alto={730} rot={4} />
  </>
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
  const estilo: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 128, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' };
  return (
    <AbsoluteFill style={{ background: NEGRO, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(45% 32% at 50% 72%, rgba(98,240,182,0.34), rgba(98,240,182,0.05) 60%, transparent 80%)' }} />
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
      <div style={{ position: 'absolute', left: 0, right: 0, top: 530, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, color: 'rgba(255,255,255,0.72)' }}>La app que convierte tus pasos en Puntos</div>
      <Telefono src={A('inicio-dark')} x={540 - (700 * (780 / 1688) + 28) / 2} y={610} alto={700} />
    </AbsoluteFill>
  );
};
