import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { RutaRing } from './RutaRing';
import { RutaMiniMap } from './RutaMiniMap';
import { MysteryPin } from './RutaPin';
import { rutaDone, rutaMonthName, rutaMonthShort, type RutaState } from '@/hooks/useRuta';

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
      <RutaMiniMap places={state.locales} padBottom={height * 0.45} pinSize={30} mystery />
      <LinearGradient pointerEvents="none" colors={['rgba(22,17,31,0.05)', 'rgba(22,17,31,0.25)', 'rgba(32,10,82,0.94)', '#200A52']} locations={[0, 0.35, 0.62, 1]} style={{ position: 'absolute', inset: 0 }} />
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

// Versión corta para Inicio: el evento del mes siempre a mano, sin tapar el resto.
export function RutaHomeCard({ state, onOpen }: { state: RutaState; onOpen: () => void }) {
  const month = rutaMonthName(state.month);
  const done = rutaDone(state);
  const end = Number(state.ends_on.slice(8, 10));
  return (
    <Press accessibilityRole="button" accessibilityLabel={`Evento del mes: tu Ruta de ${month}`} onPress={onOpen} haptic="light"
      className="mx-5 mb-4" style={{ borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(98,240,182,0.28)' }}>
      <LinearGradient colors={['#3B2577', '#200A52']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      {/* Un pin sorpresa de fondo, detrás del aro (no tapa el texto ni el botón). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 52, top: -10, opacity: 0.35 }}><MysteryPin size={22} /></View>
      <View className="flex-row items-center" style={{ padding: 14, gap: 14 }}>
        <RutaRing size={62} done={state.joined ? done : 3} month={rutaMonthShort(state.month)} glow={false} />
        <View className="flex-1">
          <Text style={{ color: '#62F0B6', fontWeight: '800', fontSize: 11, letterSpacing: 1.2 }}>EVENTO DEL MES</Text>
          <Text style={{ ...heavy(), color: '#fff', fontSize: 16, lineHeight: 19, marginTop: 2 }}>TU RUTA DE {month.toUpperCase()}</Text>
          <Text style={{ color: '#C4B8E8', fontSize: 12.5, lineHeight: 16, marginTop: 3 }} numberOfLines={2}>
            {state.completed_at ? '¡Completaste tu ruta!' : state.joined ? `Vas ${done} de 3 locales · hasta el ${end}` : `3 locales sorpresa · hasta el ${end}`}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#62F0B6' }}>
          <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 13 }}>{state.joined ? 'Ver' : 'Participar'}</Text>
        </View>
      </View>
    </Press>
  );
}
