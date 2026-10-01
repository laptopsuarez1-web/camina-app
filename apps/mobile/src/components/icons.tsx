import type { ComponentType } from 'react';
import { View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { IconProps as PhosphorProps, IconWeight } from 'phosphor-react-native';

// Íconos de la app: Phosphor en estilo duotono (dos tonos). Se exportan con los mismos nombres y
// props (size, color, fill) que usaba lucide, así cada pantalla solo cambia el import.
// Se importa cada ícono por separado para no meter los 1.500 en la app.
import { Bell as Bell_ } from 'phosphor-react-native/src/icons/Bell';
import { Clock as Clock_ } from 'phosphor-react-native/src/icons/Clock';
import { CaretDown as CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUp as CaretUp } from 'phosphor-react-native/src/icons/CaretUp';
import { CaretRight as CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretLeft as CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { Check as Check_ } from 'phosphor-react-native/src/icons/Check';
import { CheckCircle as CheckCircle } from 'phosphor-react-native/src/icons/CheckCircle';
import { UsersThree as UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { MagnifyingGlass as MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPin as MapPin_ } from 'phosphor-react-native/src/icons/MapPin';
import { X as X_ } from 'phosphor-react-native/src/icons/X';
import { Gift as Gift_ } from 'phosphor-react-native/src/icons/Gift';
import { At as At } from 'phosphor-react-native/src/icons/At';
import { Crosshair as Crosshair } from 'phosphor-react-native/src/icons/Crosshair';
import { NavigationArrow as NavigationArrow } from 'phosphor-react-native/src/icons/NavigationArrow';
import { MapTrifold as MapTrifold } from 'phosphor-react-native/src/icons/MapTrifold';
import { Heart as Heart_ } from 'phosphor-react-native/src/icons/Heart';
import { ShareNetwork as ShareNetwork } from 'phosphor-react-native/src/icons/ShareNetwork';
import { Pulse as Pulse } from 'phosphor-react-native/src/icons/Pulse';
import { Flame as Flame_ } from 'phosphor-react-native/src/icons/Flame';
import { House as House } from 'phosphor-react-native/src/icons/House';
import { CalendarBlank as CalendarBlank } from 'phosphor-react-native/src/icons/CalendarBlank';
import { ShoppingBag as ShoppingBag_ } from 'phosphor-react-native/src/icons/ShoppingBag';
import { SignOut as SignOut } from 'phosphor-react-native/src/icons/SignOut';
import { Trash as Trash } from 'phosphor-react-native/src/icons/Trash';
import { Key as Key } from 'phosphor-react-native/src/icons/Key';
import { PencilSimple as PencilSimple } from 'phosphor-react-native/src/icons/PencilSimple';
import { PaperPlaneTilt as PaperPlaneTilt } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { Trophy as Trophy_ } from 'phosphor-react-native/src/icons/Trophy';
import { Plus as Plus_ } from 'phosphor-react-native/src/icons/Plus';
import { Star as Star_ } from 'phosphor-react-native/src/icons/Star';
import { Coffee as Coffee_ } from 'phosphor-react-native/src/icons/Coffee';
import { ForkKnife as ForkKnife_ } from 'phosphor-react-native/src/icons/ForkKnife';
import { Ticket as Ticket_ } from 'phosphor-react-native/src/icons/Ticket';
import { Barbell as Barbell_ } from 'phosphor-react-native/src/icons/Barbell';
import { Sparkle as Sparkle_ } from 'phosphor-react-native/src/icons/Sparkle';
import { FirstAid as FirstAid_ } from 'phosphor-react-native/src/icons/FirstAid';
import { Wrench as Wrench_ } from 'phosphor-react-native/src/icons/Wrench';
import { Storefront as Storefront_ } from 'phosphor-react-native/src/icons/Storefront';
import { SquaresFour as SquaresFour_ } from 'phosphor-react-native/src/icons/SquaresFour';

export type IconProps = {
  size?: number;
  color?: ColorValue;
  // Compatibilidad con lucide: "fill" con un color = ícono relleno.
  fill?: string;
  strokeWidth?: number;
  weight?: IconWeight;
};

function make(Comp: ComponentType<PhosphorProps>, base: IconWeight = 'duotone') {
  return function Icon({ size = 24, color = '#000', fill, weight }: IconProps) {
    const w: IconWeight = weight ?? (fill && fill !== 'none' ? 'fill' : base);
    return <Comp size={size} color={color as string} weight={w} />;
  };
}

// Los íconos "de línea" (flechas, cruz, tilde, más) van en negrita: en duotono se verían casi invisibles.
export const Bell = make(Bell_);
export const Clock = make(Clock_);
export const ChevronDown = make(CaretDown, 'bold');
export const ChevronUp = make(CaretUp, 'bold');
export const ChevronRight = make(CaretRight, 'bold');
export const ChevronLeft = make(CaretLeft, 'bold');
export const Check = make(Check_, 'bold');
export const CheckCircle2 = make(CheckCircle);
export const Users = make(UsersThree);
export const Search = make(MagnifyingGlass, 'bold');
export const MapPin = make(MapPin_);
export const X = make(X_, 'bold');
export const Gift = make(Gift_);
export const AtSign = make(At, 'bold');
export const Locate = make(Crosshair);
export const Navigation = make(NavigationArrow);
export const MapIcon = make(MapTrifold);
export const Heart = make(Heart_);
export const Share2 = make(ShareNetwork);
export const Activity = make(Pulse, 'bold');
export const Flame = make(Flame_);
export const Home = make(House);
export const Calendar = make(CalendarBlank);
export const ShoppingBag = make(ShoppingBag_);
export const LogOut = make(SignOut);
export const Trash2 = make(Trash);
export const KeyRound = make(Key);
export const Pencil = make(PencilSimple);
export const Send = make(PaperPlaneTilt);
export const Trophy = make(Trophy_);
export const Plus = make(Plus_, 'bold');
export const Star = make(Star_);
export const Coffee = make(Coffee_);
export const ForkKnife = make(ForkKnife_);
export const Ticket = make(Ticket_);
export const Barbell = make(Barbell_);
export const Sparkle = make(Sparkle_);
export const FirstAid = make(FirstAid_);
export const Wrench = make(Wrench_);
export const Storefront = make(Storefront_);
export const SquaresFour = make(SquaresFour_);

type Tone = 'aqua' | 'purple' | 'orange' | 'red' | 'mint' | 'gold';
// [arriba, medio, abajo]: el tercer tono, un poco más profundo, le da volumen sin brillos ni relieves.
const TONES: Record<Tone, [string, string, string]> = {
  aqua: ['#8DF0CB', '#4FC3A8', '#33A68C'],
  mint: ['#8DF0CB', '#4FC3A8', '#33A68C'],
  purple: ['#B68AF0', '#8B4FD1', '#7140B8'],
  orange: ['#FFBE8C', '#F2985C', '#DE7F42'],
  red: ['#FF8C8F', '#E5484D', '#C93338'],
  gold: ['#FFE28A', '#EDB52C', '#D39A17'],
};

// Ficha de color con degradé, un filo de luz y el ícono blanco en dos tonos.
export function IconBubble({
  icon: Icon,
  tone = 'aqua',
  size = 44,
}: {
  icon: (p: IconProps) => React.ReactElement;
  tone?: Tone;
  size?: number;
}) {
  const [a, b, c] = TONES[tone];
  const radius = size * 0.32;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        shadowColor: b,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        // Sin elevation: en Android dibuja una sombra gris que no es la del color.
        elevation: 0,
      }}
    >
      <LinearGradient
        colors={[a, b, c]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flex: 1,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.35)',
        }}
      >
        <Icon size={size * 0.52} color="#fff" weight="duotone" />
      </LinearGradient>
    </View>
  );
}
