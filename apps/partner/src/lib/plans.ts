import { type BusinessPlan } from '@/lib/supabase';

export const WHATSAPP_NUMBER = '59162714286';

export const PAYMENT_QR: Partial<Record<BusinessPlan, { image: string; amount: string }>> = {
  paso_firme: { image: '/payment/qr-paso-firme.jpg', amount: 'Bs 99' },
  paso_adelante: { image: '/payment/qr-paso-adelante.webp', amount: 'Bs 299' },
};

export function whatsappLink(planName: string, amount: string) {
  const text = `Hola! Soy dueño de un comercio en Camina y quiero pasar al plan ${planName} (${amount}). Te mando el comprobante de la transferencia.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const LANZAMIENTO = 'Precio de lanzamiento';
export const LANZAMIENTO_NOTA = 'Después costará más.';

export function fundadorLink(nombreComercio?: string) {
  const quien = nombreComercio ? `Soy ${nombreComercio} y quiero` : 'Quiero';
  const text = `Hola! ${quien} pedir mi cupo fundador de Camina (3 meses gratis de Paso Firme desde que salga la app). Ya creé mi perfil, ¿me habilitan?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const PLANS: {
  id: BusinessPlan;
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
}[] = [
  {
    id: 'primer_paso',
    name: 'Primer Paso',
    price: 'Gratis',
    blurb: 'Empieza a recibir clientes sin costo fijo.',
    features: [
      'Apareces en el mapa y tu categoría',
      '1 premio gratis y, con él, 1 descuento',
      'Mínimo 3 cupones por día',
      'Sin estadísticas',
    ],
  },
  {
    id: 'paso_firme',
    name: 'Paso Firme',
    price: 'Bs 99/mes',
    blurb: 'Combina regalos y descuentos, sin límite.',
    features: [
      'Todo lo de Primer Paso',
      'Puedes combinar regalo y descuento',
      'Cupones ilimitados',
      'Varios beneficios a la vez',
      'Estadísticas básicas',
      'Tarjeta de fidelidad Camina: tu premio entre las opciones de todos los clientes',
    ],
    featured: true,
  },
  {
    id: 'paso_adelante',
    name: 'Paso Adelante',
    price: 'Bs 299/mes',
    blurb: 'Sé la primera opción de tu zona.',
    features: [
      'Todo lo de Paso Firme',
      'Pin destacado en el mapa',
      'Primero en tu categoría',
      'Notificaciones push a usuarios cerca',
      'Difusión de tu local en las redes de Camina',
      'Tarjeta de fidelidad Camina: tu premio entre las opciones de todos los clientes',
      'Elegible para videos publicitarios con una agencia de marketing para promocionar tu local y Camina',
    ],
  },
];


// Qué significa cada beneficio, en una línea simple (se muestra debajo de cada uno en la web y en el panel).
export const PLAN_EXPLICA: Record<string, string> = {
  'Apareces en el mapa y tu categoría': 'Te encuentran en el mapa de la app.',
  '1 premio gratis y, con él, 1 descuento': 'Un premio gratis y un descuento.',
  'Mínimo 3 cupones por día': 'Al menos 3 canjes por día.',
  'Sin estadísticas': 'No ves números en el panel.',
  'Todo lo de Primer Paso': 'Mapa, premio y descuento.',
  'Puedes combinar regalo y descuento': 'Premios y descuentos al mismo tiempo.',
  'Cupones ilimitados': 'Sin tope de canjes por día.',
  'Varios beneficios a la vez': 'Varios premios activos juntos.',
  'Estadísticas básicas': 'Ves tus canjes y tu mes.',
  'Tarjeta de fidelidad Camina: tu premio entre las opciones de todos los clientes': 'Clientes de otros locales pueden elegir tu premio.',
  'Todo lo de Paso Firme': 'Todo lo del plan anterior.',
  'Pin destacado en el mapa': 'Tu pin, más grande y dorado.',
  'Primero en tu categoría': 'Sales arriba al buscar tu rubro.',
  'Notificaciones push a usuarios cerca': 'Avisamos a la gente que está cerca.',
  'Difusión de tu local en las redes de Camina': 'Te publicamos en nuestras redes.',
  'Elegible para videos publicitarios con una agencia de marketing para promocionar tu local y Camina': 'Puedes salir en un video de una agencia.',
};

export const PLAN_NOMBRE: Record<BusinessPlan, string> = {
  primer_paso: 'Primer Paso',
  paso_firme: 'Paso Firme',
  paso_adelante: 'Paso Adelante',
};

// Próxima fecha de pago de un plan pago: el mismo día de cada mes desde que empezó el plan.
// Para los fundadores, la fecha en que terminan sus meses gratis (null mientras la app no haya salido).
export function vencimientoPlan(b: {
  plan: BusinessPlan;
  plan_started_at: string;
  founder?: boolean;
  founder_until?: string | null;
}): { fecha: Date | null; dias: number; gratis: boolean } | null {
  if (b.plan === 'primer_paso') return null;
  // Fundador sin fecha: los 3 meses gratis empiezan cuando salga la app.
  if (b.founder && !b.founder_until) return { fecha: null, dias: 0, gratis: true };
  const ahora = new Date();
  const dia = 24 * 3600 * 1000;
  if (b.founder && b.founder_until && new Date(b.founder_until) > ahora) {
    const fecha = new Date(b.founder_until);
    return { fecha, dias: Math.ceil((fecha.getTime() - ahora.getTime()) / dia), gratis: true };
  }
  const inicio = new Date(b.plan_started_at);
  if (isNaN(inicio.getTime())) return null;
  const fecha = new Date(inicio);
  let meses = 1;
  fecha.setMonth(inicio.getMonth() + meses);
  while (fecha <= ahora && meses < 600) {
    meses++;
    fecha.setTime(inicio.getTime());
    fecha.setMonth(inicio.getMonth() + meses);
  }
  return { fecha, dias: Math.ceil((fecha.getTime() - ahora.getTime()) / dia), gratis: false };
}

export function fechaCorta(d: Date) {
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' });
}
