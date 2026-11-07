'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';

type Tema = 'auto' | 'light' | 'dark';

const OPCIONES: { id: Tema; label: string; icon: typeof Sun }[] = [
  { id: 'auto', label: 'Auto', icon: MonitorSmartphone },
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
];

function aplicar(t: Tema) {
  const el = document.documentElement;
  if (t === 'auto') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
  try {
    if (t === 'auto') localStorage.removeItem('camina-theme');
    else localStorage.setItem('camina-theme', t);
  } catch {
    // sin almacenamiento: el cambio vale solo para esta visita
  }
}

// Botón de tema del panel: Auto (sigue al teléfono o navegador), Claro u Oscuro. Recuerda la elección en este navegador.
export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('auto');

  useEffect(() => {
    try {
      const t = localStorage.getItem('camina-theme');
      if (t === 'light' || t === 'dark') setTema(t);
    } catch {
      // ignorar
    }
  }, []);

  return (
    <div className="px-3 py-2">
      <p className="text-[#E4DDF7] text-[12px] mb-1.5">Apariencia</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.08)' }} role="group" aria-label="Apariencia del panel">
        {OPCIONES.map(({ id, label, icon: Icon }) => {
          const activo = tema === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={activo}
              onClick={() => {
                setTema(id);
                aplicar(id);
              }}
              className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[12px] font-semibold"
              style={activo ? { background: '#7FEDC4', color: '#12281F' } : { color: '#E4DDF7' }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
