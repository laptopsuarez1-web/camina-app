// Categorías que puede elegir un comercio en el panel. En la app solo aparecen, como filtro,
// las categorías que tienen al menos un comercio, así que no hay filtros vacíos.
export const CATEGORIAS = [
  'Café',
  'Panadería',
  'Burgers',
  'Sándwiches',
  'Pizza',
  'Sushi',
  'Restaurante',
  'Helados',
  'Bar & Vinos',
  'Kiosco',
  'Dietética & Saludable',
  'Estética & Belleza',
  'Barbería',
  'Peluquería',
  'Uñas & Spa',
  'Farmacias',
  'Yoga & Pilates',
  'Gimnasio & Deporte',
  'Bienestar',
  'Cultura',
  'Cine',
  'Entretenimiento',
  'Mascotas',
  'Tecnología',
  'Ropa & Accesorios',
  'Tienda Online',
  'Plantas & Flores',
  'Óptica',
  'Librería & Papelería',
  'Joyería & Relojería',
  'Lavandería',
  'Otros',
];

// Un comercio que ya existía puede tener una categoría vieja (Gastronomía, Fitness…): se conserva
// en la lista mientras la tenga, para que el selector no la cambie sin avisar.
export function opcionesCategoria(actual?: string | null) {
  return actual && !CATEGORIAS.includes(actual) ? [actual, ...CATEGORIAS] : CATEGORIAS;
}
