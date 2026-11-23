// Datos del montaje de «¿Y si cada paso…?» (sin dependencias de Remotion: los usa también scripts/ysi_linea.ts
// para que la banda sonora sepa en qué cuadro cae cada corte y cada letra).
// Música: «Glassworks: IV. Rubric» (Philip Glass, interpretada por Signal; usada con permiso) a 94,65 BPM.
// Cada toma dura 1 tiempo (≈ 19 cuadros); los cortes se redondean a cuadros enteros sin acumular desfase.
const TIEMPO = (30 * 60) / 94.646; // cuadros por tiempo
const T = TIEMPO; // una unidad de montaje = 1 tiempo

// Palabra: posición relativa (x, y), tamaño, y cuadro en que aparece dentro de la toma.
export type Palabra = { t: string; x: number; y: number; size?: number; en?: number; verde?: boolean; efecto?: 'juntar' | 'crecer' };
export type Medio = { tipo: 'video' | 'foto' | 'app'; src: string; desde?: number; origen?: string };
export type Toma = {
  medio?: Medio;
  rafaga?: Medio[]; // varias imágenes seguidas, `cada` cuadros cada una
  cada?: number;
  inicio?: boolean; // Inicio de la app en vivo (el aro se completa)
  dur?: number; // en tiempos
  palabras?: Palabra[];
  leyenda?: string;
};

const vid = (src: string, desde = 0): Medio => ({ tipo: 'video', src: `yasi/v/${src}.mp4`, desde });
const foto = (src: string, origen = 'center'): Medio => ({ tipo: 'foto', src: `yasi/f/${src}`, origen });
const app = (src: string): Medio => ({ tipo: 'app', src: src.includes('/') ? src : `yasi/app/${src}.jpg` });
const P = (t: string, x: number, y: number, size = 118, en = 0, verde = false): Palabra => ({ t, x, y, size: size >= 200 ? size : Math.round(size * 0.82), en, verde })  // palabras chicas y elegantes; las clave, grandes;

