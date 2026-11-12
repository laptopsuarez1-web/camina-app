'use client';

import { useEffect, useState } from 'react';
import { ANDROID_INSTALL_URL, IOS_INSTALL_URL } from '@/lib/app-links';

// caminaapp.com/descargar: el link del QR de los carteles, stickers y volantes.
// Un solo QR para todos: en iPhone manda a la App Store y en Android a Google Play. En computadora (o si
// todavía no hay link de una tienda) muestra los dos botones. Los links salen de NEXT_PUBLIC_IOS_INSTALL_URL y
// NEXT_PUBLIC_ANDROID_INSTALL_URL, así que al salir la app solo se cambian esas variables y los QR impresos siguen sirviendo.
export default function DescargarPage() {
  const [os, setOs] = useState<'ios' | 'android' | 'other' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const detected = /iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : 'other';
    const target = detected === 'ios' ? IOS_INSTALL_URL : detected === 'android' ? ANDROID_INSTALL_URL : '';
    if (target) {
      window.location.replace(target);
      return;
    }
    const t = setTimeout(() => setOs(detected), 0);
    return () => clearTimeout(t);
  }, []);

  const btn = 'rounded-xl py-3.5 px-8 font-bold text-[15px] block w-full max-w-[300px] mx-auto';

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-5" />
      <p className="text-white font-bold text-[22px] mb-2">Descarga Camina</p>
      <p className="text-auth-muted text-[14px] mb-7 max-w-[320px] leading-5">
        Camina, junta Puntos y canjéalos por descuentos y premios en locales de tu ciudad.
      </p>
      {os === null ? (
        <p className="text-auth-muted text-[13px]">Abriendo la tienda…</p>
      ) : (
        <div className="flex flex-col gap-3 w-full items-center">
          {IOS_INSTALL_URL ? (
            <a href={IOS_INSTALL_URL} className={`${btn} bg-mint text-mint-dark`}>
              Descargar en App Store
            </a>
          ) : null}
          {ANDROID_INSTALL_URL ? (
            <a href={ANDROID_INSTALL_URL} className={`${btn} bg-white/10 text-white border border-white/20`}>
              Descargar en Google Play
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
