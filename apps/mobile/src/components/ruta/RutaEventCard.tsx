import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { Press } from '@/components/ui/Press';
import { RutaRing } from './RutaRing';
import { RutaMiniMap } from './RutaMiniMap';
import { participationLabel, rutaDone, rutaTimeLeft, showParticipation, rutaMonthName, rutaMonthShort, useRutaParticipation, useRutaPrize, type RutaState } from '@/hooks/useRuta';

// Tarjeta grande del evento del mes, arriba de todo en Eventos.
export function RutaEventCard({ state, width, onParticipate, onOpen }: {
  state: RutaState; width: number; onParticipate: () => void; onOpen: () => void;
}) {
  const height = Math.round(width * 1.25);
  const month = rutaMonthName(state.month);
  const done = rutaDone(state);
  const end = Number(state.ends_on.slice(8, 10));
  const { data: prize } = useRutaPrize(state.month);
  const { data: participation } = useRutaParticipation(state.month);
  return (
    <Press accessibilityRole="button" accessibilityLabel={`Evento del mes: tu Ruta de ${month}`} onPress={onOpen} haptic="light"
      style={{ width, height, borderRadius: 30, overflow: 'hidden', backgroundColor: '#1a1330', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
      {/* Antes de participar, pines sorpresa. Ya con ruta, tus 3 locales con su logo. */}
      {state.joined && state.stops.length > 0
        ? <RutaMiniMap places={state.stops} padBottom={height * 0.45} pinSize={34} route />
        : <RutaMiniMap places={state.locales} padBottom={height * 0.45} pinSize={30} mystery />}
      <LinearGradient pointerEvents="none" colors={['rgba(22,17,31,0.05)', 'rgba(22,17,31,0.25)', 'rgba(32,10,82,0.94)', '#200A52']} locations={[0, 0.35, 0.62, 1]} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: 16, top: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#62F0B6' }}>
        <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 11.5, letterSpacing: 1 }}>EVENTO DEL MES</Text>
      </View>
      {!prize || !prize.drawn_at ? (
        // El sorteo, siempre a la vista desde la tarjeta: con su premio si ya está cargado o "Premio por anunciar".
        <View style={{ position: 'absolute', right: 16, top: 16, maxWidth: width * 0.48, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(26,20,38,0.88)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.5)' }}>
          <Text style={{ color: '#62F0B6', fontWeight: '800', fontSize: 9.5, letterSpacing: 1 }}>SORTEO</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }} numberOfLines={1}>{prize?.title ?? 'Premio por anunciar'}</Text>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 80, alignItems: 'center', paddingHorizontal: 16 }}>
        <RutaRing size={80} done={state.joined ? done : 3} month={rutaMonthShort(state.month)} themeMonth={state.completed_at ? state.month : null} />
        <Text style={{ ...heavy(), fontSize: 24, color: '#fff', marginTop: 12, textAlign: 'center' }}>
          TU RUTA DE <Text style={{ ...heavy(), fontSize: 24, color: '#62F0B6' }}>{month.toUpperCase()}</Text>
        </Text>
        <Text style={{ color: '#C4B8E8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
          {state.completed_at
            ? '¡Completaste tu ruta de este mes!'
            : state.joined
              ? `Vas ${done} de 3 locales · ${rutaTimeLeft(state.ends_on)}`
              : `Te tocan 3 locales al azar · hasta el ${end} de ${month}`}
        </Text>
        {state.joined && !state.completed_at ? (
          <Text style={{ color: '#62F0B6', fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
            Completa los 3 y gana Día doble, insignia y boleto del sorteo
          </Text>
        ) : null}
        {showParticipation(participation) ? (
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(98,240,182,0.12)' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#62F0B6' }} />
            <Text style={{ color: '#62F0B6', fontSize: 12, fontWeight: '800' }}>{participationLabel(participation.participants)}</Text>
          </View>
        ) : null}
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
// Tocar la tarjeta abre los detalles; el botón "Participar" anota directo y muestra cómo llegan tus 3 locales.
export function RutaHomeCard({ state, onOpen, onParticipate }: { state: RutaState; onOpen: () => void; onParticipate?: () => void }) {
  const month = rutaMonthName(state.month);
  const done = rutaDone(state);
  const end = Number(state.ends_on.slice(8, 10));
  return (
    <Press accessibilityRole="button" accessibilityLabel={`Evento del mes: tu Ruta de ${month}`} onPress={onOpen} haptic="light"
      className="mx-5 mb-4" style={{ height: 176, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(98,240,182,0.28)', backgroundColor: '#17112a' }}>
      {/* El centro de la ciudad de fondo: pines sorpresa antes de participar; ya con ruta, tus 3 locales con su logo. */}
      {state.joined && state.stops.length > 0
        ? <RutaMiniMap places={state.stops} pinSize={28} padBottom={98} route />
        : <RutaMiniMap places={state.locales} pinSize={24} padBottom={98} mystery />}
      <LinearGradient pointerEvents="none" colors={['rgba(32,10,82,0.05)', 'rgba(32,10,82,0.55)', '#200A52']} locations={[0, 0.45, 0.72]} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: 12, top: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#62F0B6' }}>
        <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 10.5, letterSpacing: 1 }}>EVENTO DEL MES</Text>
      </View>
      <View className="flex-row items-center" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, gap: 12 }}>
        <RutaRing size={54} done={state.joined ? done : 3} month={rutaMonthShort(state.month)} glow={false} themeMonth={state.completed_at ? state.month : null} />
        <View className="flex-1">
          <Text style={{ ...heavy(), color: '#fff', fontSize: 16, lineHeight: 19 }}>TU RUTA DE {month.toUpperCase()}</Text>
          <Text style={{ color: '#C4B8E8', fontSize: 12.5, lineHeight: 16, marginTop: 2 }} numberOfLines={2}>
            {state.completed_at ? '¡Completaste tu ruta!' : state.joined ? `Vas ${done} de 3 locales · ${rutaTimeLeft(state.ends_on)}` : `3 locales sorpresa · hasta el ${end}`}
          </Text>
        </View>
        <Press accessibilityRole="button" onPress={!state.joined && onParticipate ? onParticipate : onOpen} haptic="light" hitSlop={6}
          style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14, backgroundColor: '#62F0B6' }}>
          <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 13 }}>{state.joined ? 'Ver mi ruta' : 'Participar'}</Text>
        </Press>
      </View>
    </Press>
  );
}
