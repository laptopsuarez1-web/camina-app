import { Image, Platform, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { brandFontsReady, WORDMARK_FAMILY } from '@/theme/fonts';

// Adornos para la historia del canje: diez estilos que la persona elige. Van encima de su foto (o, en la polaroid, con la
// foto adentro). Ideas tomadas de cómo se comparten otras apps (pase de abordar, recibo, polaroid, credencial, medalla...),
// con los colores y las huellas de Camina.
export type StickerLook = 'sello' | 'recibo' | 'pase' | 'polaroid' | 'credencial' | 'medalla' | 'etiqueta' | 'contador' | 'letrero' | 'huellas';
export const STICKER_LOOKS: { key: StickerLook; label: string }[] = [
  { key: 'sello', label: 'Sello' },
  { key: 'recibo', label: 'Recibo' },
  { key: 'pase', label: 'Pase' },
  { key: 'polaroid', label: 'Polaroid' },
  { key: 'credencial', label: 'Credencial' },
  { key: 'medalla', label: 'Medalla' },
  { key: 'etiqueta', label: 'Etiqueta' },
  { key: 'contador', label: 'Contador' },
  { key: 'letrero', label: 'Letrero' },
  { key: 'huellas', label: 'Huellas' },
];

export type StickerProps = { businessName: string; businessLogo?: string | null; benefitName: string; costPoints?: number | null; photo: ImageSourcePropType };

const MINT = '#62F0B6';
const INK = '#241748';
const PAPER = '#FCFBF7';
const PIE_IZQ = require('@/../assets/pie-izq-mint.png');
const PIE_DER = require('@/../assets/pie-der-mint.png');
const LOGO = require('@/../assets/logo-mint.png');
const MONO = Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'ui-monospace, Menlo, monospace';
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;
const BOX_SHADOW = { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 } as const;

function wm() {
  if (!brandFontsReady()) return { fontWeight: '900' as const };
  return { fontFamily: WORDMARK_FAMILY, fontWeight: Platform.OS === 'web' ? ('900' as const) : ('normal' as const) };
}
const steps = (pts?: number | null) => (pts ? (pts * 1000).toLocaleString('es-BO') : null);

function Logo({ uri, size, round = true }: { uri?: string | null; size: number; round?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: round ? size / 2 : size * 0.26, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} accessible={false} style={{ width: size, height: size }} /> : <Image source={LOGO} accessible={false} style={{ width: size * 0.7, height: size * 0.7, tintColor: INK }} />}
    </View>
  );
}
function Mark({ color = '#fff', size = 9 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Image source={LOGO} accessible={false} style={{ width: size + 4, height: size + 4, tintColor: color }} />
      <Text style={{ color, fontSize: size, letterSpacing: 1.8, ...wm() }}>CAMINA</Text>
    </View>
  );
}
function Feet({ size = 22, gap = 3 }: { size?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      <Image source={PIE_IZQ} accessible={false} resizeMode="contain" style={{ width: size / 2, height: size, marginTop: size * 0.18 }} />
      <Image source={PIE_DER} accessible={false} resizeMode="contain" style={{ width: size / 2, height: size }} />
    </View>
  );
}
function Dashed({ color = '#C9C2D6' }: { color?: string }) {
  return <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: color, marginVertical: 6 }} />;
}
function Mono({ children, bold, size = 10.5, color = '#2a2340', right }: { children: string; bold?: boolean; size?: number; color?: string; right?: boolean }) {
  return <Text numberOfLines={1} style={{ fontFamily: MONO, fontSize: size, fontWeight: bold ? '900' : '600', color, textAlign: right ? 'right' : 'left', flexShrink: 1 }}>{children}</Text>;
}

// 1. Sello: redondo, torcido, como un sello de goma.
function Sello({ businessName, benefitName }: StickerProps) {
  const R = 60;
  return (
    <View style={{ position: 'absolute', right: 16, bottom: 22, alignItems: 'center' }}>
      <View style={{ transform: [{ rotate: '-12deg' }], width: R * 2, height: R * 2, borderRadius: R, borderWidth: 3, borderColor: MINT, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(36,23,72,0.85)' }}>
        <View style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: R, borderWidth: 1, borderColor: 'rgba(98,240,182,0.6)', borderStyle: 'dashed' }} />
        <Text style={{ color: MINT, fontWeight: '900', fontSize: 9.5, letterSpacing: 1.6 }}>GANADO</Text>
        <View style={{ marginVertical: 3 }}><Feet /></View>
        <Text style={{ color: MINT, fontWeight: '900', fontSize: 9.5, letterSpacing: 1.6 }}>CAMINANDO</Text>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 11, marginTop: 8, maxWidth: 150, textAlign: 'center', ...SHADOW }}>{benefitName}</Text>
      <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 10, maxWidth: 150, textAlign: 'center', ...SHADOW }}>en {businessName}</Text>
    </View>
  );
}

