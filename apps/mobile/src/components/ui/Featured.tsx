import { Image } from 'react-native';

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
