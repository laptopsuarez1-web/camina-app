import { useState, type ReactNode } from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// Foto de perfil que cae a `fallback` (iniciales o ícono) si la URL falta o no carga,
// en vez de dejar el círculo vacío.
export function AvatarImage({
  uri,
  fallback,
  style,
}: {
  uri?: string | null;
  fallback: ReactNode;
  style?: StyleProp<ImageStyle>;
}) {
  // Se guarda CUÁL foto falló, no un sí/no: si la persona cambia la foto, la nueva se vuelve a intentar sola.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || failedUri === uri) return <>{fallback}</>;
  // La foto y las iniciales van en la MISMA caja (la del círculo): mientras baja la foto se ven las iniciales debajo.
  // Antes las iniciales se posicionaban contra la fila entera y aparecían encima de los nombres.
  // expo-image guarda la foto en disco (la segunda vez abre al instante) y la muestra con un fundido corto.
  return (
    <View style={[StyleSheet.flatten(style) as ViewStyle, { overflow: 'hidden' }]}>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">{fallback}</View>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" priority="high" recyclingKey={uri} transition={120} onError={() => setFailedUri(uri)} />
    </View>
  );
}
