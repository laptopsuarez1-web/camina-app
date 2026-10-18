import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GOLD } from '@/components/ui/Featured';
import {
  Coffee,
  Food,
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

type CategoryStyle = { icon: (p: IconProps) => React.ReactElement; from: string; to: string; deep: string };

// Ícono y color de cada categoría (las mismas que se eligen en el panel de comercios).
export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Todos: { icon: SquaresFour, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Café: { icon: Coffee, from: '#7FEDC4', to: '#4FC3A8', deep: '#1F7A66' },
  Gastronomía: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Entretenimiento: { icon: Ticket, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Fitness: { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0', deep: '#1F7A66' },
  Belleza: { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  Compras: { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Salud: { icon: FirstAid, from: '#FF7A7E', to: '#E5484D', deep: '#B3262B' },
  Servicios: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7', deep: '#3A57A0' },
  Otro: { icon: Storefront, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  // Categorías nuevas del panel. La app solo muestra las que tienen comercios.
  Panadería: { icon: Coffee, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Burgers: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Sándwiches: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Pizza: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Sushi: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Restaurante: { icon: Food, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Helados: { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  'Bar & Vinos': { icon: Ticket, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  'Dietética & Saludable': { icon: FirstAid, from: '#7FEDC4', to: '#3FB7A0', deep: '#1F7A66' },
  'Estética & Belleza': { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  Farmacias: { icon: FirstAid, from: '#FF7A7E', to: '#E5484D', deep: '#B3262B' },
  'Yoga & Pilates': { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0', deep: '#1F7A66' },
  'Gimnasio & Deporte': { icon: Barbell, from: '#7FEDC4', to: '#3FB7A0', deep: '#1F7A66' },
  Bienestar: { icon: Sparkle, from: '#7FEDC4', to: '#4FC3A8', deep: '#1F7A66' },
  Cultura: { icon: Ticket, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Cine: { icon: Ticket, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Mascotas: { icon: Storefront, from: '#86A6E6', to: '#5B7FC7', deep: '#3A57A0' },
  Tecnología: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7', deep: '#3A57A0' },
  'Ropa & Accesorios': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  'Tienda Online': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Kiosco: { icon: Storefront, from: '#FFB27A', to: '#F2985C', deep: '#B0541A' },
  Barbería: { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  Peluquería: { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  'Uñas & Spa': { icon: Sparkle, from: '#F27BA0', to: '#D4537E', deep: '#A52F5C' },
  Óptica: { icon: Storefront, from: '#86A6E6', to: '#5B7FC7', deep: '#3A57A0' },
  'Librería & Papelería': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  'Joyería & Relojería': { icon: ShoppingBag, from: '#A672E8', to: '#8B4FD1', deep: '#5B31A3' },
  Lavandería: { icon: Wrench, from: '#86A6E6', to: '#5B7FC7', deep: '#3A57A0' },
  'Plantas & Flores': { icon: Sparkle, from: '#7FEDC4', to: '#4FC3A8', deep: '#1F7A66' },
};

export function categoryStyle(category?: string | null): CategoryStyle {
  return (category && CATEGORY_STYLES[category]) || CATEGORY_STYLES.Otro;
}

// Logo del comercio si lo subió; si no, una burbuja de color con el ícono de su categoría.
// Cuadrado con esquinas redondeadas. Los destacados llevan un aro dorado (el tamaño total no cambia).
export function BusinessAvatar({
  logoUrl,
  category,
  size,
  featured,
}: {
  logoUrl?: string | null;
  category?: string | null;
  size: number;
  featured?: boolean;
}) {
  if (featured) {
    const border = Math.max(2, Math.round(size * 0.035));
    const pad = 2;
    const inner = size - 2 * (border + pad);
    return (
      <View
        style={{
          width: size,
          height: size,
          borderWidth: border,
          borderColor: GOLD,
          borderRadius: inner * 0.28 + pad + border,
          padding: pad,
          backgroundColor: '#fff',
          shadowColor: GOLD,
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <BusinessAvatar logoUrl={logoUrl} category={category} size={inner} />
      </View>
    );
  }
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
