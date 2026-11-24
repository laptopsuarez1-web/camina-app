import { useEffect, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { colors } from '@/theme/tokens';
import { isNewForTour, markTourSeen, onProfileHintDone } from '@/lib/tab-tour';

// Recorrido corto para quien recién baja la app: 3 globos verdes sobre la barra de abajo, solo lo esencial.
// "Omitir" lo cierra por completo. Se ve una sola vez y después del globito "Tu perfil está aquí".
const BAR_HEIGHT = 64;
const TABS = 5;
const STEPS = [
  { tab: 0, title: 'Inicio', text: 'Aquí ves tus pasos de hoy y los Puntos que vas ganando.' },
  { tab: 2, title: 'Comunidad', text: 'Tus grupos, amigos y el ranking de la semana.' },
  { tab: 4, title: 'Premios', text: 'Cambia tus Puntos por premios en locales de tu ciudad.' },
] as const;

export function TabTour() {
  const [step, setStep] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let off: (() => void) | undefined;
    let t: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    isNewForTour().then(({ eligible, hintPending }) => {
      if (!alive || !eligible) return;
      const start = () => { t = setTimeout(() => alive && setStep(0), 600); };
      if (hintPending) off = onProfileHintDone(start);
      else start();
    });
    return () => { alive = false; off?.(); if (t) clearTimeout(t); };
  }, []);

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const done = () => { markTourSeen(); setStep(null); };

  // Mismas medidas que la barra de pestañas (GlassTabBar): margen lateral, aire de abajo y alto.
  const side = Platform.OS === 'android' ? 12 : 18;
  const bottomPad = Platform.OS === 'android' ? insets.bottom + 12 : Math.max(insets.bottom - 6, 12);
  const itemW = (width - side * 2 - 8) / TABS;
  const centerX = side + 4 + itemW * (s.tab + 0.5);
  const bubbleW = Math.min(width - 32, 300);
  const left = Math.min(Math.max(centerX - bubbleW / 2, 16), width - 16 - bubbleW);
  const arrowLeft = Math.min(Math.max(centerX - left - 8, 18), bubbleW - 34);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 50 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: bottomPad + BAR_HEIGHT + 6, backgroundColor: 'rgba(10,6,24,0.45)' }} />
      <View
        accessibilityLiveRegion="polite"
        style={{ position: 'absolute', left, width: bubbleW, bottom: bottomPad + BAR_HEIGHT + 14 }}
      >
        <View style={{ backgroundColor: colors.mint, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: colors.mintDark, fontSize: 15, fontWeight: '800' }}>{s.title}</Text>
          <Text style={{ color: colors.mintDark, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{s.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <Press accessibilityRole="button" accessibilityLabel="Omitir el recorrido" onPress={done} hitSlop={10}>
              <Text style={{ color: colors.mintDark, fontSize: 13, fontWeight: '700', opacity: 0.75 }}>Omitir</Text>
            </Press>
            <Text style={{ color: colors.mintDark, fontSize: 12, fontWeight: '700', opacity: 0.75 }}>{step + 1} de {STEPS.length}</Text>
            <Press
              accessibilityRole="button"
              accessibilityLabel={last ? 'Terminar el recorrido' : 'Siguiente'}
              onPress={() => (last ? done() : setStep(step + 1))}
              style={{ backgroundColor: colors.mintDark, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text style={{ color: colors.mint, fontSize: 13, fontWeight: '800' }}>{last ? 'Listo' : 'Siguiente'}</Text>
            </Press>
          </View>
        </View>
        <View style={{ width: 0, height: 0, marginLeft: arrowLeft, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.mint }} />
      </View>
    </View>
  );
}
