'use client';

import { FileText, MessageCircle, Download } from 'lucide-react';

const BASE = 'https://caminaapp.com';

type Doc = { titulo: string; para: string; href: string };

const VIDEOS: { titulo: string; para: string; src: string; poster: string }[] = [
  { titulo: 'Video para comercios', para: 'Muéstralo al dueño: qué gana su local con Camina (30 segundos).', src: '/partners/material/video-comercios.mp4', poster: '/partners/material/video-comercios.jpg' },
  { titulo: 'Video de lanzamiento', para: 'Cómo la gente camina, junta Puntos y canjea en los locales (40 segundos).', src: '/partners/material/video-lanzamiento.mp4', poster: '/partners/material/video-lanzamiento.jpg' },
];

const GRUPOS: { titulo: string; docs: Doc[] }[] = [
  {
    titulo: 'Para locales (lo que más vas a usar)',
    docs: [
      { titulo: 'Dossier cupo fundador', para: 'Para los primeros 20 comercios: 3 meses gratis y cómo reservar el cupo.', href: '/partners/material/dossier-fundadores.pdf' },
      { titulo: 'Dossier para comercios', para: 'Qué es Camina, qué gana el local, planes y cómo empezar.', href: '/partners/material/dossier-comercios.pdf' },
      { titulo: 'Guía de registro', para: 'Cómo se registra el local en el panel, con capturas.', href: '/guia-registro-comercios.pdf' },
      { titulo: 'Afiche "Aquí se canjea"', para: 'Para imprimir y pegar en el local.', href: '/marca/afiche-aqui-se-canjea.pdf' },
    ],
  },
  {
    titulo: 'Para otros tipos de negocio',
    docs: [
      { titulo: 'Dossier negocios online', para: 'Tiendas que venden por WhatsApp, Instagram, TikTok o web, sin local.', href: '/partners/material/dossier-negocios-online.pdf' },
      { titulo: 'Dossier marcas', para: 'Marcas, empresas y experiencias: desafíos y eventos.', href: '/partners/material/dossier-marcas.pdf' },
    ],
  },
];

const wa = (titulo: string, href: string) =>
  `https://wa.me/?text=${encodeURIComponent(`Hola! Te comparto ${titulo.toLowerCase()} de Camina: ${BASE}${href}`)}`;

function Compartir({ titulo, href }: { titulo: string; href: string }) {
  return (
    <div className="flex gap-2 mt-3">
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] py-2.5 text-[13px] font-semibold">
        <Download size={15} /> Abrir
      </a>
      <a href={wa(titulo, href)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-mint text-mint-dark py-2.5 text-[13px] font-semibold">
        <MessageCircle size={15} /> Enviar por WhatsApp
      </a>
    </div>
  );
}

// Material de Camina para mostrar o enviar al dueño: videos y dossiers.
export function MaterialPartner() {
  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">Material para mostrar</h1>
      <p className="text-muted text-[13.5px] mb-5">Muéstralo en tu celular durante la visita o envíaselo al dueño por WhatsApp.</p>

      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">Videos</p>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {VIDEOS.map((v) => (
          <div key={v.src} className="bg-card border border-line rounded-2xl p-3">
            <video src={v.src} poster={v.poster} controls playsInline preload="none" className="w-full max-h-[460px] rounded-xl bg-black" />
            <p className="font-bold text-text text-[14.5px] mt-2.5">{v.titulo}</p>
            <p className="text-muted text-[12.5px] leading-snug">{v.para}</p>
            <Compartir titulo={v.titulo} href={v.src} />
          </div>
        ))}
      </div>

      {GRUPOS.map((g) => (
        <div key={g.titulo} className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">{g.titulo}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.docs.map((d) => (
              <div key={d.href} className="bg-card border border-line rounded-2xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-purple-light flex items-center justify-center shrink-0">
                    <FileText size={17} className="text-[#8b4fd1]" />
                  </span>
                  <div>
                    <p className="font-bold text-text text-[14.5px] leading-tight">{d.titulo}</p>
                    <p className="text-muted text-[12.5px] leading-snug mt-0.5">{d.para}</p>
                  </div>
                </div>
                <Compartir titulo={d.titulo} href={d.href} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
