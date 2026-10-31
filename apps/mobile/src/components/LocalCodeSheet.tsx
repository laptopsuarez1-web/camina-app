import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AccessibilityInfo, Modal, Platform, TextInput as RNTextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { Check } from '@/components/icons';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';

const DIGITS = 4;

type Props = {
  visible: boolean;
  businessName: string;
  logoUrl?: string | null;
  category?: string | null;
  benefitName: string;
  // Puntos que se descuentan; con el premio de la tarjeta de fidelidad no se descuenta nada.
  costPoints: number;
  free: boolean;
  onClose: () => void;
  // Devuelve el mensaje de error para mostrar, o null si el canje salió bien.
  onSubmit: (code: string) => Promise<string | null>;
  // Se llama cuando termina la animación de "listo": ahí el padre abre la pantalla de canje confirmado.
  onSuccess: () => void;
  onDismiss?: () => void;
};

type Phase = 'typing' | 'busy' | 'error' | 'done';

// Una casilla del código: el número "salta" al escribirse y el borde marca cuál es la que sigue.
function Cell({ char, active, phase, index }: { char: string; active: boolean; phase: Phase; index: number }) {
  const theme = useThemeColors();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    enter.value = reduced ? 1 : withDelay(index * 45, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [enter, index, reduced]);

  useEffect(() => {
    if (!char || reduced) return;
    pop.value = 0.78;
    pop.value = withSpring(1, { damping: 9, stiffness: 260 });
  }, [char, pop, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }, { scale: pop.value }],
  }));

  const border =
    phase === 'error' ? colors.dangerFill : phase === 'done' ? colors.aquaDeep : active ? colors.purple : theme.line;
  const digitColor = phase === 'error' ? theme.dangerText : phase === 'done' ? theme.accentText : theme.text;

  return (
    <Animated.View
      style={[
        style,
        {
          flex: 1,
          height: 68,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: border,
          backgroundColor: theme.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text style={{ fontSize: 30, fontWeight: '800', color: digitColor }}>{char}</Text>
    </Animated.View>
  );
}

// Hoja para canjear con el código de 4 números que el local le dice a la persona en la caja.
export function LocalCodeSheet({
  visible, businessName, logoUrl, category, benefitName, costPoints, free, onClose, onSubmit, onSuccess, onDismiss,
}: Props) {
  const theme = useThemeColors();
  const reduced = useReducedMotion();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('typing');
  const input = useRef<RNTextInput>(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError(null);
      setPhase('typing');
    }
  }, [visible]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  async function submit() {
    if (code.length !== DIGITS || phase === 'busy' || phase === 'done') return;
    setPhase('busy');
    setError(null);
    const message = await onSubmit(code);
    if (message) {
      setError(message);
      setPhase('error');
      buzz.error();
      if (!reduced) shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 80 }), withTiming(-8, { duration: 70 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 50 }));
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
      // Las casillas quedan en rojo un momento y se vacían para escribir de nuevo.
      setTimeout(() => {
        setCode('');
        setPhase('typing');
        input.current?.focus();
      }, 700);
      return;
    }
    setPhase('done');
    buzz.success();
    setTimeout(onSuccess, reduced ? 150 : 650);
  }

  const cost = free ? 'Gratis con tu tarjeta' : `${costPoints} ${costPoints === 1 ? 'Punto' : 'Puntos'}`;
  const ready = code.length === DIGITS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <KeyboardSafe className="flex-1">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <View>
          <Glass className="rounded-t-[32px] px-6 pt-3 pb-8">
            <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />

            <View className="flex-row items-center gap-2.5 mb-5">
              <BusinessAvatar logoUrl={logoUrl} category={category} size={38} />
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-text-light dark:text-text-dark" numberOfLines={1}>{businessName}</Text>
                <Text className="text-xs text-muted-light dark:text-muted-dark" numberOfLines={1}>{benefitName}</Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-purple-light-light dark:bg-purple-light-dark rounded-full pl-2 pr-3 py-1.5">
                {!free && <Coin size={14} />}
                <Text className="text-[12px] font-bold text-purple-ink dark:text-purple-soft">{cost}</Text>
              </View>
            </View>

            <Text className="text-[22px] leading-7 font-extrabold text-text-light dark:text-text-dark mb-1">Pídele al local su código</Text>
            <Text className="text-[13.5px] leading-5 text-muted-light dark:text-muted-dark mb-5">
              Son 4 números. Escríbelos aquí y tu canje se confirma al instante.
            </Text>

            <Press accessible={false} feedback="none" onPress={() => input.current?.focus()}>
              <Animated.View style={[{ flexDirection: 'row', gap: 10 }, shakeStyle]}>
                {Array.from({ length: DIGITS }, (_, i) => (
                  <Cell key={i} index={i} char={code[i] ?? ''} active={phase === 'typing' && i === Math.min(code.length, DIGITS - 1)} phase={phase} />
                ))}
              </Animated.View>
              {/* El campo real es invisible: las casillas lo enfocan al tocarlas y así funciona el teclado numérico y pegar el código. */}
              <TextInput
                ref={input}
                value={code}
                onChangeText={(t) => {
                  if (phase !== 'typing') return;
                  const next = t.replace(/\D/g, '').slice(0, DIGITS);
                  if (next.length > code.length) buzz.selection();
                  setCode(next);
                }}
                keyboardType="number-pad"
                maxLength={DIGITS}
                autoFocus
                editable={phase === 'typing'}
                caretHidden
                textContentType="oneTimeCode"
                accessibilityLabel="Código del local, 4 números"
                onSubmitEditing={submit}
                style={[{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, color: 'transparent' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
              />
            </Press>

            <View style={{ minHeight: 40 }} className="justify-center mt-3 mb-3">
              {error ? (
                <Text accessibilityLiveRegion="polite" className="text-[13px] leading-5 font-semibold text-center" style={{ color: theme.dangerText }}>
                  {error}
                </Text>
              ) : (
                <Text className="text-[12px] leading-[18px] text-muted-light dark:text-muted-dark text-center">
                  Tienes que estar en el local: usamos tu ubicación solo en este momento.
                </Text>
              )}
            </View>

            <Press
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready || phase !== 'typing', busy: phase === 'busy' }}
              onPress={submit}
              disabled={!ready || phase !== 'typing'}
              className="bg-aqua-deep rounded-2xl py-4 items-center justify-center flex-row gap-2 mb-1.5"
              style={{ opacity: !ready && phase === 'typing' ? 0.5 : 1 }}
            >
              {phase === 'busy' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : phase === 'done' ? (
                <>
                  <Check size={18} color="#fff" />
                  <Text className="text-[15px] font-bold text-white">¡Canjeado!</Text>
                </>
              ) : (
                <Text className="text-[15px] font-bold text-white">Canjear</Text>
              )}
            </Press>
            <Press accessibilityRole="button" hitSlop={8} onPress={onClose} disabled={phase === 'busy' || phase === 'done'} className="py-2.5 items-center">
              <Text className="text-[13px] text-muted-light dark:text-muted-dark">Todavía no</Text>
            </Press>
          </Glass>
          </View>
        </View>
      </KeyboardSafe>
    </Modal>
  );
}
