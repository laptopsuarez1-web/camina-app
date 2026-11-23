import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram, versión 4 (11 láminas de 1080 × 1350), con más edición:
// teléfonos realistas (marco metálico, isla, barra de estado, botones, reflejo, sombra), «lupas» que amplían una parte de la
// pantalla, una palabra gigante tenue de fondo y un camino de luz que cruza todas las láminas por detrás.
// Capturas de la app con datos de ejemplo (sin personas reales); el texto no nombra ningún comercio.
// Exportar: npx remotion still Carrusel4-1 out/carrusel-4/01.png (… hasta Carrusel4-11).

export const LAMINAS4 = 11;
const W = 1080;
const MENTA = '#62f0b6';
const MORADO = '#200a52';
const NEGRO = '#0b0b0d';
const BLANCO = '#f5f4f0';
type Tema = 'negro' | 'blanco' | 'morado' | 'menta';
const FONDO: Record<Tema, string> = {
  negro: `radial-gradient(70% 45% at 60% 70%, #1d1238 0%, ${NEGRO} 70%)`,
  morado: `radial-gradient(70% 50% at 55% 68%, #3a1690 0%, ${MORADO} 72%)`,
  blanco: `radial-gradient(70% 50% at 55% 70%, #ffffff 0%, ${BLANCO} 70%)`,
  menta: `radial-gradient(70% 50% at 55% 70%, #a5fadb 0%, ${MENTA} 70%)`,
};
const claro = (t: Tema) => t === 'blanco' || t === 'menta';
const tinta = (t: Tema) => (t === 'blanco' ? NEGRO : t === 'menta' ? MORADO : '#ffffff');
const acento = (t: Tema) => (t === 'blanco' ? '#5b2bd6' : t === 'menta' ? '#ffffff' : MENTA);

// capturas (780 × 1688) y las zonas que se amplían en las lupas [x, y, ancho, alto]
const S = {
  inicio: 'yasi/app/inicio-dark.jpg',
  actividad: 'yasi/app/actividad-dark.jpg',
  puntos: 'app/puntos-248.jpg',
  ruta: 'yasi/app/eventos-ruta-v2-dark.jpg',
  rutaMapa: 'yasi/app/ruta-mapa-nov-dark.jpg',
  grupo: 'yasi/app/grupo-v4-dark.jpg',
  ranking: 'yasi/app/ranking-nuevo-dark.jpg',
  chat: 'yasi/app/grupo-chat-dark.jpg',
  grupos: 'yasi/app/grupos-v2-dark.jpg',
  mapa: 'yasi/app/mapa-locales-dark.jpg',
  ficha: 'yasi/app/ficha-galera-dark.jpg',
  nivel: 'yasi/app/ficha-bloom-nivel-dark.jpg',
  insignias: 'yasi/app/perfil-insignias-dark.jpg',
};
type Zona = [number, number, number, number];

