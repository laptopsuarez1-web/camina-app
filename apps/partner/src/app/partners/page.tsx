'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Footprints, Store, Wallet } from 'lucide-react';
import { PLAN_KINDS, partnersWa } from '@/lib/partners';

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-auth-bg text-white">
      <div className="max-w-[560px] mx-auto px-6 py-10 flex flex-col items-center">
        <Image src="/camina-logo.png" alt="Camina" width={84} height={84} className="rounded-full mb-4" />
        <p className="text-mint font-bold tracking-[0.18em] text-[13px] mb-2">CAMINA PARTNERS</p>
        <h1 className="text-[30px] leading-[1.15] font-extrabold text-center mb-3">Gana dinero sumando locales a Camina</h1>
        <p className="text-auth-muted text-[15px] text-center mb-7">
          Visitas locales de Tarija, los dejas funcionando en 5 minutos desde su celular y cobras por cada local que queda activo.
        </p>

        <div className="w-full flex flex-col gap-2.5 mb-8">
          <Link href="/partners/registro" className="bg-mint text-mint-dark rounded-xl py-3.5 font-bold text-[15px] text-center">
            Quiero ser partner
          </Link>
          <Link href="/partners/login" className="border border-white/25 rounded-xl py-3.5 font-semibold text-[15px] text-center">
            Ya tengo cuenta
          </Link>
          <a
            href={partnersWa('Hola! Quiero ser partner de Camina y tengo una consulta.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-mint text-[14px] font-semibold py-2"
          >
            <MessageCircle size={16} /> Escríbenos por WhatsApp
          </a>
        </div>

        <div className="w-full grid gap-3 mb-8">
          {[
            { icon: Footprints, t: 'Visitas el local', d: 'Hablas con el dueño con un guion de 30 segundos. Te lo damos listo.' },
            { icon: Store, t: 'Lo cargas en 5 minutos', d: 'Desde el celular del dueño: cuenta, premio con foto y ubicación.' },
            { icon: Wallet, t: 'Cobras por local activo', d: 'Los viernes, por transferencia/QR o en efectivo.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-3 bg-auth-bg-soft rounded-2xl p-4">
              <Icon size={22} className="text-mint shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[15px]">{t}</p>
                <p className="text-auth-muted text-[13.5px]">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-[18px] font-bold mb-3 self-start">Cuánto cobras por cada local activo</h2>
        <div className="w-full bg-auth-bg-soft rounded-2xl divide-y divide-white/10 mb-3">
          {PLAN_KINDS.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px]">Local con {p.label.charAt(0).toLowerCase() + p.label.slice(1)}</span>
              <span className="text-mint font-extrabold text-[20px]">Bs {p.amount}</span>
            </div>
          ))}
        </div>
        <p className="text-auth-muted text-[12.5px] self-start mb-2">
          Local activo = publicado, con su premio cargado y con un primer canje real. Bonos: +Bs 50 a los 5 locales y +Bs 100 más a los 10.
        </p>
        <p className="text-auth-muted text-[12.5px] self-start">
          Camina no promete ventas ni ganancias a los locales, y tú tampoco. Eres partner independiente: tú eliges tus horarios.
        </p>
      </div>
    </div>
  );
}
