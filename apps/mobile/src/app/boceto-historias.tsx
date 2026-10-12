import { useEffect, useState } from 'react';
import { colorScheme } from 'nativewind';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { Press } from '@/components/ui/Press';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ActionSheet } from '@/components/ActionSheet';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { MyRedemptionsSection, type RedemptionRow } from '@/components/home/HomeSections';
import {
  RedemptionFollowup, StoryComposer, StoryConfirmSheet, StoryPendingSheet, type StoryState,
} from '@/components/story/StoryShare';
import { CheckCircle2, Activity, ChevronRight, IconBubble } from '@/components/icons';
import { colors } from '@/theme/tokens';

// BOCETO (solo para capturas): pantallas del flujo de historias de Instagram con datos de ejemplo.
// ?s=confirmado|resena|inicio|hoja|foto|confirmar|pendiente  &  ?t=light|dark

const now = Date.now();
const ROWS: RedemptionRow[] = [
  { id: 'a', status: 'confirmed', cost_points: 20, created_at: new Date(now - 20 * 60_000).toISOString(), benefit: { name: 'Café americano' }, business: { name: 'Café Origen', logo_url: null, category: 'Café' } },
  { id: 'b', status: 'confirmed', cost_points: 35, created_at: new Date(now - 26 * 3600_000).toISOString(), benefit: { name: 'Medialunas x2' }, business: { name: 'Panadería La Esquina', logo_url: null, category: 'Panadería' } },
  { id: 'c', status: 'confirmed', cost_points: 60, created_at: new Date(now - 3 * 86400_000).toISOString(), benefit: { name: 'Smoothie de frutos rojos' }, business: { name: 'Bloom', logo_url: null, category: 'Dietética & Saludable' } },
];
const STATES: Record<string, StoryState> = { a: 'available', b: 'pending', c: 'approved' };

function Dim({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18,10,30,0.55)', justifyContent: 'flex-end' } as never}>
      {children}
    </View>
  );
}

function Inicio() {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 64, paddingBottom: 40 }}>
      <View className="mx-5" style={{ marginBottom: 28 }}>
        <Glass className="rounded-3xl p-4 flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <IconBubble icon={Activity} tone="aqua" size={42} />
            <View>
              <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Ver toda tu actividad</Text>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Gráfico, calendario e historial</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.light.muted} />
        </Glass>
      </View>
      <MyRedemptionsSection redemptions={ROWS} loading={false} storyFor={(r) => STATES[r.id]} onStory={() => {}} />
    </ScrollView>
  );
}

function CanjeSheet({ answered }: { answered: boolean }) {
  return (
    <Dim>
      <Glass className="rounded-t-[32px] px-6 pt-3 pb-10">
        <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />
        <View className="flex-row items-center gap-2.5 mb-5">
          <BusinessAvatar logoUrl={null} category="Café" size={38} />
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">Café Origen</Text>
            <Text className="text-xs text-muted-light dark:text-muted-dark">Café americano</Text>
          </View>
        </View>
        <View className="bg-aqua-light-light dark:bg-aqua-light-dark rounded-3xl items-center mb-4 w-full" style={{ paddingVertical: answered ? 14 : 22, paddingHorizontal: 16 }}>
          <CheckCircle2 size={answered ? 34 : 60} color={colors.aqua} weight="fill" />
          <Text className="text-aqua-ink dark:text-aqua font-extrabold text-[17px] mt-2">¡Canje confirmado!</Text>
          {!answered ? (
            <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mt-1 text-center">Café Origen ya te entregó tu beneficio.</Text>
          ) : null}
        </View>
        <RedemptionFollowup businessName="Café Origen" answered={answered} hasReviewUrl onAnswer={() => {}} onReview={() => {}} onStory={() => {}} />
        <Press accessibilityRole="button" className="w-full bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center mt-2.5">
          <Text className="text-purple-ink dark:text-purple-soft font-bold text-[14px]">Listo</Text>
        </Press>
      </Glass>
    </Dim>
  );
}

export default function BocetoHistorias() {
  const { s = 'inicio', t = 'light' } = useLocalSearchParams<{ s?: string; t?: string }>();
  const [handle, setHandle] = useState(s === 'confirmar' ? 'sofi.camina' : '');
  // Sin sesión la app vuelve al modo del sistema; acá se fuerza el del boceto un instante después.
  useEffect(() => {
    const id = setInterval(() => {
      const dark = t === 'dark' || (typeof window !== 'undefined' && window.location.search.includes('t=dark'));
      colorScheme.set(dark ? 'dark' : 'light');
      if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark);
    }, 300);
    const stop = setTimeout(() => clearInterval(id), 4000);
    // Sin sesión, el layout vuelve a sacar la clase "dark": se la vuelve a poner.
    const wantDark = t === 'dark' || (typeof window !== 'undefined' && window.location.search.includes('t=dark'));
    const html = typeof document !== 'undefined' ? document.documentElement : null;
    const obs = html && wantDark ? new MutationObserver(() => { if (!html.classList.contains('dark')) html.classList.add('dark'); }) : null;
    if (obs && html) { obs.observe(html, { attributes: true, attributeFilter: ['class'] }); html.classList.add('dark'); }
    return () => { clearInterval(id); clearTimeout(stop); obs?.disconnect(); };
  }, [t]);
  const photo = require('@/../assets/boceto/cafe.jpg');

  if (s === 'foto' || s === 'confirmar') {
    return (
      <View style={{ flex: 1 }}>
        <StoryComposer photo={photo} businessName="Café Origen" benefitName="Café americano" topInset={40} onClose={() => {}} onPublish={() => {}} onChangePhoto={() => {}} />
        {s === 'confirmar' ? (
          <Dim>
            <StoryConfirmSheet handle={handle} onChangeHandle={setHandle} onConfirm={() => {}} onLater={() => {}} />
          </Dim>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AmbientBackground />
      {s === 'confirmado' || s === 'resena' ? (
        <>
          <Inicio />
          <CanjeSheet answered={s === 'resena'} />
        </>
      ) : (
        <>
          <Inicio />
          {s === 'pendiente' ? (
            <Dim>
              <StoryPendingSheet onDone={() => {}} />
            </Dim>
          ) : null}
          <ActionSheet
            visible={s === 'hoja'}
            title="Subí tu historia"
            actions={[{ label: 'Sacar una foto', onPress: () => {} }, { label: 'Elegir de la galería', onPress: () => {} }]}
            onClose={() => {}}
          />
        </>
      )}
    </View>
  );
}
