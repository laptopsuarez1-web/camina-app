import type { Metadata } from 'next';
import GentePage from '@/components/landing/GentePage';

export const metadata: Metadata = {
  title: 'Camina — Camina, suma puntos y canjéalos en tu zona',
  description: 'Camina cuenta tus pasos y los convierte en puntos para canjear en comercios locales de Bolivia.',
  openGraph: {
    title: 'Camina — Camina, suma puntos y canjéalos en tu zona',
    description: 'La app que premia a las personas por caminar.',
    locale: 'es_BO',
    type: 'website',
  },
};

export default function RootPage() {
  return <GentePage />;
}
