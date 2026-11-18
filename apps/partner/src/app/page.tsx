import type { Metadata } from 'next';
import GentePage from '@/components/landing/GentePage';

const TITULO = 'Camina — Camina, suma puntos y gana premios';
const DESC = 'Camina cuenta tus pasos y los convierte en Puntos para canjear descuentos y premios en comercios de Bolivia. Gratis para todos.';
const OG = [{ url: '/web/og.jpg', width: 1200, height: 630, alt: 'Camina: camina, suma puntos y gana premios' }];

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  alternates: { canonical: '/' },
  openGraph: { title: TITULO, description: DESC, url: '/', siteName: 'Camina', locale: 'es_BO', type: 'website', images: OG },
  twitter: { card: 'summary_large_image', title: TITULO, description: DESC, images: ['/web/og.jpg'] },
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
