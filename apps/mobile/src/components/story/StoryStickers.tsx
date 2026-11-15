import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { RutaPin } from '@/components/ruta/RutaPin';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Historia del canje con piezas que solo tiene Camina: Baifo, el anillo de pasos de Inicio, el pin de la Ruta y la
// moneda de Puntos. Cada estilo tiene una sola protagonista; lo demás (el nombre del local y la marca) va chiquito.
export type StickerLook = 'baifo' | 'anillo' | 'pin' | 'monedas';
export const STICKER_LOOKS: { key: StickerLook; label: string }[] = [
  { key: 'baifo', label: 'Baifo' },
  { key: 'anillo', label: 'Anillo' },
  { key: 'pin', label: 'Pin' },
  { key: 'monedas', label: 'Monedas' },
];

export type StickerProps = { businessName: string; businessLogo?: string | null; businessCategory?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const MINT = '#62F0B6';
const INK = '#241748';
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 } as const;
const DROP = { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 } as const;
const BAIFO_ASOMA = require('@/../assets/baifo/asoma.webp');
const COIN = require('@/../assets/camina-coin.png');
const PIE_IZQ = require('@/../assets/pie-izq-mint.png');
const PIE_DER = require('@/../assets/pie-der-mint.png');

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}

// La marca chiquita: «CAMINA» en su letra, en menta.
function Wordmark({ size = 10, color = MINT }: { size?: number; color?: string }) {
  return <Text style={{ color, fontSize: size, letterSpacing: size * 0.22, ...wm(), ...SHADOW }}>CAMINA</Text>;
}

function LocalLogo({ uri, name, size }: { uri?: string | null; name: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} accessible={false} style={{ width: size, height: size }} /> : <Text style={{ color: INK, fontSize: size * 0.4, ...wm() }}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

// 1. Baifo se asoma por el borde de abajo de la foto; arriba, el pin del local que encontró.
function Baifo({ businessName, businessLogo, businessCategory }: StickerProps) {
  return (
    <>
      {/* El pin del local, arriba de Baifo, como si lo hubiera encontrado. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 150, alignItems: 'center' }}>
        <View style={{ transform: [{ rotate: '-6deg' }] }}>
          <RutaPin name={businessName} logoUrl={businessLogo} category={businessCategory} size={64} />
        </View>
        <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 14, maxWidth: 220, ...SHADOW }}>{businessName}</Text>
      </View>
      <Image source={BAIFO_ASOMA} accessible={false} resizeMode="contain" style={{ position: 'absolute', left: '50%', bottom: -6, width: 176, height: 144, marginLeft: -88 }} />
      <View style={{ position: 'absolute', right: 18, bottom: 18 }}><Wordmark size={10} /></View>
    </>
  );
}

// 2. El anillo de pasos de Inicio, completo, rodeando el logo del local; la moneda de Puntos donde cierra.
function Anillo({ businessName, businessLogo }: StickerProps) {
  const S = 132;
  const sw = 9;
  const r = (S - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' }}>
      <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={S} height={S} style={{ position: 'absolute' }}>
          <Circle cx={S / 2} cy={S / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={sw} fill="rgba(36,23,72,0.35)" />
          <Circle cx={S / 2} cy={S / 2} r={r} stroke={MINT} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${c * 0.999} ${c}`} transform={`rotate(-90 ${S / 2} ${S / 2})`} />
        </Svg>
        <View style={DROP}><LocalLogo uri={businessLogo} name={businessName} size={S - sw * 2 - 18} /></View>
        <Image source={COIN} accessible={false} style={{ position: 'absolute', top: -4, right: 6, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff' }} />
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginTop: 10, maxWidth: 240, ...SHADOW }}>{businessName}</Text>
      <View style={{ marginTop: 3 }}><Wordmark size={10} /></View>
    </View>
  );
}

// 3. El pin de la Ruta clavado en la foto, con huellas menta que llegan caminando desde el borde.
function Pin({ businessName, businessLogo, businessCategory }: StickerProps) {
  const steps = [
    { x: 34, y: 0, l: false }, { x: 14, y: 30, l: true }, { x: 34, y: 62, l: false }, { x: 12, y: 94, l: true }, { x: 30, y: 128, l: false },
  ];
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
      <RutaPin name={businessName} logoUrl={businessLogo} category={businessCategory} size={66} />
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 14, maxWidth: 240, ...SHADOW }}>{businessName}</Text>
      <View style={{ width: 60, height: 158, marginTop: 6 }}>
        {steps.map((p, i) => (
          <Image key={i} source={p.l ? PIE_IZQ : PIE_DER} accessible={false} resizeMode="contain" style={{ position: 'absolute', left: p.x, top: p.y, width: 12, height: 24, opacity: 1 - i * 0.16, transform: [{ rotate: p.l ? '-12deg' : '12deg' }] }} />
        ))}
      </View>
      <View style={{ position: 'absolute', right: 18, bottom: 18 }}><Wordmark size={10} /></View>
    </View>
  );
}

// 4. Dos monedas que chocan: la de Puntos de Camina y la del local.
function Monedas({ businessName, businessLogo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ transform: [{ rotate: '-10deg' }], ...DROP }}>
          <Image source={COIN} accessible={false} style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: '#fff' }} />
        </View>
        <View style={{ marginLeft: -16, transform: [{ rotate: '8deg' }], borderRadius: 44, borderWidth: 3, borderColor: '#fff', ...DROP }}>
          <LocalLogo uri={businessLogo} name={businessName} size={82} />
        </View>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginTop: 12, maxWidth: 240, ...SHADOW }}>{businessName}</Text>
      <View style={{ marginTop: 3 }}><Wordmark size={10} /></View>
    </View>
  );
}

const MAP: Record<StickerLook, (p: StickerProps) => React.JSX.Element> = { baifo: Baifo, anillo: Anillo, pin: Pin, monedas: Monedas };

export function StorySticker({ look, ...props }: StickerProps & { look: StickerLook }) {
  const C = MAP[look];
  return <C {...props} />;
}
