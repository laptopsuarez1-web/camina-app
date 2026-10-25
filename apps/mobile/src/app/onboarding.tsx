import { useRef, useState } from 'react';
import { View, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ONBOARDING, ONBOARDING_SEEN_KEY } from '@/constants/onboarding';
import { colors } from '@/theme/tokens';

// Cada ilustración es un teléfono con una captura real de la app (Inicio, Tus Puntos, Canjes y un grupo)
// más un recorte agrandado de lo importante. Los locales y premios son los reales de la base.
// Para regenerarlas: camina/boceto-onboarding/fuente en la carpeta del proyecto.
const ART = {
  ring: require('@/../assets/onboarding/ring.webp'),
  points: require('@/../assets/onboarding/points.webp'),
  reward: require('@/../assets/onboarding/reward.webp'),
  group: require('@/../assets/onboarding/group.webp'),
} as const;

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  // Alto real del área de pantallas: el ScrollView horizontal no estira a sus hijos en todas las plataformas.
  const [pageHeight, setPageHeight] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = step === ONBOARDING.length - 1;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/(auth)/welcome');
  }

  function next() {
    if (last) {
      finish();
      return;
    }
    scroller.current?.scrollTo({ x: (step + 1) * width, animated: true });
    setStep(step + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FCFBFF', paddingTop: 52, paddingBottom: 28 }}>
      <AmbientBackground dark={false} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 16, height: 44 }}>
        <Image source={require('@/../assets/icon.png')} accessibilityLabel="Camina" style={{ width: 40, height: 40, borderRadius: 20 }} />
        {!last && (
          <Press onPress={() => finish()} accessibilityRole="button" hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
            <Text style={{ color: colors.light.muted, fontSize: 15, fontWeight: '600' }}>Saltar</Text>
          </Press>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setStep(Math.round(e.nativeEvent.contentOffset.x / width))}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
        // En iPhone el ajuste automático de márgenes corría el contenido hacia abajo.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={{ flex: 1 }}
      >
        {ONBOARDING.map((slide) => (
          // Pantalla fija: la ilustración se achica para que el título y el texto entren siempre sin desplazar.
          <View key={slide.art} style={{ width, height: pageHeight || undefined, paddingHorizontal: 28, alignItems: 'center' }}>
            <View style={{ flex: 1, minHeight: 0, alignSelf: 'stretch', marginHorizontal: -28 }}>
              <Image source={ART[slide.art]} accessible={false} resizeMode="contain" style={{ flex: 1, width: '100%', height: undefined }} />
            </View>
            <View style={{ maxWidth: 340, alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ color: colors.light.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', marginBottom: 10 }}>
                {slide.title}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={{ color: colors.light.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>{slide.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 28, paddingTop: 18 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}
          accessible
          accessibilityLabel={`Pantalla ${step + 1} de ${ONBOARDING.length}`}
        >
          {ONBOARDING.map((_, i) => (
            <View key={i} style={{ height: 7, borderRadius: 99, width: i === step ? 24 : 7, backgroundColor: i === step ? colors.aquaDeep : 'rgba(41,28,71,0.16)' }} />
          ))}
        </View>
        <Press onPress={next} accessibilityRole="button" className="bg-mint rounded-2xl items-center" style={{ paddingVertical: 16 }}>
          <Text className="text-mint-dark font-extrabold text-[16px]">{last ? 'Empezar' : 'Continuar'}</Text>
        </Press>
      </View>
    </View>
  );
}
