import type { ComponentType } from 'react';
import { View, Platform, type ColorValue, type ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';
import { ReactiveIcon, usePressTick } from '@/components/ui/ReactiveIcon';
import type { IconMotion } from '@/lib/motion';
import type { IconProps as PhosphorProps, IconWeight } from 'phosphor-react-native';

// Íconos de la app: Phosphor en estilo duotono (dos tonos). Se exportan con los mismos nombres y
// props (size, color, fill) que usaba lucide, así cada pantalla solo cambia el import.
// Se importa cada ícono por separado para no meter los 1.500 en la app.
import { ShieldCheck as ShieldCheck_ } from 'phosphor-react-native/src/icons/ShieldCheck';
import { List as List_ } from 'phosphor-react-native/src/icons/List';
import { Target as Target_ } from 'phosphor-react-native/src/icons/Target';
import { Bell as Bell_ } from 'phosphor-react-native/src/icons/Bell';
import { FacebookLogo as FacebookLogo_ } from 'phosphor-react-native/src/icons/FacebookLogo';
import { TiktokLogo as TiktokLogo_ } from 'phosphor-react-native/src/icons/TiktokLogo';
import { WhatsappLogo as WhatsappLogo_ } from 'phosphor-react-native/src/icons/WhatsappLogo';
import { Globe as Globe_ } from 'phosphor-react-native/src/icons/Globe';
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
import { TrophyArt } from '@/components/share/art';
import { Plus as Plus_ } from 'phosphor-react-native/src/icons/Plus';
import { Star as Star_ } from 'phosphor-react-native/src/icons/Star';
import { Coffee as Coffee_ } from 'phosphor-react-native/src/icons/Coffee';
import { BowlFood as BowlFood_ } from 'phosphor-react-native/src/icons/BowlFood';
import { InstagramLogo as InstagramLogo_ } from 'phosphor-react-native/src/icons/InstagramLogo';
import { Crown as Crown_ } from 'phosphor-react-native/src/icons/Crown';
import { UserPlus as UserPlus_ } from 'phosphor-react-native/src/icons/UserPlus';
import { UserMinus as UserMinus_ } from 'phosphor-react-native/src/icons/UserMinus';
import { DotsThree as DotsThree_ } from 'phosphor-react-native/src/icons/DotsThree';
import { Flag as Flag_ } from 'phosphor-react-native/src/icons/Flag';
import { Prohibit as Prohibit_ } from 'phosphor-react-native/src/icons/Prohibit';
import { LinkSimple as LinkSimple_ } from 'phosphor-react-native/src/icons/LinkSimple';
import { Hash as Hash_ } from 'phosphor-react-native/src/icons/Hash';
import { SlidersHorizontal as SlidersHorizontal_ } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { Footprints as Footprints_ } from 'phosphor-react-native/src/icons/Footprints';
import { Eye as Eye_ } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlash as EyeSlash_ } from 'phosphor-react-native/src/icons/EyeSlash';
import { Heartbeat as Heartbeat_ } from 'phosphor-react-native/src/icons/Heartbeat';
import { X as X_ } from 'phosphor-react-native/src/icons/X';
import { Camera as Camera_ } from 'phosphor-react-native/src/icons/Camera';
import { ChartBar as ChartBar_ } from 'phosphor-react-native/src/icons/ChartBar';
import { Ticket as Ticket_ } from 'phosphor-react-native/src/icons/Ticket';
import { Barbell as Barbell_ } from 'phosphor-react-native/src/icons/Barbell';
import { Sparkle as Sparkle_ } from 'phosphor-react-native/src/icons/Sparkle';
import { DownloadSimple as DownloadSimple_ } from 'phosphor-react-native/src/icons/DownloadSimple';
import { FirstAid as FirstAid_ } from 'phosphor-react-native/src/icons/FirstAid';
import { Wrench as Wrench_ } from 'phosphor-react-native/src/icons/Wrench';
import { Storefront as Storefront_ } from 'phosphor-react-native/src/icons/Storefront';
import { SquaresFour as SquaresFour_ } from 'phosphor-react-native/src/icons/SquaresFour';
import { DeviceMobile as DeviceMobile_ } from 'phosphor-react-native/src/icons/DeviceMobile';
import { EnvelopeSimple as EnvelopeSimple_ } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { GoogleLogo as GoogleLogo_ } from 'phosphor-react-native/src/icons/GoogleLogo';
import { AppleLogo as AppleLogo_ } from 'phosphor-react-native/src/icons/AppleLogo';

export type IconProps = {
  size?: number;
  color?: ColorValue;
  // Compatibilidad con lucide: "fill" con un color = ícono relleno.
  fill?: string;
  strokeWidth?: number;
  weight?: IconWeight;
};

// Trazo parejo: el grosor real del trazo sale del peso y del tamaño. De 18 px para abajo el peso regular queda a menos de 1 px, así que
// esos íconos van en negrita; de 20 para arriba va regular. Debajo de 14 px el dibujo no se lee: se sube a 14.
const MIN_ICON = 14;
const BOLD_UP_TO = 18;

function make(Comp: ComponentType<PhosphorProps>, base: IconWeight = 'regular') {
  return function Icon({ size = 24, color = '#000', fill, weight }: IconProps) {
    const px = Math.max(size, MIN_ICON);
    const auto: IconWeight = base === 'regular' && px <= BOLD_UP_TO ? 'bold' : base;
    const w: IconWeight = weight ?? (fill && fill !== 'none' ? 'fill' : auto);
    return <Comp size={px} color={color as string} weight={w} />;
  };
}

