import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Camina — Caminá, sumá puntos y canjealos en tu barrio',
  description:
    'Camina convierte los pasos de la gente en puntos para canjear en comercios locales. Sumá tu comercio gratis y recibí clientes que ya van caminando.',
  openGraph: {
    title: 'Camina — Tus próximos clientes ya están caminando',
    description: 'Sumá tu comercio gratis a la app que premia a las personas por caminar.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function RootPage() {
  return <Landing />;
}
