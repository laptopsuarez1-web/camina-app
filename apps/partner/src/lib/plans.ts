import { type BusinessPlan } from '@/lib/supabase';

export const WHATSAPP_NUMBER = '59162714286';

export const PAYMENT_QR: Partial<Record<BusinessPlan, { image: string; amount: string }>> = {
  paso_firme: { image: '/payment/qr-paso-firme.jpg', amount: 'Bs 100' },
  paso_adelante: { image: '/payment/qr-paso-adelante.webp', amount: 'Bs 300' },
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
    blurb: 'Empezá a recibir clientes sin costo fijo.',
    features: [
      'Aparecés en el mapa y tu categoría',
      '1 premio gratis y, con él, 1 descuento',
      'Mínimo 3 cupones por día',
      'Sin estadísticas',
    ],
  },
  {
    id: 'paso_firme',
    name: 'Paso Firme',
    price: 'Bs 100/mes',
    blurb: 'Combiná regalos y descuentos, sin límite.',
    features: [
      'Todo lo de Primer Paso',
      'Podés combinar regalo y descuento',
      'Cupones ilimitados',
      'Varios beneficios a la vez',
      'Estadísticas básicas',
      'Tarjeta de fidelidad: premio por 5 canjes en tu local',
    ],
    featured: true,
  },
  {
    id: 'paso_adelante',
    name: 'Paso Adelante',
    price: 'Bs 300/mes',
    blurb: 'Sé la primera opción de tu zona.',
    features: [
      'Todo lo de Paso Firme',
      'Pin destacado en el mapa',
      'Primero en tu categoría',
      'Notificaciones push a usuarios cerca',
      'Difusión de tu local en las redes de Camina',
      'Tarjeta de fidelidad: premio por 5 canjes en tu local',
      'Elegible para videos publicitarios con una agencia de marketing para promocionar tu local y Camina',
    ],
  },
];


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
