import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Historia del canje: una pastilla grande abajo con Camina × el local, nada más.
// Dos formas: la palabra CAMINA o el logo de Camina, siempre con el logo del local al lado.
export type StickerLook = 'nombre' | 'logos';
export const STICKER_LOOKS: { key: StickerLook; label: string }[] = [
  { key: 'nombre', label: 'CAMINA × local' },
  { key: 'logos', label: 'Logo × logo' },
];

export type StickerProps = { businessName: string; businessLogo?: string | null; businessCategory?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const MINT = '#62F0B6';
const INK = '#241748';
const H = 62;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}

function Circle({ children, bg = '#fff' }: { children: React.ReactNode; bg?: string }) {
  return <View style={{ width: H - 12, height: H - 12, borderRadius: (H - 12) / 2, overflow: 'hidden', backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

function LocalLogo({ uri, name }: { uri?: string | null; name: string }) {
  return (
    <Circle>
      {uri ? <Image source={{ uri }} accessible={false} style={{ width: H - 12, height: H - 12 }} /> : <Text style={{ color: INK, fontSize: 22, ...wm() }}>{name.slice(0, 1).toUpperCase()}</Text>}
    </Circle>
  );
}

export function StorySticker({ look, businessName, businessLogo }: StickerProps & { look: StickerLook }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' }}>
      <View style={{ height: H, borderRadius: H / 2, backgroundColor: INK, flexDirection: 'row', alignItems: 'center', paddingLeft: look === 'nombre' ? 24 : 6, paddingRight: 6, gap: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}>
        {look === 'nombre'
          ? <Text style={{ color: MINT, fontSize: 28, letterSpacing: 0.5, ...wm() }}>CAMINA</Text>
          : <Circle bg={MINT}><Image source={require('@/../assets/logo-mint.png')} accessible={false} style={{ width: 38, height: 38, tintColor: INK }} /></Circle>}
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '700' }}>×</Text>
        <LocalLogo uri={businessLogo} name={businessName} />
      </View>
    </View>
  );
}
