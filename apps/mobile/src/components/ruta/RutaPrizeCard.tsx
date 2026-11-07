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
      {/* Local protagonista del mes: el que regala el premio. Se destaca con su logo y una estrella dorada. */}
      {prize.sponsor && !drawn ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 14, padding: 10, borderRadius: 16, backgroundColor: 'rgba(226,179,60,0.10)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.45)' }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {prize.sponsor.logo_url
              ? <Image source={{ uri: prize.sponsor.logo_url }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} />
              : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 16 }}>{prize.sponsor.name.trim()[0]?.toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E2B33C', fontWeight: '800', fontSize: 10.5, letterSpacing: 1.2 }}>★ LOCAL PROTAGONISTA DEL MES</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{prize.sponsor.name}</Text>
            {!compact ? <Text style={{ color: '#C4B8E8', fontSize: 11.5 }}>Regala el premio para todos los que completen la Ruta</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
