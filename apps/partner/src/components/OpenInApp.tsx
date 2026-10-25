'use client';

import { useEffect, useState } from 'react';
import { ANDROID_INSTALL_URL, IOS_INSTALL_URL, SUPPORT_EMAIL } from '@/lib/app-links';

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
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent;
    const detected = /iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : 'other';
    setOs(detected);
    // En Android el sistema abre la app solo si está instalada. En iPhone no se redirige solo: sin la app,
    // Safari muestra un error de "dirección no válida" y la persona se queda sin saber qué hacer.
    if (valid && detected === 'android') {
      const t = setTimeout(() => {
        window.location.href = deep;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [valid, deep]);

  const installUrl = os === 'android' ? ANDROID_INSTALL_URL : os === 'ios' ? IOS_INSTALL_URL : '';
  const btn = 'rounded-xl py-3.5 px-8 font-bold text-[15px] block w-full max-w-[300px]';

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
          {isGroup && (
            <div className="mb-6">
              <p className="text-auth-muted text-[12.5px] mb-1.5">Código del grupo</p>
              <p className="text-white font-extrabold text-[28px] tracking-[0.18em] select-all">{id.toUpperCase()}</p>
            </div>
          )}
          <a href={deep} className={`${btn} bg-mint text-mint-dark mb-3`}>
            Ya tengo Camina: abrir
          </a>
          <div className="mt-3 max-w-[320px]">
            <p className="text-white font-semibold text-[14px] mb-1">¿Todavía no tienes la app?</p>
            {installUrl ? (
              <a href={installUrl} className={`${btn} bg-white/10 text-white border border-white/20 mx-auto mt-2`}>
                {os === 'ios' ? 'Descargar para iPhone' : 'Descargar para Android'}
              </a>
            ) : (
              <p className="text-auth-muted text-[12.5px] leading-[18px]">
                Camina está en prueba. Escríbenos a{' '}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Quiero probar Camina`} className="underline text-white">
                  {SUPPORT_EMAIL}
                </a>{' '}
                y te mandamos el link para instalarla. Después vuelve a tocar este link.
              </p>
            )}
            {isGroup && (
              <p className="text-auth-muted text-[12.5px] leading-[18px] mt-4">
                Con la app instalada, ve a Grupos, escribe el código y toca Unirme.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
