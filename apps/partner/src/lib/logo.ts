import { supabase } from '@/lib/supabase';

// Achica la imagen elegida (lado máx. 480 px, JPEG) para poder guardarla en el navegador
// hasta que la cuenta esté lista, y para que la subida sea liviana con datos móviles.
export function fileToSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen'));
    };
    img.src = url;
  });
}

// Sube el logo elegido en el registro apenas el comercio existe. Si falla no pasa nada:
// se puede subir después desde Perfil.
export async function uploadLogoFromDataUrl(businessId: string, dataUrl: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${businessId}/logo.jpg`;
    const { error } = await supabase.storage
      .from('business-logos')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) return;
    const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
    await supabase.from('businesses').update({ logo_url: `${data.publicUrl}?t=${Date.now()}` }).eq('id', businessId);
  } catch {
    // se ignora
  }
}
