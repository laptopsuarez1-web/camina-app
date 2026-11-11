import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { colors } from '@/theme/tokens';

// Aviso en Perfil: quien se registró con correo y contraseña verifica su correo con un código de 6 números.
// Solo se exige para canjear; para lo demás puede seguir usando la app. Quien entra con Google o Apple no lo ve (ya viene verificado).
export function VerifyEmailCard({ email, required = false, onClose, closeLabel = 'Volver', onVerified }: { email: string; required?: boolean; onClose?: () => void; closeLabel?: string; onVerified?: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function verify() {
    if (busy || code.length !== 6) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('panel-email', { body: { action: 'verify_code', code } });
    setBusy(false);
    if (error) return Alert.alert('No pudimos verificar', friendlyError(error));
    if (!data?.ok) return Alert.alert('Código', data?.error ?? 'Ese código no es correcto.');
    onVerified?.();
  }

  async function resend() {
    const { data, error } = await supabase.functions.invoke('panel-email', { body: { action: 'resend' } });
    if (error) return Alert.alert('No pudimos mandarlo', friendlyError(error));
    Alert.alert(data?.wait ? 'Espera un momento' : 'Listo', data?.wait ? 'Ya te mandamos un código hace un momento. Revisa tu correo.' : 'Te mandamos un código nuevo.');
  }
  return (
    <Glass className="rounded-2xl p-4 mb-4">
      <Text className="text-[15px] font-extrabold text-text-light dark:text-text-dark">{required ? 'Verifica tu correo para canjear' : 'Verifica tu correo'}</Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mt-1" style={{ lineHeight: 19 }}>
        Te mandamos un código de 6 números a <Text className="font-bold text-text-light dark:text-text-dark">{email}</Text>.{required ? ' Es solo una vez: así cuidamos que los premios sean para personas reales.' : ' Así te avisamos de tus canjes y puedes recuperar tu cuenta.'}
      </Text>
      <View className="mt-3" style={{ gap: 10 }}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(41,28,71,0.35)'}
          accessibilityLabel="Código de 6 números"
          style={{
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(41,28,71,0.18)',
            color: isDark ? '#fff' : '#291C47',
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: 6,
            textAlign: 'center',
          }}
        />
        <Press
          accessibilityRole="button"
          accessibilityLabel="Verificar"
          onPress={verify}
          disabled={code.length !== 6 || busy}
          className="rounded-xl items-center justify-center"
          style={{ height: 46, backgroundColor: colors.mint, opacity: code.length === 6 ? 1 : 0.5 }}
        >
          <Text style={{ color: '#12281f', fontWeight: '800', fontSize: 14 }}>Verificar</Text>
        </Press>
      </View>
      {onClose ? (
        <Press accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} className="rounded-xl items-center justify-center mt-3" style={{ height: 44, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(41,28,71,0.18)' }}>
          <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{closeLabel}</Text>
        </Press>
      ) : null}
      <Press accessibilityRole="button" accessibilityLabel="Mandar otro código" onPress={resend} className="mt-3 self-start">
        <Text className="text-[12.5px] font-semibold" style={{ color: isDark ? colors.mint : colors.aquaDeep, textDecorationLine: 'underline' }}>
          Mandar otro código
        </Text>
      </Press>
    </Glass>
  );
}
