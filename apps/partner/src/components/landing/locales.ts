// Datos reales de los primeros comercios (Tarija), tomados de la base de Camina el 2026-10-17.
// La página es estática: si cambia un premio o sus puntos en el panel, hay que actualizar acá.
export type Premio = { nombre: string; detalle: string; puntos: number };
export type Local = {
  id: 'bloom' | 'coco' | 'fripaps';
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
      { nombre: 'Manicura o pedicura tradicional', detalle: '20 Bs de descuento', puntos: 40 },
      { nombre: 'Diseño y perfilado de cejas', detalle: '25% de descuento', puntos: 20 },
      { nombre: 'Retirado de gel / acrílico', detalle: 'Gratis', puntos: 40 },
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
      { nombre: 'Corte de cabello', detalle: '20% de descuento', puntos: 20 },
      { nombre: 'Lavado de cabello', detalle: 'Gratis', puntos: 20 },
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
      { nombre: 'Salchipapa', detalle: '20% de descuento', puntos: 20 },
      { nombre: 'Panchito', detalle: 'Gratis', puntos: 30 },
    ],
  },
];
