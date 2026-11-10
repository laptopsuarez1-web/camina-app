import { Alert, Platform } from 'react-native';
import { useAppAlertStore, type AppAlertButton } from '@/store/useAppAlertStore';

// Todos los `Alert.alert` de la app pasan por aquí: en vez de la ventana gris del sistema sale el aviso de Camina
// (AppAlertHost), con el Baifo y los colores de la app. Si el host todavía no está montado (arranque), se usa
// la ventana del sistema para que ningún aviso se pierda.
const nativeAlert = Alert.alert.bind(Alert);

Alert.alert = (title, message, buttons, options) => {
  const store = useAppAlertStore.getState();
  if (!store.hostReady) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const text = [title, message].filter(Boolean).join('\n\n');
      const list = buttons ?? [];
      if (list.length > 1) {
        const ok = window.confirm(text);
        (ok ? list.find((b) => b.style !== 'cancel') : list.find((b) => b.style === 'cancel'))?.onPress?.();
      } else {
        window.alert(text);
        list[0]?.onPress?.();
      }
      return;
    }
    nativeAlert(title, message, buttons, options);
    return;
  }
  store.push(title, message ?? undefined, buttons as AppAlertButton[] | undefined, options?.cancelable);
};
