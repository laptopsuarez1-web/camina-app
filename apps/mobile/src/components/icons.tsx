import type { ComponentType } from 'react';
import { Platform, View, type ColorValue } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { AndroidSymbol } from 'expo-symbols';
import materialLight from 'expo-symbols/androidWeights/light';
import materialRegular from 'expo-symbols/androidWeights/regular';
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
import { Trophy as Trophy_ } from 'phosphor-react-native/src/icons/Trophy';
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
import { HandsClapping as HandsClapping_ } from 'phosphor-react-native/src/icons/HandsClapping';
import { Image as Image_ } from 'phosphor-react-native/src/icons/Image';
import { ChartBar as ChartBar_ } from 'phosphor-react-native/src/icons/ChartBar';
import { Ticket as Ticket_ } from 'phosphor-react-native/src/icons/Ticket';
import { Barbell as Barbell_ } from 'phosphor-react-native/src/icons/Barbell';
import { Sparkle as Sparkle_ } from 'phosphor-react-native/src/icons/Sparkle';
import { DownloadSimple as DownloadSimple_ } from 'phosphor-react-native/src/icons/DownloadSimple';
import { Copy as Copy_ } from 'phosphor-react-native/src/icons/Copy';
import { FirstAid as FirstAid_ } from 'phosphor-react-native/src/icons/FirstAid';
import { Wrench as Wrench_ } from 'phosphor-react-native/src/icons/Wrench';
import { Storefront as Storefront_ } from 'phosphor-react-native/src/icons/Storefront';
import { SquaresFour as SquaresFour_ } from 'phosphor-react-native/src/icons/SquaresFour';
import { DeviceMobile as DeviceMobile_ } from 'phosphor-react-native/src/icons/DeviceMobile';
import { EnvelopeSimple as EnvelopeSimple_ } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { GoogleLogo as GoogleLogo_ } from 'phosphor-react-native/src/icons/GoogleLogo';
import { AppleLogo as AppleLogo_ } from 'phosphor-react-native/src/icons/AppleLogo';
import { Hamburger as Hamburger_ } from 'phosphor-react-native/src/icons/Hamburger';
import { Pizza as Pizza_ } from 'phosphor-react-native/src/icons/Pizza';
import { Cookie as Cookie_ } from 'phosphor-react-native/src/icons/Cookie';
import { IceCream as IceCream_ } from 'phosphor-react-native/src/icons/IceCream';
import { Wine as Wine_ } from 'phosphor-react-native/src/icons/Wine';
import { Scissors as Scissors_ } from 'phosphor-react-native/src/icons/Scissors';
import { Flower as Flower_ } from 'phosphor-react-native/src/icons/Flower';
import { PawPrint as PawPrint_ } from 'phosphor-react-native/src/icons/PawPrint';
import { Pill as Pill_ } from 'phosphor-react-native/src/icons/Pill';
import { FilmSlate as FilmSlate_ } from 'phosphor-react-native/src/icons/FilmSlate';
import { Books as Books_ } from 'phosphor-react-native/src/icons/Books';
import { Diamond as Diamond_ } from 'phosphor-react-native/src/icons/Diamond';
import { Eyeglasses as Eyeglasses_ } from 'phosphor-react-native/src/icons/Eyeglasses';
import { TShirt as TShirt_ } from 'phosphor-react-native/src/icons/TShirt';
import { Laptop as Laptop_ } from 'phosphor-react-native/src/icons/Laptop';
import { Basket as Basket_ } from 'phosphor-react-native/src/icons/Basket';
import { Drop as Drop_ } from 'phosphor-react-native/src/icons/Drop';
import { Fish as Fish_ } from 'phosphor-react-native/src/icons/Fish';
import { ForkKnife as ForkKnife_ } from 'phosphor-react-native/src/icons/ForkKnife';
import { Leaf as Leaf_ } from 'phosphor-react-native/src/icons/Leaf';
import { Bread as Bread_ } from 'phosphor-react-native/src/icons/Bread';
import { Cake as Cake_ } from 'phosphor-react-native/src/icons/Cake';
import { HandHeart as HandHeart_ } from 'phosphor-react-native/src/icons/HandHeart';
import { Fire as Fire_ } from 'phosphor-react-native/src/icons/Fire';
import { BeerStein as BeerStein_ } from 'phosphor-react-native/src/icons/BeerStein';
import { Bed as Bed_ } from 'phosphor-react-native/src/icons/Bed';
import { Airplane as Airplane_ } from 'phosphor-react-native/src/icons/Airplane';
import { GraduationCap as GraduationCap_ } from 'phosphor-react-native/src/icons/GraduationCap';
import { MusicNotes as MusicNotes_ } from 'phosphor-react-native/src/icons/MusicNotes';
import { Tooth as Tooth_ } from 'phosphor-react-native/src/icons/Tooth';
import { Stethoscope as Stethoscope_ } from 'phosphor-react-native/src/icons/Stethoscope';
import { Bicycle as Bicycle_ } from 'phosphor-react-native/src/icons/Bicycle';
import { CookingPot as CookingPot_ } from 'phosphor-react-native/src/icons/CookingPot';


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
const BOLD_UP_TO = 15;

