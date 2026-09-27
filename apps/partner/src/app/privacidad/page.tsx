import type { Metadata } from 'next';
import { LegalContent } from '@/components/LegalContent';

export const metadata: Metadata = {
  title: 'Términos y Privacidad — Camina',
};

// Misma página que /terminos bajo otra URL: Apple y Google piden a veces un
// link de "Privacy Policy" específico y a veces uno de "Terms" — con las dos
// rutas apuntando al mismo documento completo, cualquiera de las dos sirve.
export default function PrivacidadPage() {
  return <LegalContent />;
}