export const Carrusel4 = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return (
        <Lamina n={1} tema="negro" palabra="CAMINA" sinEncabezado sinNumero>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 92, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 60, height: 60 }} />
            <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 38 }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 178, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 110, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' }}>
            Camina
            <br />
            y gana
            <br />
            <span style={{ color: MENTA }}>premios</span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 486, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, color: 'rgba(255,255,255,0.75)' }}>La app que convierte tus pasos en premios y descuentos</div>
          <Telefono src={S.inicio} cx={540} y={572} alto={700} brillo={MENTA} />
          <Lupa src={S.inicio} zona={[90, 180, 600, 600]} x={748} y={650} ancho={270} redonda etiqueta="6.840 pasos" />
          <div style={{ position: 'absolute', left: 46, top: 950, width: 290, padding: '26px 26px 24px', borderRadius: 34, background: '#17121f', boxShadow: `0 0 0 4px ${MENTA}, 0 0 50px rgba(98,240,182,0.35), 0 30px 60px rgba(0,0,0,0.5)` }}>
            <div style={{ display: 'flex' }}>
              {[0, 1, 2, 3].map((k) => (
                <Img key={k} src={staticFile('marca/sello-oro.png')} style={{ width: 66, height: 66, marginLeft: k ? -14 : 0 }} />
              ))}
            </div>
            <div style={{ marginTop: 14, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 30, color: '#fff', lineHeight: 1.15 }}>Premio gratis</div>
            <div style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>con tu tarjeta de sellos</div>
          </div>
        </Lamina>
      );
    case 2:
      return (
        <Lamina n={2} tema="blanco" palabra="PASOS">
          <Titulo tema="blanco" etiqueta="Cómo funciona">
            Así de <Ac tema="blanco">simple</Ac>
          </Titulo>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 470, display: 'flex', flexDirection: 'column', gap: 26 }}>
            {[
              ['01', 'Caminas', 'La app cuenta tus pasos sola, todos los días'],
              ['02', 'Sumas Puntos', 'Cada día que caminas, ganas Puntos'],
              ['03', 'Canjeas', 'Los usas en los comercios que se suman a Camina'],
            ].map(([num, t, d]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '30px 40px', borderRadius: 40, background: '#ffffff', boxShadow: '0 20px 50px rgba(32,10,82,0.10), inset 0 0 0 2px rgba(32,10,82,0.06)' }}>
                <div style={{ width: 120, height: 120, borderRadius: 34, background: NEGRO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 52, color: MENTA, flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 48, textTransform: 'uppercase', color: NEGRO }}>{t}</div>
                  <div style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32, color: 'rgba(11,11,13,0.65)', marginTop: 6 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </Lamina>
      );
    case 3:
      return (
        <Lamina n={3} tema="morado" palabra="PASOS">
          <Titulo tema="morado" etiqueta="Tus pasos">
            Se cuentan <Ac tema="morado">solos</Ac>
          </Titulo>
          <Texto tema="morado">Meta diaria, rachas y tu actividad de la semana</Texto>
          <Telefono src={S.actividad} cx={770} y={500} alto={760} brillo={MENTA} />
          <Lupa src={S.actividad} zona={[20, 260, 740, 560]} x={60} y={560} ancho={460} etiqueta="Tu semana" />
          <Lupa src={S.actividad} zona={[20, 1090, 740, 250]} x={60} y={1000} ancho={460} etiqueta="Rachas" />
        </Lamina>
      );
    case 4:
      return (
        <Lamina n={4} tema="negro" palabra="PUNTOS">
          <Titulo tema="negro" etiqueta="Puntos">
            Cada día suma <Ac tema="negro">Puntos</Ac>
          </Titulo>
          <Texto tema="negro">Caminas, cumples tu meta y tus Puntos crecen</Texto>
          <Telefono src={S.puntos} cx={770} y={500} alto={760} brillo={MENTA} />
          <Lupa src={S.puntos} zona={[20, 190, 620, 260]} x={60} y={640} ancho={460} etiqueta="Ganaste 7 Puntos hoy" />
        </Lamina>
      );
    case 5:
      return (
        <Lamina n={5} tema="morado" palabra="RUTA">
          <Titulo tema="morado" etiqueta="Evento del mes">
            Cada mes, una <Ac tema="morado">ruta nueva</Ac>
          </Titulo>
          <Texto tema="morado">Complétala y gana Día doble, insignia y boleto del sorteo</Texto>
          <Telefono src={S.rutaMapa} cx={780} y={520} alto={740} rz={3} brillo={MENTA} />
          <Telefono src={S.ruta} cx={300} y={520} alto={740} rz={-3} brillo={MENTA} />
        </Lamina>
      );
    case 6:
      return (
        <Lamina n={6} tema="menta" palabra="AMIGOS">
          <Titulo tema="menta" etiqueta="Grupos y ranking">
            Camina con tus <Ac tema="menta">amigos</Ac>
          </Titulo>
          <Texto tema="menta">Metas de grupo, podio y ranking semanal</Texto>
          <Telefono src={S.ranking} cx={300} y={520} alto={740} rz={-3} brillo={MORADO} />
          <Telefono src={S.grupo} cx={780} y={520} alto={740} rz={3} brillo={MORADO} />
          
        </Lamina>
      );
    case 7:
      return (
        <Lamina n={7} tema="negro" palabra="CHAT">
          <Titulo tema="negro" etiqueta="Chat y desafíos">
            Organícense y <Ac tema="negro">rétense</Ac>
          </Titulo>
          <Texto tema="negro">Chat del grupo, desafíos y +5 Puntos por cada amigo que invitas</Texto>
          <Telefono src={S.chat} cx={770} y={500} alto={760} brillo={MENTA} />
          <Burbuja x={60} y={600} quien="Camila">¿Quién se anota a la caminata del sábado?</Burbuja>
          <Burbuja x={120} y={800} quien="Lucía" yo>Yo voy, salgo a las 7</Burbuja>
          <div style={{ position: 'absolute', left: 60, top: 990, width: 460, padding: '26px 30px', borderRadius: 34, background: MENTA, color: MORADO, boxShadow: '0 30px 60px rgba(0,0,0,0.45)', transform: 'rotate(-2deg)' }}>
            <div style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 46, textTransform: 'uppercase', lineHeight: 1 }}>+5 Puntos</div>
            <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 26, marginTop: 8 }}>por cada amigo que se suma</div>
          </div>
        </Lamina>
      );
    case 8:
      return (
        <Lamina n={8} tema="morado" palabra="CANJE">
          <Titulo tema="morado" etiqueta="Canjes">
            Canjea en tu <Ac tema="morado">ciudad</Ac>
          </Titulo>
          <Texto tema="morado">Usa tus Puntos en los comercios que se suman a Camina</Texto>
          <Telefono src={S.ficha} cx={780} y={520} alto={740} rz={3} brillo={MENTA} />
          <Telefono src={S.mapa} cx={300} y={520} alto={740} rz={-3} brillo={MENTA} />
          
        </Lamina>
      );
    case 9:
      return (
        <Lamina n={9} tema="blanco" palabra="FAN">
          <Titulo tema="blanco" etiqueta="Insignias y niveles">
            Hazte fan de tus <Ac tema="blanco">lugares</Ac>
          </Titulo>
          <Texto tema="blanco">Visitante, Habitual, Fan y Leyenda del mes. Y cada canje suma un sello</Texto>
          <Telefono src={S.insignias} cx={780} y={520} alto={740} rz={3} brillo={MORADO} />
          <Telefono src={S.nivel} cx={300} y={520} alto={740} rz={-3} brillo={MORADO} />
          
        </Lamina>
      );
    case 10:
      return (
        <Lamina n={10} tema="negro" sinPalabra sinCamino sinNumero>
          <Img src={staticFile('yasi/f/t-plaza-luis-de-fuentes.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,13,0.05) 30%, rgba(11,11,13,0.92) 80%)' }} />
          <div style={{ position: 'absolute', left: 80, top: 800, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.16em', textTransform: 'uppercase', color: MENTA }}>Tarija, Bolivia</div>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 850, fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 112, lineHeight: 0.92, textTransform: 'uppercase', color: '#fff' }}>
            Hecho en <span style={{ color: MENTA }}>Tarija</span>
          </div>
          <div style={{ position: 'absolute', left: 80, top: 1100, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 38, color: 'rgba(255,255,255,0.85)' }}>Nació caminando estas calles</div>
        </Lamina>
      );
    default:
      return (
        <Lamina n={11} tema="negro" palabra="PRONTO" sinNumero sinEncabezado>
          <AbsoluteFill style={{ background: 'radial-gradient(50% 32% at 50% 36%, rgba(98,240,182,0.18), transparent 70%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 170, height: 170, filter: 'drop-shadow(0 0 30px rgba(98,240,182,0.5))' }} />
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

// ---------- base ----------
const Lamina = ({ n, tema, palabra, children, sinEncabezado, sinNumero, sinPalabra, sinCamino }: { n: number; tema: Tema; palabra?: string; children: ReactNode; sinEncabezado?: boolean; sinNumero?: boolean; sinPalabra?: boolean; sinCamino?: boolean }) => (
  <AbsoluteFill style={{ background: FONDO[tema], overflow: 'hidden' }}>
    {!sinPalabra && palabra && (
      <div style={{ position: 'absolute', left: -40, right: -40, top: 640, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 330, lineHeight: 1, color: 'transparent', WebkitTextStroke: `2px ${claro(tema) ? 'rgba(32,10,82,0.10)' : 'rgba(255,255,255,0.07)'}`, whiteSpace: 'nowrap' } as CSSProperties}>{palabra}</div>
    )}
    {!sinCamino && <Camino n={n} tema={tema} />}
    <AbsoluteFill>{children}</AbsoluteFill>
    {!sinEncabezado && (
      <div style={{ position: 'absolute', left: 80, top: 92, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 48, height: 48, filter: tema === 'menta' ? 'brightness(0.25) saturate(2) hue-rotate(200deg)' : 'none' }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 30, filter: claro(tema) ? 'brightness(0)' : 'brightness(0) invert(1)' }} />
      </div>
    )}
    {!sinNumero && <div style={{ position: 'absolute', right: 80, top: 100, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, color: tinta(tema), opacity: 0.5 }}>{String(n).padStart(2, '0')} / {LAMINAS4}</div>}
  </AbsoluteFill>
);
const Titulo = ({ tema, etiqueta, children }: { tema: Tema; etiqueta: string; children: ReactNode }) => (
  <>
    <div style={{ position: 'absolute', left: 80, top: 172, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.16em', textTransform: 'uppercase', color: tema === 'menta' ? MORADO : tema === 'blanco' ? '#5b2bd6' : MENTA }}>{etiqueta}</div>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 222, fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 86, lineHeight: 0.92, letterSpacing: '-0.015em', textTransform: 'uppercase', color: tinta(tema) }}>{children}</div>
  </>
);
const Ac = ({ tema, children }: { tema: Tema; children: ReactNode }) => <span style={{ color: acento(tema) }}>{children}</span>;
const Texto = ({ tema, children }: { tema: Tema; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, right: 140, top: 400, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, lineHeight: 1.3, color: tinta(tema), opacity: 0.8 }}>{children}</div>
);

// ---------- teléfono realista (derecho, sin deformar) ----------
const Telefono = ({ src, cx, y, alto, ry = 0, rz = 0, brillo, atras }: { src: string; cx: number; y: number; alto: number; ry?: number; rx?: number; rz?: number; brillo: string; atras?: boolean }) => {
  const pantalla = alto * (780 / 1688);
  const b = pantalla * 0.04; // bisel
  const ancho = pantalla + b * 2;
  const total = alto + b * 2;
  const radio = ancho * 0.165;
  const barra = alto * 0.052; // barra de estado: la isla no tapa la app
  void ry;
  return (
    <div style={{ position: 'absolute', left: cx - ancho / 2, top: y, width: ancho, height: total, transform: `rotate(${rz * 0.4}deg) scale(${atras ? 0.95 : 1})`, filter: atras ? 'brightness(0.8)' : 'none' }}>
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '6%', bottom: '-4%', borderRadius: radio, background: brillo, opacity: 0.32, filter: 'blur(70px)' }} />
      <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: -36, height: 70, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(28px)' }} />
      <div style={{ position: 'absolute', left: -5, top: total * 0.2, width: 6, height: total * 0.05, borderRadius: 3, background: '#2c2a33' }} />
      <div style={{ position: 'absolute', left: -5, top: total * 0.28, width: 6, height: total * 0.08, borderRadius: 3, background: '#2c2a33' }} />
      <div style={{ position: 'absolute', right: -5, top: total * 0.25, width: 6, height: total * 0.11, borderRadius: 3, background: '#2c2a33' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: radio, background: 'linear-gradient(145deg, #4a4752 0%, #1a191e 30%, #2d2b33 62%, #121115 100%)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.28), inset 0 0 0 4px #0b0a0e, 0 30px 60px rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', left: b, top: b, width: pantalla, height: alto, borderRadius: radio - b, overflow: 'hidden', background: '#140b28' }}>
        {/* barra de estado */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barra, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${pantalla * 0.09}px`, color: '#fff', fontFamily: 'Jakarta', fontWeight: 700, fontSize: pantalla * 0.042 }}>
          <span>9:41</span>
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: pantalla * 0.008 }}>
            {[0.35, 0.55, 0.75, 1].map((h) => (
              <span key={h} style={{ width: pantalla * 0.009, height: pantalla * 0.03 * h, borderRadius: 2, background: '#fff', display: 'inline-block' }} />
            ))}
            <span style={{ marginLeft: pantalla * 0.02, width: pantalla * 0.06, height: pantalla * 0.03, borderRadius: 4, border: '2px solid rgba(255,255,255,0.8)', display: 'inline-block', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '70%', borderRadius: 2, background: '#fff' }} />
            </span>
          </span>
        </div>
        <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: barra, width: '100%', height: alto - barra, objectFit: 'cover', objectPosition: '50% 0%' }} />
        <div style={{ position: 'absolute', left: '50%', top: barra * 0.18, width: pantalla * 0.3, height: barra * 0.64, marginLeft: -pantalla * 0.15, borderRadius: 40, background: '#000' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 26%, rgba(255,255,255,0) 40%)' }} />
      </div>
    </div>
  );
};

// ---------- lupa: amplía una zona de la captura ----------
const Lupa = ({ src, zona, x, y, ancho, redonda, etiqueta }: { src: string; zona: Zona; x: number; y: number; ancho: number; redonda?: boolean; etiqueta?: string }) => {
  const [zx, zy, zw, zh] = zona;
  const k = ancho / zw;
  const alto = zh * k;
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div style={{ width: ancho, height: alto, borderRadius: redonda ? '50%' : 34, overflow: 'hidden', position: 'relative', boxShadow: `0 0 0 5px ${MENTA}, 0 0 50px rgba(98,240,182,0.45), 0 30px 60px rgba(0,0,0,0.5)` }}>
        <Img src={staticFile(src)} style={{ position: 'absolute', left: -zx * k, top: -zy * k, width: 780 * k, height: 1688 * k, maxWidth: 'none' }} />
      </div>
      {etiqueta && (
        <div style={{ position: 'absolute', left: redonda ? '50%' : 22, top: alto - 26, transform: redonda ? 'translateX(-50%)' : 'none', padding: '10px 22px', borderRadius: 30, background: MENTA, color: MORADO, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 26, whiteSpace: 'nowrap', boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>{etiqueta}</div>
      )}
    </div>
  );
};

const Burbuja = ({ x, y, quien, yo, children }: { x: number; y: number; quien: string; yo?: boolean; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 400, padding: '20px 26px', borderRadius: yo ? '30px 30px 8px 30px' : '30px 30px 30px 8px', background: yo ? MENTA : '#ffffff', color: yo ? MORADO : NEGRO, boxShadow: '0 24px 50px rgba(0,0,0,0.45)' }}>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 700, fontSize: 22, opacity: 0.55, marginBottom: 4 }}>{quien}</div>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 30, lineHeight: 1.25 }}>{children}</div>
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

// ---------- camino de luz: un solo recorrido a lo largo de todas las láminas ----------
const yCamino = (x: number) => 1060 + 120 * Math.sin(x / 560) + 50 * Math.sin(x / 230 + 1.3);
const Camino = ({ n, tema }: { n: number; tema: Tema }) => {
  const x0 = (n - 1) * W;
  const pts: string[] = [];
  for (let x = x0 - 40; x <= x0 + W + 40; x += 12) pts.push(`${x - x0} ${yCamino(x)}`);
  const d = 'M' + pts.join(' L');
  const color = claro(tema) ? MORADO : MENTA;
  const pasos = [];
  for (let x = Math.ceil((x0 - 40) / 70) * 70; x <= x0 + W + 40; x += 70) pasos.push(x);
  return (
    <svg width={W} height={1350} style={{ position: 'absolute', inset: 0 }}>
      <path d={d} stroke={color} strokeOpacity={0.35} strokeWidth={18} fill="none" style={{ filter: 'blur(10px)' }} />
      <path d={d} stroke={color} strokeOpacity={0.8} strokeWidth={3} fill="none" />
      {pasos.map((x) => (
        <circle key={x} cx={x - x0} cy={yCamino(x)} r={5} fill={color} opacity={0.9} />
      ))}
    </svg>
  );
};
