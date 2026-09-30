import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme/tokens';
import { usePlaces } from '@/hooks/usePlaces';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3.5 py-2 mr-2 mb-2 border"
      style={{
        backgroundColor: selected ? colors.mint : 'transparent',
        borderColor: selected ? colors.mint : colors.light.line,
      }}
    >
      <Text style={{ color: selected ? '#1E8F6F' : colors.light.muted, fontWeight: selected ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// Ciudad y barrio se eligen de una lista (nada de texto libre), así quedan siempre bien escritos.
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
        <>
          <Text className="text-muted-light dark:text-muted-dark text-[12px] mt-1 mb-1.5">Zona o barrio</Text>
          <View className="flex-row flex-wrap">
            {zones.map((z) => (
              <Chip key={z.id} label={z.name} selected={z.name === zone} onPress={() => onChange(city, z.name === zone ? null : z.name)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
