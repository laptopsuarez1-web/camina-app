import { Alert, Platform } from 'react-native';

// En la web, Alert.alert de React Native no hace nada: los avisos y errores (por ejemplo al crear el perfil)
// quedaban invisibles y parecía que "no deja". Acá se reemplaza por los diálogos del navegador.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    if (list.length > 1) {
      // Confirmación: Aceptar corre el botón que no es "cancel"; Cancelar corre el de cancel, si hay.
      const ok = window.confirm(text);
      const chosen = ok ? list.find((b) => b.style !== 'cancel') : list.find((b) => b.style === 'cancel');
      chosen?.onPress?.();
      return;
    }
    window.alert(text);
    list[0]?.onPress?.();
  };
}
