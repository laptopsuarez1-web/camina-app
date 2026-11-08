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
  'Comida criolla',
  'Parrilla & Asados',
  'Pollería',
  'Salteñería & Empanadas',
  'Comida rápida',
  'Comida mexicana',
  'Comida china & oriental',
  'Pastas & Italiana',
  'Mariscos & Pescados',
  'Food truck',
  'Helados',
  'Bar & Vinos',
  'Bar',
  'Pub & Cervecería',
  'Coctelería',
  'Karaoke',
  'Discoteca',
  'Peña & Música en vivo',
  'Licorería',
  'Kiosco',
  'Heladería & Postres',
  'Chocolatería & Dulces',
  'Frutería & Verdulería',
  'Minimarket',
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
  'Crossfit & Funcional',
  'Danza & Baile',
  'Artes marciales',
  'Natación',
  'Psicología & Terapias',
  'Odontología',
  'Consultorio médico',
  'Bienestar',
  'Cultura',
  'Cine',
  'Entretenimiento',
  'Mascotas',
  'Veterinaria',
  'Juguetería',
  'Artesanías & Souvenirs',
  'Calzado',
  'Deportes & Bicicletas',
  'Fotografía & Imprenta',
  'Hotel & Hospedaje',
  'Turismo & Viajes',
  'Clases & Cursos',
  'Idiomas',
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


// "Lo que ofreces": opciones para que la app encuentre el local en el buscador. No se muestran todas: el local
// escribe en el buscador del panel y elige de las que coinciden. Hasta 12.
export const MAX_PALABRAS = 12;
export const SUGERENCIAS = [
  // Bebidas
  'Batidos', 'Jugos naturales', 'Smoothies', 'Licuados', 'Limonadas', 'Café', 'Café de especialidad', 'Capuchino', 'Té', 'Mates',
  'Chocolate caliente', 'Api', 'Mocochinchi', 'Refrescos', 'Cerveza', 'Cerveza artesanal', 'Vinos', 'Singani', 'Cócteles', 'Tragos',
  'Chuflay', 'Happy hour', 'Sin alcohol',
  // Comidas
  'Desayunos', 'Almuerzos', 'Cenas', 'Menú del día', 'Almuerzo ejecutivo', 'Comida casera', 'Comida criolla', 'Saice', 'Picante de pollo',
  'Sopa de maní', 'Chicharrón', 'Salteñas', 'Tucumanas', 'Empanadas', 'Cuñapés', 'Sonsos', 'Hamburguesas', 'Pizza', 'Pastas', 'Lasaña',
  'Pollo frito', 'Pollo a la brasa', 'Broaster', 'Alitas', 'Parrilla', 'Churrasco', 'Asado', 'Lomito', 'Sándwiches', 'Hot dogs', 'Panchos',
  'Salchipapas', 'Papas fritas', 'Tacos', 'Burritos', 'Sushi', 'Ramen', 'Comida china', 'Chifa', 'Pescado', 'Ceviche', 'Mariscos',
  'Ensaladas', 'Wraps', 'Bowls', 'Comida rápida', 'Picoteo', 'Tablas', 'Snacks',
  // Saludable
  'Saludable', 'Vegano', 'Vegetariano', 'Sin gluten', 'Sin azúcar', 'Keto', 'Proteínas', 'Granola', 'Açaí', 'Frutas', 'Orgánico',
  'Nutricionista', 'Plan de alimentación', 'Control de peso', 'Suplementos', 'Productos naturales',
  // Dulces y panadería
  'Postres', 'Tortas', 'Tortas personalizadas', 'Cupcakes', 'Galletas', 'Helados', 'Paletas', 'Gelatinas', 'Chocolates', 'Pan', 'Pan integral',
  'Medialunas', 'Masitas', 'Repostería', 'Facturas',
  // Belleza y cuidado
  'Corte de cabello', 'Barba', 'Peinados', 'Tintes', 'Alisado', 'Manicura', 'Pedicura', 'Uñas acrílicas', 'Uñas de gel', 'Pestañas', 'Cejas',
  'Depilación', 'Maquillaje', 'Limpieza facial', 'Masajes', 'Masajes relajantes', 'Spa', 'Sauna', 'Tatuajes', 'Piercing',
  // Movimiento y salud
  'Gimnasio', 'Clases grupales', 'Entrenador personal', 'Crossfit', 'Funcional', 'Yoga', 'Pilates', 'Zumba', 'Baile', 'Danza', 'Spinning',
  'Box', 'Artes marciales', 'Natación', 'Fútbol', 'Pádel', 'Running', 'Fisioterapia', 'Kinesiología', 'Psicología', 'Odontología',
  // Salidas
  'Música en vivo', 'Karaoke', 'Peña', 'Fiestas', 'Eventos', 'Cumpleaños', 'Juegos de mesa', 'Billar', 'Futbolito', 'Terraza',
  'Pet friendly', 'Para niños', 'WiFi', 'Para trabajar', 'Vista a la ciudad',
  // Compras y servicios
  'Delivery', 'Para llevar', 'Pedidos por WhatsApp', 'Regalos', 'Flores', 'Plantas', 'Libros', 'Papelería', 'Ropa', 'Ropa deportiva',
  'Zapatillas', 'Accesorios', 'Artesanías', 'Souvenirs', 'Juguetes', 'Para mascotas', 'Veterinaria', 'Bicicletas', 'Fotografía',
  'Impresiones', 'Clases', 'Cursos', 'Idiomas', 'Hospedaje', 'Tours',
];

// Quita tildes y mayúsculas para buscar ("cafe" encuentra "Café").
export function sinTildes(t: string) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