// Los íconos "de línea" (flechas, cruz, tilde, más) van en negrita: en duotono se verían casi invisibles.
export const Bell = make(Bell_);
export const Target = make(Target_);
export const ShieldCheck = make(ShieldCheck_);
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
export const FacebookIcon = make(FacebookLogo_);
export const TiktokIcon = make(TiktokLogo_);
export const WhatsappIcon = make(WhatsappLogo_);
export const GlobeIcon = make(Globe_);
export const Locate = make(Crosshair);
export const Navigation = make(NavigationArrow);
export const MapIcon = make(MapTrifold);
export const Heart = make(Heart_);
export const Share2 = make(ShareNetwork);
export const MenuIcon = make(List_, 'bold');
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
// Trofeo propio de Camina (dorado, con las huellas del logo). Es un dibujo de colores fijos: ignora `color`. Va un poco más grande que
// el tamaño pedido porque el dibujo ocupa menos del cuadro que un ícono de línea.
export function Trophy({ size = 24 }: IconProps) {
  return <TrophyArt size={Math.max(size * 1.25, 18)} />;
}
export const Plus = make(Plus_, 'bold');
export const Star = make(Star_);
export const Coffee = make(Coffee_);
// Gastronomía: un plato servido se lee mejor que el tenedor y cuchillo en tamaños chicos.
export const Food = make(BowlFood_);
export const WhatsApp = make(WhatsappLogo_);
export const Instagram = make(InstagramLogo_);
export const Globe = make(Globe_);
export const ChartBar = make(ChartBar_);
export const Camera = make(Camera_);
export const Eye = make(Eye_);
export const EyeSlash = make(EyeSlash_);
export const Heartbeat = make(Heartbeat_);
export const UserPlus = make(UserPlus_);
export const UserMinus = make(UserMinus_);
export const DotsThree = make(DotsThree_, 'bold');
export const Flag = make(Flag_);
export const Prohibit = make(Prohibit_);
export const LinkIcon = make(LinkSimple_, 'bold');
export const Hash = make(Hash_, 'bold');
export const Sliders = make(SlidersHorizontal_, 'bold');
export const Footprints = make(Footprints_);
export const Crown = make(Crown_);
export const Ticket = make(Ticket_);
export const Barbell = make(Barbell_);
export const Sparkle = make(Sparkle_);
export const DownloadSimple = make(DownloadSimple_);
export const FirstAid = make(FirstAid_);
export const Wrench = make(Wrench_);
export const Storefront = make(Storefront_);
export const SquaresFour = make(SquaresFour_);
export const DeviceMobile = make(DeviceMobile_);
export const Mail = make(EnvelopeSimple_);
export const GoogleIcon = make(GoogleLogo_);
export const AppleIcon = make(AppleLogo_);

type Tone = 'aqua' | 'purple' | 'orange' | 'red' | 'mint' | 'gold';

// Ficha de vidrio teñido: el ícono va relleno en el color de la categoría, sobre un vidrio con borde del mismo tono.
const GLYPH: Record<Tone, [string, string]> = {
  // [modo claro, modo oscuro]
  // Todos llegan a 3:1 (ícono) sobre el vidrio del fondo, también con el vidrio al máximo.
  aqua: ['#1A876D', '#5BD9B5'],
  mint: ['#1A876D', '#5BD9B5'],
  purple: ['#7A3FC4', '#C9ADF5'],
  orange: ['#BE5F1C', '#FFA866'],
  red: ['#D23B40', '#FF8388'],
  gold: ['#A57009', '#F5C645'],
};

// Gesto de cada ícono al tocar la fila o tarjeta donde está: la llama respira, el trofeo y el regalo se sacuden, la campana suena,
// la meta pega un golpe; el resto hace un saltito. (Se busca por identidad: los íconos de arriba son constantes del módulo.)
const MOTIONS = new Map<unknown, IconMotion>([
  [Flame, 'flick'], [Trophy, 'wobble'], [Gift, 'wobble'], [Crown, 'wobble'], [Bell, 'ring'], [Target, 'thud'],
]);

export function IconBubble({
  icon: Icon,
  tone = 'aqua',
  size = 44,
}: {
  icon: (p: IconProps) => React.ReactElement;
  tone?: Tone;
  size?: number;
}) {
  const tick = usePressTick();
  const motion = MOTIONS.get(Icon) ?? 'pop';
  const dark = useColorScheme().colorScheme === 'dark';
  const [lightColor, darkColor] = GLYPH[tone];
  const color = dark ? darkColor : lightColor;
  const radius = size * 0.32;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: `${color}${dark ? '88' : '70'}`,
          backgroundColor: dark ? 'rgba(255,255,255,0.1)' : `${color}26`,
          shadowColor: color,
          shadowOpacity: dark ? 0 : 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          // Sin elevation: en Android dibuja una sombra gris que no es la del color.
          elevation: 0,
        },
        Platform.OS === 'web' && ({ backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)' } as ViewStyle),
      ]}
    >
      <ReactiveIcon motion={motion} tick={tick} idle={Icon === Flame}>
        <Icon size={size * 0.54} color={color} weight="fill" />
      </ReactiveIcon>
    </View>
  );
}
