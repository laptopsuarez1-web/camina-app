import { useState, type ReactNode } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

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
  return <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} />;
}
