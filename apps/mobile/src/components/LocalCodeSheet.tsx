import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { useThemeColors } from '@/theme/useThemeColors';

type Props = {
  visible: boolean;
  businessName: string;
  benefitName: string;
  // "Tus 50 Puntos se descuentan" o el aviso de premio de la tarjeta.
  costLine: string;
  onClose: () => void;
  // Devuelve el mensaje de error para mostrar, o null si el canje salió bien.
  onSubmit: (code: string) => Promise<string | null>;
  // El local no da código o la persona prefiere el código para el cajero (el de 6 números de siempre).
  onFallback: () => void;
  onDismiss?: () => void;
};

// Hoja para canjear con el código de 4 números que el local le dice a la persona en la caja.
export function LocalCodeSheet({ visible, businessName, benefitName, costLine, onClose, onSubmit, onFallback, onDismiss }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const theme = useThemeColors();
  const input = useRef<React.ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  async function submit() {
    if (code.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(code);
    setBusy(false);
    if (message) {
      setError(message);
      setCode('');
      input.current?.focus();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
          <Glass className="rounded-t-[32px] px-6 pt-3 pb-10">
            <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />

            <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{businessName}</Text>
            <Text className="text-xs text-muted-light dark:text-muted-dark mb-5">{benefitName}</Text>

            <View className="bg-bg-light dark:bg-bg-dark rounded-3xl py-6 px-4 items-center mb-3">
              <Text className="text-[12px] text-muted-light dark:text-muted-dark mb-3 text-center">
                Pídele al local su código de 4 números
              </Text>
              <TextInput
                ref={input}
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 4));
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                editable={!busy}
                accessibilityLabel="Código del local, 4 números"
                placeholder="0000"
                placeholderTextColor={theme.muted}
                onSubmitEditing={submit}
                className="text-[40px] font-extrabold tracking-[12px] text-purple text-center w-full"
              />
            </View>

            {error ? (
              <Text accessibilityLiveRegion="polite" className="text-[13px] leading-5 font-semibold text-center mb-3" style={{ color: theme.dangerText }}>
                {error}
              </Text>
            ) : (
              <Text className="text-[12px] leading-[18px] text-muted-light dark:text-muted-dark text-center mb-3">
                Tienes que estar en el local: usamos tu ubicación solo en este momento. {costLine}.
              </Text>
            )}

            <Press
              accessibilityRole="button"
              accessibilityState={{ disabled: code.length !== 4 || busy, busy }}
              onPress={submit}
              disabled={code.length !== 4 || busy}
              className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5"
              style={{ opacity: code.length !== 4 && !busy ? 0.5 : 1 }}
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-[15px] font-bold text-white">Canjear</Text>}
            </Press>

            <Press accessibilityRole="button" hitSlop={8} onPress={onFallback} disabled={busy} className="py-2.5 items-center">
              <Text className="text-[13px] font-bold text-purple-ink dark:text-purple-soft">Prefiero mostrar un código al cajero</Text>
            </Press>
            <Press accessibilityRole="button" hitSlop={8} onPress={onClose} disabled={busy} className="py-2 items-center">
              <Text className="text-[13px] text-muted-light dark:text-muted-dark">Todavía no</Text>
            </Press>
          </Glass>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
