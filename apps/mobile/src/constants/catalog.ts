// Portado 1:1 del prototipo camina-full.html.
export const ZONES = [
  'Centro',
  'Aranjuez',
  'San Jorge',
  'El Molino',
  'Guadalquivir',
  'La Tablada',
  'San Roque',
  'Otro',
] as const;

export const INTERESTS_OPTIONS = [
  ['Café', 'coffee'],
  ['Gastronomía', 'utensils'],
  ['Entretenimiento', 'film'],
  ['Fitness', 'dumbbell'],
  ['Compras', 'bag'],
  ['Belleza', 'scissors'],
  ['Tecnología', 'camera'],
  ['Eventos', 'calendar'],
] as const;

export const CATEGORIES = [
  { id: 'Todos', label: 'Todos' },
  { id: 'Café', label: 'Café' },
  { id: 'Gastronomía', label: 'Comida' },
  { id: 'Fitness', label: 'Fitness' },
  { id: 'Belleza', label: 'Belleza' },
  { id: 'Entretenimiento', label: 'Entretenimiento' },
] as const;
