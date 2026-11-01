import { useMemo, useState } from 'react';
import { CardShareSheet, Seg, Toggle } from '@/components/share/CardShareSheet';
import { ResumenCard } from '@/components/share/cards';
import { computeShareStats, type SharePeriod } from '@/lib/share-stats';

// Compartir el resumen del día, la semana o el mes (Actividad). Por defecto no lleva el nombre de la persona.
export function ResumenShareSheet({
  visible, onClose, byDay, goalFor, openedDays, streak, weeklyRank, firstName,
}: {
  visible: boolean;
  onClose: () => void;
  byDay: Map<string, number>;
  goalFor: (key: string) => number;
  openedDays: Set<string>;
  streak: number;
  weeklyRank: number | null;
  firstName: string | null;
}) {
  const [period, setPeriod] = useState<SharePeriod>('week');
  const [withName, setWithName] = useState(false);
  const [withRank, setWithRank] = useState(true);

  // Se recalcula al abrir la hoja (o cambiar el período): así el día y la hora son los de ese momento.
  const stats = useMemo(
    () => computeShareStats({ period, today: new Date(), byDay, goalFor, openedDays }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, byDay, openedDays, visible],
  );

  return (
    <CardShareSheet
      visible={visible}
      onClose={onClose}
      title="Compartir mi progreso"
      filename={`camina-${period === 'day' ? 'dia' : period === 'week' ? 'semana' : 'mes'}`}
      extras={
        <>
          <Seg
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[{ value: 'day', label: 'Hoy' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]}
          />
          {firstName ? <Toggle label="Mostrar mi nombre" hint="Si lo apagas, la tarjeta no lleva tu nombre." value={withName} onChange={setWithName} /> : null}
          {weeklyRank && period !== 'day' ? <Toggle label="Mostrar mi puesto en el ranking" hint="Tu puesto de esta semana entre todos los caminantes." value={withRank} onChange={setWithRank} /> : null}
        </>
      }
      render={({ theme, format }) => (
        <ResumenCard
          theme={theme}
          format={format}
          data={{ stats, streak, weeklyRank: withRank && period !== 'day' ? weeklyRank : null, name: withName ? firstName : null }}
        />
      )}
    />
  );
}
