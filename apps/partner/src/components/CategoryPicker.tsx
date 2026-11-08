'use client';

import { useEffect, useRef, useState } from 'react';
import { buscarCategorias } from '@/lib/categories';

// Elegir la categoría del local escribiendo: hay muchas, así que en vez de una lista larga se busca
// ("jugo" → "Batidos & Jugos") y se toca una. No hay "Otra": siempre se elige una de la lista.
export default function CategoryPicker({
  value,
  onChange,
  actual,
  className = '',
}: {
  value: string;
  onChange: (c: string) => void;
  actual?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const lista = buscarCategorias(q, actual);

  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [open]);

  function abrir() {
    setOpen(true);
    setQ('');
    setHi(0);
  }
  function cerrar() {
    setOpen(false);
    setQ('');
  }
  function elegir(c: string) {
    onChange(c);
    cerrar();
    field.current?.blur();
  }

  return (
    <div ref={box} className="relative">
      <input
        ref={field}
        role="combobox"
        aria-expanded={open}
        aria-controls="categorias-lista"
        aria-label="Buscar categoría"
        value={open ? q : value}
        placeholder={open ? `${value} · escribe para buscar` : 'Elige una categoría'}
        onFocus={abrir}
        onClick={() => !open && abrir()}
        onChange={(e) => {
          setQ(e.target.value);
          setHi(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, lista.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (lista[hi]) elegir(lista[hi]);
          } else if (e.key === 'Escape') {
            cerrar();
            field.current?.blur();
          }
        }}
        className={`w-full border rounded-[10px] pl-3 pr-9 py-2.5 text-[13.5px] ${open ? 'border-purple' : 'border-line'} ${className}`}
      />
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && (
        <ul
          id="categorias-lista"
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-[260px] overflow-y-auto bg-card border border-line rounded-[10px] shadow-lg py-1"
        >
          {lista.length === 0 ? (
            <li className="px-3 py-2.5 text-[12.5px] text-muted">
              No encontramos &quot;{q}&quot;. Prueba con otra palabra (por ejemplo: bar, jugos, belleza).
            </li>
          ) : (
            lista.map((c, i) => (
              <li
                key={c}
                role="option"
                aria-selected={c === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(c);
                }}
                onMouseEnter={() => setHi(i)}
                className={`px-3 py-2 text-[13.5px] cursor-pointer flex items-center justify-between ${i === hi ? 'bg-purple-light' : ''} ${c === value ? 'font-semibold text-purple' : 'text-text'}`}
              >
                {c}
                {c === value && <span aria-hidden>✓</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
