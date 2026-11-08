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
  'Batidos & Jugos',
  'Comida saludable',
  'Postres & Pastelería',
  'Nutricionista',
  'Estética & Belleza',
  'Barbería',
  'Peluquería',
  'Uñas & Spa',
  'Farmacias',
  'Yoga & Pilates',
  'Gimnasio & Deporte',
  'Masajes & Fisioterapia',
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

// Elegir "Otra" en el selector deja escribir la categoría a mano (se guarda lo que escriben).
export const OTRA = 'Otra (escríbela)';

// "Lo que ofreces": palabras sugeridas para que la app encuentre el local en el buscador. Son opcionales y el
// local puede escribir las suyas. Hasta 12.
export const MAX_PALABRAS = 12;
export const SUGERENCIAS = [
  'Batidos', 'Jugos naturales', 'Smoothies', 'Café de especialidad', 'Desayunos', 'Almuerzos', 'Menú del día',
  'Vegano', 'Vegetariano', 'Sin gluten', 'Saludable', 'Proteínas', 'Ensaladas', 'Postres', 'Tortas', 'Helados',
  'Salteñas', 'Empanadas', 'Hamburguesas', 'Pizza', 'Pollo', 'Parrilla', 'Comida rápida', 'Delivery',
  'Nutricionista', 'Plan de alimentación', 'Suplementos', 'Masajes', 'Manicura', 'Corte de cabello', 'Barba',
  'Depilación', 'Maquillaje', 'Clases', 'Yoga', 'Pilates', 'Para mascotas', 'Regalos', 'Flores', 'Libros',
];
