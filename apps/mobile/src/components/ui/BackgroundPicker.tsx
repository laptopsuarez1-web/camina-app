import { ScrollView, Pressable, View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { BackgroundArt } from '@/components/ui/AmbientBackground';
import { BACKGROUNDS } from '@/components/ui/backgrounds';
import { Check } from '@/components/icons';
import { useBackgroundStore } from '@/store/useBackgroundStore';
import { colors } from '@/theme/tokens';

// Selector de fondo de Perfil: una miniatura por fondo, igual que el deslizador de vidrio
// cambia el resultado al instante. La miniatura muestra cómo se ve el fondo en el modo actual.
export function BackgroundPicker() {
  const dark = useColorScheme().colorScheme === 'dark';
  const current = useBackgroundStore((s) => s.id);
  const setId = useBackgroundStore((s) => s.setId);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 4 }} accessibilityRole="radiogroup">
      {BACKGROUNDS.map((b) => {
        const selected = b.id === current;
        return (
          <Pressable
            key={b.id}
            onPress={() => setId(b.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Fondo ${b.name}`}
            accessibilityHint={b.hint}
            style={{ width: 84, alignItems: 'center' }}
          >
            <View
              style={{
                width: 84,
                height: 112,
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? colors.aquaDeep : dark ? 'rgba(255,255,255,0.25)' : colors.light.line,
              }}
            >
              <BackgroundArt id={b.id} dark={dark} />
              {selected && (
                <View style={{ position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.aquaDeep, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} color="#fff" />
                </View>
              )}
            </View>
            <Text
              numberOfLines={2}
              className={`text-[12px] mt-1.5 text-center ${selected ? 'font-bold text-text-light dark:text-text-dark' : 'text-muted-light dark:text-muted-dark'}`}
            >
              {b.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
