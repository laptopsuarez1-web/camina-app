import { useMemo, useState } from 'react';
import { CardShareSheet, Toggle } from '@/components/share/CardShareSheet';
import { GroupCard } from '@/components/share/cards';
import { dayKey, rangeLabel } from '@/lib/share-stats';

// Compartir el ranking del grupo como imagen (pantalla del grupo). Los integrantes salen con su inicial; los nombres son opcionales
// y, si se activan, solo el primer nombre: nunca apellidos ni fotos de otras personas.
export function GroupShareImageSheet({
  visible, onClose, groupName, members, userId, target,
}: {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  members: { id: string; name: string; steps: number }[];
  userId: string | undefined;
  target: number;
}) {
  const [withNames, setWithNames] = useState(false);

  const data = useMemo(() => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return {
      groupName,
      weekLabel: rangeLabel(dayKey(monday), dayKey(sunday)),
      members: members.map((m) => ({
        id: m.id,
        steps: m.steps,
        isMe: m.id === userId,
        label: m.id === userId ? 'Tú' : withNames ? m.name.trim().split(/\s+/)[0] || 'Caminante' : (m.name.trim()[0] ?? 'C').toUpperCase(),
      })),
      target,
      total: members.reduce((a, m) => a + m.steps, 0),
    };
  }, [groupName, members, userId, target, withNames]);

  return (
    <CardShareSheet
      visible={visible}
      onClose={onClose}
      title="Compartir el ranking"
      filename="camina-grupo"
      extras={<Toggle label="Mostrar nombres" hint="Apagado: tus compañeros salen solo con su inicial." value={withNames} onChange={setWithNames} />}
      render={({ theme, format }) => <GroupCard theme={theme} format={format} data={data} />}
    />
  );
}
