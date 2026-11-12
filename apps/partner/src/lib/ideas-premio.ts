// Ideas de premio por rubro: al crear un premio, el local toca una y se llenan el nombre, cómo lo ofrece y los Puntos.
// Los Puntos siguen la guía del panel (unos 2,5 Puntos por cada Bs que vale lo que se regala); el local los cambia si quiere.

export type IdeaPremio = {
  nombre: string;
  modo: 'gratis' | 'regalo' | 'descuento';
  // Regalo con compra: cómo empieza la frase y el resto («llevando» + «una hamburguesa»).
  regalo?: { inicio: string; resto: string };
  // Descuento: un porcentaje o 2x1.
  porcentaje?: number;
  dosxuno?: boolean;
  puntos: number;
};

type Grupo = { rubros: RegExp; ideas: IdeaPremio[] };

const GRUPOS: Grupo[] = [
  {
    rubros: /caf[eé]|brunch|desayuno|t[eé] &|panader|horneado|cuñap|repost|pastel|galleta|cupcake|torta/i,
    ideas: [
      { nombre: 'Café americano', modo: 'gratis', puntos: 25 },
      { nombre: 'Medialuna', modo: 'regalo', regalo: { inicio: 'con tu', resto: 'café' }, puntos: 10 },
      { nombre: 'Capuchino', modo: 'descuento', dosxuno: true, puntos: 35 },
    ],
  },
  {
    rubros: /helad|postre|chocolat|dulce|smoothie|a[çc]a[ií]|jug|batido/i,
    ideas: [
      { nombre: 'Bola de helado', modo: 'gratis', puntos: 20 },
      { nombre: 'Topping extra', modo: 'regalo', regalo: { inicio: 'con tu', resto: 'helado' }, puntos: 8 },
      { nombre: 'Conos', modo: 'descuento', dosxuno: true, puntos: 30 },
    ],
  },
  {
    rubros: /bar\b|bar |pub|cervec|cocteler|vino|singan|rooftop|tapas|karaoke|disco|peña|billar|licor/i,
    ideas: [
      { nombre: 'Bebida sin alcohol', modo: 'gratis', puntos: 20 },
      { nombre: 'Porción de papas', modo: 'regalo', regalo: { inicio: 'si pides', resto: 'una tabla' }, puntos: 12 },
      { nombre: 'Tablas para compartir', modo: 'descuento', dosxuno: true, puntos: 45 },
    ],
  },
  {
    rubros: /barber|peluquer|est[eé]tica|belleza|uñas|spa|masaje/i,
    ideas: [
      { nombre: 'Lavado de cabello', modo: 'regalo', regalo: { inicio: 'con tu', resto: 'corte' }, puntos: 12 },
      { nombre: 'Corte de cabello', modo: 'descuento', porcentaje: 20, puntos: 25 },
      { nombre: 'Diseño de cejas', modo: 'gratis', puntos: 30 },
    ],
  },
  {
    rubros: /gimnasio|deporte|yoga|pilates|crossfit|funcional|danza|baile|marcial|nataci/i,
    ideas: [
      { nombre: 'Clase de prueba', modo: 'gratis', puntos: 15 },
      { nombre: 'Primer mes', modo: 'descuento', porcentaje: 30, puntos: 40 },
      { nombre: 'Bebida isotónica', modo: 'regalo', regalo: { inicio: 'al comprar', resto: 'tu mensualidad' }, puntos: 8 },
    ],
  },
  {
    rubros: /nutricion|fisioter|psicolog|terapia|odontolog|m[eé]dic|[oó]ptica|bienestar|veterinar/i,
    ideas: [
      { nombre: 'Primera consulta', modo: 'descuento', porcentaje: 30, puntos: 30 },
      { nombre: 'Evaluación inicial', modo: 'gratis', puntos: 25 },
    ],
  },
  {
    // Comida en general (va al final: muchos rubros de comida no dicen "comida" en el nombre).
    rubros: /comida|burger|s[aá]ndwich|lomito|pizz|sushi|ramen|restaur|criolla|parrilla|asado|churrasq|poll|broaster|alita|salteñ|empanada|tucuman|food|hot dog|salchipapa|taco|burrito|almuerzo|men[uú]|pensi[oó]n|ceviche|picanter|rotiser|catering|gastronom/i,
    ideas: [
      { nombre: 'Gaseosa personal', modo: 'gratis', puntos: 12 },
      { nombre: 'Papas pequeñas', modo: 'regalo', regalo: { inicio: 'llevando', resto: 'un combo' }, puntos: 10 },
      { nombre: 'Plato del día', modo: 'descuento', porcentaje: 15, puntos: 20 },
      { nombre: 'Hamburguesa clásica', modo: 'descuento', dosxuno: true, puntos: 40 },
    ],
  },
];

const GENERAL: IdeaPremio[] = [
  { nombre: 'Tu compra', modo: 'descuento', porcentaje: 10, puntos: 20 },
  { nombre: 'Regalo sorpresa', modo: 'regalo', regalo: { inicio: 'al comprar', resto: 'cualquier producto' }, puntos: 10 },
  { nombre: 'Segundo producto', modo: 'descuento', dosxuno: true, puntos: 35 },
];

export function ideasParaRubro(categoria?: string | null): IdeaPremio[] {
  const c = categoria ?? '';
  return GRUPOS.find((g) => g.rubros.test(c))?.ideas ?? GENERAL;
}

// Cómo se lee la idea en el botón: «Café americano · Gratis · 25 Puntos».
export function etiquetaIdea(i: IdeaPremio): string {
  const como = i.modo === 'gratis' ? 'Gratis' : i.modo === 'regalo' ? `De regalo ${i.regalo?.inicio} ${i.regalo?.resto}` : i.dosxuno ? '2x1' : `${i.porcentaje}% de descuento`;
  return `${i.nombre} · ${como} · ${i.puntos} Puntos`;
}
