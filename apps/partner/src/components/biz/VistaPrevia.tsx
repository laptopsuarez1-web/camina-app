'use client';

import { useState } from 'react';
import { Eye, X } from 'lucide-react';

// Vista previa en vivo de lo que se está cargando (ficha del local o premio), tal como se ve en la app.
// En compu queda fija a la derecha del formulario; en el celular, un botón la abre en una hoja desde abajo.
export function VistaPrevia({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <aside className="biz-preview" aria-label={titulo}>
        <p className="biz-preview-t">
          <Eye size={14} /> {titulo}
        </p>
        <div className="biz-preview-phone">{children}</div>
        <p className="biz-preview-n">Se actualiza mientras escribes. Vista aproximada de la app.</p>
      </aside>
      <button type="button" className="biz-preview-btn" onClick={() => setAbierta(true)}>
        <Eye size={16} /> Ver vista previa
      </button>
      {abierta && (
        <div className="biz-sheet" role="dialog" aria-modal="true" aria-label={titulo}>
          <button type="button" className="biz-sheet-bg" aria-label="Cerrar vista previa" onClick={() => setAbierta(false)} />
          <div className="biz-sheet-in">
            <div className="biz-sheet-top">
              <b>{titulo}</b>
              <button type="button" aria-label="Cerrar" onClick={() => setAbierta(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="biz-preview-phone">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
