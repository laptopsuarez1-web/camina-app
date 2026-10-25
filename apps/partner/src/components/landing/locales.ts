// Datos reales de los primeros comercios (Tarija), tomados de la base de Camina el 2026-10-17.
// Puntos ya con la regla de 2,5 puntos por Bs 1 (antes x1,25, redondeo hacia arriba).
// Un local sin premios cargados (premios: []) se muestra igual, solo con nombre, rubro y dirección.
// La página es estática: si cambia un premio o sus puntos en el panel, hay que actualizar acá.
export type Premio = { nombre: string; detalle: string; puntos: number };
export type Local = {
  id: 'bloom' | 'coco' | 'fripaps' | 'cancheritos';
  nombre: string;
  categoria: string;
  direccion: string;
  logo: string;
  portada: string;
  premios: Premio[];
};

export const LOCALES: Local[] = [
  {
    id: 'bloom',
    nombre: 'Bloom',
    categoria: 'Belleza',
    direccion: 'Ramón Rojas entre Madrid e Ingavi, Tarija',
    logo: '/web/locales/bloom-logo.jpg',
    portada: '/web/locales/bloom-cover.jpg',
    premios: [
      { nombre: 'Manicura o pedicura tradicional', detalle: '20 Bs de descuento', puntos: 50 },
      { nombre: 'Diseño y perfilado de cejas', detalle: '25% de descuento', puntos: 25 },
      { nombre: 'Retirado de gel / acrílico', detalle: 'Gratis', puntos: 50 },
    ],
  },
  {
    id: 'coco',
    nombre: 'Coco Barber',
    categoria: 'Barbería',
    direccion: 'Ramón Rojas esquina La Madrid, Tarija',
    logo: '/web/locales/coco-logo.jpg',
    portada: '/web/locales/coco-cover.jpg',
    premios: [
      { nombre: 'Corte de cabello', detalle: '20% de descuento', puntos: 25 },
      { nombre: 'Lavado de cabello', detalle: 'Gratis', puntos: 25 },
    ],
  },
  {
    id: 'fripaps',
    nombre: "Fripap's",
    categoria: 'Gastronomía',
    direccion: 'Calle Virginio Lema casi Suipacha, Tarija',
    logo: '/web/locales/fripaps-logo.jpg',
    portada: '/web/locales/fripaps-cover.jpg',
    premios: [
      { nombre: 'Salchipapa', detalle: '20% de descuento', puntos: 25 },
      { nombre: 'Panchito', detalle: 'Gratis', puntos: 38 },
    ],
  },
  {
    id: 'cancheritos',
    nombre: 'Cancheritos F.C',
    categoria: 'Deporte',
    direccion: 'Cancha García Agreda, Tarija',
    logo: '/web/locales/cancheritos-logo.jpg',
    portada: '/web/locales/cancheritos-cover.jpg',
    premios: [],
  },
];