export const TOMAS: Toma[] = [
  // ¿Cuántos pasos das por día?
  { medio: vid('parque-camino'), palabras: [P('¿Cuántos', 0.3, 0.3, 124), P('pasos', 0.62, 0.62, 124, 5)], dur: 1 },
  { medio: vid('t-palmeras'), palabras: [P('das', 0.72, 0.42, 150)], dur: 1 },
  { medio: vid('m32616'), palabras: [P('por', 0.25, 0.58, 118), P('día?', 0.58, 0.66, 160, 5)], dur: 1 },
  { medio: vid('plaza-palomas'), leyenda: 'Plaza-Luis-de-Fuentes · Tarija', dur: 1 },
  // ¿Y si cada uno contara?
  { medio: vid('m14766'), palabras: [P('¿Y si', 0.32, 0.36, 130)], dur: 1 },
  { medio: vid('m40765'), palabras: [P('cada', 0.3, 0.58, 124), P('uno', 0.66, 0.66, 124, 5)], dur: 1 },
  { medio: vid('m609'), palabras: [{ ...P('contara?', 0.5, 0.45, 250, 0, true), efecto: 'juntar' }], dur: 1 },
  { rafaga: [app('inicio-dark'), app('actividad-dark'), app('rachas-dark'), app('ranking-nuevo-dark')], cada: 5, dur: 1 },
  // ¿Y si caminar te llevara más lejos? — Bolivia: La Paz y Santa Cruz
  { medio: foto('lp-illimani.jpg'), palabras: [P('¿Y si', 0.28, 0.24, 130)], leyenda: 'Illimani · La-Paz', dur: 1 },
  { medio: foto('isla-del-sol-camino.jpg'), palabras: [P('caminar', 0.55, 0.36, 150)], leyenda: 'Isla-del-Sol · Lago-Titicaca', dur: 1 },
  { medio: foto('sc-catedral.jpg', '50% center'), palabras: [P('te', 0.22, 0.3, 124), P('llevara', 0.6, 0.38, 124, 5)], leyenda: 'Santa-Cruz-de-la-Sierra', dur: 1 },
  { medio: foto('tiwanaku-puerta-del-sol.jpg'), palabras: [P('más', 0.7, 0.3, 150)], leyenda: 'Tiwanaku · La-Paz', dur: 1 },
  { medio: foto('titicaca-terrazas.jpg'), palabras: [{ ...P('lejos?', 0.5, 0.42, 250, 0, true), efecto: 'crecer' }], dur: 1 },
  { rafaga: [foto('lp-noche.jpg'), foto('sc-plaza-24.jpg')], cada: 10, dur: 1, leyenda: 'La-Paz · Santa-Cruz' },
  { medio: foto('banderas-bolivia.jpg'), leyenda: 'Bolivia', dur: 1 },
  // ¿Y si tu ciudad te lo devolviera? — Tarija
  { medio: vid('aerea'), palabras: [P('¿Y si', 0.3, 0.26, 130)], leyenda: 'Tarija', dur: 1 },
  { medio: vid('plaza-fuente-lado'), palabras: [P('tu', 0.22, 0.34, 150), P('ciudad', 0.6, 0.42, 150, 5)], leyenda: 'Plaza-principal · Tarija', dur: 1 },
  { medio: foto('chunchos-san-roque.jpg', '58% center'), palabras: [P('te lo', 0.66, 0.28, 140)], leyenda: 'Chunchos-de-San-Roque', dur: 1 },
  { medio: foto('san-roque-iglesia.jpg', 'center 30%'), palabras: [{ ...P('devolviera?', 0.5, 0.8, 170, 0, true), efecto: 'juntar' }], dur: 1 },
  {
    rafaga: [foto('t-glorieta.jpg'), foto('t-monumento-luis-de-fuentes.jpg'), foto('puente-aereo.jpg'), foto('vinedos.jpg'), foto('t-casa-dorada.jpg', 'center 40%'), foto('empanada-blanqueada.jpg'), foto('t-rueda-chapaca.jpg'), foto('t-plaza-luis-de-fuentes.jpg')],
    cada: 5,
    dur: 2,
    leyenda: 'Tarija',
  },
  { medio: vid('fuente'), leyenda: 'Plaza-Luis-de-Fuentes', dur: 1 },
  { medio: vid('monumento-suelo'), leyenda: 'Loma-de-San-Juan', dur: 1 },
  // En los locales de tu barrio
  { medio: foto('tarija-calle-plaza.jpg'), palabras: [P('En', 0.3, 0.3, 150)], leyenda: 'Centro · Tarija', dur: 1 },
  { medio: foto('mercado-central-tarija.jpg'), palabras: [P('los', 0.25, 0.25, 124), P('locales', 0.6, 0.33, 150, 5)], leyenda: 'Mercado-Central · Tarija', dur: 1 },
  { medio: foto('parque-bolivar-tarija.jpg'), palabras: [P('de tu', 0.5, 0.4, 140)], leyenda: 'Parque-Bolívar · Tarija', dur: 1 },
  { medio: vid('gente-plaza'), palabras: [{ ...P('ciudad', 0.5, 0.36, 250, 0, true), efecto: 'crecer' }], dur: 1 },
  // Cada paso cuenta — la app
  { inicio: true, palabras: [P('Cada', 0.5, 0.1, 160)], leyenda: '1.000-pasos = 1-Punto', dur: 1 },
  { medio: vid('app-ficha-mapa', 66), palabras: [P('paso', 0.72, 0.16, 150)], leyenda: 'Locales-en-el-mapa', dur: 2 },
  { rafaga: [app('ranking-nuevo-dark'), app('grupo-v4-dark'), app('ficha-galera-dark'), app('insignias-dark'), app('perfil-insignias-dark')], cada: 4, dur: 1 },
  { medio: vid('app-ruta-participar', 45), palabras: [{ ...P('cuenta', 0.5, 0.66, 230, 0, true), efecto: 'crecer' }], leyenda: 'Ruta-del-mes · Tarija', dur: 2 },
  { medio: vid('app-actividad'), leyenda: 'Tu-actividad', dur: 1 },
  { medio: vid('app-visita', 40), leyenda: 'Visita-confirmada', dur: 1 },
];

export const INTRO = Math.round(4 * TIEMPO); // 4 tiempos ≈ 76 cuadros
export const UNIDADES = TOMAS.reduce((s, x) => s + (x.dur ?? 1), 0);
export const MONTAJE = Math.round(INTRO + UNIDADES * T) - INTRO;
// la tarjeta dura 8 tiempos: el cierre (logo) entra en el tiempo 47 y el golpe final de Rubric cae en el 53
export const TARJETA = Math.round(INTRO + UNIDADES * T + 8 * TIEMPO) - INTRO - MONTAJE;
export const bordes: number[] = [];
TOMAS.reduce((u, x) => {
  bordes.push(Math.round(INTRO + u * T));
  return u + (x.dur ?? 1);
}, 0);
bordes.push(INTRO + MONTAJE);
export const CIERRE = 1050 - INTRO - MONTAJE - TARJETA;
export const DUR_YSI = 1050;
export const TIEMPOS_YSI = { INTRO, MONTAJE, TARJETA, CIERRE };
