import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthRedirect } from '@/components/AuthRedirect';
import Medicion from '@/components/landing/Medicion';

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
  title: { default: 'Camina — Camina, suma puntos y gana premios', template: '%s' },
  description: 'Camina cuenta tus pasos y los convierte en Puntos para canjear descuentos y premios en comercios de Bolivia. Gratis.',
  applicationName: 'Camina',
  openGraph: {
    type: 'website',
    siteName: 'Camina',
    locale: 'es_BO',
    title: 'Camina — Camina, suma puntos y gana premios',
    description: 'Tus pasos se convierten en Puntos que canjeas por descuentos y premios en comercios de tu ciudad.',
    images: [{ url: '/web/og.jpg', width: 1200, height: 630, alt: 'Camina: camina, suma puntos y gana premios' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camina — Camina, suma puntos y gana premios',
    description: 'Tus pasos se convierten en Puntos que canjeas por descuentos y premios en comercios de tu ciudad.',
    images: ['/web/og.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full antialiased ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema elegido antes de pintar, para que no parpadee. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('camina-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text"><AuthRedirect />
        {children}
        <Medicion />
      </body>
    </html>
  );
}
