import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Coffee,
  ForkKnife,
  Ticket,
  Barbell,
  Sparkle,
  ShoppingBag,
  FirstAid,
  Wrench,
  Storefront,
  SquaresFour,
  type IconProps,
} from '@/components/icons';

type CategoryStyle = { icon: (p: IconProps) => React.ReactElement; from: string; to: string };

// Ícono y color de cada categoría (las mismas que se eligen en el panel de comercios).
export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Todos: { icon: SquaresFour, from: '#A672E8', to: '#8B4FD1' },
  Café: { icon: Coffee, from: '#7FEDC4', to: '#4FC3A8' },
  Gastronomía: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Entretenimiento: { icon: Ticket, from: '#A672E8', to: '#8B4FD1' },
  Fitness: { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0' },
  Belleza: { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  Compras: { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1' },
  Salud: { icon: FirstAid, from: '#FF7A7E', to: '#E5484D' },
  Servicios: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7' },
  Otro: { icon: Storefront, from: '#A672E8', to: '#8B4FD1' },
  // Categorías nuevas del panel. La app solo muestra las que tienen comercios.
  Panadería: { icon: Coffee, from: '#FFB27A', to: '#F2985C' },
  Burgers: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Sándwiches: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Pizza: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Sushi: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Restaurante: { icon: ForkKnife, from: '#FFB27A', to: '#F2985C' },
  Helados: { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  'Bar & Vinos': { icon: Ticket, from: '#A672E8', to: '#8B4FD1' },
  'Dietética & Saludable': { icon: FirstAid, from: '#7FEDC4', to: '#3FB7A0' },
  'Estética & Belleza': { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  Farmacias: { icon: FirstAid, from: '#FF7A7E', to: '#E5484D' },
  'Yoga & Pilates': { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0' },
  'Gimnasio & Deporte': { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0' },
  Bienestar: { icon: Sparkle, from: '#7FEDC4', to: '#4FC3A8' },
  Cultura: { icon: Ticket, from: '#A672E8', to: '#8B4FD1' },
  Cine: { icon: Ticket, from: '#A672E8', to: '#8B4FD1' },
  Mascotas: { icon: Storefront, from: '#86A6E6', to: '#5B7FC7' },
  Tecnología: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7' },
  'Ropa & Accesorios': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1' },
  'Tienda Online': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1' },
  Kiosco: { icon: Storefront, from: '#FFB27A', to: '#F2985C' },
  Barbería: { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  Peluquería: { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  'Uñas & Spa': { icon: Sparkle, from: '#F27BA0', to: '#D4537E' },
  Óptica: { icon: Storefront, from: '#86A6E6', to: '#5B7FC7' },
  'Librería & Papelería': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1' },
  'Joyería & Relojería': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1' },
  Lavandería: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7' },
  'Plantas & Flores': { icon: Sparkle, from: '#7FEDC4', to: '#4FC3A8' },
};

export function categoryStyle(category?: string | null): CategoryStyle {
  return (category && CATEGORY_STYLES[category]) || CATEGORY_STYLES.Otro;
}

// Logo del comercio si lo subió; si no, una burbuja de color con el ícono de su categoría.
export function BusinessAvatar({
  logoUrl,
  category,
  size,
}: {
  logoUrl?: string | null;
  category?: string | null;
  size: number;
}) {
  const radius = size * 0.28;
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const { icon: Icon, from, to } = categoryStyle(category);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        shadowColor: to,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={size * 0.5} color="#fff" weight="fill" />
      </LinearGradient>
    </View>
  );
}
