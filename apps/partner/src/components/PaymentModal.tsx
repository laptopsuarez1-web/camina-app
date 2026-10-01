'use client';

import Image from 'next/image';
import { whatsappLink } from '@/lib/plans';

// Ventana de pago: QR del banco + enviar comprobante por WhatsApp.
export function PaymentModal({
  planName, qr, onClose, doneLabel = 'Listo, ya mandé el pago',
}: { planName: string; qr: { image: string; amount: string }; onClose: () => void; doneLabel?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-[360px] w-full text-center relative">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-bg text-muted flex items-center justify-center text-[15px]"
        >
          ✕
        </button>
        <p className="font-bold text-[15px] mb-1">Pasar a {planName}</p>
        <p className="text-muted text-[12.5px] mb-4">
          Escaneá el código con tu app del banco y transferí el monto exacto ({qr.amount}).
          Después mandanos el comprobante por WhatsApp y activamos tu plan.
        </p>
        <div className="rounded-xl overflow-hidden border border-line mb-4">
          <Image src={qr.image} alt={`QR de pago ${planName}`} width={340} height={480} className="w-full h-auto" />
        </div>
        <a
          href={whatsappLink(planName, qr.amount)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-[10px] py-2.5 font-semibold text-[13px] mb-2"
          style={{ background: '#25D366', color: '#fff' }}
        >
          Enviar comprobante por WhatsApp
        </a>
        <button
          onClick={onClose}
          className="w-full bg-bg text-muted border border-line rounded-[10px] py-2.5 font-semibold text-[13px]"
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
