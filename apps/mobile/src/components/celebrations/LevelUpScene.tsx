import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { BaifoMascot } from '@/components/ui/BaifoMascot';
import { LEVEL_LOOK, LocalBadge } from '@/components/badges/LocalBadge';
import { levelLabel, nextLevel, type LocalLevel } from '@/hooks/useBadges';
import { buzz } from '@/lib/haptics';
import { Burst, display, EASE, Eyebrow, MainButton, Reveal, Stage, usePalette, useTimeline } from '@/components/challenge/ChallengeCinematics';

// Festejo al subir de nivel en un local (o al ganar la primera insignia, con el primer canje).
// Una sola vez por subida: lo dispara LevelUpWatcher cuando ve un nivel más alto que el último que guardó.
export type LevelUpCinematic = {
  kind: 'level-up';
  businessName: string;
  logoUrl: string | null;
  from: LocalLevel | null;
  to: LocalLevel;
  points: number;
};

const SIZE = 132;

export function LevelUpScene({ c, onDone }: { c: LevelUpCinematic; onDone: () => void }) {
  const p = usePalette();
  const tl = useTimeline(2900);
  const look = LEVEL_LOOK[c.to];
  const first = !c.from;
  // 0 → 1: la insignia vieja se apaga y la nueva aparece con un salto.
  const swap = useSharedValue(first ? 1 : 0);
  const pop = useSharedValue(0.4);
  useEffect(() => {
    if (tl.reduced) { swap.value = 1; pop.value = 1; buzz.success(); return; }
    buzz.light();
    pop.value = withTiming(1, { duration: 420, easing: EASE });
    swap.value = withDelay(first ? 0 : 750, withTiming(1, { duration: 380, easing: EASE }));
    tl.at(first ? 380 : 800, buzz.success);
    tl.onSkip(() => { swap.value = 1; pop.value = 1; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - swap.value, transform: [{ scale: pop.value * (1 - 0.15 * swap.value) }] }));
  const newStyle = useAnimatedStyle(() => {
    // Salto: crece un poco más que su tamaño y vuelve.
    const s = swap.value < 0.6 ? 0.7 + (swap.value / 0.6) * 0.45 : 1.15 - ((swap.value - 0.6) / 0.4) * 0.15;
    return { opacity: swap.value, transform: [{ scale: s * pop.value }] };
  });
  const next = nextLevel(c.points);
  const at = first ? 380 : 800;
  return (
    <Stage tl={tl} announce={first ? `Ganaste tu insignia de ${c.businessName}: ${levelLabel(c.to)}.` : `Subiste a ${levelLabel(c.to)} en ${c.businessName}.`} confetti={{ at, palette: [look.ring[0], look.ring[1], '#62F0B6', '#FFFFFF'] }}>
      <Reveal tl={tl} delay={0}>
        <Eyebrow color={p.accent}>{first ? 'NUEVA INSIGNIA' : 'SUBISTE DE NIVEL'}</Eyebrow>
      </Reveal>
      <View style={{ width: SIZE + 120, height: SIZE + 40, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
        <Burst tl={tl} delay={at} palette={[look.ring[0], look.ring[1], '#62F0B6']} count={18} radius={120} style={{ left: '50%', top: '45%' }} />
        {!first && c.from ? (
          <Animated.View style={[{ position: 'absolute' }, oldStyle]}>
            <LocalBadge logoUrl={c.logoUrl} name={c.businessName} level={c.from} size={SIZE} />
          </Animated.View>
        ) : null}
        <Animated.View style={[{ position: 'absolute' }, newStyle]}>
          <LocalBadge logoUrl={c.logoUrl} name={c.businessName} level={c.to} size={SIZE} />
        </Animated.View>
        <Reveal tl={tl} delay={at + 150} pop from={0.4} style={{ position: 'absolute', right: 2, bottom: -10, width: 64 }}>
          <BaifoMascot pose="festeja" height={92} />
        </Reveal>
      </View>
      <Reveal tl={tl} delay={at + 250} pop from={0.6} style={{ marginTop: 26 }}>
        <Text style={{ ...display(30), color: p.text, textAlign: 'center' }}>
          {first ? '¡Ganaste tu insignia!' : `¡Ahora eres ${levelLabel(c.to)}!`}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={at + 450}>
        <Text style={{ fontSize: 14.5, color: p.muted, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 300 }}>
          {first ? `Eres ${levelLabel(c.to)} en ${c.businessName}.` : `En ${c.businessName}.`}
          {next ? ` Te faltan ${next.missing} puntos de nivel para ${next.label}.` : ' Llegaste al nivel más alto.'}
        </Text>
      </Reveal>
      <Reveal tl={tl} delay={at + 700} dy={20} style={{ alignSelf: 'stretch', marginTop: 34 }}>
        <MainButton label="Listo" onPress={onDone} />
      </Reveal>
    </Stage>
  );
}