// 2. Recibo: ticket de caja con borde dentado.
function Recibo({ businessName, benefitName, costPoints }: StickerProps) {
  const row = (a: string, b: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 3 }}><Mono bold={bold}>{a}</Mono><Mono bold={bold} right>{b}</Mono></View>
  );
  return (
    <View style={{ position: 'absolute', left: 18, bottom: 26, width: 172, transform: [{ rotate: '-3deg' }], ...BOX_SHADOW }}>
      <View style={{ backgroundColor: PAPER, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
        <Text style={{ color: INK, fontSize: 12, letterSpacing: 2, textAlign: 'center', ...wm() }}>CAMINA</Text>
        <Mono size={8.5} color="#7a7290">{'    TARIJA · BOLIVIA'}</Mono>
        <Dashed />
        {row(benefitName, '1')}
        {row(businessName, '')}
        {steps(costPoints) ? row('Pasos', steps(costPoints)!) : null}
        <Dashed />
        {row('TOTAL', 'Bs 0', true)}
        {row('PAGADO', 'CAMINANDO', true)}
      </View>
      <View style={{ flexDirection: 'row', overflow: 'hidden', height: 6 }}>
        {Array.from({ length: 15 }, (_, i) => <View key={i} style={{ width: 12, height: 12, backgroundColor: PAPER, transform: [{ rotate: '45deg' }], marginTop: -6 }} />)}
      </View>
    </View>
  );
}

// 3. Pase de abordar: de «Tu casa» al local, con los pasos como pasaje.
function Pase({ businessName, businessLogo, benefitName, costPoints }: StickerProps) {
  const code = businessName.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 3).toUpperCase() || 'LOC';
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, flexDirection: 'row', borderRadius: 16, overflow: 'hidden', ...BOX_SHADOW }}>
      <View style={{ flex: 1, backgroundColor: PAPER, padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark color={INK} size={9} />
          <Mono size={8.5} color="#7a7290">PASE DE PREMIO</Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <View><Mono size={8} color="#7a7290">DESDE</Mono><Text style={{ color: INK, fontSize: 22, ...wm() }}>CASA</Text></View>
          <Feet size={18} />
          <View style={{ alignItems: 'flex-end' }}><Mono size={8} color="#7a7290">HASTA</Mono><Text style={{ color: INK, fontSize: 22, ...wm() }}>{code}</Text></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1 }}><Mono size={8} color="#7a7290">PREMIO</Mono><Mono bold>{benefitName}</Mono></View>
          <View><Mono size={8} color="#7a7290">PASAJE</Mono><Mono bold>{steps(costPoints) ? `${steps(costPoints)} pasos` : 'tus pasos'}</Mono></View>
        </View>
      </View>
      {/* Talón del pase. */}
      <View style={{ width: 70, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderStyle: 'dashed', borderColor: INK, gap: 6 }}>
        <Logo uri={businessLogo} size={38} />
        <Mono size={8} color={INK} bold>ABORDO</Mono>
      </View>
    </View>
  );
}

// 4. Polaroid: tu foto adentro de una polaroid sobre fondo morado, con texto tipo escrito a mano.
function Polaroid({ businessName, benefitName, photo }: StickerProps) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' }}><Mark color={MINT} size={10} /></View>
      <View style={{ width: '78%', backgroundColor: PAPER, padding: 10, paddingBottom: 14, transform: [{ rotate: '-4deg' }], ...BOX_SHADOW }}>
        <View style={{ aspectRatio: 0.9, backgroundColor: '#000', overflow: 'hidden' }}>
          <Image source={photo} accessible={false} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </View>
        <Text numberOfLines={1} style={{ color: INK, fontSize: 17, fontStyle: 'italic', fontWeight: '700', marginTop: 10, textAlign: 'center' }}>{benefitName} ♡</Text>
        <Text numberOfLines={1} style={{ color: '#6B5A8A', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>lo gané caminando · {businessName}</Text>
      </View>
      {/* Cinta adhesiva arriba de la polaroid. */}
      <View style={{ position: 'absolute', top: '17%', width: 70, height: 22, backgroundColor: 'rgba(98,240,182,0.75)', transform: [{ rotate: '6deg' }] }} />
    </View>
  );
}

