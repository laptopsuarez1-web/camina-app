// Contenido de la portada (caminaapp.com). Todo sale de reglas y datos reales de Camina:
// README del monorepo, términos (LegalContent), docs/marketing/BRIEF-CONTENIDO.md y la portada anterior.
// No agregar cifras, comercios, premios ni testimonios que no estén confirmados.
import { WHATSAPP_NUMBER } from '@/lib/plans';

// Comercios y premios tal como se ven en la app oficial (pantalla Canjes y fichas, 18 de noviembre de 2026).
// Si un dato no se ve en la app (por ejemplo, el detalle de un premio), no se pone.
export type Premio = { nombre: string; detalle?: string; puntos: number };
export type Local = { id: string; nombre: string; categoria: string; direccion: string; logo: string; portada?: string; premios: Premio[] };
const L = (n: string) => `/web/locales/${n}.jpg`;
export const LOCALES: Local[] = [
  {
    id: 'bloom',
    nombre: 'Bloom',
    categoria: 'Belleza',
    direccion: 'Ramón Rojas entre Madrid e Ingavi',
    logo: L('bloom-logo'),
    portada: L('bloom-cover'),
    premios: [
      { nombre: 'Retirado de gel / acrílico', detalle: 'Gratis', puntos: 35 },
      { nombre: 'Manicura o pedicura tradicional', detalle: '20 Bs de descuento', puntos: 50 },
      { nombre: 'Diseño y perfilado de cejas', detalle: '25% de descuento', puntos: 25 },
    ],
  },
  {
    id: 'fripaps',
    nombre: "Fripap's",
    categoria: 'Gastronomía',
    direccion: 'Calle Virginio Lema casi Suipacha',
    logo: L('fripaps-logo'),
    portada: L('fripaps-cover'),
    premios: [
      { nombre: 'Salchipapa', detalle: '20% de descuento', puntos: 25 },
    ],
  },
  {
    id: 'coco',
    nombre: 'Coco Barber',
    categoria: 'Barbería',
    direccion: 'Ramón Rojas esquina La Madrid',
    logo: L('coco-logo'),
    portada: L('coco-cover'),
    premios: [
      { nombre: 'Lavado de cabello', puntos: 30 },
      { nombre: 'Corte de cabello', puntos: 25 },
    ],
  },
  {
    id: 'cancheritos',
    nombre: 'Cancheritos F.C',
    categoria: 'Gimnasio y deporte',
    direccion: 'Cancha García Agreda',
    logo: L('cancheritos-logo'),
    portada: L('cancheritos-cover'),
    premios: [{ nombre: 'Clase', detalle: 'Gratis', puntos: 10 }],
  },
  {
    id: 'viviana',
    nombre: 'Viviana',
    categoria: 'Estética y belleza',
    direccion: 'Federico Ávila 644',
    logo: L('viviana-logo'),
    premios: [{ nombre: 'Lavado y planchado', puntos: 150 }],
  },
  { id: 'galera', nombre: 'Salteñería La Galera', categoria: 'Salteñas y empanadas', direccion: 'Avenida La Paz', logo: L('galera-logo'), premios: [] },
  { id: 'sabor', nombre: 'Sabor y Vida', categoria: 'Restaurante', direccion: 'Calle Suipacha', logo: L('sabor-logo'), premios: [] },
  { id: 'luzdevida', nombre: 'Fisioterapia Luz de Vida', categoria: 'Fisioterapia', direccion: 'Calle San Roque', logo: L('luzdevida-logo'), premios: [] },
];

export const CONTACTO = {
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
  whatsappTexto: '+591 627 14286',
  email: 'hola@caminaapp.com',
  instagram: 'https://www.instagram.com/caminaapp',
  instagramTexto: '@caminaapp',
};

// Estado de salida en las tiendas. La fecha no está confirmada: no se publica ninguna.
export const SALIDA = 'Muy pronto en App Store y Google Play';

// Enlaces externos de la portada: siempre a destinos que existen.
export const RUTAS = { comercios: '/comercios', registro: '/registro', login: '/login', guia: '/guia', terminos: '/terminos', privacidad: '/privacidad', eliminar: '/eliminar-cuenta' };

// Hasta que las tiendas aprueben la app, los botones de descarga se muestran como "Próximamente" (sin link).
// Cuando haya link público de la tienda, poner la URL aquí y el botón pasa a ser un enlace real.
export const TIENDAS: { nombre: 'App Store' | 'Google Play'; url: string | null }[] = [
  { nombre: 'App Store', url: null },
  { nombre: 'Google Play', url: null },
];

export const EMAIL_AVISAME = `mailto:${CONTACTO.email}?subject=${encodeURIComponent('Avísenme cuando Camina esté disponible')}&body=${encodeURIComponent('Hola! Quiero que me avisen por correo cuando Camina esté disponible en la tienda de mi celular.')}`;

// Capturas reales de la app (modo oscuro, como en todo el material de Camina).
const C = (n: string) => `/web/cap/${n}.jpg`;
export const CAP = {
  inicio: C('inicio-dark'),
  inicioClaro: C('inicio'),
  actividad: C('actividad-dark'),
  puntos: C('puntos-nuevo-dark'),
  // Capturas nuevas de la app oficial (noviembre 2026), con la barra de estado limpia.
  mapa: '/web/app/mapa-comercios.jpg',
  premiosFripaps: '/web/app/premios-fripaps.jpg',
  canjes: '/web/app/canjes.jpg',
  fichaLocal: '/web/app/ficha-fripaps.jpg',
  calificar: C('canje-calificar-v3-dark'),
  compartir: C('canje-historia-v3-dark'),
  perfil: C('perfil-insignias-dark'),
  ranking: C('ranking-nuevo-dark'),
  retos: C('retos-dark'),
  desafios: C('desafios-dark'),
  rachas: C('rachas-dark'),
  insignias: C('insignias-dark'),
  grupo: C('grupo-v4-dark'),
  eventos: C('eventos-dark'),
  rutaEvento: C('eventos-ruta-nov-dark'),
  rutaMapa: C('ruta-mapa-nov-dark'),
};

