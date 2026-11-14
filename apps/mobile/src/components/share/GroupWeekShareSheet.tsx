import { useMemo, useState } from 'react';
import { CardShareSheet, Toggle } from '@/components/share/CardShareSheet';
import { GroupWeekCard } from '@/components/share/cards';

// Compartir el resultado de la semana pasada del grupo (quién ganó y en qué puesto quedaste).
// Como en el ranking: los compañeros salen con su inicial salvo que se active «Mostrar nombres».
export function GroupWeekShareSheet({
  visible, onClose, groupName, weekLabel, rows, userId, inviteCode,
}: {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  weekLabel: string;
  rows: { user_id: string; name: string; steps: number }[];
  userId: string | undefined;
  inviteCode?: string | null;
}) {
  const [withNames, setWithNames] = useState(true);
  const [invite, setInvite] = useState(true);
  const data = useMemo(() => ({
    groupName,
    weekLabel,
    rows: rows.map((r) => ({
      id: r.user_id,
      steps: r.steps,
      isMe: r.user_id === userId,
      label: r.user_id === userId || withNames ? r.name.trim().split(/\s+/)[0] || 'Caminante' : (r.name.trim()[0] ?? 'C').toUpperCase(),
    })),
    total: rows.reduce((a, r) => a + r.steps, 0),
    inviteCode: invite ? inviteCode ?? null : null,
  }), [groupName, weekLabel, rows, userId, withNames, invite, inviteCode]);
  return (
    <CardShareSheet
      visible={visible}
      onClose={onClose}
      title="Compartir la semana"
      filename="camina-semana-grupo"
      extras={
        <>
          <Toggle label="Mostrar nombres" hint="Apagado: tus compañeros salen solo con su inicial." value={withNames} onChange={setWithNames} />
          {inviteCode ? <Toggle label="Invitar a sumarse" hint="Pone el código del grupo para que se unan desde la app." value={invite} onChange={setInvite} /> : null}
        </>
      }
      render={({ theme, format }) => <GroupWeekCard theme={theme} format={format} data={data} />}
    />
  );
}
