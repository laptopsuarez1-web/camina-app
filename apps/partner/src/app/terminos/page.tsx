import type { Metadata } from 'next';
import { LegalContent } from '@/components/LegalContent';

export const metadata: Metadata = {
  title: 'Términos y Privacidad — Camina',
};

export default function TerminosPage() {
  return <LegalContent />;
}
