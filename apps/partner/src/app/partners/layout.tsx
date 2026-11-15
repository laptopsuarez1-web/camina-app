import type { Metadata } from 'next';

// La zona de partners no se publica en buscadores ni se enlaza desde la web: el link se manda directo por WhatsApp.
export const metadata: Metadata = {
  title: 'Camina Partners',
  description: 'Gana comisión sumando locales a Camina.',
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: 'Camina Partners', description: 'Gana comisión sumando locales a Camina.' },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
