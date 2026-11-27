'use client';

import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';

// Material de marketing de Camina (versiones finales vigentes) para usar y compartir.
// Los archivos viven en /public/materiales; para sumar uno nuevo: copiarlo ahí y agregar una línea acá.

type Tipo = 'imagen' | 'video' | 'pdf';
interface Item { nombre: string; archivo: string; tipo: Tipo; poster?: string; nota?: string }
interface Grupo { titulo: string; detalle: string; items: Item[] }

const P = '/materiales';
const lamina = (n: number): Item => ({ nombre: `Lámina ${n} de 11`, archivo: `${P}/instagram/lamina-${String(n).padStart(2, '0')}.jpg`, tipo: 'imagen' });
const pdf = (nombre: string, archivo: string, nota?: string): Item => ({ nombre, archivo: `${P}/documentos/${archivo}.pdf`, poster: `${P}/documentos/${archivo}.jpg`, tipo: 'pdf', nota });

const GRUPOS: Grupo[] = [
  {
    titulo: 'Instagram',
    detalle: 'Carrusel de lanzamiento: 11 láminas para publicar en orden.',
    items: Array.from({ length: 11 }, (_, i) => lamina(i + 1)),
  },
  {
    titulo: 'Videos',
    detalle: 'Para redes, WhatsApp y presentaciones.',
    items: [
      { nombre: 'Así es Camina (68 s)', archivo: `${P}/videos/asi-es-camina.mp4`, poster: `${P}/videos/asi-es-camina.jpg`, tipo: 'video', nota: 'Recorrido por la app' },
      { nombre: 'Lanzamiento (40 s)', archivo: `${P}/videos/lanzamiento-40s.mp4`, poster: `${P}/videos/lanzamiento-40s.jpg`, tipo: 'video' },
    ],
  },
  {
    titulo: 'Logos',
    detalle: 'Fondo transparente, listos para poner sobre cualquier diseño.',
    items: [
      { nombre: 'Logo con nombre', archivo: `${P}/logos/logo-con-nombre-transparente.png`, tipo: 'imagen' },
      { nombre: 'Logo solo (transparente)', archivo: `${P}/logos/logo-solo-transparente.png`, tipo: 'imagen' },
      { nombre: 'Logo solo (morado)', archivo: `${P}/logos/logo-solo-morado.png`, tipo: 'imagen' },
      { nombre: 'Logo menta', archivo: `${P}/logos/logo-mint.png`, tipo: 'imagen' },
      { nombre: 'Nombre CAMINA', archivo: `${P}/logos/nombre-camina-transparente.png`, tipo: 'imagen' },
      { nombre: 'Moneda Camina', archivo: `${P}/logos/camina-coin.png`, tipo: 'imagen' },
    ],
  },
  {
    titulo: 'Capturas de Google Play',
    detalle: 'Las 8 pantallas de la ficha de Android.',
    items: [['1-inicio', 'Inicio'], ['2-canjes', 'Canjes'], ['3-mapa', 'Mapa'], ['4-ruta', 'Ruta'], ['5-grupos', 'Grupos'], ['6-chat-de-grupo', 'Chat de grupo'], ['7-ranking', 'Ranking'], ['8-perfil', 'Perfil']].map(([f, n]) => ({
      nombre: n, archivo: `${P}/capturas/play-${f}.jpg`, tipo: 'imagen' as const,
    })),
  },
  {
    titulo: 'Fichas de App Store',
    detalle: 'Las 10 pantallas de la ficha de iPhone y el encabezado de las tiendas.',
    items: [
      { nombre: 'Encabezado de las tiendas', archivo: `${P}/capturas/encabezado-tiendas.jpg`, tipo: 'imagen' },
      ...[['01-inicio', 'Inicio'], ['02-canjes', 'Canjes'], ['03-mapa', 'Mapa'], ['04-ruta', 'Ruta'], ['05-actividad', 'Actividad'], ['06-grupos', 'Grupos'], ['07-grupo_chat', 'Chat de grupo'], ['08-ranking', 'Ranking'], ['09-perfil', 'Perfil'], ['10-eventos', 'Eventos']].map(([f, n]) => ({
        nombre: n, archivo: `${P}/capturas/apple-${f}.jpg`, tipo: 'imagen' as const,
      })),
    ],
  },
  {
    titulo: 'Dossiers',
    detalle: 'Presentaciones para cada tipo de cliente.',
    items: [
      pdf('Dossier comercios', 'dossier-camina-comercios'),
      pdf('Dossier eventos, bares y discotecas', 'dossier-camina-eventos-bares-discotecas'),
      pdf('Dossier negocios online', 'dossier-negocios-online-camina'),
      pdf('Dossier marcas y experiencias', 'dossier-marcas-experiencias-camina'),
      pdf('Dossier empresas', 'dossier-corporativo-camina'),
      pdf('Dossier sector público', 'dossier-sector-publico-camina'),
    ],
  },
  {
    titulo: 'Kit comercial',
    detalle: 'Para mostrar Camina a un local en persona o por WhatsApp.',
    items: [
      pdf('Camina para comercios (1 página)', 'camina-para-comercios-1-pagina'),
      pdf('Flyer comercios', 'flyer-camina-comercios'),
      pdf('Flyer comercios (2 páginas)', 'flyer-2-paginas-camina-comercios'),
    ],
  },
  {
    titulo: 'Productora',
    detalle: 'Para quien filma o edita videos de Camina.',
    items: [pdf('Guía para la productora', 'camina-guia-video')],
  },
];

function Tarjeta({ item }: { item: Item }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const url = `${window.location.origin}${item.archivo}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia el enlace:', url);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden flex flex-col">
      <div className="bg-[#0f0f14] flex items-center justify-center h-[170px] p-2">
        {item.tipo === 'video' ? (
          <video src={item.archivo} poster={item.poster} controls preload="none" playsInline className="max-h-full max-w-full rounded-md" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.tipo === 'pdf' ? item.poster : item.archivo} alt={item.nombre} loading="lazy" className="max-h-full max-w-full object-contain rounded-md" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-text text-[13px] font-semibold leading-tight">{item.nombre}</p>
          {item.nota && <p className="text-muted text-[11.5px]">{item.nota}</p>}
        </div>
        <div className="flex gap-2 mt-auto">
          <a href={item.archivo} download className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-line px-2 py-1.5 text-[12px] font-semibold text-text whitespace-nowrap">
            <Download size={14} /> Descargar
          </a>
          <button type="button" onClick={copiar} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-line px-2 py-1.5 text-[12px] font-semibold text-text whitespace-nowrap">
            {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMaterialesPage() {
  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Materiales</h1>
      <p className="text-muted text-[13.5px] mb-5">Todo el material de Camina para usar y compartir: descarga el archivo o copia su enlace.</p>
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="mb-7">
          <h2 className="text-[16px] font-bold text-text">{g.titulo}</h2>
          <p className="text-muted text-[12.5px] mb-2.5">{g.detalle}</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))' }}>
            {g.items.map((it) => <Tarjeta key={it.archivo} item={it} />)}
          </div>
        </section>
      ))}
    </AdminShell>
  );
}
