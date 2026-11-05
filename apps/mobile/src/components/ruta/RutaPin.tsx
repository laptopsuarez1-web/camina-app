import { useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '@/components/ui/Text';

const MINT = '#62F0B6';
const PIE_IZQ = require('@/../assets/pie-izq-mint.png');

// Pin de la Ruta: misma forma que los pines del mapa de Canjes (cabeza cuadrada redondeada con el logo y punta abajo),
// con borde menta y unas huellas arriba si el local es de tu ruta. Sin ruta va en blanco, igual que en Canjes.
export function RutaPin({ name, logoUrl, size = 46, route = true, onLoaded }: {
  name: string; logoUrl?: string | null; size?: number; route?: boolean; onLoaded?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const ring = route ? MINT : '#fff';
  const b = route ? 4 : 3;
  const inner = size - b * 2;
  const showLogo = !!logoUrl && !failed;
  return (
    <View style={{ width: size + 16, height: size + 26, alignItems: 'center', paddingTop: 8 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: ring, alignItems: 'center', justifyContent: 'center',
        shadowColor: route ? MINT : '#000', shadowOpacity: route ? 0.6 : 0.4, shadowRadius: route ? 8 : 4, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
        <View style={{ width: inner, height: inner, borderRadius: inner * 0.28, overflow: 'hidden', backgroundColor: showLogo ? '#fff' : '#1F7A66', alignItems: 'center', justifyContent: 'center' }}>
          {showLogo ? (
            <Image source={{ uri: logoUrl! }} fadeDuration={0} onLoad={onLoaded} onError={() => setFailed(true)} style={{ width: inner, height: inner }} resizeMode="cover" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{(name.trim()[0] ?? '·').toUpperCase()}</Text>
          )}
        </View>
        {route && (
          <View style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#200A52', borderWidth: 2, borderColor: MINT, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={PIE_IZQ} style={{ width: 6, height: 12 }} resizeMode="contain" />
          </View>
        )}
      </View>
      <View style={{ marginTop: -2, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ring }} />
    </View>
  );
}
