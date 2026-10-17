'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  // Color del ojito: en las pantallas oscuras de acceso el campo es blanco y
  // el ícono va gris; en el registro (tarjeta clara) va violeta.
  iconClassName?: string;
};

// Campo de contraseña con el ojito para mostrar u ocultar lo que se escribió.
export default function PasswordInput({ className = '', iconClassName = 'text-muted', ...rest }: Props) {
  const [ver, setVer] = useState(false);
  const Icono = ver ? EyeOff : Eye;
  return (
    <div className="relative w-full">
      <input {...rest} type={ver ? 'text' : 'password'} className={`${className} w-full pr-12`} />
      <button
        type="button"
        onClick={() => setVer(!ver)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={ver}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg ${iconClassName}`}
      >
        <Icono size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