// Línea fina de un solo color en todos los tamaños; solo los muy chicos van un poco más gruesos para que se lean.
// El segundo argumento queda por compatibilidad: ya no cambia el trazo.
function make(Comp: ComponentType<PhosphorProps>, _base: IconWeight = 'regular') {
  return function Icon({ size = 24, color = '#000', fill, weight }: IconProps) {
    const px = Math.max(size, MIN_ICON);
    const w: IconWeight = weight ?? (fill && fill !== 'none' ? 'fill' : px <= BOLD_UP_TO ? 'bold' : 'regular');
    return <Comp size={px} color={color as string} weight={w} />;
  };
}

// Los íconos "de línea" (flechas, cruz, tilde, más) van en negrita: en duotono se verían casi invisibles.
// Íconos nativos: SF Symbols en iPhone (los de iOS) y Material Symbols en Android y web; si no hay símbolo, el dibujo de línea.
// Trazo según el tamaño, como hace iOS: fino en grande, un poco más firme en chico. `fill` (o weight="fill") usa la variante rellena.
function sym(sf: SFSymbol | null, sfFill: SFSymbol | null, material: AndroidSymbol, Fallback: ComponentType<PhosphorProps>) {
  return function Icon({ size = 24, color = '#000', fill, weight }: IconProps) {
    const px = Math.max(size, MIN_ICON);
    const filled = weight === 'fill' || (!!fill && fill !== 'none');
    const line = <Fallback size={px} color={color as string} weight={filled ? 'fill' : px <= BOLD_UP_TO ? 'bold' : 'regular'} />;
    const iosName = (filled ? sfFill : sf) ?? undefined;
    if (Platform.OS === 'ios' && !iosName) return line;
    const iosWeight = weight === 'bold' ? 'semibold' : px >= 28 ? 'light' : px >= 18 ? 'regular' : 'medium';
    const matWeight = px >= 28 && weight !== 'bold' ? materialLight : materialRegular;
    return (
      <SymbolView
        name={{ ios: iosName, android: material, web: material }}
        size={px}
        tintColor={color}
        type="monochrome"
        weight={{ ios: iosWeight, android: matWeight }}
        fallback={line}
      />
    );
  };
}

