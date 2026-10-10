import { createContext, useContext, type Ref } from 'react';
import { Platform, StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { WEB_FAMILY, brandFamily, brandFontsReady } from '@/theme/fonts';

// Text y TextInput de la app: igual que los de React Native, pero con la fuente de marca.
// Con una fuente propia el peso no sale de `fontWeight` sino de la familia, así que acá se traduce uno en otro
// (y se pisa `fontWeight`, para que Android no lo "engorde" encima). `className` ya llega resuelto como `style`.
const InsideText = createContext(false);

function withBrand(style: TextProps['style'], nested: boolean): TextProps['style'] {
  if (!brandFontsReady()) return style;
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (flat.fontFamily) return style;
  // Un Text anidado sin peso propio hereda la familia del padre (por ejemplo, una palabra dentro de un párrafo en negrita).
  if (nested && flat.fontWeight == null) return style;
  // En web el peso lo resuelve CSS (la clase `font-bold` no aparece en `style`): solo se fija la familia.
  if (Platform.OS === 'web') return [style, { fontFamily: WEB_FAMILY }];
  // `fontWeight: 'normal'` pisa al peso original: con familias por peso el negrita ya viene en el archivo.
  return [style, { fontFamily: brandFamily(flat.fontWeight), fontWeight: 'normal' }];
}

function BrandText({ style, children, ref, ...props }: TextProps & { ref?: Ref<RNText> }) {
  const nested = useContext(InsideText);
  return (
    <InsideText.Provider value>
      <RNText ref={ref} {...props} style={withBrand(style, nested)}>
        {children}
      </RNText>
    </InsideText.Provider>
  );
}

function BrandTextInput({ style, ref, ...props }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput ref={ref} {...props} style={withBrand(style as TextProps['style'], false) as TextInputProps['style']} />;
}

cssInterop(BrandText, { className: 'style' });
cssInterop(BrandTextInput, { className: 'style' });

// Mismo nombre como valor y como tipo (`useRef<TextInput>`), igual que en React Native.
const Text = BrandText;
// eslint-disable-next-line @typescript-eslint/no-redeclare
type Text = RNText;
const TextInput = BrandTextInput;
// eslint-disable-next-line @typescript-eslint/no-redeclare
type TextInput = RNTextInput;
export { Text, TextInput };
