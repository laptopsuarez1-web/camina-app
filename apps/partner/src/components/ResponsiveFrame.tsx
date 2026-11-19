'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// Marco común del panel: en compu, menú fijo a la izquierda; en celular, barra de arriba con un botón
// que abre el menú como un cajón. Lo usan el panel de comercios y el de administrador.
// `variant="biz"` aplica la identidad de CAMINA Business (panel de comercios) y permite plegar el menú en compu.
export function ResponsiveFrame({
  sidebar,
  children,
  variant,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  variant?: 'biz';
}) {
  const [open, setOpen] = useState(false);
  // El panel se dibuja solo en el navegador (espera la sesión), así que se puede leer la preferencia al iniciar.
  const [plegado, setPlegado] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('camina-biz-menu') === 'plegado';
    } catch {
      return false;
    }
  });
  const pathname = usePathname();
  const biz = variant === 'biz';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const plegar = () => {
    const v = !plegado;
    setPlegado(v);
    try {
      localStorage.setItem('camina-biz-menu', v ? 'plegado' : 'abierto');
    } catch {
      // ignorar
    }
  };

  return (
    <div className={`flex min-h-screen bg-bg ${biz ? 'biz biz-frame' : ''}`} data-collapsed={biz && plegado ? '1' : undefined}>
      <aside
        className={`hidden md:flex bg-auth-bg shrink-0 flex-col p-3.5 sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ${
          biz ? (plegado ? 'w-[76px]' : 'w-[252px]') : 'w-[220px]'
        }`}
      >
        {sidebar}
        {biz && (
          <button type="button" className="biz-collapse mt-1" onClick={plegar} aria-label={plegado ? 'Mostrar menú completo' : 'Plegar menú'}>
            {plegado ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            <span className="biz-label">Plegar menú</span>
          </button>
        )}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-auth-bg flex items-center justify-between pl-4 pr-2 h-14">
          <div className="flex items-center gap-2.5">
            <Image src="/camina-logo.png" alt="Camina" width={30} height={30} className="rounded-full" />
            <span className="text-white font-bold text-[15px] tracking-wide">CAMINA</span>
            {biz && <span className="text-mint text-[10.5px] font-bold tracking-[0.16em]">COMERCIOS</span>}
          </div>
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="w-11 h-11 flex items-center justify-center text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        {open && (
          <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Menú">
            <div className="w-[290px] max-w-[85%] bg-auth-bg h-full flex flex-col p-3.5 overflow-y-auto shadow-2xl biz-drawer">
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="self-end w-10 h-10 flex items-center justify-center text-auth-muted"
              >
                <X size={22} />
              </button>
              {sidebar}
            </div>
            <button type="button" aria-label="Cerrar menú" className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
          </div>
        )}

        <main className={biz ? 'p-4 sm:p-6 md:p-10 max-w-[1180px] mx-auto' : 'p-4 sm:p-6 md:p-10 max-w-[1100px]'}>{children}</main>
      </div>
    </div>
  );
}
