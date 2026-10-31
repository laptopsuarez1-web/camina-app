import type { ComponentProps } from 'react';
import { KeyboardAvoidingView } from 'react-native';

// El teclado empuja el contenido hacia arriba en iPhone y en Android. Antes cada pantalla usaba
// `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`: en Android (pantalla completa, sin que la ventana se
// redimensione sola) el teclado tapaba el campo y el botón. Toda pantalla u hoja con un campo de texto va dentro de esto.
export function KeyboardSafe(props: ComponentProps<typeof KeyboardAvoidingView>) {
  return <KeyboardAvoidingView behavior="padding" {...props} />;
}