// Grabación de la app oficial: Ruta de noviembre, los 3 locales, el recorrido a pie y la ficha del local.
export const VID_RUTA = { poster: '/web/app/ruta-app.jpg', src: '/web/app/ruta-app.mp4' };
// Grabación de la app oficial: la Tarjeta de fidelidad llenando sus sellos.
export const VID_TARJETA = { poster: '/web/app/tarjeta-app.jpg', src: '/web/app/tarjeta-app.mp4' };

// Cómo funciona: 4 momentos, cada uno con su pantalla real.
export const ETAPAS = [
  {
    n: '01',
    t: 'Camina como siempre.',
    d: 'Al trabajo, a clases, a la plaza. La app cuenta tus pasos sola, desde Salud en iPhone o Health Connect en Android.',
    dato: 'Sin gimnasio, sin equipo y sin pagar nada',
    img: CAP.actividad,
    alt: 'Pantalla Actividad de Camina con los pasos de la semana',
  },
  {
    n: '02',
    t: 'Tus pasos se vuelven Puntos.',
    d: 'Cada 1.000 pasos ganas 1 Punto. Abre la app cada día y los pasos de ese día suman.',
    dato: 'Hasta 20 Puntos por día; duran 90 días',
    img: CAP.puntos,
    alt: 'Pantalla Tus Puntos de Camina con el saldo y los movimientos',
  },
  {
    n: '03',
    t: 'Encuentra tu premio.',
    d: 'En el mapa ves los comercios cerca de ti y lo que ofrece cada uno: descuentos y premios gratis.',
    dato: 'Comida, belleza, deporte y más',
    img: CAP.mapa,
    alt: 'Mapa de Camina con los comercios cercanos',
  },
  {
    n: '04',
    t: 'Canjéalo en el local.',
    d: 'Eliges el premio, vas al local y escribes su código en la app. El canje se confirma al instante.',
    dato: 'Puedes volver al mismo local cada 14 días',
    img: CAP.canjes,
    alt: 'Pantalla Canjes de Camina con los comercios y sus premios',
  },
] as const;

// Comunidad: cuatro funciones, cada una con su pantalla real.
export const COMUNIDAD = [
  {
    id: 'ranking',
    tab: 'Ranking',
    t: 'Mira dónde estás.',
    d: 'Tu puesto en todo Camina y entre tus amigos. El ranking se reinicia cada lunes: siempre hay revancha.',
    img: CAP.ranking,
    alt: 'Ranking semanal de Camina',
  },
  {
    id: 'grupos',
    tab: 'Grupos',
    t: 'Camina con tu gente.',
    d: 'Arma un grupo con amigos, familia o compañeros. Tienen meta de la semana, podio y chat.',
    img: CAP.grupo,
    alt: 'Grupo de Camina con podio y meta de la semana',
  },
  {
    id: 'rachas',
    tab: 'Rachas',
    t: 'No cortes la racha.',
    d: 'Cada día seguido con 5.000 pasos o más suma a tu racha, y tus Retos Camina te dan Puntos extra.',
    img: CAP.rachas,
    alt: 'Pantalla de rachas en Camina',
  },
  {
    id: 'insignias',
    tab: 'Insignias',
    t: 'Tus locales favoritos, en tu perfil.',
    d: 'Cada canje te sube de nivel en ese local: Visitante, Habitual y Fan. Eliges hasta 5 insignias para mostrar.',
    img: '/web/app/insignias-app.jpg',
    alt: 'Pantalla Mis insignias de Camina',
  },
] as const;

export const RUTA_PREMIOS = [
  ['x2', 'Día doble', 'Eliges un día del mes siguiente en que tus pasos valen el doble.'],
  ['badge', 'Insignia del mes', 'La de esa Ruta, para tu perfil.'],
  ['ticket', 'Boleto al sorteo', 'Entras al sorteo exclusivo del mes.'],
] as const;

export const DUDAS = [
  ['¿Tengo que pagar algo?', 'No. Camina es gratis para todos y no te pedimos datos de pago.'],
  ['¿Necesito ir al gimnasio?', 'No. Cuentan los pasos de tu día: al trabajo, a la tienda, a la plaza.'],
  [
    '¿Cómo cuenta mis pasos?',
    'Camina lee tus pasos desde Salud en iPhone o Health Connect en Android, y te pide permiso la primera vez. Abre la app cada día: solo los pasos de los días en que la abres suman Puntos (los demás se ven en Actividad, pero no suman). Los pasos escritos a mano no cuentan.',
  ],
  ['¿Dónde canjeo mis Puntos?', 'En los comercios que ves en el mapa de la app. Eliges el premio, vas al local y escribes su código.'],
  [
    '¿Qué es la Ruta del mes?',
    'Un evento mensual en la pestaña Eventos: tocas Participar y te tocan 3 locales sorpresa. Los visitas en el orden que quieras y compras lo que quieras (no se usan Puntos ni descuentos). Al completar los 3 ganas un Día doble, la insignia del mes y un boleto para el sorteo del mes.',
  ],
  [
    '¿Cómo cuenta una visita de la Ruta?',
    'Al pagar, escribes en la app el código del local (el mismo de los canjes), estando ahí. El local confirma desde su panel que compraste y la visita se suma a tu Ruta.',
  ],
] as const;
