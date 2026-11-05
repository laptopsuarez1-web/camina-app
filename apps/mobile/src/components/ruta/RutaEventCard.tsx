import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { RutaRing } from './RutaRing';
import { RutaPin } from './RutaPin';
import { rutaDone, rutaMonthName, rutaMonthShort, type RutaState } from '@/hooks/useRuta';

// Lugares fijos de los pines del fondo (no son las ubicaciones reales: el fondo solo muestra que participan varios locales,
// sin decir cuáles te tocaron).
const SPOTS = [[0.14, 0.1], [0.62, 0.06], [0.38, 0.22], [0.8, 0.26], [0.08, 0.36], [0.55, 0.4], [0.28, 0.02], [0.86, 0.02]];

// Tarjeta grande del evento del mes, arriba de todo en Eventos.
export function RutaEventCard({ state, width, onParticipate, onOpen }: {
  state: RutaState; width: number; onParticipate: () => void; onOpen: () => void;
}) {
  const height = Math.round(width * 1.25);
  const month = rutaMonthName(state.month);
  const done = rutaDone(state);
  const end = Number(state.ends_on.slice(8, 10));
  return (
    <Press accessibilityRole="button" accessibilityLabel={`Evento del mes: tu Ruta de ${month}`} onPress={onOpen} haptic="light"
      style={{ width, height, borderRadius: 30, overflow: 'hidden', backgroundColor: '#1a1330', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
      {state.locales.slice(0, SPOTS.length).map((l, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: SPOTS[i][0] * width, top: 50 + SPOTS[i][1] * height, opacity: 0.9 }}>
          <RutaPin name={l.name} logoUrl={l.logo_url} size={34} route={false} />
        </View>
      ))}
      <LinearGradient pointerEvents="none" colors={['rgba(26,19,48,0.15)', 'rgba(32,10,82,0.92)', '#200A52']} locations={[0.2, 0.55, 1]} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: 16, top: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#62F0B6' }}>
        <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 11.5, letterSpacing: 1 }}>EVENTO DEL MES</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 86, alignItems: 'center', paddingHorizontal: 16 }}>
        <RutaRing size={80} done={state.joined ? done : 3} month={rutaMonthShort(state.month)} />
        <Text style={{ ...heavy(), fontSize: 24, color: '#fff', marginTop: 12, textAlign: 'center' }}>
          TU RUTA DE <Text style={{ ...heavy(), fontSize: 24, color: '#62F0B6' }}>{month.toUpperCase()}</Text>
        </Text>
        <Text style={{ color: '#C4B8E8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
          {state.completed_at
            ? '¡Completaste tu ruta de este mes!'
            : state.joined
              ? `Vas ${done} de 3 locales · hasta el ${end} de ${month}`
              : `Te tocan 3 locales al azar · hasta el ${end} de ${month}`}
        </Text>
      </View>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 10 }}>
        <Press accessibilityRole="button" onPress={state.joined ? onOpen : onParticipate} haptic="light"
          style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#62F0B6' }}>
          <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>{state.joined ? 'Ver mi ruta' : 'Participar'}</Text>
        </Press>
        {!state.joined && (
          <Press accessibilityRole="button" onPress={onOpen} style={{ width: 120, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Ver detalles</Text>
          </Press>
        )}
      </View>
    </Press>
  );
}
