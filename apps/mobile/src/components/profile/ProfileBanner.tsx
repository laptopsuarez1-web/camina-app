import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { profileBg } from '@/lib/profile-bg';

// Banner de arriba del perfil: el degradé de la app (morado o verde Camina) o la foto propia de la persona.

// Foto propia de fondo: nítida arriba y abajo se va desenfocando y oscureciendo, para que el nombre y las insignias se lean.
// Sin máscaras nativas: se apilan franjas de la misma foto cada vez más borrosas (la franja recorta la foto en su lugar exacto).
function PhotoBg({ uri }: { uri: string }) {
  const [h, setH] = useState(0);
  const STRIPS = 5;
  const from = 0.4; // el desenfoque empieza al 40% de la altura
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Image source={{ uri }} cachePolicy="memory-disk" priority="high" transition={150} style={StyleSheet.absoluteFill} contentFit="cover" />
      {h > 0 &&
        Array.from({ length: STRIPS }, (_, i) => {
          const top = h * (from + ((1 - from) * i) / STRIPS);
          return (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top, bottom: 0, overflow: 'hidden' }}>
              <Image source={{ uri }} cachePolicy="memory-disk" blurRadius={4 + i * 4} contentFit="cover" style={{ position: 'absolute', left: 0, right: 0, top: -top, height: h }} />
            </View>
          );
        })}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(22,16,31,0.55)', 'rgba(22,16,31,0.92)']} locations={[0, 0.32, 0.7, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// artPad: espacio extra abajo cuando el fondo es una foto, para que se vea la foto debajo del nombre.
// photoUrl: si el fondo es 'foto', la foto propia de la persona.
export function ProfileBanner({ bg, children, style, artPad = 0, photoUrl }: { bg: string | null | undefined; children: ReactNode; style?: StyleProp<ViewStyle>; artPad?: number; photoUrl?: string | null }) {
  const photo = bg === 'foto' && !!photoUrl;
  const theme = profileBg(bg);
  const base = StyleSheet.flatten(style) ?? {};
  const padBottom = Number(base.paddingBottom ?? 28) + (photo ? artPad : 0);
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: 0.8, y: 1 }}
      style={[{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' }, style, { paddingBottom: padBottom }]}
    >
      {photo ? <PhotoBg uri={photoUrl!} /> : null}
      {children}
    </LinearGradient>
  );
}

// Miniatura del selector.
export function ProfileBgThumb({ bg, selected, width, height = 68 }: { bg: string; selected: boolean; width?: number; height?: number }) {
  return (
    <LinearGradient
      colors={profileBg(bg).colors}
      start={{ x: 0.15, y: -0.1 }}
      end={{ x: 0.8, y: 1 }}
      style={{ width: width ?? '100%', height, borderRadius: 14, borderWidth: selected ? 2.5 : 1, borderColor: selected ? '#fff' : 'rgba(255,255,255,0.18)' }}
    />
  );
}
