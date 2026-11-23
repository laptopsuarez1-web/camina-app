import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';
import { type CinePerson, type Timeline, Avatar, usePalette, useBeat } from '@/components/challenge/ChallengeCinematics';

// Kit de los festejos "limpios": sin confeti, destellos ni rebotes. Todo entra con un fundido suave y un desplazamiento
// corto, en el hilo de la UI. Con "reducir movimiento" ya aparece terminado (useBeat nace en 1).

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Aparece con un fundido y sube unos pocos píxeles.
export function Fade({ tl, delay, dy = 8, style, children }: { tl: Timeline; delay: number; dy?: number; style?: ViewStyle; children: ReactNode }) {
  const k = useBeat(tl, delay, { duration: 560 });
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * dy }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Aro fino que se dibuja de 0 a `to`, con lo que se ponga adentro.
export function ThinRing({ tl, delay, size, to, stroke = 4, duration = 1100, children }: { tl: Timeline; delay: number; size: number; to: number; stroke?: number; duration?: number; children?: ReactNode }) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = useBeat(tl, delay, { duration });
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0.0001, to) * k.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={p.dark ? colors.mint : colors.aqua} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}

// Barra fina que se llena de 0 a `to` (0 a 1).
export function ThinBar({ tl, delay, to, duration = 1100 }: { tl: Timeline; delay: number; to: number; duration?: number }) {
  const p = usePalette();
  const k = useBeat(tl, delay, { duration });
  const a = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, to)) * k.value * 100}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: p.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: p.dark ? colors.mint : colors.aqua }, a]} />
    </View>
  );
}

// Puesto grande: "3.º" con un rótulo chico al lado.
export function BigRank({ rank, label }: { rank: number; label?: string }) {
  const p = usePalette();
  return (
    <View accessible accessibilityLabel={`Puesto ${rank}${label ? ` ${label}` : ''}`} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <Text allowFontScaling={false} style={{ fontSize: 56, fontWeight: '800', letterSpacing: -1.5, color: p.text, fontVariant: ['tabular-nums'] }}>{rank}.º</Text>
      {label ? <Text style={{ fontSize: 15, fontWeight: '600', color: p.muted }}>{label}</Text> : null}
    </View>
  );
}

export type RankEntry = { rank: number; person: CinePerson; steps: number; me?: boolean };

// Lista de puestos: número, foto, nombre y pasos, separados por líneas finas. Tu fila va resaltada.
export function RankList({ tl, delay, rows }: { tl: Timeline; delay: number; rows: RankEntry[] }) {
  const p = usePalette();
  const meBg = p.dark ? 'rgba(98,240,182,0.10)' : 'rgba(79,195,168,0.12)';
  return (
    <View style={{ alignSelf: 'stretch', borderRadius: 18, borderWidth: 1, borderColor: p.glassLine, backgroundColor: p.glass, overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <Fade key={`${row.rank}-${row.person.id}`} tl={tl} delay={delay + i * 90} dy={6}>
          <View
            accessible
            accessibilityLabel={`${row.rank}.º ${row.me ? 'Tú' : row.person.name}: ${row.steps} pasos`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: row.me ? meBg : 'transparent', borderTopWidth: i ? 1 : 0, borderColor: p.glassLine }}
          >
            <Text style={{ width: 26, fontSize: 14, fontWeight: '700', color: p.muted, fontVariant: ['tabular-nums'] }}>{row.rank}.º</Text>
            <Avatar p={row.person} size={32} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: row.me ? '800' : '600', color: p.text }}>{row.me ? 'Tú' : row.person.name.split(' ')[0]}</Text>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: row.me ? p.accent : p.muted, fontVariant: ['tabular-nums'] }}>{row.steps.toLocaleString('es-BO')}</Text>
          </View>
        </Fade>
      ))}
    </View>
  );
}

// Tres datos en una fila, separados por líneas finas.
export function Stats({ tl, delay, items }: { tl: Timeline; delay: number; items: { value: string; label: string }[] }) {
  const p = usePalette();
  return (
    <Fade tl={tl} delay={delay} style={{ alignSelf: 'stretch' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {i > 0 ? <View style={{ width: 1, height: 26, backgroundColor: p.glassLine }} /> : null}
            <View accessible accessibilityLabel={`${it.label}: ${it.value}`} style={{ flex: 1, alignItems: 'center' }}>
              <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, fontWeight: '800', color: p.text, fontVariant: ['tabular-nums'] }}>{it.value}</Text>
              <Text style={{ fontSize: 11.5, color: p.muted, marginTop: 2 }}>{it.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </Fade>
  );
}

// Título y bajada de cada festejo.
export function Heading({ tl, delay, title, sub }: { tl: Timeline; delay: number; title: string; sub?: string }) {
  const p = usePalette();
  return (
    <Fade tl={tl} delay={delay} style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: p.text, textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 14, color: p.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 300 }}>{sub}</Text> : null}
    </Fade>
  );
}
