import { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import {
  Burst, CAMINA_SPARKS, display, Eyebrow, LinkButton, MainButton, Reveal, Stage, Stamp, usePalette, useTimeline,
} from '@/components/challenge/ChallengeCinematics';
import { RutaRing } from '@/components/ruta/RutaRing';
import { buzz } from '@/lib/haptics';

export type RutaDoneCinematic = {
  kind: 'ruta-done';
  month: string; // "noviembre"
  monthShort: string; // "NOV"
  stops: { name: string; logo_url: string | null }[];
  ticket: number | null;
  prize?: string | null;
  onSeeBadge?: () => void;
};

// Ruta completada: los 3 locales se marcan uno por uno, el aro del mes se llena y se ven los premios.
export function RutaDoneScene({ c, onDone }: { c: RutaDoneCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3600);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(650, buzz.light);
    tl.at(950, buzz.light);
    tl.at(1250, buzz.light);
    tl.at(1700, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const premios = [
    `Insignia de ${c.month}`,
    c.ticket ? `Boleto N.º ${c.ticket} del sorteo${c.prize ? `: ${c.prize}` : ''}` : 'Boleto para el sorteo',
    'Tu Día doble del mes que viene',
  ];
  return (
    <Stage tl={tl} announce={`¡Completaste tu Ruta de ${c.month}! Ganaste ${premios.join(', ')}.`} confetti={{ at: 1750, palette: CAMINA_SPARKS }}>
      <Reveal tl={tl} delay={150}><Eyebrow color={p.muted}>{`Tu Ruta de ${c.month}`}</Eyebrow></Reveal>

      {/* Los 3 locales, cada uno con su ✓ */}
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 18 }}>
        {c.stops.slice(0, 3).map((s, i) => (
          <Reveal key={s.name + i} tl={tl} delay={300 + i * 120} pop from={0.6} style={{ alignItems: 'center', width: 72 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#62F0B6', overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              {s.logo_url ? <Image source={{ uri: s.logo_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 22 }}>{s.name.trim()[0]?.toUpperCase()}</Text>}
            </View>
            <Stamp tl={tl} delay={650 + i * 300} style={{ position: 'absolute', top: -4, right: 2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#62F0B6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: p.dark ? '#1c1030' : '#fff' }}>
                <Text style={{ color: '#14093a', fontWeight: '900', fontSize: 12 }}>✓</Text>
              </View>
            </Stamp>
            <Text style={{ color: p.text, fontSize: 11.5, fontWeight: '700', marginTop: 5 }} numberOfLines={1}>{s.name}</Text>
          </Reveal>
        ))}
      </View>

      {/* El aro del mes, lleno */}
      <Reveal tl={tl} delay={1500} pop from={0.4} style={{ marginTop: 22 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <RutaRing size={150} done={3} month={c.monthShort} />
          <Burst tl={tl} delay={1650} palette={CAMINA_SPARKS} count={16} radius={110} style={{ left: '50%', top: '50%' }} />
        </View>
      </Reveal>

      <Reveal tl={tl} delay={1900} pop from={0.6} style={{ marginTop: 18 }}>
        <Text style={{ ...display(28), color: p.text, textAlign: 'center' }}>¡Ruta completada!</Text>
      </Reveal>
      <View style={{ marginTop: 10, alignSelf: 'stretch', gap: 8 }}>
        {premios.map((t, i) => (
          <Reveal key={t} tl={tl} delay={2150 + i * 160}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassLine }}>
              <Text style={{ color: p.accent, fontWeight: '900', fontSize: 15 }}>✓</Text>
              <Text style={{ color: p.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={2}>{t}</Text>
            </View>
          </Reveal>
        ))}
      </View>
      <Reveal tl={tl} delay={2800} dy={20} style={{ alignSelf: 'stretch', marginTop: 18 }}>
        <MainButton label="Ver mi insignia" onPress={() => { onDone(); c.onSeeBadge?.(); }} />
        <LinkButton label="Listo" onPress={onDone} color={p.accent} />
      </Reveal>
    </Stage>
  );
}
