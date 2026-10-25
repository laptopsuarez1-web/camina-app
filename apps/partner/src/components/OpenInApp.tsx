'use client';

import { useEffect } from 'react';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Los grupos se invitan con su código (8 letras y números, por ejemplo 82EUTHNX), no con un id largo.
const GROUP_CODE = /^[a-z0-9]{6,12}$/i;

// Página a la que llegan los links de invitación (caminaapp.com/r/... y /join-group/...).
// Los links camina:// no se pueden tocar en Instagram/WhatsApp; este sí. Intenta abrir la app
// y, si no está instalada, explica cómo conseguirla. En los grupos muestra también el código para escribirlo en la app.
export function OpenInApp({ path, id, title, text }: { path: string; id: string; title: string; text: string }) {
  const isGroup = path === 'join-group';
  const valid = isGroup ? GROUP_CODE.test(id) : UUID.test(id);
  const deep = `camina://${path}/${id}`;

  useEffect(() => {
    if (valid && /android|iphone|ipad/i.test(navigator.userAgent)) {
      const t = setTimeout(() => {
        window.location.href = deep;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [valid, deep]);

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-5" />
      <p className="text-white font-bold text-[22px] mb-2">{valid ? title : 'Link no válido'}</p>
      <p className="text-auth-muted text-[14px] mb-7 max-w-[320px] leading-5">
        {valid ? text : 'Este link de invitación está incompleto. Pídele a tu amigo que lo comparta de nuevo.'}
      </p>
      {valid && (
        <>
          <a href={deep} className="bg-mint text-mint-dark rounded-xl py-3.5 px-8 font-bold text-[15px] mb-4">
            Abrir en Camina
          </a>
          {isGroup && (
            <div className="mb-5">
              <p className="text-auth-muted text-[12.5px] mb-1.5">Si no se abre, en Camina ve a Grupos, escribe este código y toca Unirme:</p>
              <p className="text-white font-extrabold text-[26px] tracking-[0.18em] select-all">{id.toUpperCase()}</p>
            </div>
          )}
          <p className="text-auth-muted text-[12.5px] max-w-[300px] leading-[18px]">
            ¿Todavía no tienes la app? Pídele a quien te invitó el link de prueba o espera el lanzamiento en las tiendas.
            Después vuelve a tocar este link.
          </p>
        </>
      )}
    </div>
  );
}
