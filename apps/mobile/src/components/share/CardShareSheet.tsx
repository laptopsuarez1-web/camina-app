import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Copy, DownloadSimple, Share2, X } from '@/components/icons';
import { pickSharePhoto } from '@/lib/pick-share-photo';
import { useThemeColors } from '@/theme/useThemeColors';
import { friendlyError } from '@/lib/errors';
import { copyCardImage, saveCardToGallery, shareCard } from '@/lib/share-image';
import { CARD_W, cardHeight, type CardFormat, type CardTheme } from '@/components/share/cards';

// Selector de 2 o 3 opciones con el estilo de los filtros de la app (verde oscuro para la elegida).
export function Seg<T extends string>({ label, value, options, onChange, onDark }: { label?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; onDark?: boolean }) {
  const theme = useThemeColors();
  const muted = onDark ? '#C4B8E8' : theme.muted;
  return (
    <View className="flex-row items-center mb-2.5" style={{ gap: 10 }}>
      {label ? <Text className="text-[12.5px] font-semibold text-muted-light dark:text-muted-dark" style={{ width: 64 }}>{label}</Text> : null}
      <View className={`flex-1 flex-row rounded-full p-1 ${onDark ? '' : 'bg-purple-light-light dark:bg-purple-light-dark'}`} style={onDark ? { backgroundColor: 'rgba(255,255,255,0.12)' } : undefined}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Press
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              aria-pressed={on}
              haptic="selection"
              feedback="none"
              onPress={() => onChange(o.value)}
              className="flex-1 rounded-full items-center py-2"
              style={on ? { backgroundColor: '#1F7A66' } : undefined}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : muted }}>{o.label}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

// Interruptor de texto para las opciones de privacidad de la tarjeta (por ejemplo, "Mostrar mi nombre").
export function Toggle({ label, hint, value, onChange, onDark }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; onDark?: boolean }) {
  return (
    <Press accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} feedback="row" haptic="selection" className="flex-row items-center py-2" style={{ gap: 12 }}>
      <View className="flex-1">
        <Text className={`text-[13.5px] font-semibold ${onDark ? '' : 'text-text-light dark:text-text-dark'}`} style={onDark ? { color: '#fff' } : undefined}>{label}</Text>
        {hint ? <Text className={`text-[11.5px] ${onDark ? '' : 'text-muted-light dark:text-muted-dark'}`} style={onDark ? { color: '#C4B8E8' } : undefined}>{hint}</Text> : null}
      </View>
      <View style={{ width: 46, height: 27, borderRadius: 14, backgroundColor: value ? '#1F7A66' : '#CFC3E6', padding: 3, justifyContent: 'center' }}>
        <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </Press>
  );
}

