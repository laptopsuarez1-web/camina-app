import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { askCrop } from '@/store/usePhotoCropStore';

// Elegir una foto de la galería, rápido.
//
// Por qué así: con `allowsEditing: true` el iPhone abre el selector VIEJO (UIImagePickerController), que carga toda la
// galería y procesa la foto entera antes de devolverla: tardaba varios segundos en abrir y en volver. Sin el editor se
// abre el selector nuevo del sistema (PHPicker), que es instantáneo y no convierte la foto. El recorte lo hacemos
// nosotros después: la persona lo acomoda (mover y zoom) a la proporción pedida y achicado al tamaño que se va a mostrar.
//
// aspect = ancho / alto (1 = cuadrado). max = lado mayor final en px.
export async function pickPhoto({ aspect, max = 1280, title = 'Acomoda tu foto' }: { aspect?: number; max?: number; title?: string } = {}): Promise<{ uri: string; width: number; height: number } | null> {
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
      // La persona acomoda la foto (mover y zoom) dentro del marco antes de guardarla.
      const rect = await askCrop({ uri: asset.uri, width: w, height: h, aspect, title, round: aspect === 1 });
      if (!rect) return null;
      const cw = Math.max(1, Math.min(w, Math.round(rect.width)));
      const ch = Math.max(1, Math.min(h, Math.round(rect.height)));
      ctx.crop({ originX: Math.max(0, Math.min(w - cw, Math.round(rect.x))), originY: Math.max(0, Math.min(h - ch, Math.round(rect.y))), width: cw, height: ch });
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
