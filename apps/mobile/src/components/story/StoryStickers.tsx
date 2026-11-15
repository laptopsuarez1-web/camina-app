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
    <View style={{ alignItems: 'center', width: 92 }}>
      <View style={{ width: 58, height: 58, borderRadius: 29, padding: 2.5, backgroundColor: 'rgba(255,255,255,0.95)', ...LOGO_SHADOW }}>
        <View style={{ flex: 1, borderRadius: 27, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 9.5, letterSpacing: 1.6, marginTop: 8, ...SHADOW }}>{name}</Text>
    </View>
  );
}

// Entre los dos logos: «×» o «con».
export const STORY_JOINER: 'x' | 'con' = 'con';

// Los dos logos, lado a lado, sobre un vidrio oscuro suave para que se lean en cualquier foto.
export function StorySticker({ businessName, businessLogo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(18,10,30,0.35)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingTop: 12, paddingBottom: 10, paddingHorizontal: 6 }}>
        <Brand name="CAMINA">
          <View style={{ width: '100%', height: '100%', backgroundColor: '#241748', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={require('@/../assets/logo-mint.png')} accessible={false} style={{ width: 38, height: 38 }} />
          </View>
        </Brand>
        <View style={{ height: 58, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: STORY_JOINER === 'x' ? 18 : 13, fontWeight: '600', fontStyle: STORY_JOINER === 'con' ? 'italic' : 'normal', opacity: 0.9, ...SHADOW }}>{STORY_JOINER === 'x' ? '×' : 'con'}</Text>
        </View>
        <Brand name={businessName.toUpperCase()}>
          {businessLogo
            ? <Image source={{ uri: businessLogo }} accessible={false} style={{ width: '100%', height: '100%' }} />
            : <Text style={{ color: '#241748', fontSize: 22, ...wm() }}>{businessName.slice(0, 1).toUpperCase()}</Text>}
        </Brand>
      </View>
    </View>
  );
}