// 5. Credencial: pase colgante de «Caminante oficial».
function Credencial({ businessName, businessLogo, benefitName, costPoints }: StickerProps) {
  return (
    <View style={{ position: 'absolute', right: 22, bottom: 22, alignItems: 'center', transform: [{ rotate: '5deg' }] }}>
      <View style={{ width: 16, height: 46, backgroundColor: MINT, borderRadius: 3 }} />
      <View style={{ width: 150, backgroundColor: PAPER, borderRadius: 14, overflow: 'hidden', marginTop: -6, ...BOX_SHADOW }}>
        <View style={{ backgroundColor: INK, paddingVertical: 8, alignItems: 'center' }}>
          <View style={{ width: 26, height: 5, borderRadius: 3, backgroundColor: '#120a26', marginBottom: 6 }} />
          <Mark color={MINT} size={8.5} />
        </View>
        <View style={{ padding: 10, alignItems: 'center' }}>
          <Logo uri={businessLogo} size={44} />
          <Mono size={8} color="#7a7290">CAMINANTE OFICIAL</Mono>
          <Text numberOfLines={2} style={{ color: INK, fontWeight: '900', fontSize: 13, textAlign: 'center', marginTop: 4 }}>{benefitName}</Text>
          <Mono size={9} color="#6B5A8A">{businessName}</Mono>
          <View style={{ flexDirection: 'row', gap: 1.5, marginTop: 8, height: 18 }}>
            {Array.from({ length: 26 }, (_, i) => <View key={i} style={{ width: i % 3 === 0 ? 2.5 : 1.2, backgroundColor: INK }} />)}
          </View>
          <Mono size={8} color="#7a7290">{steps(costPoints) ? `${steps(costPoints)} PASOS` : 'PASOS'}</Mono>
        </View>
      </View>
    </View>
  );
}

// 6. Medalla: como las de las carreras, con cinta.
function Medalla({ businessName, benefitName }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center' }}>
      {/* Cinta en V, como la de las medallas de carrera. */}
      <View style={{ width: 90, height: 60, marginBottom: -14 }}>
        <View style={{ position: 'absolute', left: 14, top: -4, width: 24, height: 66, backgroundColor: MINT, transform: [{ rotate: '-24deg' }] }} />
        <View style={{ position: 'absolute', right: 14, top: -4, width: 24, height: 66, backgroundColor: '#8B4FD1', transform: [{ rotate: '24deg' }] }} />
      </View>
      <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: '#E0B43A', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#F5D77A', ...BOX_SHADOW }}>
        <View style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 2, borderColor: '#B8891B', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#5A3D05', fontWeight: '900', fontSize: 8.5, letterSpacing: 1.2 }}>FINISHER</Text>
          <Image source={LOGO} accessible={false} style={{ width: 30, height: 30, tintColor: '#5A3D05', marginVertical: 2 }} />
          <Text style={{ color: '#5A3D05', fontSize: 8.5, letterSpacing: 1.4, ...wm() }}>CAMINA</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 10, ...SHADOW }}>{benefitName}</Text>
      <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 11, ...SHADOW }}>en {businessName} · ganado caminando</Text>
    </View>
  );
}

// 7. Etiqueta: etiqueta de precio colgando de un hilo, el precio son los pasos.
function Etiqueta({ businessName, benefitName, costPoints }: StickerProps) {
  return (
    <View style={{ position: 'absolute', left: 30, bottom: 30, transform: [{ rotate: '-10deg' }] }}>
      <View style={{ position: 'absolute', left: -26, top: 26, width: 40, height: 1.5, backgroundColor: 'rgba(255,255,255,0.8)', transform: [{ rotate: '-30deg' }] }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', ...BOX_SHADOW }}>
        <View style={{ width: 0, height: 0, borderTopWidth: 34, borderBottomWidth: 34, borderRightWidth: 26, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: MINT }} />
        <View style={{ backgroundColor: MINT, paddingVertical: 10, paddingRight: 16, paddingLeft: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10, height: 68, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ color: INK, fontWeight: '800', fontSize: 11, maxWidth: 170 }}>{benefitName} · {businessName}</Text>
          <Text style={{ color: INK, fontSize: 20, ...wm() }}>{steps(costPoints) ? `${steps(costPoints)} pasos` : 'Tus pasos'}</Text>
          <Text style={{ color: INK, fontWeight: '700', fontSize: 9.5 }}>precio Camina · Bs 0</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: 14, top: 29, width: 10, height: 10, borderRadius: 5, backgroundColor: INK }} />
    </View>
  );
}

