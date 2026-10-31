import type { Metadata } from 'next';
import ComerciosPage from '@/components/landing/ComerciosPage';

export const metadata: Metadata = {
  title: 'Camina para comercios — Tus próximos clientes ya están caminando',
  description: 'Suma tu comercio gratis a Camina: aparece en el mapa, elige tu premio y recibe personas que ya van caminando por tu zona.',
  openGraph: {
    title: 'Camina para comercios',
    description: 'Suma tu comercio gratis y recibe clientes que ya van caminando.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function Page() {
  return <ComerciosPage />;
}
