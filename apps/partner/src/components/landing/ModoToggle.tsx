'use client';
import { useState } from 'react';

// Alterna las capturas de una galería (la sección con id `target`) entre modo oscuro (por defecto) y claro.
export default function ModoToggle({ target = 'app' }: { target?: string }) {
  const [claro, setClaro] = useState(false);

  function cambiar(valor: boolean) {
    setClaro(valor);
    document.getElementById(target)?.setAttribute('data-modo', valor ? 'claro' : 'oscuro');
  }

  return (
    <div className="modo-toggle" role="group" aria-label="Modo de la app">
      <button type="button" aria-pressed={!claro} onClick={() => cambiar(false)}>Oscuro</button>
      <button type="button" aria-pressed={claro} onClick={() => cambiar(true)}>Claro</button>
    </div>
  );
}