// 8. Contador: los pasos en un marcador de dígitos, como un podómetro.
function Contador({ businessName, benefitName, costPoints }: StickerProps) {
  const digits = String((costPoints ?? 0) * 1000).padStart(6, '0').split('');
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center' }}>
      <Mono size={9} color="#fff" bold>PASOS POR MI PREMIO</Mono>
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 6, backgroundColor: '#120a26', padding: 5, borderRadius: 10, borderWidth: 1.5, borderColor: MINT, ...BOX_SHADOW }}>
        {digits.map((d, i) => (
          <View key={i} style={{ width: 26, height: 38, borderRadius: 5, backgroundColor: i < digits.length - 3 ? INK : '#2E1F5C', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: MINT, fontSize: 24, fontFamily: MONO, fontWeight: '900' }}>{d}</Text>
          </View>
        ))}
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 13, marginTop: 8, ...SHADOW }}>{benefitName} · {businessName}</Text>
      <View style={{ marginTop: 6 }}><Mark size={8.5} /></View>
    </View>
  );
}

// 9. Letrero: cartel de calle verde, como los de la ciudad, que señala al local.
function Letrero({ businessName, benefitName, costPoints }: StickerProps) {
  return (
    <View style={{ position: 'absolute', right: 20, bottom: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: '#1F7A66', borderRadius: 8, borderWidth: 2.5, borderColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, minWidth: 170, ...BOX_SHADOW }}>
        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 15, ...wm() }}>{businessName.toUpperCase()} →</Text>
        <Text numberOfLines={1} style={{ color: '#E6FFF5', fontWeight: '700', fontSize: 10.5, marginTop: 2 }}>{benefitName}</Text>
        <Text style={{ color: MINT, fontWeight: '900', fontSize: 10.5, marginTop: 2 }}>{steps(costPoints) ? `${steps(costPoints)} pasos` : 'a pie'}</Text>
      </View>
      <View style={{ backgroundColor: INK, borderRadius: 6, borderWidth: 2, borderColor: '#fff', paddingVertical: 4, paddingHorizontal: 10, marginTop: 6, transform: [{ rotate: '-4deg' }] }}>
        <Text style={{ color: MINT, fontSize: 10, letterSpacing: 1.6, ...wm() }}>AV. CAMINA</Text>
      </View>
      <View style={{ width: 7, height: 58, backgroundColor: '#B9B2C8', marginTop: -2 }} />
    </View>
  );
}

// 10. Huellas: pisadas que suben por la foto hasta el local.
function Huellas({ businessName, businessLogo, benefitName }: StickerProps) {
  const pts = [{ x: 46, y: 104, l: true }, { x: 68, y: 72, l: false }, { x: 48, y: 38, l: true }, { x: 70, y: 6, l: false }];
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ borderWidth: 2, borderColor: MINT, borderRadius: 19 }}><Logo uri={businessLogo} size={34} /></View>
        <View>
          <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: 13, maxWidth: 200, ...SHADOW }}>{benefitName}</Text>
          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 10.5, maxWidth: 200, ...SHADOW }}>en {businessName} · llegué caminando</Text>
        </View>
      </View>
      <View style={{ width: 120, height: 132, marginTop: 6 }}>
        {pts.map((p, i) => (
          <Image key={i} source={p.l ? PIE_IZQ : PIE_DER} accessible={false} resizeMode="contain" style={{ position: 'absolute', left: p.x, top: p.y, width: 13, height: 26, opacity: 0.55 + i * 0.15, transform: [{ rotate: p.l ? '-14deg' : '10deg' }] }} />
        ))}
      </View>
      <Mark size={8.5} />
    </View>
  );
}

const MAP: Record<StickerLook, (p: StickerProps) => React.JSX.Element> = {
  sello: Sello, recibo: Recibo, pase: Pase, polaroid: Polaroid, credencial: Credencial,
  medalla: Medalla, etiqueta: Etiqueta, contador: Contador, letrero: Letrero, huellas: Huellas,
};

export function StorySticker({ look, ...props }: StickerProps & { look: StickerLook }) {
  const C = MAP[look];
  return <C {...props} />;
}
