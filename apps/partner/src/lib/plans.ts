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
      '1 solo beneficio activo, 100% gratis',
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
    ],
  },
];

