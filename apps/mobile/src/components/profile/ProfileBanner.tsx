import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G } from 'react-native-svg';
import { profileBg } from '@/lib/profile-bg';
import { H, SCENES, STARRY, Stars, W } from './ProfileScenes';

// Banner de arriba del perfil. Los dibujos (paisajes de Bolivia y uno de Camina) están en ProfileScenes.tsx.
// El dibujo se baja SHIFT unidades dentro de una caja más alta: queda completo, anclado abajo, y sobra cielo arriba.
const SHIFT = 105;

// Solo el dibujo (para banners y miniaturas): llena la caja, anclado abajo.
export function ProfileBgArt({ bg }: { bg: string | null | undefined }) {
  const key = profileBg(bg).key;
  const Scene = SCENES[key];
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H + SHIFT}`} preserveAspectRatio="xMidYMax slice" style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARRY[key] ? <Stars n={48} seed={3} maxY={H} /> : null}
      <G transform={`translate(0 ${SHIFT})`}>
        <Scene />
      </G>
    </Svg>
  );
}

// Foto propia de fondo: nítida arriba y abajo se va desenfocando y oscureciendo, para que el nombre y las insignias se lean.
// Sin máscaras nativas: se apilan franjas de la misma foto cada vez más borrosas (la franja recorta la foto en su lugar exacto).
function PhotoBg({ uri }: { uri: string }) {
  const [h, setH] = useState(0);
  const STRIPS = 7;
  const from = 0.4; // el desenfoque empieza al 40% de la altura
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {h > 0 &&
        Array.from({ length: STRIPS }, (_, i) => {
          const top = h * (from + ((1 - from) * i) / STRIPS);
          return (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top, bottom: 0, overflow: 'hidden' }}>
              <Image source={{ uri }} blurRadius={3 + i * 3} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: -top, height: h }} />
            </View>
          );
        })}
      <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(22,16,31,0.55)', 'rgba(22,16,31,0.92)']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// artPad: espacio extra abajo cuando el fondo tiene dibujo, para que se vea el paisaje debajo del nombre.
// photoUrl: si el fondo es 'foto', la foto propia de la persona.
export function ProfileBanner({ bg, children, style, artPad = 0, photoUrl }: { bg: string | null | undefined; children: ReactNode; style?: StyleProp<ViewStyle>; artPad?: number; photoUrl?: string | null }) {
  const photo = bg === 'foto' && !!photoUrl;
  const theme = profileBg(photo ? 'ciudad' : bg);
  const base = StyleSheet.flatten(style) ?? {};
  const padBottom = Number(base.paddingBottom ?? 28) + artPad;
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: 0.2, y: 1 }}
      style={[{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' }, style, { paddingBottom: padBottom }]}
    >
      {photo ? <PhotoBg uri={photoUrl!} /> : <ProfileBgArt bg={bg} />}
      {!photo ? <LinearGradient pointerEvents="none" colors={['rgba(22,16,31,0)', 'rgba(22,16,31,0.5)', 'rgba(22,16,31,0.88)']} locations={[0.35, 0.75, 1]} style={StyleSheet.absoluteFill} /> : null}
      {children}
    </LinearGradient>
  );
}

// Miniatura del selector.
export function ProfileBgThumb({ bg, selected, width, height = 68 }: { bg: string; selected: boolean; width?: number; height?: number }) {
  const theme = profileBg(bg);
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: 0.2, y: 1 }}
      style={{ width: width ?? '100%', height, borderRadius: 14, overflow: 'hidden', borderWidth: selected ? 2.5 : 1, borderColor: selected ? '#fff' : 'rgba(255,255,255,0.18)' }}
    >
      <View style={StyleSheet.absoluteFill}>
        <ProfileBgArt bg={bg} />
      </View>
    </LinearGradient>
  );
}
