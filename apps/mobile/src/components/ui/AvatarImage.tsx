import { useState, type ReactNode } from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp } from 'react-native';

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
  // expo-image guarda la foto en disco (la segunda vez abre al instante), la decodifica al tamaño del círculo y la muestra con un fundido corto.
  // Mientras baja la foto se ven las iniciales debajo (antes el círculo quedaba vacío hasta que llegaba).
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">{fallback}</View>
      <Image source={{ uri }} style={style} contentFit="cover" cachePolicy="memory-disk" priority="high" recyclingKey={uri} transition={120} onError={() => setFailedUri(uri)} />
    </>
  );
}
