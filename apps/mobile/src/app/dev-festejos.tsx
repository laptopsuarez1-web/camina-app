import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { TabGlyph, type TabKind } from '@/components/ui/TabGlyph';
import { Bell, Calendar, Flame, Gift, IconBubble, MapPin, Search, Share2, Target, Trophy, Users } from '@/components/icons';
import { GroupCreatedScene, GroupGoalScene, GroupJoinedScene, GroupWeekScene, RankingResultScene } from '@/components/celebrations/MomentScenes';

// Solo en desarrollo: muestra cada festejo con datos de ejemplo para revisarlo (y grabarlo) sin tener que provocarlo de verdad.
// /dev-festejos?e=ranking-podio | ranking-top10 | grupo-semana | grupo-meta | grupo-unirse | grupo-crear | iconos

const P = (id: string, name: string) => ({ id, name, photoUrl: null });
const yo = P('yo', 'Valentina');
const gente = [P('a', 'Ana Rojas'), P('j', 'Joaquín Vargas'), P('l', 'Lucía Mamani'), P('s', 'Sebastián Choque'), P('c', 'Camila Flores'), P('d', 'Diego Cruz')];

const ESCENAS: Record<string, (onDone: () => void) => React.ReactNode> = {
  'ranking-podio': (d) => <RankingResultScene onDone={d} c={{ kind: 'ranking-result', position: 2, steps: 64820, weekLabel: '17 al 23 de nov', me: yo, podium: [{ ...gente[1], steps: 71230 }, { ...yo, steps: 64820 }, { ...gente[0], steps: 58410 }] }} />,
  'ranking-top10': (d) => <RankingResultScene onDone={d} c={{ kind: 'ranking-result', position: 7, steps: 48930, weekLabel: '17 al 23 de nov', me: yo, podium: [{ ...gente[1], steps: 71230 }, { ...gente[2], steps: 66010 }, { ...gente[0], steps: 58410 }] }} />,
  'grupo-semana': (d) => <GroupWeekScene onDone={d} c={{ kind: 'group-week', name: 'Caminantes del centro', weekLabel: '17 al 23 de nov', podium: [{ ...gente[4], steps: 66160 }, { ...yo, steps: 63530 }, { ...gente[3], steps: 54870 }], meId: 'yo', myRank: 2, mySteps: 63530, members: 7, total: 426850, onOpen: () => {} }} />,
  'grupo-meta': (d) => <GroupGoalScene onDone={d} c={{ kind: 'group-goal', name: 'Los del Molino', total: 152400, target: 150000, people: [{ ...gente[0], steps: 48120 }, { ...yo, steps: 41200 }, { ...gente[1], steps: 36900 }, { ...gente[2], steps: 26180 }] }} />,
  'grupo-unirse': (d) => <GroupJoinedScene onDone={d} c={{ kind: 'group-joined', name: 'Caminantes del centro', me: yo, others: gente, total: 7, goalText: 'Meta de la semana: 300.000 pasos entre todos.' }} />,
  'grupo-crear': (d) => <GroupCreatedScene onDone={d} c={{ kind: 'group-created', name: 'Los del Molino', me: yo, code: 'K7Q2M', target: 150000, onInvite: () => {} }} />,
};

const TABS: TabKind[] = ['home', 'activity', 'groups', 'events', 'canjes'];

function Iconos() {
  const [tick, setTick] = useState(0);
  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 28, paddingTop: 60 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Íconos de línea</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 22 }}>
          {[Bell, Calendar, Flame, Gift, MapPin, Search, Share2, Target, Trophy, Users].map((I, i) => <I key={i} size={26} color="#8B4FD1" />)}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Fichas</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <IconBubble icon={Users} tone="purple" />
          <IconBubble icon={Flame} tone="orange" />
          <IconBubble icon={Trophy} tone="gold" />
          <IconBubble icon={Gift} tone="aqua" />
          <IconBubble icon={Target} tone="mint" />
          <IconBubble icon={Bell} tone="red" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Barra de abajo</Text>
        <Press onPress={() => setTick((t) => t + 1)} style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(139,79,209,0.08)' }}>
          {TABS.map((k, i) => <TabGlyph key={k} kind={k} focused={i === 2} tick={tick} color={i === 2 ? '#8B4FD1' : '#9A8FB3'} />)}
        </Press>
      </ScrollView>
    </View>
  );
}

export default function DevFestejos() {
  const { e } = useLocalSearchParams<{ e?: string }>();
  const [vuelta, setVuelta] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  if (e === 'iconos') return <Iconos />;
  const escena = e ? ESCENAS[e] : undefined;
  if (escena) return <View key={vuelta} style={{ flex: 1 }}>{escena(() => setVuelta((v) => v + 1))}</View>;
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12, paddingTop: 60 }}>
      {[...Object.keys(ESCENAS), 'iconos'].map((k) => (
        <Press key={k} onPress={() => router.setParams({ e: k })} style={{ padding: 14, borderRadius: 14, backgroundColor: 'rgba(139,79,209,0.1)' }}>
          <Text style={{ fontWeight: '700' }}>{k}</Text>
        </Press>
      ))}
    </ScrollView>
  );
}
