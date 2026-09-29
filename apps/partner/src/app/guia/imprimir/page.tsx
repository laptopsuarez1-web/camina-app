import { GuiaContent } from '@/components/GuiaContent';

// Versión sin menú de la guía: de acá sale el PDF descargable.
export default function GuiaImprimirPage() {
  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-[720px] mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camina-logo.png" alt="" width={48} height={48} className="rounded-full" />
          <div>
            <p className="font-extrabold text-[22px] leading-tight" style={{ color: '#241748' }}>Guía para comercios</p>
            <p className="text-muted text-[13px]">Camina · caminaapp.com</p>
          </div>
        </div>
        <GuiaContent />
      </div>
    </div>
  );
}
