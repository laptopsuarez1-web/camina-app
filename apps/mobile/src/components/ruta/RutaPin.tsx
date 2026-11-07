import { useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Coin } from '@/components/ui/Coin';
import { GOLD as FEATURED_GOLD } from '@/components/ui/Featured';

const MINT = '#62F0B6';
// Mismo dorado que los comercios Paso Adelante del mapa de Canjes.
export const GOLD = FEATURED_GOLD;
const HUELLAS = require('@/../assets/ruta-huellas.png');

// Pin de la Ruta: misma forma que los pines del mapa de Canjes (cabeza cuadrada redondeada con el logo y punta abajo),
// con borde menta y unas huellas arriba si el local es de tu ruta. Sin ruta va en blanco, igual que en Canjes.
// `star`: el local protagonista del mes (el que regala el premio del sorteo) se ve igual que un destacado Paso Adelante
// en Canjes: marco dorado y la moneda dorada arriba a la derecha (en vez de las huellas menta).
export function RutaPin({ name, logoUrl, size = 46, route = true, star = false, onLoaded }: {
  name: string; logoUrl?: string | null; size?: number; route?: boolean; star?: boolean; onLoaded?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  // El protagonista del mes va con marco dorado (destacado); el resto, menta.
  const ring = star ? GOLD : route ? MINT : '#fff';
  const b = route ? 4 : 3;
  const inner = size - b * 2;
  const showLogo = !!logoUrl && !failed;
  return (
    <View style={{ width: size + 16, height: size + 26, alignItems: 'center', paddingTop: 8 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: ring, alignItems: 'center', justifyContent: 'center',
        shadowColor: star ? '#000' : route ? MINT : '#000', shadowOpacity: star ? 0.4 : route ? 0.6 : 0.4, shadowRadius: star ? 4 : route ? 8 : 4, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
        <View style={{ width: inner, height: inner, borderRadius: inner * 0.28, overflow: 'hidden', backgroundColor: showLogo ? '#fff' : '#1F7A66', alignItems: 'center', justifyContent: 'center' }}>
          {showLogo ? (
            <Image source={{ uri: logoUrl! }} fadeDuration={0} onLoad={onLoaded} onError={() => setFailed(true)} style={{ width: inner, height: inner }} resizeMode="cover" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{(name.trim()[0] ?? '·').toUpperCase()}</Text>
          )}
        </View>
        {route && !star && (
          <RutaBadge />
        )}
        {star && (
          <View style={{ position: 'absolute', top: -5, right: -7, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 7, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
            <Coin size={24} gold />
          </View>
        )}
      </View>
      <View style={{ marginTop: -2, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ring }} />
    </View>
  );
}

// Huellas de Camina en un círculo: marca que el local es parte de tu ruta.
export function RutaBadge({ size = 22, style }: { size?: number; style?: object }) {
  return (
    <View style={[{ position: 'absolute', top: -8, right: -8, width: size, height: size, borderRadius: size / 2, backgroundColor: '#200A52', borderWidth: 2, borderColor: MINT, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={HUELLAS} style={{ width: size * 0.5, height: size * 0.56 }} resizeMode="contain" />
    </View>
  );
}

// Pin sorpresa: misma forma que el pin del mapa, pero con un "?" en vez del logo. Va en la tarjeta del evento,
// así no se sabe qué locales te van a tocar hasta que participas.
export function MysteryPin({ size = 34 }: { size?: number }) {
  const b = 3;
  const inner = size - b * 2;
  return (
    <View style={{ width: size + 16, height: size + 26, alignItems: 'center', paddingTop: 8 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center',
        shadowColor: MINT, shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
        <View style={{ width: inner, height: inner, borderRadius: inner * 0.28, backgroundColor: '#2F1E5C', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: MINT, fontWeight: '900', fontSize: size * 0.55, lineHeight: size * 0.66 }}>?</Text>
        </View>
      </View>
      <View style={{ marginTop: -2, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: MINT }} />
    </View>
  );
}
