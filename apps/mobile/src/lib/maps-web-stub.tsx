import { View, Text } from 'react-native';

// react-native-maps no existe en web; este stub deja que la versión web
// (solo para previews) cargue sin romper. En iOS/Android se usa el real.
export const PROVIDER_GOOGLE = 'google';
export function Marker(_props: unknown) {
  return null;
}
export default function MapView({ style, children }: { style?: object; children?: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: '#1d1b2e', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#7C6A9C', fontSize: 12 }}>Mapa (solo en la app)</Text>
      {children}
    </View>
  );
}
