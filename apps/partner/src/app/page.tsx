import type { Metadata } from 'next';
import GentePage from '@/components/landing/GentePage';

export const metadata: Metadata = {
  title: 'Camina — Camina, suma puntos y gana premios',
  description: 'Camina cuenta tus pasos y los convierte en Puntos para canjear descuentos y premios en comercios de Bolivia. Gratis para todos.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Camina — Camina, suma puntos y gana premios',
    description: 'La app que premia a las personas por caminar.',
    url: '/',
    locale: 'es_BO',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: 'Camina', url: 'https://caminaapp.com', logo: 'https://caminaapp.com/camina-logo.png', areaServed: 'BO', email: 'hola@caminaapp.com' },
    { '@type': 'WebSite', name: 'Camina', url: 'https://caminaapp.com', inLanguage: 'es-BO' },
  ],
};

export default function RootPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GentePage />
    </>
  );
}
