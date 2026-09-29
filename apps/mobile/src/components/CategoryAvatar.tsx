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
