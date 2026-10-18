import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Share2, X } from '@/components/icons';
import { CARD_W, cardHeight, WrappedSlide, wrappedSlideCount, type CardTheme, type WrappedData } from '@/components/share/cards';
import { Seg, Toggle } from '@/components/share/CardShareSheet';
import { friendlyError } from '@/lib/errors';
import { shareCard } from '@/lib/share-image';

// Wrapped del mes: láminas que se pasan tocando la derecha o la izquierda de la pantalla. Cada lámina se comparte por separado
// (Instagram toma una imagen por vez). El nombre y el ranking son opcionales: sin nombre, la tarjeta no lo lleva.
export function WrappedViewer({ visible, onClose, data, firstName }: { visible: boolean; onClose: () => void; data: WrappedData | null | undefined; firstName: string | null }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<CardTheme>('light');
  const [withName, setWithName] = useState(false);
  const [withRank, setWithRank] = useState(true);
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<View>(null);

  // Al cerrar, la próxima vez vuelve a empezar por la primera lámina.
  const close = () => {
    setIndex(0);
    onClose();
  };

  if (!data) return null;
  const shown: WrappedData = { ...data, name: withName ? firstName : null, rank: withRank ? data.rank : null };
  const total = wrappedSlideCount(shown);
  const i = Math.min(index, total - 1);

  // La tarjeta se achica para que entre con los controles de abajo.
  const h = cardHeight('story');
  const scale = Math.min((width - 32) / CARD_W, (height - insets.top - insets.bottom - 250) / h);

  async function share() {
    setBusy(true);
    try {
      await shareCard(shotRef, { width: CARD_W, height: h }, `camina-wrapped-${data!.monthName}-${i + 1}`, 'Compartí tu mes');
    } catch (e) {
      Alert.alert('No pudimos compartir la imagen', friendlyError(e, 'Probá de nuevo en un momento.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View className="flex-1" style={{ backgroundColor: '#120A1E', paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8 }}>
        <View className="flex-row items-center justify-between px-4 mb-2">
          <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <X size={16} color="#fff" weight="bold" />
          </Press>
          <Text accessibilityRole="header" className="text-white font-bold text-[16px]">Tu {data.monthName}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: CARD_W * scale, height: h * scale, borderRadius: 20 * scale, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: h, transformOrigin: 'top left', transform: [{ scale }] }}>
              <WrappedSlide theme={theme} data={shown} index={i} />
            </View>
            {/* Mitad izquierda: lámina anterior; mitad derecha: la siguiente. */}
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
              <Press accessibilityRole="button" accessibilityLabel="Lámina anterior" feedback="none" disabled={i === 0} onPress={() => setIndex(Math.max(0, i - 1))} style={{ flex: 1 }} />
              <Press accessibilityRole="button" accessibilityLabel="Lámina siguiente" feedback="none" disabled={i === total - 1} onPress={() => setIndex(Math.min(total - 1, i + 1))} style={{ flex: 1 }} />
            </View>
          </View>
          <Text className="text-[12px] mt-2" style={{ color: '#C4B8E8' }}>Lámina {i + 1} de {total}</Text>
        </View>

        <View className="px-5 mt-2" style={{ gap: 2 }}>
          <Seg onDark value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Clara' }, { value: 'dark', label: 'Oscura' }]} />
          {firstName ? <Toggle onDark label="Mostrar mi nombre" value={withName} onChange={setWithName} /> : null}
          {data.rank ? <Toggle onDark label="Mostrar mi puesto en el ranking" value={withRank} onChange={setWithRank} /> : null}
          <Press accessibilityRole="button" accessibilityState={{ busy }} onPress={share} disabled={busy} className="rounded-2xl py-4 flex-row items-center justify-center mt-1" style={{ gap: 8, backgroundColor: '#1F7A66', opacity: busy ? 0.7 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Share2 size={18} color="#fff" weight="bold" />}
            <Text className="text-white font-bold text-[15px]">Compartir esta lámina</Text>
          </Press>
        </View>
      </View>

      <View pointerEvents="none" style={{ position: 'absolute', left: -5000, top: 0 }}>
        <View ref={shotRef} collapsable={false} style={{ width: CARD_W, height: h }}>
          {visible ? <WrappedSlide theme={theme} data={shown} index={i} /> : null}
        </View>
      </View>
    </Modal>
  );
}
