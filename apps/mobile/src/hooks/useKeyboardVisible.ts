import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// true mientras el teclado está abierto. Con teclado, la barra inferior (zona del indicador de inicio) ya no hace falta
// y dejaba un hueco entre la barra de escribir y el teclado.
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}
