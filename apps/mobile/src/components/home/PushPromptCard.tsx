import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Bell, IconBubble } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';

const DISMISSED_KEY = 'camina_push_prompt_dismissed_at';
const WAIT_MS = 3 * 86_400_000;

// El permiso de avisos se pide recién después del primer logro (un Punto, la meta o una racha) y explicando para qué
// sirve: pedido apenas se entra, mucha gente dice que no y después no le llega nada. "Ahora no" lo esconde 3 días.
export function PushPromptCard({ earnedSomething }: { earnedSomething: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  // Se fija una vez, cuando ya hay algún logro: si todavía se puede preguntar y no tocó "Ahora no" hace poco.
  useEffect(() => {
    if (!earnedSomething) return;
    let alive = true;
    (async () => {
      try {
        const p = await Notifications.getPermissionsAsync();
        const canAsk = p.status === 'undetermined' || (p.status === 'denied' && p.canAskAgain && Platform.OS === 'android');
        const at = Number(await AsyncStorage.getItem(DISMISSED_KEY).catch(() => null)) || 0;
        if (alive) setShow(canAsk && Date.now() - at > WAIT_MS);
      } catch {
        if (alive) setShow(false);
      }
    })();
    return () => { alive = false; };
  }, [earnedSomething]);

  if (!show || !earnedSomething) return null;

  async function activate() {
    setBusy(true);
    try {
      await registerForPushNotificationsAsync({ userInitiated: true });
    } finally {
      setBusy(false);
      setShow(false);
    }
  }

  function later() {
    AsyncStorage.setItem(DISMISSED_KEY, String(Date.now())).catch(() => {});
    setShow(false);
  }

  return (
    <Glass className="rounded-3xl mx-5 mb-4 p-4" style={{ gap: 12 }}>
      <View className="flex-row" style={{ gap: 12 }}>
        <IconBubble icon={Bell} tone="aqua" size={42} />
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold text-text-light dark:text-text-dark">¿Te avisamos antes de perder la racha?</Text>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark" style={{ lineHeight: 17, marginTop: 2 }}>
            Un aviso si estás por cortar la racha, tu puesto en el ranking cada semana o si se te van a vencer Puntos. Nada más.
          </Text>
        </View>
      </View>
      <View className="flex-row" style={{ gap: 8 }}>
        <Press accessibilityRole="button" onPress={later} className="rounded-2xl items-center justify-center bg-purple-light-light dark:bg-purple-light-dark" style={{ paddingVertical: 11, paddingHorizontal: 16 }}>
          <Text className="text-[13.5px] font-bold text-purple-ink dark:text-purple-soft">Ahora no</Text>
        </Press>
        <Press accessibilityRole="button" accessibilityState={{ busy }} disabled={busy} onPress={activate} haptic="light" className="flex-1 rounded-2xl items-center justify-center" style={{ paddingVertical: 11, backgroundColor: colors.aquaDeep }}>
          <Text className="text-[13.5px] font-bold text-white">Activar avisos</Text>
        </Press>
      </View>
    </Glass>
  );
}
