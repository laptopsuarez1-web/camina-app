import { Camera } from '@/components/icons';
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
  monthIso?: string; // "2026-12-01" (ya no cambia el color de la insignia)
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
          <RutaRing size={150} done={3} month={c.monthShort} themeMonth={c.monthIso} />
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

export type RutaStopDoneCinematic = {
  kind: 'ruta-stop';
  month: string;
  monthShort: string;
  name: string;
  logo_url: string | null;
  done: number; // cuántos van confirmados, con este (1 o 2)
  // Los 3 locales de la ruta, en orden, para la fila de casilleros (el de esta escena va marcado con `now`).
  stops?: { name: string; logo_url: string | null; done: boolean; now?: boolean }[];
  onShare?: () => void;
  onPhoto?: () => void;
};

// Casillero de la fila 1-2-3: vacío con "?", lleno con el logo, y el de ahora se llena con un salto.
function Slot({ tl, delay, s, n }: { tl: ReturnType<typeof useTimeline>; delay: number; s: { name: string; logo_url: string | null; done: boolean; now?: boolean }; n: number }) {
  const filled = (
    <View style={{ width: 54, height: 54, borderRadius: 15, borderWidth: 3, borderColor: '#62F0B6', overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      {s.logo_url ? <Image source={{ uri: s.logo_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 20 }}>{s.name.trim()[0]?.toUpperCase()}</Text>}
    </View>
  );
  const empty = (
    <View style={{ width: 54, height: 54, borderRadius: 15, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(196,184,232,0.55)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#C4B8E8', fontWeight: '900', fontSize: 20 }}>{n}</Text>
    </View>
  );
  return (
    <View style={{ alignItems: 'center', width: 64 }}>
      {s.now ? (
        <View>
          {empty}
          <Stamp tl={tl} delay={delay} style={{ position: 'absolute', left: 0, top: 0 }}>{filled}</Stamp>
          <Burst tl={tl} delay={delay + 40} palette={CAMINA_SPARKS} count={8} radius={44} style={{ left: 27, top: 27 }} />
        </View>
      ) : s.done ? filled : empty}
    </View>
  );
}

// Un local de la Ruta confirmado (1 de 3, 2 de 3): cae la "foto" del local como polaroid, le pegan el sello
// VISITADO, su casillero se llena en la fila de 3 y se suma un tramo del aro. Abajo: subir tu foto y compartir.
export function RutaStopDoneScene({ c, onDone }: { c: RutaStopDoneCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3200);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(650, buzz.medium);
    tl.at(1150, buzz.light);
    tl.at(1500, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const left = 3 - c.done;
  const slots = c.stops?.length === 3 ? c.stops : null;
  return (
    <Stage tl={tl} announce={`${c.name} confirmado. Vas ${c.done} de 3 en tu Ruta de ${c.month}.`} confetti={{ at: 700 }}>
      <Reveal tl={tl} delay={120}><Eyebrow color={p.muted}>{`Tu Ruta de ${c.month} · ${c.done} de 3`}</Eyebrow></Reveal>
      {/* La polaroid del local cae girando y se acomoda; el sello le cae encima. */}
      <Reveal tl={tl} delay={250} pop from={0.3} dy={-120} style={{ marginTop: 20 }}>
        <View style={{ transform: [{ rotate: '-4deg' }], padding: 9, paddingBottom: 14, borderRadius: 10, backgroundColor: '#FBF8FF', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
          <View style={{ position: 'absolute', top: -10, alignSelf: 'center', width: 70, height: 20, borderRadius: 3, backgroundColor: 'rgba(98,240,182,0.7)', transform: [{ rotate: '3deg' }], zIndex: 2 }} />
          <View style={{ width: 150, height: 150, borderRadius: 6, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {c.logo_url ? <Image source={{ uri: c.logo_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 54 }}>{c.name.trim()[0]?.toUpperCase()}</Text>}
          </View>
          <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 15, marginTop: 8, textAlign: 'center', maxWidth: 150 }} numberOfLines={1}>{c.name}</Text>
        </View>
        <Burst tl={tl} delay={680} palette={CAMINA_SPARKS} count={14} radius={110} style={{ left: '50%', top: '45%' }} />
      </Reveal>
      <Reveal tl={tl} delay={900} pop from={0.6} style={{ marginTop: 22 }}>
        <Text style={{ ...display(25), color: p.text, textAlign: 'center' }}>{`¡Sumaste ${c.name}!`}</Text>
      </Reveal>
      {slots ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {slots.map((s, i) => (
            <Reveal key={i} tl={tl} delay={1000 + i * 90} pop from={0.7}><Slot tl={tl} delay={1150} s={s} n={i + 1} /></Reveal>
          ))}
          <Reveal tl={tl} delay={1300} pop from={0.6} style={{ marginLeft: 6 }}>
            <RutaRing size={64} done={c.done} month={c.monthShort} />
          </Reveal>
        </View>
      ) : (
        <View style={{ marginTop: 16, width: 110, height: 110 }}>
          <Reveal tl={tl} delay={1000} style={{ position: 'absolute' }}><RutaRing size={110} done={c.done - 1} month={c.monthShort} glow={false} /></Reveal>
          <Reveal tl={tl} delay={1300} pop from={0.85} style={{ position: 'absolute' }}><RutaRing size={110} done={c.done} month={c.monthShort} /></Reveal>
        </View>
      )}
      <Reveal tl={tl} delay={1500}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 12, lineHeight: 20, maxWidth: 290 }}>
          {`${left === 1 ? 'Te falta 1 local' : `Te faltan ${left} locales`} para tu insignia y el boleto del sorteo. Guarda una foto de hoy en tu álbum.`}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={1750} dy={20} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        {c.onPhoto ? <MainButton label="Subir mi foto al álbum" icon={(c) => <Camera size={20} color={c} />} onPress={() => { onDone(); c.onPhoto?.(); }} /> : null}
        {c.onShare ? (c.onPhoto
          ? <LinkButton label="Compartir en historias" onPress={() => { onDone(); c.onShare?.(); }} color={p.accent} />
          : <MainButton label="Compartir en historias" onPress={() => { onDone(); c.onShare?.(); }} />) : null}
        <LinkButton label="Seguir mi ruta" onPress={onDone} color={p.muted} />
      </Reveal>
    </Stage>
  );
}
