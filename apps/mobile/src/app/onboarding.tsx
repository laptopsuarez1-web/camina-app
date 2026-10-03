import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, Animated, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ONBOARDING, ONBOARDING_SEEN_KEY } from '@/constants/onboarding';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Coffee, IconBubble } from '@/components/icons';
import { colors } from '@/theme/tokens';

const COIN = require('@/../assets/camina-coin.png');

function Coin({ size, style }: { size: number; style?: object }) {
  return <Image source={COIN} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

// 1. El aro de Inicio llenándose, con monedas alrededor.
function RingArt() {
  return (
    <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      <ProgressRing size={220} strokeWidth={20} progress={0.78} trackColor="rgba(255,255,255,0.1)" progressColor={colors.mint}>
        <Text style={{ color: '#fff', fontSize: 42, fontWeight: '800', letterSpacing: -1 }}>6.230</Text>
        <Text style={{ color: '#D5CBF0', fontSize: 14 }}>pasos hoy</Text>
      </ProgressRing>
      <Coin size={44} style={{ position: 'absolute', right: 0, top: 14 }} />
      <Coin size={30} style={{ position: 'absolute', left: 6, bottom: 34 }} />
    </View>
  );
}

// 2. La regla de los Puntos, con los números de business-rules.
function PointsArt() {
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>
        {POINTS_PER_STEP_UNIT.toLocaleString('es-BO')} <Text style={{ color: '#D5CBF0', fontSize: 17, fontWeight: '500' }}>pasos</Text>
      </Text>
      <Text style={{ color: colors.mint, fontSize: 28, fontWeight: '800' }}>↓</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Coin size={64} />
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>1 Punto</Text>
      </View>
      <View style={{ marginTop: 6, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(127,237,196,0.14)', borderWidth: 1, borderColor: 'rgba(127,237,196,0.3)' }}>
        <Text style={{ color: colors.mint, fontWeight: '800', fontSize: 14 }}>Hasta {DAILY_POINTS_CAP} Puntos por día</Text>
      </View>
    </View>
  );
}

// 3. Una tarjeta de premio como las de Canjes (ejemplo ilustrativo).
function RewardArt() {
  return (
    <View
      style={{
        width: '100%', maxWidth: 320, borderRadius: 22, padding: 16, gap: 12, transform: [{ rotate: '-3deg' }],
        backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: colors.light.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBubble icon={Coffee} tone="aqua" size={44} />
        <View>
          <Text style={{ color: colors.light.text, fontWeight: '800', fontSize: 17 }}>Café Origen</Text>
          <Text style={{ color: colors.light.muted, fontSize: 13 }}>Café · a 300 m</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.light.line, paddingTop: 12 }}>
        <Text style={{ flex: 1, color: colors.light.text, fontSize: 14 }}>Café americano gratis</Text>
        <Coin size={20} />
        <Text style={{ color: colors.light.text, fontWeight: '800', fontSize: 15 }}>20</Text>
        <View style={{ backgroundColor: colors.aquaDeep, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Canjear</Text>
        </View>
      </View>
    </View>
  );
}

// 4. El podio del detalle de grupo.
function GroupArt() {
  const step = (letter: string, place: number, height: number, avatar: number, bg: string, first?: boolean) => (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {first ? <Text style={{ fontSize: 22 }}>👑</Text> : null}
      <View style={{ width: avatar, height: avatar, borderRadius: avatar / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: avatar * 0.4 }}>{letter}</Text>
      </View>
      <View
        style={{
          width: first ? 78 : 66, height, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', paddingTop: 8,
          backgroundColor: first ? 'rgba(127,237,196,0.35)' : 'rgba(255,255,255,0.12)',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: first ? 28 : 24 }}>{place}</Text>
      </View>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }} accessible={false} importantForAccessibility="no-hide-descendants">
      {step('A', 2, 76, 48, colors.mint)}
      {step('L', 1, 112, 56, colors.mint, true)}
      {step('C', 3, 56, 48, '#C6A2F5')}
    </View>
  );
}

const ART = { ring: RingArt, points: PointsArt, reward: RewardArt, group: GroupArt } as const;

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

  async function finish(params?: { modo?: 'login'; via?: 'google' }) {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace(params ? { pathname: '/(auth)/welcome', params } : '/(auth)/welcome');
  }

  function next() {
    scroller.current?.scrollTo({ x: (step + 1) * width, animated: true });
    setStep(step + 1);
  }

  return (
    <LinearGradient colors={['#3a2668', '#1c1030', '#120a1e']} style={{ flex: 1, paddingTop: 52, paddingBottom: 28 }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, height: 44 }}>
        {!last && (
          <Pressable onPress={() => finish()} accessibilityRole="button" hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
            <Text style={{ color: '#E4DCF7', fontSize: 15, fontWeight: '600' }}>Saltar</Text>
          </Pressable>
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
        {ONBOARDING.map((slide, i) => {
          const Art = ART[slide.art];
          return (
            <View key={slide.art} style={{ width, height: pageHeight || undefined, paddingHorizontal: 28, alignItems: 'center' }}>
              <Animated.View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', opacity: i === step ? fade : 1 }}>
                <Art />
              </Animated.View>
              <View style={{ maxWidth: 330, alignItems: 'center', paddingBottom: 8 }}>
                <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 27, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
                  {slide.title}
                </Text>
                <Text style={{ color: '#D5CBF0', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>{slide.desc}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 28, paddingTop: 22 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}
          accessible
          accessibilityLabel={`Pantalla ${step + 1} de ${ONBOARDING.length}`}
        >
          {ONBOARDING.map((_, i) => (
            <View key={i} style={{ height: 7, borderRadius: 99, width: i === step ? 24 : 7, backgroundColor: i === step ? colors.mint : 'rgba(255,255,255,0.25)' }} />
          ))}
        </View>
        {last ? (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => finish({ via: 'google' })}
              accessibilityRole="button"
              style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#4285F4' }}>G</Text>
              <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 15.5 }}>Continuar con Google</Text>
            </Pressable>
            <Pressable onPress={() => finish()} accessibilityRole="button" className="bg-mint rounded-2xl items-center" style={{ paddingVertical: 15 }}>
              <Text className="text-mint-dark font-extrabold text-[15.5px]">Otras formas de entrar</Text>
            </Pressable>
            <Pressable onPress={() => finish({ modo: 'login' })} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#E4DCF7', fontSize: 14, fontWeight: '600' }}>Ya tengo cuenta</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={next} accessibilityRole="button" className="bg-mint rounded-2xl items-center" style={{ paddingVertical: 16 }}>
            <Text className="text-mint-dark font-extrabold text-[16px]">Siguiente</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
