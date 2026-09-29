'use client';

import { Download } from 'lucide-react';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { GuiaContent } from '@/components/GuiaContent';

const MATERIAL = [
  { file: '/marca/afiche-aqui-se-canjea.pdf', t: 'Afiche "Aquí canjeás con Camina"', d: 'A4 para pegar en la vitrina o la caja.' },
  { file: '/marca/logo-solo-transparente.png', t: 'Logo (fondo transparente)', d: 'Para tus redes o tu carta.' },
  { file: '/marca/logo-con-nombre-transparente.png', t: 'Logo con nombre (transparente)', d: 'Para portadas y afiches.' },
  { file: '/marca/nombre-camina-transparente.png', t: 'Solo el nombre CAMINA (transparente)', d: 'Para encabezados.' },
  { file: '/marca/logo-solo-morado.png', t: 'Logo sobre morado', d: 'Listo para publicar en Instagram.' },
];

export default function GuiaPage() {
  return (
    <DashboardShell>
      <TopBar title="Guía y reglas" subtitle="Todo lo que necesitás para atender canjes sin dudas." />
      <div className="max-w-[720px]">
        <a
          href="/guia-camina-comercios.pdf"
          download
          className="inline-flex items-center gap-2 bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px] mb-6"
        >
          <Download size={15} /> Descargar la guía en PDF
        </a>

        <GuiaContent />

        <section id="material" className="mb-8">
          <h2 className="font-extrabold text-[18px] mb-1" style={{ color: '#241748' }}>Material para tu local</h2>
          <p className="text-muted text-[13px] mb-3.5">
            Avisale a tus clientes que en tu local se canjea con Camina. Imprimí el afiche o usá el logo en tus redes.
          </p>
          <div className="flex flex-col gap-2">
            {MATERIAL.map((m) => (
              <a
                key={m.file}
                href={m.file}
                download
                className="flex items-center justify-between gap-3 bg-white border border-line rounded-xl px-3.5 py-3"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-[13.5px]">{m.t}</span>
                  <span className="block text-muted text-[12.5px]">{m.d}</span>
                </span>
                <Download size={16} color="#1f9d75" className="shrink-0" />
              </a>
            ))}
          </div>
          <div className="bg-bg border border-line rounded-xl p-4 mt-4">
            <p className="font-semibold text-[13px] mb-1">Texto listo para tu Instagram o WhatsApp</p>
            <p className="text-[12.5px] leading-5 text-muted">
              &ldquo;¡Ya estamos en Camina! 🚶 Caminá, juntá puntos y canjealos por beneficios en nuestro local. Descargá
              la app en caminaapp.com y mostrá tu código en la caja.&rdquo;
            </p>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
