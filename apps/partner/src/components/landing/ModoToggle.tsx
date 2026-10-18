'use client';
import { useState } from 'react';

// Alterna las capturas de "Así se ve Camina" entre modo oscuro (por defecto) y claro.
export default function ModoToggle() {
  const [claro, setClaro] = useState(false);

  function cambiar(valor: boolean) {
    setClaro(valor);
    document.getElementById('app')?.setAttribute('data-modo', valor ? 'claro' : 'oscuro');
  }

  return (
    <div className="modo-toggle" role="group" aria-label="Modo de la app">
      <button type="button" aria-pressed={!claro} onClick={() => cambiar(false)}>Oscuro</button>
      <button type="button" aria-pressed={claro} onClick={() => cambiar(true)}>Claro</button>
    </div>
  );
}
