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
  // Primero la persona acomoda la foto (mover y zoom). Se pregunta SIEMPRE, aunque después falle el recorte, para que
  // ninguna foto se suba sin pasar por el editor.
  let w = asset.width;
  let h = asset.height;
  let rect: Awaited<ReturnType<typeof askCrop>> = null;
  if (aspect) {
    if (!w || !h) {
      try {
        const probe = await ImageManipulator.manipulate(asset.uri).renderAsync();
        w = probe.width;
        h = probe.height;
      } catch {
        // sin medidas no se puede acomodar: se usa cuadrado de 1000 como referencia
        w = w || 1000;
        h = h || 1000;
      }
    }
    rect = await askCrop({ uri: asset.uri, width: w, height: h, aspect, title, round: aspect === 1 });
    if (!rect) return null;
  }
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    const first = await ctx.renderAsync();
    // Las medidas reales de la foto (ya girada) pueden diferir de las del selector: se escala el recorte a esas medidas.
    const fx = first.width / w;
    const fy = first.height / h;
    let cw = first.width;
    let ch = first.height;
    if (rect) {
      cw = Math.max(1, Math.min(first.width, Math.round(rect.width * fx)));
      ch = Math.max(1, Math.min(first.height, Math.round(rect.height * fy)));
      ctx.crop({
        originX: Math.max(0, Math.min(first.width - cw, Math.round(rect.x * fx))),
        originY: Math.max(0, Math.min(first.height - ch, Math.round(rect.y * fy))),
        width: cw,
        height: ch,
      });
    }
    if (cw > max || ch > max) ctx.resize(cw >= ch ? { width: max } : { height: max });
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
    return { uri: out.uri, width: out.width, height: out.height };
  } catch {
    // Si no se pudo recortar, se usa la foto como vino (después se achica al subirla).
    return { uri: asset.uri, width: asset.width, height: asset.height };
  }
}
