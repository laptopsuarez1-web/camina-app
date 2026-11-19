'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CONTACTO } from './data';

// Formulario "Avísame cuando salga": solo el correo y, si quiere, la ciudad.
// Lo abre cualquier botón con data-avisame. Sin JavaScript, esos botones llevan a la sección de cierre.
const CIUDADES = ['Tarija', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Otra'];
type Estado = 'form' | 'enviando' | 'listo' | 'error';

export default function Avisame() {
  const dlg = useRef<HTMLDialogElement>(null);
  const [estado, setEstado] = useState<Estado>('form');
  const [email, setEmail] = useState('');
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
    const correo = String(fd.get('email') || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      setMsg('Revisa tu correo: parece que le falta algo.');
      return;
    }
    setMsg('');
    setEstado('enviando');
    try {
      const r = await fetch('/api/avisame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo, ciudad: ciudad || null, web: fd.get('web') }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setEmail(correo);
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
              Te escribimos a <b>{email}</b> apenas Camina esté en App Store y Google Play.
            </p>
            <button type="button" className="hm-btn" onClick={cerrar}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h2 id="hm-avisame-t">Te avisamos cuando salga.</h2>
            <p className="hm-dlg-sub">Un solo correo, el día que Camina esté en tu tienda. Nada más.</p>
            <label className="hm-field" htmlFor="hm-avisame-email">
              <span>Tu correo</span>
              <input id="hm-avisame-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" required />
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
                No pudimos guardar tu correo. Prueba de nuevo o escríbenos a <b>{CONTACTO.email}</b>.
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