export const Bell = sym('bell', 'bell.fill', 'notifications', Bell_);
export const Target = sym('target', 'target', 'target', Target_);
export const ShieldCheck = sym('checkmark.shield', 'checkmark.shield.fill', 'verified_user', ShieldCheck_);
export const Clock = sym('clock', 'clock.fill', 'schedule', Clock_);
export const ChevronDown = sym('chevron.down', 'chevron.down', 'expand_more', CaretDown);
export const ChevronUp = sym('chevron.up', 'chevron.up', 'expand_less', CaretUp);
export const ChevronRight = sym('chevron.right', 'chevron.right', 'chevron_right', CaretRight);
export const ChevronLeft = sym('chevron.left', 'chevron.left', 'chevron_left', CaretLeft);
export const Check = sym('checkmark', 'checkmark', 'check', Check_);
export const CheckCircle2 = sym('checkmark.circle', 'checkmark.circle.fill', 'check_circle', CheckCircle);
export const Users = sym('person.3', 'person.3.fill', 'group', UsersThree);
export const Search = sym('magnifyingglass', 'magnifyingglass', 'search', MagnifyingGlass);
export const MapPin = sym('mappin.and.ellipse', 'mappin.and.ellipse', 'location_on', MapPin_);
export const X = sym('xmark', 'xmark', 'close', X_);
export const Gift = sym('gift', 'gift.fill', 'redeem', Gift_);
export const AtSign = sym('at', 'at', 'alternate_email', At);
export const FacebookIcon = make(FacebookLogo_);
export const TiktokIcon = make(TiktokLogo_);
export const WhatsappIcon = make(WhatsappLogo_);
export const GlobeIcon = sym('globe', 'globe', 'language', Globe_);
export const Locate = sym('location', 'location.fill', 'my_location', Crosshair);
export const Navigation = sym('location.north', 'location.north.fill', 'navigation', NavigationArrow);
export const MapIcon = sym('map', 'map.fill', 'map', MapTrifold);
export const Heart = sym('heart', 'heart.fill', 'favorite', Heart_);
export const Share2 = sym('square.and.arrow.up', 'square.and.arrow.up', 'share', ShareNetwork);
export const MenuIcon = sym('line.3.horizontal', 'line.3.horizontal', 'menu', List_);
export const Activity = sym('waveform.path.ecg', 'waveform.path.ecg', 'monitor_heart', Pulse);
export const Flame = sym('flame', 'flame.fill', 'local_fire_department', Flame_);
export const Home = sym('house', 'house.fill', 'home', House);
export const Calendar = sym('calendar', 'calendar', 'calendar_today', CalendarBlank);
export const ShoppingBag = sym('bag', 'bag.fill', 'shopping_bag', ShoppingBag_);
export const LogOut = sym('rectangle.portrait.and.arrow.right', 'rectangle.portrait.and.arrow.right', 'logout', SignOut);
export const Trash2 = sym('trash', 'trash.fill', 'delete', Trash);
export const KeyRound = sym('key', 'key.fill', 'key', Key);
export const Pencil = sym('pencil', 'pencil', 'edit', PencilSimple);
export const Send = sym('paperplane', 'paperplane.fill', 'send', PaperPlaneTilt);
export const Trophy = sym('trophy', 'trophy.fill', 'emoji_events', Trophy_);
export const Plus = sym('plus', 'plus', 'add', Plus_);
export const Star = sym('star', 'star.fill', 'star', Star_);
export const Coffee = sym('cup.and.saucer', 'cup.and.saucer.fill', 'local_cafe', Coffee_);
// Gastronomía: un plato servido se lee mejor que el tenedor y cuchillo en tamaños chicos.
export const Food = sym('fork.knife', 'fork.knife', 'restaurant', BowlFood_);
export const WhatsApp = make(WhatsappLogo_);
export const Instagram = make(InstagramLogo_);
export const Globe = sym('globe', 'globe', 'language', Globe_);
export const ChartBar = sym('chart.bar', 'chart.bar.fill', 'bar_chart', ChartBar_);
export const Camera = sym('camera', 'camera.fill', 'photo_camera', Camera_);
export const HandsClapping = sym('hands.clap', 'hands.clap.fill', 'celebration', HandsClapping_);
export const ImageIcon = sym('photo', 'photo.fill', 'image', Image_);
export const Eye = sym('eye', 'eye.fill', 'visibility', Eye_);
export const EyeSlash = sym('eye.slash', 'eye.slash.fill', 'visibility_off', EyeSlash_);
export const Heartbeat = sym('heart.text.square', 'heart.text.square.fill', 'monitor_heart', Heartbeat_);
export const UserPlus = sym('person.badge.plus', 'person.fill.badge.plus', 'person_add', UserPlus_);
export const UserMinus = sym('person.badge.minus', 'person.fill.badge.minus', 'person_remove', UserMinus_);
export const DotsThree = sym('ellipsis', 'ellipsis', 'more_horiz', DotsThree_);
export const Flag = sym('flag', 'flag.fill', 'flag', Flag_);
export const Prohibit = sym('nosign', 'nosign', 'block', Prohibit_);
export const LinkIcon = sym('link', 'link', 'link', LinkSimple_);
export const Hash = sym('number', 'number', 'tag', Hash_);
export const Sliders = sym('slider.horizontal.3', 'slider.horizontal.3', 'tune', SlidersHorizontal_);
export const Footprints = sym('shoeprints.fill', 'shoeprints.fill', 'footprint', Footprints_);
export const Crown = sym('crown', 'crown.fill', 'crown', Crown_);
export const Ticket = sym('ticket', 'ticket.fill', 'confirmation_number', Ticket_);
export const Barbell = sym('dumbbell', 'dumbbell.fill', 'fitness_center', Barbell_);
export const Sparkle = sym('sparkle', 'sparkle', 'auto_awesome', Sparkle_);
export const DownloadSimple = sym('arrow.down.to.line', 'arrow.down.to.line', 'download', DownloadSimple_);
export const Copy = sym('doc.on.doc', 'doc.on.doc.fill', 'content_copy', Copy_);
export const FirstAid = sym('cross.case', 'cross.case.fill', 'medical_services', FirstAid_);
export const Wrench = sym('wrench.and.screwdriver', 'wrench.and.screwdriver.fill', 'build', Wrench_);
export const Storefront = sym('storefront', 'storefront.fill', 'storefront', Storefront_);
export const Hamburger = sym('takeoutbag.and.cup.and.straw', 'takeoutbag.and.cup.and.straw.fill', 'lunch_dining', Hamburger_);
export const Pizza = sym(null, null, 'local_pizza', Pizza_);
export const Cookie = sym(null, null, 'cookie', Cookie_);
export const IceCream = sym(null, null, 'icecream', IceCream_);
export const Wine = sym('wineglass', 'wineglass.fill', 'wine_bar', Wine_);
export const Scissors = sym('scissors', 'scissors', 'content_cut', Scissors_);
export const Flower = sym('camera.macro', 'camera.macro', 'local_florist', Flower_);
export const PawPrint = sym('pawprint', 'pawprint.fill', 'pets', PawPrint_);
export const Pill = sym('pills', 'pills.fill', 'medication', Pill_);
export const FilmSlate = sym('film', 'film.fill', 'movie', FilmSlate_);
export const Books = sym('books.vertical', 'books.vertical.fill', 'menu_book', Books_);
export const Diamond = sym('diamond', 'diamond.fill', 'diamond', Diamond_);
export const Eyeglasses = sym('eyeglasses', 'eyeglasses', 'eyeglasses', Eyeglasses_);
export const TShirt = sym('tshirt', 'tshirt.fill', 'checkroom', TShirt_);
export const Laptop = sym('laptopcomputer', 'laptopcomputer', 'laptop', Laptop_);
export const Basket = sym('basket', 'basket.fill', 'shopping_basket', Basket_);
export const Drop = sym('drop', 'drop.fill', 'water_drop', Drop_);
export const Fish = sym('fish', 'fish.fill', 'set_meal', Fish_);
export const ForkKnife = sym('fork.knife', 'fork.knife', 'restaurant', ForkKnife_);
export const Leaf = sym('leaf', 'leaf.fill', 'eco', Leaf_);
export const Bread = sym(null, null, 'bakery_dining', Bread_);
export const Cake = sym('birthday.cake', 'birthday.cake.fill', 'cake', Cake_);
export const HandHeart = sym('heart.circle', 'heart.circle.fill', 'volunteer_activism', HandHeart_);
export const Fire = sym('flame', 'flame.fill', 'local_fire_department', Fire_);
export const BeerStein = sym('mug', 'mug.fill', 'sports_bar', BeerStein_);
export const Bed = sym('bed.double', 'bed.double.fill', 'bed', Bed_);
export const Airplane = sym('airplane', 'airplane', 'flight', Airplane_);
export const GraduationCap = sym('graduationcap', 'graduationcap.fill', 'school', GraduationCap_);
export const MusicNotes = sym('music.note', 'music.note', 'music_note', MusicNotes_);
export const Tooth = sym(null, null, 'dentistry', Tooth_);
export const Stethoscope = sym('stethoscope', 'stethoscope', 'stethoscope', Stethoscope_);
export const Bicycle = sym('bicycle', 'bicycle', 'pedal_bike', Bicycle_);
export const CookingPot = sym(null, null, 'skillet', CookingPot_);
export const SquaresFour = sym('square.grid.2x2', 'square.grid.2x2.fill', 'grid_view', SquaresFour_);
export const DeviceMobile = sym('iphone', 'iphone', 'smartphone', DeviceMobile_);
export const Mail = sym('envelope', 'envelope.fill', 'mail', EnvelopeSimple_);
export const GoogleIcon = make(GoogleLogo_);
export const AppleIcon = sym('apple.logo', 'apple.logo', 'phone_iphone', AppleLogo_);

