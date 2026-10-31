import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Camera, Check } from '@/components/icons';
import { GROUP_BACKGROUNDS } from '@/lib/group-look';
import { useThemeColors } from '@/theme/useThemeColors';

export type GroupPhoto = { uri: string; b64: string | null };

// Foto y tema de color del grupo, para elegir al crearlo.
export function GroupLookPicker({ photo, onPhoto, background, onBackground }: {
  photo: GroupPhoto | null;
  onPhoto: (p: GroupPhoto) => void;
  background: string;
  onBackground: (key: string) => void;
}) {
  const { dark, accentIcon } = useThemeColors();
  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1], base64: true });
    if (!r.canceled) onPhoto({ uri: r.assets[0].uri, b64: r.assets[0].base64 ?? null });
  }
  return (
    <View style={{ gap: 14 }}>
      <Press accessibilityRole="button" accessibilityLabel="Elegir foto del grupo" className="self-start" onPress={pickPhoto}>
        <AvatarImage
          uri={photo?.uri}
          style={{ width: 64, height: 64, borderRadius: 32 }}
          fallback={
            <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
              <Camera size={22} color={accentIcon} />
            </View>
          }
        />
      </Press>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {GROUP_BACKGROUNDS.map((b) => {
          const on = background === b.key;
          return (
            <Press key={b.key} accessibilityRole="button" accessibilityLabel={`Fondo ${b.label}`} accessibilityState={{ selected: on }} onPress={() => onBackground(b.key)}>
              <LinearGradient colors={b.colors} style={{ width: 108, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 1, borderColor: on ? '#fff' : 'rgba(255,255,255,0.15)' }}>
                {on ? <Check size={14} color="#fff" weight="bold" /> : null}
                <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>{b.label}</Text>
              </LinearGradient>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
