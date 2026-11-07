import { Camera } from '@/components/icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import {
  Burst, CAMINA_SPARKS, display, Eyebrow, LinkButton, MainButton, Reveal, Stage, Stamp, useBeat, usePalette, useTimeline,
} from '@/components/challenge/ChallengeCinematics';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { heavy } from '@/components/ruta/heavy';
import { RutaRing } from '@/components/ruta/RutaRing';
import { buzz } from '@/lib/haptics';

const HUELLAS = require('@/../assets/ruta-huellas.png');

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
    <View style={{ width: 54, height: 54, borderRadius: 15, borderWidth: 3, borderColor: '#62F0B6', overflow: 'hidden', backgroundColor: '#2F1E5C', alignItems: 'center', justifyContent: 'center' }}>
      {s.logo_url ? <Image source={{ uri: s.logo_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{s.name.trim()[0]?.toUpperCase()}</Text>}
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
        </View>
      ) : s.done ? filled : empty}
    </View>
  );
}

// Un local de la Ruta confirmado (1 de 3, 2 de 3). Sin confeti (eso queda para la ruta completa): el aro de la Ruta es
// el protagonista. Aparece con el logo del local adentro, el tramo nuevo se enciende, cae un check sobre el logo y una
// onda suave sale del aro. Abajo: la fila de tus 3 locales, subir tu foto y compartir.
export function RutaStopDoneScene({ c, onDone }: { c: RutaStopDoneCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(3800);
  useEffect(() => {
    if (tl.reduced) { buzz.success(); return; }
    buzz.light();
    tl.at(1000, buzz.selection);
    tl.at(2200, buzz.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const left = 3 - c.done;
  const slots = c.stops?.length === 3 ? c.stops : null;
  const R = 168;
  const COIN = Math.round(R * 0.62);
  // La moneda: de un lado el logo del local, del otro el logo de la Ruta con el mes. Gira una vez, como una moneda.
  const flip = useBeat(tl, 950, { duration: 750 });
  const front = useAnimatedStyle(() => {
    const deg = flip.value * 180;
    return { opacity: deg < 90 ? 1 : 0, transform: [{ perspective: 700 }, { rotateY: `${deg}deg` }, { scale: 1 + Math.sin(flip.value * Math.PI) * 0.08 }] };
  });
  const back = useAnimatedStyle(() => {
    const deg = flip.value * 180;
    return { opacity: deg >= 90 ? 1 : 0, transform: [{ perspective: 700 }, { rotateY: `${deg - 180}deg` }, { scale: 1 + Math.sin(flip.value * Math.PI) * 0.08 }] };
  });
  const coin = { position: 'absolute' as const, width: COIN, height: COIN, borderRadius: COIN / 2, overflow: 'hidden' as const, alignItems: 'center' as const, justifyContent: 'center' as const, backfaceVisibility: 'hidden' as const };
  return (
    <Stage tl={tl} announce={`${c.name} confirmado. Vas ${c.done} de 3 en tu Ruta de ${c.month}.`}>
      <Reveal tl={tl} delay={100}><Eyebrow color={p.muted}>{`Tu Ruta de ${c.month}`}</Eyebrow></Reveal>
      <View style={{ marginTop: 22, width: R, height: R, alignItems: 'center', justifyContent: 'center' }}>
        <Ripple tl={tl} delay={2200} size={R} />
        <Reveal tl={tl} delay={150} pop from={0.7} style={{ position: 'absolute' }}>
          <View style={{ width: R, height: R }}>
            <RutaRing size={R} done={c.done - 1} month={c.monthShort} glow={false} hideCenter />
            {/* El tramo nuevo se rellena de a poco, después del giro. */}
            <SegmentFill tl={tl} delay={1700} size={R} index={c.done - 1} />
          </View>
        </Reveal>
        <Reveal tl={tl} delay={150} pop from={0.5} style={{ position: 'absolute', width: COIN, height: COIN, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[coin, { backgroundColor: '#2F1E5C', borderWidth: 3, borderColor: '#62F0B6' }, front]}>
            {c.logo_url ? <Image source={{ uri: c.logo_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              : <Text style={{ color: '#fff', fontWeight: '900', fontSize: COIN * 0.4 }}>{c.name.trim()[0]?.toUpperCase()}</Text>}
          </Animated.View>
          <Animated.View style={[coin, { backgroundColor: '#2B1663', borderWidth: 3, borderColor: '#62F0B6' }, back]}>
            <Image source={HUELLAS} contentFit="contain" style={{ width: COIN * 0.42, height: COIN * 0.46 }} />
            <Text style={{ ...heavy(), color: '#62F0B6', fontSize: COIN * 0.17, marginTop: 2 }}>{c.monthShort}</Text>
          </Animated.View>
        </Reveal>
      </View>
      <Reveal tl={tl} delay={2350} style={{ marginTop: 20 }}>
        <Text style={{ ...display(25), color: p.text, textAlign: 'center' }}>¡Visita confirmada!</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: p.accent, textAlign: 'center', marginTop: 4 }} numberOfLines={1}>{`${c.name} · ${c.done} de 3`}</Text>
      </Reveal>
      {slots ? (
        <Reveal tl={tl} delay={2500} style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {slots.map((s, i) => <Slot key={i} tl={tl} delay={2600} s={s} n={i + 1} />)}
          </View>
        </Reveal>
      ) : null}
      <Reveal tl={tl} delay={2650}>
        <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 12, lineHeight: 20, maxWidth: 290 }}>
          {`${left === 1 ? 'Te falta 1 local' : `Te faltan ${left} locales`} para tu insignia del mes.`}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={2800} dy={16} style={{ alignSelf: 'stretch', marginTop: 20 }}>
        {c.onPhoto ? <MainButton label="Subir mi foto al álbum" icon={(col) => <Camera size={20} color={col} />} onPress={() => { onDone(); c.onPhoto?.(); }} /> : null}
        {c.onShare ? (c.onPhoto
          ? <LinkButton label="Compartir en historias" onPress={() => { onDone(); c.onShare?.(); }} color={p.accent} />
          : <MainButton label="Compartir en historias" onPress={() => { onDone(); c.onShare?.(); }} />) : null}
        <LinkButton label="Seguir mi ruta" onPress={onDone} color={p.muted} />
      </Reveal>
    </Stage>
  );
}

// Un tramo del aro de la Ruta que se dibuja de punta a punta (misma geometría que RutaRing).
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function SegmentFill({ tl, delay, size, index }: { tl: ReturnType<typeof useTimeline>; delay: number; size: number; index: number }) {
  const k = useBeat(tl, delay, { duration: 650 });
  const r = 100;
  const C = 2 * Math.PI * r;
  const gap = 48;
  const seg = C / 3 - gap;
  const rot = -90 + ((gap / 2) * 360) / C + index * 120;
  const a = ((-90 + index * 120) * Math.PI) / 180;
  const props = useAnimatedProps(() => ({ strokeDasharray: [Math.max(0.01, seg * k.value), C], strokeOpacity: k.value > 0 ? 1 : 0 }));
  const dot = useAnimatedProps(() => ({ fillOpacity: k.value > 0 ? 1 : 0 }));
  return (
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 240 240" style={{ position: 'absolute', left: 0, top: 0 }}>
      <AnimatedCircle cx={120} cy={120} r={r} fill="none" stroke="#62F0B6" strokeWidth={16} strokeLinecap="round" rotation={rot} origin="120, 120" animatedProps={props} />
      <AnimatedCircle cx={120 + r * Math.cos(a)} cy={120 + r * Math.sin(a)} r={7} fill="#62F0B6" animatedProps={dot} />
    </Svg>
  );
}

// Onda suave que sale del aro una vez (en vez de confeti).
function Ripple({ tl, delay, size }: { tl: ReturnType<typeof useTimeline>; delay: number; size: number }) {
  const k = useBeat(tl, delay, { duration: 900 });
  const st = useAnimatedStyle(() => ({ opacity: k.value <= 0 ? 0 : (1 - k.value) * 0.7, transform: [{ scale: 1 + k.value * 0.35 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#62F0B6' }, st]} />;
}
