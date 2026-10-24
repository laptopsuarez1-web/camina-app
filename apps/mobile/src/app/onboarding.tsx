import { useEffect, useRef, useState } from 'react';
import { View, Image, ScrollView, Animated, AccessibilityInfo, useWindowDimensions } from 'react-native';
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
  const [fade] = useState(() => new Animated.Value(1));
  const reduceMotion = useRef(false);
  const last = step === ONBOARDING.length - 1;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v)).catch(() => {});
  }, []);

  // Entrada corta de la ilustración al cambiar de pantalla; sin animación si el teléfono pide reducir movimiento.
  useEffect(() => {
    if (reduceMotion.current) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [step, fade]);

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
        style={{ flex: 1 }}
      >
        {ONBOARDING.map((slide, i) => (
          // Vertical con flexGrow: con letra normal entra todo; con texto grande el contenido crece y se desplaza.
          <ScrollView
            key={slide.art}
            style={{ width, height: pageHeight || undefined }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ flex: 1, minHeight: 260, alignSelf: 'stretch', marginHorizontal: -28, opacity: i === step ? fade : 1 }}>
              <Image source={ART[slide.art]} accessible={false} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
            </Animated.View>
            <View style={{ maxWidth: 340, alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
              <Text accessibilityRole="header" style={{ color: colors.light.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', marginBottom: 10 }}>
                {slide.title}
              </Text>
              <Text style={{ color: colors.light.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>{slide.desc}</Text>
            </View>
          </ScrollView>
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
