'use client';

import { useEffect, useId, useRef } from 'react';
import { X, Search, type LucideIcon } from 'lucide-react';

// Piezas visuales del módulo de Gestión. Usan los mismos colores del panel (globals.css), claro y oscuro.

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className, pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return <div className={cx('bg-card border border-line rounded-2xl', pad && 'p-4 sm:p-5', className)}>{children}</div>;
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="font-bold text-[14.5px] m-0">{children}</h2>
      {action}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-semibold rounded-[10px] transition-[opacity,transform,background-color] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        size === 'sm' ? 'h-9 px-3 text-[12.5px]' : 'h-11 px-4 text-[13.5px]',
        variant === 'primary' && 'gx-btn-primary',
        variant === 'secondary' && 'bg-card border border-line text-text hover:bg-purple-light',
        variant === 'ghost' && 'text-text hover:bg-purple-light',
        variant === 'danger' && 'gx-btn-danger',
        className
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[12.5px] font-semibold mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full bg-white border border-line rounded-[10px] px-3 h-11 text-[13.5px] outline-none focus:border-purple focus:ring-2 focus:ring-purple/20';
export const textareaCls =
  'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px] outline-none focus:border-purple focus:ring-2 focus:ring-purple/20';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar…'}
        aria-label={placeholder ?? 'Buscar'}
        className={cx(inputCls, 'pl-9')}
      />
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info'; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        tone === 'neutral' && 'bg-purple-light text-muted',
        tone === 'ok' && 'bg-aqua-light gx-text-ok',
        tone === 'warn' && 'bg-warn-light gx-text-warn',
        tone === 'danger' && 'gx-bg-danger gx-text-danger',
        tone === 'info' && 'bg-purple-light gx-text-purple'
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  delta,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted text-[12px] font-medium truncate">{label}</p>
        {Icon && <Icon size={15} className="text-muted shrink-0" aria-hidden />}
      </div>
      <p className="text-[24px] sm:text-[26px] font-extrabold tracking-tight mt-1 tabular-nums truncate">{value}</p>
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted min-h-[16px]">
        {delta != null && Number.isFinite(delta) && (
          <span className={cx('font-semibold', delta >= 0 ? 'gx-text-ok' : 'gx-text-danger')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-purple-light flex items-center justify-center mx-auto mb-3">
          <Icon size={20} className="text-muted" aria-hidden />
        </div>
      )}
      <p className="font-bold text-[14px]">{title}</p>
      {text && <p className="text-muted text-[13px] mt-1 max-w-[360px] mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse bg-purple-light rounded-lg', className)} />;
}

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'ok' | 'danger'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'rounded-[10px] px-3 py-2.5 text-[12.5px]',
        tone === 'warn' && 'bg-warn-light gx-text-warn',
        tone === 'ok' && 'bg-aqua-light gx-text-ok',
        tone === 'danger' && 'gx-bg-danger gx-text-danger'
      )}
    >
      {children}
    </p>
  );
}

// Hoja modal: en celular sube desde abajo, en compu queda centrada.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/45 gx-fade" onClick={onClose} tabIndex={-1} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cx(
          'relative bg-card w-full max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl gx-rise',
          wide ? 'sm:max-w-[680px]' : 'sm:max-w-[480px]'
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <h2 id={id} className="font-bold text-[16px] m-0">
            {title}
          </h2>
          <button type="button" data-close onClick={onClose} aria-label="Cerrar" className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full hover:bg-purple-light">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex bg-purple-light rounded-[10px] p-1 gap-1 max-w-full overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 px-3 rounded-[8px] text-[12.5px] font-semibold whitespace-nowrap transition-colors',
            value === o.value ? 'bg-card text-text shadow-sm' : 'text-muted'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ text }: { text: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-purple-light gx-text-purple flex items-center justify-center text-[12px] font-bold shrink-0" aria-hidden>
      {text || '·'}
    </div>
  );
}
