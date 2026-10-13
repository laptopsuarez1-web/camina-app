import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { colors } from '@/theme/tokens';

// Avatar redondo de una persona: su foto o, si no hay, la inicial sobre menta.
export function PersonAvatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <AvatarImage
        uri={photoUrl}
        style={{ width: '100%', height: '100%' }}
        fallback={<Text style={{ fontWeight: '800', color: colors.mintDark, fontSize: Math.round(size * 0.4) }}>{(name || 'C')[0]?.toUpperCase()}</Text>}
      />
    </View>
  );
}
