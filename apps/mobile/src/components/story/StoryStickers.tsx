import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Historia del canje: el logo de Camina × el logo del local, con su nombre debajo, y el slogan. Nada más.
export type StickerProps = { businessName: string; businessLogo?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 } as const;
const LOGO_SHADOW = { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 } as const;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}

function Brand({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', width: 96 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...LOGO_SHADOW }}>{children}</View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 10, letterSpacing: 1.4, marginTop: 7, ...SHADOW }}>{name}</Text>
    </View>
  );
}

// Entre los dos logos: «×» o «con».
export const STORY_JOINER: 'x' | 'con' = 'con';

export function StorySticker({ businessName, businessLogo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 36, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Brand name="CAMINA">
          <View style={{ width: 52, height: 52, backgroundColor: '#241748', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={require('@/../assets/logo-mint.png')} accessible={false} style={{ width: 38, height: 38 }} />
          </View>
        </Brand>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: STORY_JOINER === 'x' ? 16 : 13, marginTop: STORY_JOINER === 'x' ? 15 : 17, ...SHADOW }}>{STORY_JOINER === 'x' ? '×' : 'con'}</Text>
        <Brand name={businessName.toUpperCase()}>
          {businessLogo
            ? <Image source={{ uri: businessLogo }} accessible={false} style={{ width: 52, height: 52 }} />
            : <Text style={{ color: '#241748', fontSize: 22, ...wm() }}>{businessName.slice(0, 1).toUpperCase()}</Text>}
        </Brand>
      </View>
      <Text style={{ color: '#fff', fontSize: 20, letterSpacing: -0.3, marginTop: 14, ...wm(), ...SHADOW }}>lo gané caminando</Text>
    </View>
  );
}
