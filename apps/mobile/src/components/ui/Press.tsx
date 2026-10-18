import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type PressableStateCallbackType, type StyleProp, type View, type ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';
import { buzz } from '@/lib/haptics';
import { PressTickContext } from '@/components/ui/ReactiveIcon';

// Reemplazo de Pressable con respuesta al toque en menos de 100 ms:
// - 'scale' (por defecto): la tarjeta o botón se achica a 0,97 y se oscurece un poco. En Android solo se oscurece (convención de la plataforma).
// - 'row': fila de una lista agrupada; se resalta el fondo, sin escala.
// - 'none': sin respuesta (fondos que cierran una hoja, etc.). También queda en 'none' si el estilo ocupa toda la pantalla.
// `haptic` agrega la vibración suave del sistema al tocar: 'selection' (cambiar pestaña, filtro o interruptor) o 'light' (acción principal).
export type PressFeedback = 'scale' | 'row' | 'none';
type Props = PressableProps & { className?: string; feedback?: PressFeedback; haptic?: 'selection' | 'light' };

function fillsScreen(style: StyleProp<ViewStyle>, className?: string) {
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  if (flat && (flat.position === 'absolute' || flat.flex === 1)) return true;
  return !!className && /(^|\s)(absolute|inset-0)(\s|$)/.test(className);
}

export const Press = forwardRef<View, Props>(function Press({ style, feedback, haptic, onPress, onPressIn, onPressOut, className, children, ...rest }, ref) {
  const dark = useColorScheme().colorScheme === 'dark';
  const [pressed, setPressed] = useState(false);
  // Cuenta los toques: los íconos de adentro (IconBubble) lo leen para reaccionar.
  const [taps, setTaps] = useState(0);
  const isFn = typeof style === 'function';
  const mode: PressFeedback = feedback ?? (!isFn && fillsScreen(style, className) ? 'none' : 'scale');

  // El efecto se calcula con el estado "apretado" y se suma como un estilo más: así NativeWind sigue uniendo `className` con `style`
  // (si `style` fuera una función, `className` se perdería).
  let extra: ViewStyle | undefined;
  if (pressed && mode !== 'none' && !rest.disabled) {
    if (mode === 'row') extra = { backgroundColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(91,49,163,0.08)' };
    else if (Platform.OS === 'android') extra = { opacity: 0.82 };
    else extra = { transform: [{ scale: 0.97 }], opacity: 0.92 };
  }

  return (
    <Pressable
      ref={ref}
      className={className}
      onPress={haptic ? (e) => { buzz[haptic](); onPress?.(e); } : onPress}
      onPressIn={(e) => { setPressed(true); setTaps((n) => n + 1); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
      style={isFn ? (state) => [(style as (s: PressableStateCallbackType) => StyleProp<ViewStyle>)(state), extra] : [style as StyleProp<ViewStyle>, extra]}
      {...rest}
    >
      {typeof children === 'function'
        ? (state: PressableStateCallbackType) => <PressTickContext.Provider value={taps}>{(children as (s: PressableStateCallbackType) => ReactNode)(state)}</PressTickContext.Provider>
        : <PressTickContext.Provider value={taps}>{children as ReactNode}</PressTickContext.Provider>}
    </Pressable>
  );
});
