'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// Marco común del panel: en compu, menú fijo a la izquierda; en celular, barra de arriba con un botón
// que abre el menú como un cajón. Lo usan el panel de comercios y el de administrador.
export function ResponsiveFrame({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden md:flex w-[220px] bg-auth-bg shrink-0 flex-col p-3.5 sticky top-0 h-screen overflow-y-auto">
        {sidebar}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-auth-bg flex items-center justify-between pl-4 pr-2 h-14">
          <div className="flex items-center gap-2.5">
            <Image src="/camina-logo.png" alt="Camina" width={30} height={30} className="rounded-full" />
            <span className="text-white font-bold text-[15px] tracking-wide">CAMINA</span>
          </div>
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="w-11 h-11 flex items-center justify-center text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        {open && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-[280px] max-w-[85%] bg-auth-bg h-full flex flex-col p-3.5 overflow-y-auto shadow-2xl">
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

        <main className="p-4 sm:p-6 md:p-10 max-w-[1100px]">{children}</main>
      </div>
    </div>
  );
}
