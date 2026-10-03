import { Image, View, Text } from 'react-native';

// Comercios del plan Paso Adelante: borde dorado, moneda Camina dorada y primeros en las listas.
// Es lo que el panel les promete como "destacado"; los demás planes no llevan dorado.
export const GOLD = '#E2B33C';

export const isFeatured = (b: { plan?: string | null }) => b.plan === 'paso_adelante';

export function GoldBadge({ size = 20 }: { size?: number }) {
  return (
    <Image
      source={require('@/../assets/camina-coin-gold.png')}
      accessible
      accessibilityLabel="Comercio destacado"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

// Chip para la ficha del comercio: deja claro qué significa la moneda dorada.
export function FeaturedChip() {
  return (
    <View
      className="flex-row items-center self-start rounded-full"
      style={{ gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 11, backgroundColor: 'rgba(226,179,60,0.14)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.45)' }}
    >
      <Image source={require('@/../assets/camina-coin-gold.png')} style={{ width: 18, height: 18, borderRadius: 9 }} />
      <Text className="text-[12px] font-bold" style={{ color: '#8A6510' }}>Comercio destacado</Text>
    </View>
  );
}
