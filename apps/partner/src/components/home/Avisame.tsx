'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CONTACTO } from './data';

// Formulario "Avísame cuando salga": la persona elige WhatsApp o correo, deja ese dato y, si quiere, su ciudad.
// Lo abre cualquier botón con data-avisame. Sin JavaScript, esos botones llevan a la sección de cierre.
const CIUDADES = ['Tarija', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Otra'];
type Estado = 'form' | 'enviando' | 'listo' | 'error';

export default function Avisame() {
  const dlg = useRef<HTMLDialogElement>(null);
  const [estado, setEstado] = useState<Estado>('form');
  const [canal, setCanal] = useState<'whatsapp' | 'email'>('whatsapp');
  const [contacto, setContacto] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const open = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest('[data-avisame]');
      if (!t) return;
      e.preventDefault();
      setEstado((s) => (s === 'listo' ? 'listo' : 'form'));
      dlg.current?.showModal();
    };
    document.addEventListener('click', open);
    return () => document.removeEventListener('click', open);
  }, []);

  const cerrar = () => dlg.current?.close();

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valor = String(fd.get('contacto') || '').trim();
    const ok = canal === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor) : /^\+?[\d\s\-()]{8,18}$/.test(valor);
    if (!ok) {
      setMsg(canal === 'email' ? 'Revisa tu correo: parece que le falta algo.' : 'Revisa tu número: escribe tus 8 cifras, por ejemplo 71234567.');
      return;
    }
    setMsg('');
    setEstado('enviando');
    try {
      const r = await fetch('/api/avisame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal, contacto: valor, ciudad: ciudad || null, web: fd.get('web') }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setContacto(valor);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }

  return (
    <dialog ref={dlg} className="hm-dlg" aria-labelledby="hm-avisame-t" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="hm-dlg-in">
        <button type="button" className="hm-dlg-x" onClick={cerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {estado === 'listo' ? (
          <div className="hm-dlg-ok" role="status">
            <span className="hm-dlg-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 id="hm-avisame-t">Listo, quedaste anotado.</h2>
            <p>
              Te avisamos {canal === 'whatsapp' ? 'por WhatsApp al' : 'a'} <b>{contacto}</b> apenas Camina esté en App Store y Google Play.
            </p>
            <button type="button" className="hm-btn" onClick={cerrar}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h2 id="hm-avisame-t">Te avisamos cuando salga.</h2>
            <p className="hm-dlg-sub">Un solo mensaje, el día que Camina esté en tu tienda. Nada más.</p>
            <div className="hm-seg" role="radiogroup" aria-label="¿Cómo te avisamos?">
              {(['whatsapp', 'email'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={canal === c}
                  className={canal === c ? 'is-on' : ''}
                  onClick={() => {
                    setCanal(c);
                    setMsg('');
                  }}
                >
                  {c === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                </button>
              ))}
              <span className="hm-seg-pill" style={{ ['--k' as string]: canal === 'whatsapp' ? 0 : 1 }} aria-hidden="true" />
            </div>
            <label className="hm-field" htmlFor="hm-avisame-contacto">
              <span>{canal === 'whatsapp' ? 'Tu número de WhatsApp' : 'Tu correo'}</span>
              {canal === 'whatsapp' ? (
                <span className="hm-tel">
                  <i>+591</i>
                  <input key="tel" id="hm-avisame-contacto" name="contacto" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="71234567" required />
                </span>
              ) : (
                <input key="mail" id="hm-avisame-contacto" name="contacto" type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" required />
              )}
            </label>
            <fieldset className="hm-chips">
              <legend>¿Dónde vives? (opcional)</legend>
              {CIUDADES.map((c) => (
                <label key={c} className={ciudad === c ? 'is-on' : ''}>
                  <input type="radio" name="ciudad" value={c} checked={ciudad === c} onChange={() => setCiudad(c)} />
                  {c}
                </label>
              ))}
            </fieldset>
            <input className="hm-hp" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {msg ? <p className="hm-dlg-err">{msg}</p> : null}
            {estado === 'error' ? (
              <p className="hm-dlg-err" role="alert">
                No pudimos guardar tus datos. Prueba de nuevo o escríbenos por WhatsApp al <b>{CONTACTO.whatsappTexto}</b>.
              </p>
            ) : null}
            <button type="submit" className="hm-btn hm-dlg-send" disabled={estado === 'enviando'} data-medir="avisame_enviar">
              {estado === 'enviando' ? 'Guardando…' : 'Avísame'}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
