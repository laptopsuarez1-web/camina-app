'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footprints, Store, Gift, Receipt, LifeBuoy, X } from 'lucide-react';

const KEY = 'camina-guia-vista';
// La página Guía y reglas la vuelve a abrir con este evento.
export const ABRIR_GUIA = 'camina:abrir-guia';

type Paso = { icon: typeof Store; t: string; d: string; href?: string; ir?: string };

const PASOS_DUENO: Paso[] = [
  {
    icon: Footprints,
    t: '¡Bienvenido a Camina!',
    d: 'La gente camina, junta Puntos y los canjea por tus premios. Tú pones el premio; ellos llegan caminando a tu local.',
  },
  {
    icon: Store,
    t: 'Arma tu ficha',
    d: 'Sube tu logo, una foto de portada, tu ubicación y tus horarios. Así te encuentran en el mapa de la app.',
    href: '/perfil',
    ir: 'Ir a Perfil del local',
  },
  {
    icon: Gift,
    t: 'Crea tu primer premio',
    d: 'Elige qué regalas y cuántos Puntos cuesta. Algo rico y simple engancha más que algo caro.',
    href: '/beneficio',
    ir: 'Ir a Mis beneficios',
  },
  {
    icon: Receipt,
    t: 'Canjes en segundos',
    d: 'Cuando alguien quiera canjear, dile el código de 4 números de tu local (lo ves en Canjes). La app lo confirma sola.',
    href: '/canjes',
    ir: 'Ver mi código',
  },
  {
    icon: LifeBuoy,
    t: '¿Alguna duda?',
    d: 'En Guía y reglas tienes todo explicado, y por WhatsApp te ayudamos cuando quieras. ¡A llenar tu local!',
  },
];

const PASOS_CAJERO: Paso[] = [
  {
    icon: Footprints,
    t: '¡Bienvenido al equipo!',
    d: 'Aquí atiendes los canjes de Camina: la gente camina, junta Puntos y los cambia por los premios del local.',
  },
  {
    icon: Receipt,
    t: 'Canjes en segundos',
    d: 'Cuando alguien quiera canjear, dile el código de 4 números que ves arriba en Canjes. La app lo confirma sola y tú entregas el premio.',
  },
];

export function BienvenidaGuia({ cajero }: { cajero: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [i, setI] = useState(0);
  const pasos = cajero ? PASOS_CAJERO : PASOS_DUENO;

  useEffect(() => {
    const abrir = () => {
      setI(0);
      setAbierta(true);
    };
    let vista = true;
    try {
      vista = !!localStorage.getItem(KEY);
    } catch {}
    const t = vista ? null : setTimeout(abrir, 400);
    window.addEventListener(ABRIR_GUIA, abrir);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener(ABRIR_GUIA, abrir);
    };
  }, []);

  if (!abierta) return null;

  function cerrar() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setAbierta(false);
  }

  const p = pasos[i];
  const Icon = p.icon;
  const ultimo = i === pasos.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16, 9, 36, 0.6)' }} role="dialog" aria-modal="true" aria-labelledby="guia-titulo">
      <div className="relative w-full max-w-[400px] bg-card border border-line rounded-3xl p-6 pt-8 text-center shadow-xl">
        <button type="button" onClick={cerrar} aria-label="Cerrar guía" className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-muted">
          <X size={18} />
        </button>
        <div className="mx-auto w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--c-aqua-light)' }}>
          <Icon size={32} color="#4FC3A8" />
        </div>
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1">
          Paso {i + 1} de {pasos.length}
        </p>
        <h2 id="guia-titulo" className="text-[20px] font-extrabold text-text m-0 mb-2">
          {p.t}
        </h2>
        <p className="text-[14px] text-muted leading-5 mb-5">{p.d}</p>
        {p.href && (
          <Link href={p.href} onClick={cerrar} className="inline-block text-[13px] font-semibold underline underline-offset-2 mb-5" style={{ color: 'var(--c-ok-text)' }}>
            {p.ir}
          </Link>
        )}
        <div className="flex justify-center gap-1.5 mb-5" aria-hidden>
          {pasos.map((_, k) => (
            <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 18 : 6, background: k === i ? '#4FC3A8' : 'var(--c-line)' }} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 ? (
            <button type="button" onClick={() => setI(i - 1)} className="flex-1 rounded-[12px] py-3 text-[14px] font-semibold border border-line text-text">
              Atrás
            </button>
          ) : (
            <button type="button" onClick={cerrar} className="flex-1 rounded-[12px] py-3 text-[14px] font-semibold text-muted">
              Saltar
            </button>
          )}
          <button
            type="button"
            onClick={() => (ultimo ? cerrar() : setI(i + 1))}
            className="flex-1 rounded-[12px] py-3 text-[14px] font-bold"
            style={{ background: '#62F0B6', color: '#241748' }}
          >
            {ultimo ? '¡Empezar!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
