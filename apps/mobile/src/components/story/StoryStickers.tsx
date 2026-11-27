import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Historia del canje: una pastilla chica y centrada abajo. Dos versiones: «[ícono de Camina] con [logo del local]» o «CAMINA con [logo del local]».
// El logo va cuadrado con las puntas redondeadas, igual que en el mapa y en las fichas de los comercios.
export type StickerProps = { businessName: string; businessLogo?: string | null; businessCategory?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType; variant?: StickerVariant };
export type StickerVariant = 'icono' | 'nombre';

const APP_ICON = require('@/../assets/icon.png');

const MINT = '#62F0B6';
const INK = '#241748';
const H = 42;
const LOGO = H - 14;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}

export function StorySticker({ businessName, businessLogo, variant = 'nombre' }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: '14%', alignItems: 'center' }}>
      <View style={{ height: H, borderRadius: 13, backgroundColor: INK, flexDirection: 'row', alignItems: 'center', paddingLeft: variant === 'icono' ? 9 : 14, paddingRight: 9, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        {variant === 'icono'
          ? <Image source={APP_ICON} accessible={false} style={{ width: LOGO, height: LOGO, borderRadius: LOGO / 2 }} />
          : <Text style={{ color: MINT, fontSize: 16, letterSpacing: 0.4, ...wm() }}>CAMINA</Text>}
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', marginLeft: 8, marginRight: 8 }}>con</Text>
        <View style={{ width: LOGO, height: LOGO, borderRadius: LOGO * 0.28, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {businessLogo
            ? <Image source={{ uri: businessLogo }} accessible={false} style={{ width: LOGO, height: LOGO }} />
            : <Text style={{ color: INK, fontSize: 14, ...wm() }}>{businessName.slice(0, 1).toUpperCase()}</Text>}
        </View>
      </View>
    </View>
  );
}
