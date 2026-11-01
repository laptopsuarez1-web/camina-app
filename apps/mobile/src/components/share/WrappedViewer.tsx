import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { DownloadSimple, Share2, X } from '@/components/icons';
import { CARD_W, cardHeight, palette, WrappedOverlay, WrappedSlide, wrappedSlideCount, type CardTheme, type WrappedData } from '@/components/share/cards';
import { friendlyError } from '@/lib/errors';
import { pickSharePhoto } from '@/lib/pick-share-photo';
import { copyCardImage, saveCardToGallery, shareCard } from '@/lib/share-image';

type Mode = CardTheme | 'overlay';

// Sin el marco de enfoque del navegador en las zonas de toque (se veía una línea vertical en el medio).
const NO_RING = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

function Chip({ label, on, onPress, a11y, bg, fg }: { label: string; on: boolean; onPress: () => void; a11y: string; bg: string; fg: string }) {
  return (
    <Press
      accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: on }} haptic="selection" feedback="none" onPress={onPress}
      className="rounded-full items-center justify-center" style={{ flex: 1, height: 36, paddingHorizontal: 8, backgroundColor: on ? '#1F7A66' : bg }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: on ? '#FFFFFF' : fg }}>{label}</Text>
    </Press>
  );
}

// Wrapped del mes a pantalla completa, como una historia: la lámina ocupa todo el ancho, se pasa tocando la derecha o la izquierda
// y abajo están los controles (tema, nombre, puesto, transparente) junto a Guardar y Compartir. Cada lámina se comparte por separado.
// "Transparente" deja solo el texto en blanco: se pega como sticker sobre la foto o el video de la historia de Instagram.
export function WrappedViewer({ visible, onClose, data, firstName }: { visible: boolean; onClose: () => void; data: WrappedData | null | undefined; firstName: string | null }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('dark');
  const [withName, setWithName] = useState(false);
  const [withRank, setWithRank] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  // Alto real de la barra de arriba y de los botones de abajo: la lámina se acomoda entre las dos para que nada se pise.
  const [topH, setTopH] = useState(insets.top + 40 + 40);
  const [botH, setBotH] = useState(insets.bottom + 150);
  const shotRef = useRef<View>(null);
  const stickerRef = useRef<View>(null);

  const close = () => {
    setIndex(0);
    onClose();
  };

  if (!data) return null;
  const shown: WrappedData = { ...data, name: withName ? firstName : null, rank: withRank ? data.rank : null };
  const total = wrappedSlideCount(shown);
  const i = Math.min(index, total - 1);
  const overlay = mode === 'overlay';
  const theme: CardTheme = overlay ? 'dark' : mode;
  const p = palette(theme);

  const h = cardHeight('story');
  const avail = Math.max(200, height - topH - botH);
  const scale = Math.min(width / CARD_W, avail / h);
  const cardTop = topH + Math.max(0, (avail - h * scale) / 2);
  const chrome = overlay ? '#FFFFFF' : p.ink;
  const chipBg = overlay ? 'rgba(255,255,255,0.18)' : theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)';

  // Botones secundarios: en lámina clara van oscuros sobre fondo claro (antes eran blancos y no se veían).
  const btnBg = !overlay && theme === 'light' ? 'rgba(41,28,71,0.1)' : 'rgba(255,255,255,0.2)';
  const btnFg = !overlay && theme === 'light' ? p.ink : '#fff';

  async function share() {
    setBusy(true);
    try {
      await shareCard(shotRef, { width: CARD_W, height: h }, `camina-${data!.monthName}-${i + 1}`, `Tu ${data!.monthName} en Camina`);
    } catch (e) {
      Alert.alert('No pudimos compartir la imagen', friendlyError(e, 'Prueba de nuevo en un momento.'));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      const ok = await saveCardToGallery(shotRef, { width: CARD_W, height: h }, `camina-${data!.monthName}-${i + 1}`);
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

  async function copy() {
    try {
      await copyCardImage(stickerRef, { width: CARD_W, height: h });
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      Alert.alert('No pudimos copiar la imagen', friendlyError(e, 'Prueba de nuevo en un momento.'));
    }
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: overlay ? '#3B3552' : p.bg[0] }}>
        {overlay ? (
          // Fondo de ejemplo: el sticker va sobre tu foto, acá se ve sobre un color.
          <LinearGradient colors={['#5A4B8A', '#2E2547', '#1B1432']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        ) : null}

        {overlay && photo ? <Image source={{ uri: photo }} accessible={false} resizeMode="cover" style={{ position: 'absolute', left: (width - CARD_W * scale) / 2, top: cardTop, width: CARD_W * scale, height: h * scale }} /> : null}

        {/* La lámina a pantalla completa. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: (width - CARD_W * scale) / 2, top: cardTop, width: CARD_W * scale, height: h * scale, overflow: 'hidden', borderRadius: overlay ? 0 : 22 * scale }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: h, transformOrigin: 'top left', transform: [{ scale }] }}>
            {overlay ? <WrappedOverlay data={shown} index={i} /> : <WrappedSlide theme={theme} data={shown} index={i} />}
          </View>
        </View>

        {/* Mitad izquierda: lámina anterior; mitad derecha: la siguiente. */}
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
          <Press accessibilityRole="button" accessibilityLabel="Lámina anterior" feedback="none" disabled={i === 0} onPress={() => setIndex(Math.max(0, i - 1))} style={[{ flex: 1 }, NO_RING]} />
          <Press accessibilityRole="button" accessibilityLabel="Lámina siguiente" feedback="none" disabled={i === total - 1} onPress={() => setIndex(Math.min(total - 1, i + 1))} style={[{ flex: 1 }, NO_RING]} />
        </View>

        {/* Arriba: solo cerrar. Lo que se puede cambiar va abajo, junto a Guardar y Compartir. */}
        <View onLayout={(e) => setTopH(e.nativeEvent.layout.y + e.nativeEvent.layout.height + 6)} style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 40 }} pointerEvents="box-none">
          <View className="flex-row items-center px-4" pointerEvents="box-none">
            <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} hitSlop={10} className="rounded-full items-center justify-center" style={{ width: 34, height: 34, backgroundColor: chipBg }}>
              <X size={15} color={chrome} weight="bold" />
            </Press>
          </View>
        </View>

        {/* Botón de abajo, a la altura del pulgar. */}
        <View onLayout={(e) => setBotH(height - e.nativeEvent.layout.y + 6)} style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 14, gap: 8 }} pointerEvents="box-none">
          <View className="flex-row items-center justify-center" style={{ gap: 8 }} pointerEvents="box-none">
            <Chip bg={chipBg} fg={chrome} label="Clara" a11y="Lámina clara" on={mode === 'light'} onPress={() => setMode('light')} />
            <Chip bg={chipBg} fg={chrome} label="Oscura" a11y="Lámina oscura" on={mode === 'dark'} onPress={() => setMode('dark')} />
            <Chip bg={chipBg} fg={chrome} label="Sticker" a11y="Transparente, para pegar como sticker en una historia" on={overlay} onPress={() => setMode('overlay')} />
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }} pointerEvents="box-none">
            {firstName ? <Chip bg={chipBg} fg={chrome} label="Mi nombre" a11y="Mostrar mi nombre" on={withName} onPress={() => setWithName(!withName)} /> : null}
            {data.rank ? <Chip bg={chipBg} fg={chrome} label="Mi puesto" a11y="Mostrar mi puesto en el ranking" on={withRank} onPress={() => setWithRank(!withRank)} /> : null}
          </View>
          {overlay ? (
            <>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center', opacity: 0.9 }} numberOfLines={2}>
                Copia el sticker y pégalo en tu historia («Agregar sticker»), o carga una foto para ver cómo queda.
              </Text>
              <View className="flex-row" style={{ gap: 8 }}>
                <Press accessibilityRole="button" onPress={copy} className="flex-1 rounded-2xl py-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{copied ? '¡Copiado!' : 'Copiar sticker'}</Text>
                </Press>
                <Press accessibilityRole="button" onPress={photo ? () => setPhoto(null) : choosePhoto} onLongPress={choosePhoto} className="flex-1 rounded-2xl py-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{photo ? 'Quitar foto' : 'Cargar foto'}</Text>
                </Press>
              </View>
            </>
          ) : null}
          <View className="flex-row" style={{ gap: 8 }}>
            <Press accessibilityRole="button" accessibilityLabel="Guardar en la galería" onPress={save} className="rounded-2xl py-4 px-5 flex-row items-center justify-center" style={{ gap: 6, backgroundColor: btnBg }}>
              <DownloadSimple size={18} color={btnFg} weight="bold" />
              <Text style={{ color: btnFg, fontWeight: '800', fontSize: 14 }}>{saved ? '¡Guardada!' : 'Guardar'}</Text>
            </Press>
            <Press accessibilityRole="button" accessibilityState={{ busy }} onPress={share} disabled={busy} className="flex-1 rounded-2xl py-4 flex-row items-center justify-center" style={{ gap: 8, backgroundColor: '#1F7A66', opacity: busy ? 0.7 : 1 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Share2 size={18} color="#fff" weight="bold" />}
              <Text className="text-white font-bold text-[15px]">Compartir esta lámina</Text>
            </Press>
          </View>
        </View>
      </View>

      <View pointerEvents="none" style={{ position: 'absolute', left: -5000, top: 0 }}>
        <View ref={shotRef} collapsable={false} style={{ width: CARD_W, height: h }}>
          {overlay && photo ? <Image source={{ uri: photo }} accessible={false} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: h }} /> : null}
          {visible ? (overlay ? <WrappedOverlay data={shown} index={i} /> : <WrappedSlide theme={theme} data={shown} index={i} />) : null}
        </View>
        {overlay ? (
          <View ref={stickerRef} collapsable={false} style={{ width: CARD_W, height: h, position: 'absolute', top: h + 20 }}>
            {visible ? <WrappedOverlay data={shown} index={i} /> : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
