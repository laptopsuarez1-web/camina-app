import * as ImagePicker from 'expo-image-picker';

// Elige una foto de la galería para ponerla de fondo de una lámina transparente (9:16). Devuelve null si la persona cancela.
// La foto no sale del teléfono: solo se usa para armar la imagen que la persona comparte.
export async function pickSharePhoto(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [9, 16] });
  return r.canceled ? null : r.assets[0].uri;
}
