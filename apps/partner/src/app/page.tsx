import type { Metadata } from 'next';
import GentePage from '@/components/landing/GentePage';

export const metadata: Metadata = {
  title: 'Camina — Tu caminata de todos los días ahora vale Puntos',
  description: 'Camina cuenta tus pasos y los convierte en Puntos para canjear en comercios de Bolivia. Gratis para todos.',
  openGraph: {
    title: 'Camina — Tu caminata de todos los días ahora vale Puntos',
    description: 'La app que premia a las personas por caminar.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function RootPage() {
  return <GentePage />;
}
