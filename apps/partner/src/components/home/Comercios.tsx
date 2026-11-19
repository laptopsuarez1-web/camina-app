'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { LOCALES, type Local } from './data';
import { Coin } from './ui';

// Comercios participantes: logos cuadrados como los del mapa de la app. Al tocar uno se abren sus premios.
export default function Comercios() {
  const dlg = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<Local | null>(null);

  const abrir = (l: Local) => {
    setSel(l);
    dlg.current?.showModal();
  };
  const cerrar = () => dlg.current?.close();

  return (
    <>
      <ul className="hm-shops" data-stagger>
        {LOCALES.map((l, i) => (
          <li key={l.id} style={{ ['--i' as string]: i }}>
            <button type="button" className="hm-shop" onClick={() => abrir(l)} aria-haspopup="dialog">
              <span className="hm-shop-logo">
                <Image src={l.logo} alt="" width={96} height={96} sizes="96px" />
              </span>
              <b>{l.nombre}</b>
              <small>{l.premios.length ? `${l.premios.length} ${l.premios.length === 1 ? 'premio' : 'premios'}` : 'Pronto con premios'}</small>
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dlg} className="hm-dlg" aria-labelledby="hm-shop-t" onClick={(e) => e.target === e.currentTarget && cerrar()}>
        {sel ? (
          <div className="hm-dlg-in">
            <button type="button" className="hm-dlg-x" onClick={cerrar} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="hm-shop-head">
              <span className="hm-shop-logo">
                <Image src={sel.logo} alt="" width={96} height={96} sizes="64px" />
              </span>
              <div>
                <h2 id="hm-shop-t">{sel.nombre}</h2>
                <p>
                  {sel.categoria} · {sel.direccion}, Tarija
                </p>
              </div>
            </div>
            {sel.premios.length ? (
              <ul className="hm-shop-prem">
                {sel.premios.map((p) => (
                  <li key={p.nombre}>
                    <span>
                      <b>{p.nombre}</b>
                      {p.detalle ? <small>{p.detalle}</small> : null}
                    </span>
                    <span className="hm-pts">
                      <Coin size={22} />
                      <b>{p.puntos}</b>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hm-shop-empty">Ya está en el mapa de Camina. Sus premios aparecen en la app apenas los publique.</p>
            )}
            <p className="hm-shop-note">Premios tal como están en la app en noviembre de 2026. Los vigentes, siempre en la app.</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
