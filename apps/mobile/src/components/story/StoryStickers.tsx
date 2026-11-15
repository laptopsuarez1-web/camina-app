import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Historia del canje: una pastilla abajo, «CAMINA con [logo del local]». El logo va cuadrado con las puntas redondeadas,
// igual que en el mapa y en las fichas de los comercios.
export type StickerProps = { businessName: string; businessLogo?: string | null; businessCategory?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const MINT = '#62F0B6';
const INK = '#241748';
const H = 62;
const LOGO = H - 12;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}

export function StorySticker({ businessName, businessLogo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' }}>
      <View style={{ height: H, borderRadius: H / 2, backgroundColor: INK, flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 6, gap: 11, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}>
        <Text style={{ color: MINT, fontSize: 28, letterSpacing: 0.5, ...wm() }}>CAMINA</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '700' }}>con</Text>
        <View style={{ width: LOGO, height: LOGO, borderRadius: LOGO * 0.28, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {businessLogo
            ? <Image source={{ uri: businessLogo }} accessible={false} style={{ width: LOGO, height: LOGO }} />
            : <Text style={{ color: INK, fontSize: 22, ...wm() }}>{businessName.slice(0, 1).toUpperCase()}</Text>}
        </View>
      </View>
    </View>
  );
}
