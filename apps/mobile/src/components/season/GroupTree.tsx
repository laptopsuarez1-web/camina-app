import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { letItSnow } from '@/components/season/Snowfall';
import { celebrate } from '@/store/useCelebrationStore';
import { useGroupTree, type GroupTree } from '@/hooks/useSeason';
import { colors } from '@/theme/tokens';

// Árbol de Navidad del grupo (migración 0087): una luz por día. Se enciende si al menos la mitad del grupo cumplió su
// meta ese día. Las luces se llenan de abajo hacia arriba, hacia la estrella.
const VB = { w: 160, h: 190 };
const BULB_COLORS = ['#FF5D6A', '#FFD166', '#62F0B6', '#8FB8FF', '#FF9AD1'];
const ROWS = [
  { y: 140, n: 7, half: 60, tilt: -1.6 },
  { y: 116, n: 5, half: 46, tilt: 1.8 },
  { y: 94, n: 5, half: 38, tilt: -1.8 },
  { y: 70, n: 4, half: 26, tilt: 1.8 },
  { y: 49, n: 3, half: 14, tilt: -1.5 },
];

// Posiciones de las luces (hasta 24), de abajo hacia arriba, y la guirnalda que las une.
function layout(count: number) {
  const pts: { x: number; y: number }[] = [];
  const garlands: string[] = [];
  for (const r of ROWS) {
    const row: { x: number; y: number }[] = [];
    for (let i = 0; i < r.n; i++) {
      const t = r.n === 1 ? 0.5 : i / (r.n - 1);
      const x = 80 - r.half + t * r.half * 2;
      const y = r.y + (i - (r.n - 1) / 2) * r.tilt * 2 + Math.sin(t * Math.PI) * 4;
      row.push({ x, y });
    }
    garlands.push(row.map((p, i) => (i === 0 ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' '));
    pts.push(...row);
  }
  return { pts: pts.slice(0, count), garlands };
}

export function TreeArt({ tree, size = 150 }: { tree: Pick<GroupTree, 'days' | 'complete'> & { todayIndex?: number }; size?: number }) {
  const n = Math.min(tree.days.length, 24);
  const { pts, garlands } = useMemo(() => layout(n), [n]);
  const scale = size / VB.w;
  return (
    <View style={{ width: size, height: VB.h * scale }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        <Defs>
          <LinearGradient id="tr-a" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#2FB57A" />
            <Stop offset="1" stopColor="#13684A" />
          </LinearGradient>
          <LinearGradient id="tr-b" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#28A06C" />
            <Stop offset="1" stopColor="#0F5A40" />
          </LinearGradient>
          <RadialGradient id="tr-glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFF4C2" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFD166" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Copa en tres pisos y tronco. */}
        <Rect x={72} y={160} width={16} height={18} rx={3} fill="#8A5A3A" />
        <Path d="M80 98 L150 162 Q 80 172 10 162 Z" fill="url(#tr-b)" />
        <Path d="M80 62 L130 124 Q 80 134 30 124 Z" fill="url(#tr-a)" />
        <Path d="M80 26 L110 84 Q 80 92 50 84 Z" fill="url(#tr-b)" />
        {/* Nieve en las puntas de los pisos. */}
        <Path d="M14 161 Q 40 154 60 160 Q 80 164 100 160 Q 120 154 146 161 Q 80 168 14 161 Z" fill="#FFFFFF" opacity={0.85} />
        <Path d="M34 123 Q 56 117 80 122 Q 104 117 126 123 Q 80 130 34 123 Z" fill="#FFFFFF" opacity={0.8} />
        <Path d="M54 83 Q 66 79 80 82 Q 94 79 106 83 Q 80 89 54 83 Z" fill="#FFFFFF" opacity={0.8} />
        {/* Guirnaldas. */}
        {garlands.map((d, i) => <Path key={i} d={d} stroke="#F4D58D" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />)}
        {/* Luces. */}
        {pts.map((p, i) => {
          const day = tree.days[i];
          const lit = !!day?.lit;
          const c = BULB_COLORS[i % BULB_COLORS.length];
          return (
            <G key={i}>
              {lit ? <Circle cx={p.x} cy={p.y} r={8} fill={c} opacity={0.28} /> : null}
              <Circle cx={p.x} cy={p.y} r={lit ? 4.4 : 3.4} fill={lit ? c : '#0B3B2B'} stroke={lit ? '#FFFFFF' : '#2C6B54'} strokeOpacity={lit ? 0.6 : 1} strokeWidth={lit ? 0.8 : 1} />
              {lit ? <Circle cx={p.x - 1.3} cy={p.y - 1.4} r={1.2} fill="#FFFFFF" opacity={0.85} /> : null}
            </G>
          );
        })}
        {/* Estrella: se enciende con el árbol completo. */}
        {tree.complete ? <Circle cx={80} cy={20} r={22} fill="url(#tr-glow)" /> : null}
        <Path
          d="M80 6 L84.4 15.6 L95 16.6 L87 23.6 L89.4 34 L80 28.6 L70.6 34 L73 23.6 L65 16.6 L75.6 15.6 Z"
          fill={tree.complete ? '#FFD166' : '#2A1F45'}
          stroke={tree.complete ? '#FFF1BF' : '#7B6AA8'}
          strokeWidth={1.4}
        />
      </Svg>
      {tree.todayIndex != null && tree.todayIndex < pts.length && !tree.days[tree.todayIndex]?.lit ? (
        <TodayPulse x={pts[tree.todayIndex].x * scale} y={pts[tree.todayIndex].y * scale} />
      ) : null}
    </View>
  );
}

// La luz de hoy late mientras falta gente: "acá va la de hoy".
function TodayPulse({ x, y }: { x: number; y: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) })), -1);
  }, [reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + t.value * 0.65, transform: [{ scale: 0.8 + t.value * 0.5 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x - 8, top: y - 8, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFD166' }, style]}
    />
  );
}

type Member = { id: string; name: string; photoUrl: string | null };

// Tarjeta del árbol en el detalle del grupo.
export function GroupTreeCard({ groupId, members }: { groupId: string; members: Member[] }) {
  const { data: tree } = useGroupTree(groupId);
  const todayIndex = tree?.today ? tree.days.findIndex((d) => d.day === tree.today!.day) : -1;
  const todayLit = !!tree?.today?.lit;

  // Cuando se ve por primera vez la luz de hoy encendida: un poco de nieve y un aviso. Una vez por grupo y por día.
  useEffect(() => {
    if (!tree?.today || !todayLit) return;
    const key = `camina_tree_${groupId}_${tree.today.day}`;
    AsyncStorage.getItem(key)
      .then((v) => {
        if (v) return;
        AsyncStorage.setItem(key, '1').catch(() => {});
        letItSnow(5000);
        celebrate({ kind: 'toast', icon: 'gift', title: tree.complete ? '¡El árbol del grupo está encendido!' : '¡Encendieron la luz de hoy!' });
      })
      .catch(() => {});
  }, [groupId, tree?.today, tree?.complete, todayLit]);

  if (!tree) return null;
  const today = tree.today;
  const metIds = new Set(today?.met_ids ?? []);
  const metMembers = members.filter((m) => metIds.has(m.id)).slice(0, 5);
  const missing = today ? Math.max(0, today.need - today.met) : 0;
  const toStar = Math.max(0, tree.goal - tree.lit);

  return (
    <View className="mx-5 mb-3 rounded-3xl overflow-hidden" style={{ backgroundColor: '#0E2E26', borderWidth: 1, borderColor: 'rgba(98,240,182,0.22)' }}>
      <View className="flex-row items-center" style={{ paddingLeft: 6, paddingRight: 16, paddingVertical: 12 }}>
        <TreeArt tree={{ ...tree, todayIndex: todayIndex >= 0 ? todayIndex : undefined }} size={132} />
        <View className="flex-1" style={{ marginLeft: 8 }}>
          <Text style={{ color: colors.mint, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2 }}>ÁRBOL DEL GRUPO</Text>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {tree.lit}
            <Text style={{ color: '#BFE9D6', fontSize: 14, fontWeight: '700' }}> de {tree.lights} luces</Text>
          </Text>
          <Text style={{ color: '#BFE9D6', fontSize: 12.5, lineHeight: 17, marginTop: 2 }}>
            {tree.complete ? '¡Árbol encendido! Brilla la estrella.' : `Con ${tree.goal} se enciende la estrella. ${toStar === 1 ? 'Falta 1' : `Faltan ${toStar}`}.`}
          </Text>
          {today ? (
            <View className="rounded-2xl mt-2.5" style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: todayLit ? 'rgba(255,209,102,0.16)' : 'rgba(255,255,255,0.07)' }}>
              <Text style={{ color: todayLit ? '#FFE3A0' : '#fff', fontSize: 12.5, fontWeight: '700' }}>
                {todayLit ? 'Encendieron la luz de hoy' : missing === 1 ? 'Hoy falta 1 persona para la luz' : `Hoy faltan ${missing} personas para la luz`}
              </Text>
              <View className="flex-row items-center mt-1.5">
                {metMembers.map((m, i) => (
                  <View key={m.id} style={{ width: 22, height: 22, borderRadius: 11, overflow: 'hidden', marginLeft: i ? -6 : 0, borderWidth: 1.5, borderColor: '#0E2E26', backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                    <AvatarImage uri={m.photoUrl} style={{ width: '100%', height: '100%' }} fallback={<Text style={{ fontSize: 10, fontWeight: '800', color: colors.mintDark }}>{(m.name || 'C')[0]?.toUpperCase()}</Text>} />
                  </View>
                ))}
                <Text style={{ color: '#BFE9D6', fontSize: 11.5, marginLeft: metMembers.length ? 6 : 0 }}>
                  {today.met} de {today.need} cumplieron su meta
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={{ color: '#8FC4AE', fontSize: 11.5, lineHeight: 16, paddingHorizontal: 16, paddingBottom: 12 }}>
        Cada día, si al menos la mitad del grupo cumple su meta, se enciende una luz. Va hasta el {Number(tree.to.slice(8, 10))} de diciembre.
      </Text>
    </View>
  );
}

// Chip chiquito para la lista de Grupos.
export function TreeChip({ tree }: { tree: GroupTree }) {
  return (
    <View className="flex-row items-center rounded-full" style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(14,46,38,0.75)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.3)' }}>
      <Svg width={12} height={14} viewBox="0 0 12 14">
        <Path d="M6 0.5 L11.5 10 L0.5 10 Z" fill="#2FB57A" />
        <Rect x={5} y={10} width={2} height={3} fill="#8A5A3A" />
        <Circle cx={6} cy={1.2} r={1.4} fill={tree.complete ? '#FFD166' : '#7B6AA8'} />
        <Circle cx={4.2} cy={6.5} r={0.9} fill="#FF5D6A" />
        <Circle cx={7.6} cy={8} r={0.9} fill="#FFD166" />
      </Svg>
      <Text style={{ color: '#CFF5E4', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{tree.lit}/{tree.lights}</Text>
      {tree.today?.lit ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD166' }} /> : null}
    </View>
  );
}
