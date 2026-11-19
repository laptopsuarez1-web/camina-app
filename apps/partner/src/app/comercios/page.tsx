import type { Metadata } from 'next';
import ComerciosHome from '@/components/home/comercios/ComerciosHome';

export const metadata: Metadata = {
  title: 'Camina para comercios — Tus próximos clientes ya están caminando',
  description: 'Suma tu comercio a Camina: aparece en el mapa, elige tu descuento o regalo y recibe personas que ya van caminando por tu zona.',
  openGraph: {
    title: 'Camina para comercios',
    description: 'Suma tu comercio y recibe clientes que ya van caminando.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function Page() {
  return <ComerciosHome />;
}
