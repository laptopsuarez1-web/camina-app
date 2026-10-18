'use client';
import { useEffect, useState } from 'react';

// Cambia las capturas de la app entre modo claro y oscuro (solo donde hay captura oscura).
export default function CapToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('camina_cap') === 'dark') {
        document.documentElement.dataset.cap = 'dark';
        setDark(true);
      }
    } catch {}
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.cap = next ? 'dark' : 'light';
    try { localStorage.setItem('camina_cap', next ? 'dark' : 'light'); } catch {}
  }

  return (
    <button type="button" className="cap-toggle" onClick={toggle} aria-pressed={dark} aria-label="Ver la app en modo oscuro">
      <span aria-hidden>{dark ? '☀️' : '🌙'}</span>
      <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
