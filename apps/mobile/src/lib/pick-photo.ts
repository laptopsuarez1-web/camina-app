import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Elegir una foto de la galería, rápido.
//
// Por qué así: con `allowsEditing: true` el iPhone abre el selector VIEJO (UIImagePickerController), que carga toda la
// galería y procesa la foto entera antes de devolverla: tardaba varios segundos en abrir y en volver. Sin el editor se
// abre el selector nuevo del sistema (PHPicker), que es instantáneo y no convierte la foto. El recorte lo hacemos
// nosotros después: centrado a la proporción pedida y achicado al tamaño que se va a mostrar.
//
// aspect = ancho / alto (1 = cuadrado). max = lado mayor final en px.
export async function pickPhoto({ aspect, max = 1280 }: { aspect?: number; max?: number } = {}): Promise<{ uri: string; width: number; height: number } | null> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const asset = r.assets[0];
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    const first = await ctx.renderAsync();
    let w = first.width;
    let h = first.height;
    if (aspect) {
      // Recorte centrado a la proporción pedida.
      const cw = Math.min(w, Math.round(h * aspect));
      const ch = Math.min(h, Math.round(w / aspect));
      ctx.crop({ originX: Math.round((w - cw) / 2), originY: Math.round((h - ch) / 2), width: cw, height: ch });
      w = cw;
      h = ch;
    }
    if (w > max || h > max) ctx.resize(w >= h ? { width: max } : { height: max });
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
    return { uri: out.uri, width: out.width, height: out.height };
  } catch {
    // Si no se pudo recortar, se usa la foto como vino (después se achica al subirla).
    return { uri: asset.uri, width: asset.width, height: asset.height };
  }
}
