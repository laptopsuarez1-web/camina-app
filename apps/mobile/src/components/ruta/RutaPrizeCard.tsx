import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { rutaMonthName, type RutaPrize } from '@/hooks/useRuta';

const MINT = '#62F0B6';

// Premio del sorteo del mes (lo carga el admin). Foto grande si hay, quién lo regala y cuántos ganan.
export function RutaPrizeCard({ prize, compact = false }: { prize: RutaPrize; compact?: boolean }) {
  const who = prize.sponsor?.name ?? 'Camina';
  const drawn = !!prize.drawn_at;
  return (
    <View style={{ marginTop: compact ? 12 : 16, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(98,240,182,0.45)', backgroundColor: '#241748' }}>
      {prize.image_url && !compact ? (
        <View style={{ height: 150 }}>
          <Image source={{ uri: prize.image_url }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} />
          <LinearGradient pointerEvents="none" colors={['rgba(36,23,72,0)', '#241748']} locations={[0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
        </View>
      ) : null}
      <View style={{ padding: 14, paddingTop: prize.image_url && !compact ? 0 : 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {compact && prize.image_url ? (
          <Image source={{ uri: prize.image_url }} cachePolicy="memory-disk" contentFit="cover" style={{ width: 52, height: 52, borderRadius: 14 }} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: MINT, fontWeight: '800', fontSize: 11, letterSpacing: 1.3 }}>{drawn ? `GANADORES DEL SORTEO DE ${rutaMonthName(prize.month).toUpperCase()}` : 'PREMIO DEL SORTEO'}</Text>
          <Text style={{ ...heavy(), color: '#fff', fontSize: compact ? 15 : 18, lineHeight: compact ? 19 : 22, marginTop: 2 }} numberOfLines={2}>{prize.title}</Text>
          {drawn ? (
            <Text style={{ color: '#C4B8E8', fontSize: 12.5, marginTop: 3 }}>
              {prize.winners.length ? prize.winners.map((w) => `${w.name} (N.º ${w.ticket_no})`).join(' · ') : 'Nadie completó la ruta este mes.'}
            </Text>
          ) : (
            <Text style={{ color: '#C4B8E8', fontSize: 12.5, marginTop: 3 }}>
              Lo regala {who} · {prize.winners_count === 1 ? '1 ganador' : `${prize.winners_count} ganadores`} · se sortea al terminar el mes
            </Text>
          )}
          {!compact && !drawn && prize.detail ? <Text style={{ color: '#8E82AE', fontSize: 12, marginTop: 4 }}>{prize.detail}</Text> : null}
        </View>
      </View>
    </View>
  );
}
