'use client';

// Hora en formato de 24 horas (00:00 a 23:59). Se usa en vez de <input type="time">, que en
// computadoras configuradas en inglés muestra la hora de 12 con AM/PM y no se puede cambiar.
// Va de a 15 minutos, más el 23:59 para "hasta el cierre del día". Si el valor guardado no cae en
// esa grilla (un horario viejo), se agrega a la lista para no perderlo.
const HORAS = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  out.push('23:59');
  return out;
})();

export function TimeSelect({
  value,
  onChange,
  className,
  allowEmpty = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  allowEmpty?: boolean;
}) {
  const v = value ? value.slice(0, 5) : '';
  const opciones = v && !HORAS.includes(v) ? [...HORAS, v].sort() : HORAS;
  return (
    <select value={v} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowEmpty && <option value="">--:--</option>}
      {opciones.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}