// Hoja de compartir: vista previa de la tarjeta, formato (historia o cuadrada), tarjeta clara u oscura y el botón que abre
// la hoja del sistema. `render` dibuja la tarjeta; la hoja la dibuja dos veces: chica para la vista previa y a tamaño real
// fuera de pantalla para capturarla.
export function CardShareSheet({
  visible, onClose, title, filename, extras, render, defaultFormat = 'story',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  extras?: ReactNode;
  render: (o: { theme: CardTheme; format: CardFormat }) => ReactNode;
  defaultFormat?: CardFormat;
}) {
  const { height: screenH, width: screenW } = useWindowDimensions();
  const [theme, setTheme] = useState<CardTheme>('light');
  const [format, setFormat] = useState<CardFormat>(defaultFormat);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'img' | null>(null);
  const [saved, setSaved] = useState(false);
  // Foto de fondo para la versión transparente: sale en la imagen que se comparte, no en el sticker que se copia.
  const [photo, setPhoto] = useState<string | null>(null);
  const stickerRef = useRef<View>(null);
  const overlay = format === 'overlay';
  const shotRef = useRef<View>(null);

  const h = cardHeight(format);
  const maxH = Math.min(320, screenH * 0.4);
  const scale = Math.min(maxH / h, (screenW - 80) / CARD_W);

  async function share() {
    setBusy(true);
    try {
      await shareCard(shotRef, { width: CARD_W, height: h }, filename);
    } catch (e) {
      Alert.alert('No pudimos compartir la imagen', friendlyError(e, 'Prueba de nuevo en un momento.'));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      const ok = await saveCardToGallery(shotRef, { width: CARD_W, height: h }, filename);
      if (!ok) {
        Alert.alert('Falta el permiso', 'Para guardar la imagen, permite a Camina agregar fotos a tu galería desde los ajustes del teléfono.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      Alert.alert('No pudimos guardar la imagen', friendlyError(e, 'Prueba de nuevo en un momento.'));
    }
  }

  async function choosePhoto() {
    try {
      const uri = await pickSharePhoto();
      if (uri) setPhoto(uri);
    } catch (e) {
      Alert.alert('No pudimos abrir tus fotos', friendlyError(e, 'Revisa el permiso de fotos e intenta de nuevo.'));
    }
  }

  function flash(k: 'img') {
    setCopied(k);
    setTimeout(() => setCopied(null), 2200);
  }

  async function copyImage() {
    try {
      await copyCardImage(stickerRef, { width: CARD_W, height: h });
      flash('img');
    } catch (e) {
      Alert.alert('No pudimos copiar la imagen', friendlyError(e, 'Prueba de nuevo en un momento.'));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }}>
        {/* Tocar fuera de la hoja la cierra. La hoja NO es un Press: así el contenido se puede deslizar. */}
        <Press accessible={false} feedback="none" onPress={onClose} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <View className="bg-card-light dark:bg-card-dark rounded-t-[28px] pt-3" style={{ maxHeight: screenH * 0.94 }}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-3" />
          <View className="flex-row items-center justify-between px-5 mb-2">
            <Text accessibilityRole="header" className="text-[19px] font-extrabold text-text-light dark:text-text-dark">{title}</Text>
            <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10} className="w-8 h-8 rounded-full items-center justify-center bg-purple-light-light dark:bg-purple-light-dark">
              <X size={14} color="#8B4FD1" />
            </Press>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false} bounces keyboardShouldPersistTaps="handled">
            {extras}
            <Seg label="Formato" value={format} onChange={setFormat} options={[{ value: 'story', label: 'Historia' }, { value: 'overlay', label: 'Transparente' }]} />
            {overlay ? null : <Seg label="Tarjeta" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Clara' }, { value: 'dark', label: 'Oscura' }]} />}

            {/* Vista previa: la misma tarjeta, achicada. */}
            <View accessible accessibilityLabel="Vista previa de la tarjeta" style={{ alignSelf: 'center', width: CARD_W * scale, height: h * scale, borderRadius: 18 * scale, overflow: 'hidden', marginVertical: 8, backgroundColor: overlay ? '#3B3552' : undefined }}>
              {/* Fondo de ejemplo detrás de la tarjeta transparente: ahí va tu foto. */}
              {overlay && photo ? <Image source={{ uri: photo }} accessible={false} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : null}
              {overlay && !photo ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0.5, backgroundColor: '#8F86B3' }} /> : null}
              <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: h, transformOrigin: 'top left', transform: [{ scale }] }} pointerEvents="none">
                {render({ theme, format })}
              </View>
            </View>

            {overlay ? (
              <Press accessibilityRole="button" onPress={copyImage} className="rounded-2xl py-4 flex-row items-center justify-center mt-2" style={{ gap: 8, backgroundColor: copied === 'img' ? '#16604F' : '#1F7A66' }}>
                <Copy size={19} color="#fff" weight="bold" />
                <Text className="text-white font-bold text-[15.5px]">{copied === 'img' ? '¡Copiada! Pégala en tu historia' : 'Copiar para pegar como sticker'}</Text>
              </Press>
            ) : null}
            <View className="flex-row mt-2.5" style={{ gap: 8 }}>
              <Press accessibilityRole="button" accessibilityLabel="Guardar en la galería" onPress={save} className="rounded-2xl py-4 px-5 flex-row items-center justify-center bg-purple-light-light dark:bg-purple-light-dark" style={{ gap: 6 }}>
                <DownloadSimple size={18} color="#8B4FD1" weight="bold" />
                <Text className="font-bold text-[14px]" style={{ color: '#8B4FD1' }}>{saved ? '¡Guardada!' : 'Guardar'}</Text>
              </Press>
              <Press accessibilityRole="button" accessibilityState={{ busy }} onPress={share} disabled={busy} className="flex-1 rounded-2xl py-4 flex-row items-center justify-center" style={{ gap: 8, backgroundColor: overlay ? '#8B4FD1' : '#1F7A66', opacity: busy ? 0.7 : 1 }}>
                {busy ? <ActivityIndicator color="#fff" /> : <Share2 size={18} color="#fff" weight="bold" />}
                <Text className="text-white font-bold text-[15px]">Compartir imagen</Text>
              </Press>
            </View>
            {overlay ? (
              <View className="rounded-2xl mt-3 p-3.5 bg-purple-light-light dark:bg-purple-light-dark" style={{ gap: 6 }}>
                <Text className="text-[13px] font-extrabold text-text-light dark:text-text-dark">Cómo usar la versión transparente</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">1. Toca «Copiar para pegar como sticker».</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">2. En Instagram, crea tu historia con tu foto o video, abre los stickers y toca «Agregar sticker». También funciona en WhatsApp y otras apps.</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">¿Prefieres una sola imagen? Carga una foto aquí abajo para ver cómo queda y toca «Guardar» o «Compartir imagen».</Text>
              </View>
            ) : (
              <Text className="text-[11.5px] text-center text-muted-light dark:text-muted-dark mt-2.5">
                La imagen se arma en tu teléfono. Eliges dónde compartirla: Instagram, WhatsApp o guardarla.
              </Text>
            )}

            {overlay ? (
              <>
                <View className="flex-row mt-2.5" style={{ gap: 8 }}>
                  <Press accessibilityRole="button" onPress={choosePhoto} className="flex-1 rounded-2xl py-3.5 items-center bg-purple-light-light dark:bg-purple-light-dark">
                    <Text className="font-bold text-[14px]" style={{ color: '#8B4FD1' }}>{photo ? 'Cambiar foto' : 'Cargar foto para ver cómo queda'}</Text>
                  </Press>
                  {photo ? (
                    <Press accessibilityRole="button" accessibilityLabel="Quitar la foto de fondo" onPress={() => setPhoto(null)} className="rounded-2xl px-5 items-center justify-center bg-purple-light-light dark:bg-purple-light-dark">
                      <X size={14} color="#8B4FD1" />
                    </Press>
                  ) : null}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>

      {/* Tarjeta a tamaño real, fuera de pantalla, para capturarla en 1080 px. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -5000, top: 0 }}>
        <View ref={shotRef} collapsable={false} style={{ width: CARD_W, height: h }}>
          {overlay && photo ? <Image source={{ uri: photo }} accessible={false} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: h }} /> : null}
          {visible ? render({ theme, format }) : null}
        </View>
        {/* Sin foto: es lo que se copia como sticker (fondo transparente). */}
        {overlay ? (
          <View ref={stickerRef} collapsable={false} style={{ width: CARD_W, height: h, position: 'absolute', top: h + 20 }}>
            {visible ? render({ theme, format }) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
