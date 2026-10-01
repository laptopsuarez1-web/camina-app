import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Vibración suave en los logros. Nunca rompe nada si el celular no la soporta.
export const buzz = {
  light: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};
