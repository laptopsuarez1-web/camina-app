import { Image } from 'react-native';

// La moneda de Puntos de Camina. Siempre es la imagen de la marca (no se redibuja); `gold` es la dorada de los comercios destacados.
// Decorativa: el valor al lado ya dice "Puntos", así que no se anuncia sola.
export function Coin({ size = 16, gold = false }: { size?: number; gold?: boolean }) {
  return (
    <Image
      accessible={false}
      source={gold ? require('@/../assets/camina-coin-gold.png') : require('@/../assets/camina-coin.png')}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}