type Tone = 'aqua' | 'purple' | 'orange' | 'red' | 'mint' | 'gold';


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
  void tone; // todas las fichas van en el verde de Camina (se deja la prop por compatibilidad)
  const color = dark ? '#62F0B6' : '#14876A';
  const radius = size * 0.3;
  const glass = isLiquidGlassAvailable();
  // Ficha al estilo iOS: vidrio líquido teñido de verde (iOS 26) o, donde no hay, un vidrio dibujado: verde translúcido con
  // un brillo arriba y un borde de un pelo. Adentro, el símbolo nativo relleno, como los íconos de Ajustes.
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {glass ? (
        <GlassView glassEffectStyle="regular" tintColor={dark ? 'rgba(98,240,182,0.18)' : 'rgba(79,195,168,0.20)'} colorScheme={dark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius }} />
      ) : (
        <>
          <LinearGradient colors={dark ? ['rgba(98,240,182,0.22)', 'rgba(98,240,182,0.08)'] : ['rgba(98,240,182,0.30)', 'rgba(79,195,168,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: size * 0.5 }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)' }} />
        </>
      )}
      <ReactiveIcon motion={motion} tick={tick} idle={false}>
        <Icon size={size * 0.5} color={color} weight="fill" />
      </ReactiveIcon>
    </View>
  );
}
