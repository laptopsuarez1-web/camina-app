import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { useColorScheme } from 'nativewind';
import { colors } from '@/theme/tokens';
import { usePlaces } from '@/hooks/usePlaces';
import { BarrioPicker } from '@/components/BarrioPicker';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      className="rounded-full px-3.5 py-2 mr-2 mb-2 border"
      style={{
        minHeight: 40,
        justifyContent: 'center',
        backgroundColor: selected ? colors.mint : 'transparent',
        borderColor: selected ? colors.mint : dark ? colors.dark.line : colors.light.line,
      }}
    >
      <Text style={{ color: selected ? colors.mintInk : dark ? colors.dark.muted : colors.light.muted, fontWeight: selected ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Press>
  );
}

// Ciudad de una lista corta; la zona se busca escribiendo (salen solo las coincidencias) o con la ubicación, así queda siempre bien escrito.
export function PlacePicker({
  city,
  zone,
  onChange,
}: {
  city: string;
  zone: string | null;
  onChange: (city: string, zone: string | null) => void;
}) {
  const { data } = usePlaces();
  if (!data) return null;
  const zones = data.zones.filter((z) => z.city === city);

  return (
    <View>
      <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1.5">Ciudad</Text>
      <View className="flex-row flex-wrap">
        {data.cities.map((c) => (
          <Chip key={c} label={c} selected={c === city} onPress={() => onChange(c, c === city ? zone : null)} />
        ))}
      </View>
      {zones.length > 0 && (
        <View className="mt-1">
          <BarrioPicker city={city} zone={zone} onChange={(z) => onChange(city, z)} />
        </View>
      )}
    </View>
  );
}
