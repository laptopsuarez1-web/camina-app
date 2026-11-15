import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Adorno de la historia del canje: simple. «Llegué caminando» y «Camina × local», sobre la foto de la persona.
// Tres formas de ponerlo; la persona elige.
export type StickerLook = 'texto' | 'pastilla' | 'esquina';
export const STICKER_LOOKS: { key: StickerLook; label: string }[] = [
  { key: 'texto', label: 'Texto' },
  { key: 'pastilla', label: 'Pastilla' },
  { key: 'esquina', label: 'Esquina' },
];

export type StickerProps = { businessName: string; businessLogo?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const MINT = '#62F0B6';
const INK = '#241748';
const PIE_IZQ = require('@/../assets/pie-izq-mint.png');
const PIE_DER = require('@/../assets/pie-der-mint.png');
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 } as const;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}
const camina = (businessName: string) => `CAMINA × ${businessName.toUpperCase()}`;

function Feet({ size = 16, tint }: { size?: number; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      <Image source={PIE_IZQ} accessible={false} resizeMode="contain" style={{ width: size / 2, height: size, marginTop: size * 0.18, tintColor: tint }} />
      <Image source={PIE_DER} accessible={false} resizeMode="contain" style={{ width: size / 2, height: size, tintColor: tint }} />
    </View>
  );
}

// Texto: grande y limpio, centrado abajo.
function Texto({ businessName }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' }}>
      <Feet size={20} />
      <Text style={{ color: '#fff', fontSize: 30, letterSpacing: -0.6, marginTop: 6, ...wm(), ...SHADOW }}>llegué caminando</Text>
      <Text numberOfLines={1} style={{ color: MINT, fontWeight: '800', fontSize: 11, letterSpacing: 1.8, marginTop: 4, ...SHADOW }}>{camina(businessName)}</Text>
    </View>
  );
}

// Pastilla: una cápsula blanca con las huellas, el texto y el logo del local.
function Pastilla({ businessName, businessLogo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 38, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 999, paddingLeft: 14, paddingRight: businessLogo ? 5 : 16, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
        <Feet size={16} tint={INK} />
        <View>
          <Text style={{ color: INK, fontSize: 15, letterSpacing: -0.2, ...wm() }}>llegué caminando</Text>
          <Text numberOfLines={1} style={{ color: '#6B5A8A', fontWeight: '700', fontSize: 9, letterSpacing: 1.2 }}>{camina(businessName)}</Text>
        </View>
        {businessLogo ? <Image source={{ uri: businessLogo }} accessible={false} style={{ width: 34, height: 34, borderRadius: 17 }} /> : null}
      </View>
    </View>
  );
}

// Esquina: chiquito abajo a la izquierda, como una firma.
function Esquina({ businessName }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 20, bottom: 30 }}>
      <Text style={{ color: '#fff', fontSize: 19, letterSpacing: -0.3, ...wm(), ...SHADOW }}>llegué caminando.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <View style={{ width: 18, height: 2, backgroundColor: MINT }} />
        <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 10, letterSpacing: 1.6, ...SHADOW }}>{camina(businessName)}</Text>
      </View>
    </View>
  );
}

const MAP: Record<StickerLook, (p: StickerProps) => React.JSX.Element> = { texto: Texto, pastilla: Pastilla, esquina: Esquina };

export function StorySticker({ look, ...props }: StickerProps & { look: StickerLook }) {
  const C = MAP[look];
  return <C {...props} />;
}
