import type { Metadata } from 'next';
import ComerciosPage from '@/components/landing/ComerciosPage';

export const metadata: Metadata = {
  title: 'Camina para comercios — Tus próximos clientes ya están caminando',
  description: 'Sumá tu comercio gratis a Camina: aparecé en el mapa, elegí tu premio y recibí personas que ya van caminando por tu barrio.',
  openGraph: {
    title: 'Camina para comercios',
    description: 'Sumá tu comercio gratis y recibí clientes que ya van caminando.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function Page() {
  return <ComerciosPage />;
}
