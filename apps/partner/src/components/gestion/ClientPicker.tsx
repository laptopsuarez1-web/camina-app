'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fullName, initials, matchesSearch, type Client } from '@/lib/gestion';
import { useGestion } from './GestionShell';
import { Avatar, Badge, cx, inputCls } from './ui';

const COLS = 'id, business_id, first_name, last_name, phone, email, registered_at, service_id, status, notes, custom, created_by_email, created_at';

export async function searchClients(businessId: string, q: string, limit = 20): Promise<Client[]> {
  let query = supabase.from('gestion_clients').select(COLS).eq('business_id', businessId);
  const clean = q.trim().replace(/[%_,()\\*]/g, ' ').trim();
  // El servidor filtra por la palabra más larga; el resto de las palabras se filtra acá.
  const words = clean ? clean.split(/\s+/) : [];
  const w = [...words].sort((a, b) => b.length - a.length)[0];
  if (w) query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%,phone.ilike.%${w}%,email.ilike.%${w}%`);
  const { data } = await query.order('first_name').limit(words.length > 1 ? limit * 5 : limit);
  return ((data as Client[]) ?? []).filter((c) => matchesSearch(c, clean)).slice(0, limit);
}

export async function getClient(id: string): Promise<Client | null> {
  const { data } = await supabase.from('gestion_clients').select(COLS).eq('id', id).maybeSingle();
  return (data as Client) ?? null;
}

// Buscador de clientes con teclado (flechas + Enter).
export function ClientPicker({ value, onChange, autoFocus }: { value: Client | null; onChange: (c: Client | null) => void; autoFocus?: boolean }) {
  const { business, settings } = useGestion();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) return;
    let alive = true;
    const t = setTimeout(() => {
      searchClients(business.id, q, 8).then((r) => {
        if (alive) {
          setItems(r);
          setActive(0);
        }
      });
    }, 160);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, business.id, value]);

  if (value) {
    return (
      <div className="flex items-center gap-3 border border-line rounded-[10px] px-3 py-2 bg-white">
        <Avatar text={initials(value)} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[13.5px] truncate">{fullName(value)}</p>
          <p className="text-[12px] text-muted truncate">{value.phone ?? value.email ?? ''}</p>
        </div>
        {value.status !== 'activo' && <Badge tone={value.status === 'suspendido' ? 'danger' : 'neutral'}>{value.status}</Badge>}
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-8 h-8 rounded-full hover:bg-purple-light flex items-center justify-center"
          aria-label={`Cambiar ${settings.client_singular.toLowerCase()}`}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-[14px] text-muted" aria-hidden />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && items[active]) {
            e.preventDefault();
            onChange(items[active]);
            setOpen(false);
          }
        }}
        placeholder={`Buscar ${settings.client_singular.toLowerCase()} por nombre o teléfono`}
        className={cx(inputCls, 'pl-9')}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-card border border-line rounded-xl shadow-xl max-h-[280px] overflow-y-auto p-1 m-0 list-none">
          {items.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">Sin resultados.</li>}
          {items.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setOpen(false);
              }}
              onMouseEnter={() => setActive(i)}
              className={cx('flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer', i === active && 'bg-purple-light')}
            >
              <Avatar text={initials(c)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold truncate">{fullName(c)}</p>
                <p className="text-[12px] text-muted truncate">{c.phone ?? c.email ?? '—'}</p>
              </div>
              {c.status !== 'activo' && <Badge tone={c.status === 'suspendido' ? 'danger' : 'neutral'}>{c.status}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
