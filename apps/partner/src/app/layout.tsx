import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const jakarta = localFont({
  src: [
    { path: '../fonts/PlusJakartaSans_500Medium.ttf', weight: '500' },
    { path: '../fonts/PlusJakartaSans_700Bold.ttf', weight: '700' },
    { path: '../fonts/PlusJakartaSans_800ExtraBold.ttf', weight: '800' },
  ],
  variable: '--font-jakarta',
  display: 'swap',
});

// La vista previa del link (WhatsApp, redes) usa estos datos: que diga "Panel de comercios Camina" y no el
// nombre interno del proyecto.
export const metadata: Metadata = {
  metadataBase: new URL('https://caminaapp.com'),
  title: 'Camina — Panel de comercios',
  description: 'Gestioná tu beneficio, tus canjes y tu plan en Camina.',
  applicationName: 'Camina',
  openGraph: {
    type: 'website',
    siteName: 'Camina',
    locale: 'es_BO',
    title: 'Camina — Panel de comercios',
    description: 'Registrá tu comercio, publicá tu beneficio y validá canjes en Camina.',
    images: [{ url: '/camina-logo.png', alt: 'Camina' }],
  },
  twitter: {
    card: 'summary',
    title: 'Camina — Panel de comercios',
    description: 'Registrá tu comercio, publicá tu beneficio y validá canjes en Camina.',
    images: ['/camina-logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full antialiased ${jakarta.variable}`}>
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
