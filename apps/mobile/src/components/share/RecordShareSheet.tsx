import { useState } from 'react';
import { CardShareSheet, Toggle } from '@/components/share/CardShareSheet';
import { RecordCard, type RecordData } from '@/components/share/cards';

// Compartir el récord personal (día con más pasos). Por defecto sin el nombre de la persona.
export function RecordShareSheet({ visible, onClose, data, firstName }: { visible: boolean; onClose: () => void; data: Omit<RecordData, 'name'>; firstName: string | null }) {
  const [withName, setWithName] = useState(false);
  return (
    <CardShareSheet
      visible={visible}
      onClose={onClose}
      title="Compartir mi récord"
      filename="camina-record"
      extras={firstName ? <Toggle label="Mostrar mi nombre" hint="Si lo apagas, la tarjeta no lleva tu nombre." value={withName} onChange={setWithName} /> : null}
      render={({ theme, format }) => <RecordCard theme={theme} format={format} data={{ ...data, name: withName ? firstName : null }} />}
    />
  );
}
