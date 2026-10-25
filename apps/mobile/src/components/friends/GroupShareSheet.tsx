import { useState } from 'react';
import { Modal, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronRight, Hash, IconBubble, LinkIcon, UserPlus } from '@/components/icons';
import { groupInviteLink } from '@/constants/sharing';
import { useThemeColors } from '@/theme/useThemeColors';

// Hoja para invitar al grupo: compartir el link, ver (y copiar) el código, o elegir amigos de tu lista.
export function GroupShareSheet({
  visible, onClose, groupId, groupName, inviteCode,
}: { visible: boolean; onClose: () => void; groupId: string; groupName: string; inviteCode: string }) {
  const { muted } = useThemeColors();
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Al cerrar, la hoja vuelve a su estado inicial (código oculto).
  const close = () => { setShowCode(false); setCopied(false); onClose(); };

  async function shareLink() {
    close();
    // Solo `message`, con el link al final: en iPhone, si además se pasa `url`, WhatsApp se queda con una sola de las dos.
    await Share.share({
      message: `Únete a mi grupo "${groupName}" en Camina: caminemos y ganemos Puntos juntos.\nCódigo: ${inviteCode}\n${groupInviteLink(inviteCode)}`,
    });
  }

  async function copyCode() {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={close}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9" onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          <Text accessibilityRole="header" className="text-[19px] font-extrabold text-text-light dark:text-text-dark mb-3.5">Invitar al grupo</Text>

          <Glass className="rounded-2xl mb-2.5">
            <Press accessibilityRole="button" onPress={shareLink} feedback="row" className="flex-row items-center p-3.5" style={{ gap: 12 }}>
              <IconBubble icon={LinkIcon} tone="aqua" size={38} />
              <View className="flex-1">
                <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Compartir link</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">WhatsApp, mensajes, donde quieras</Text>
              </View>
              <ChevronRight size={14} color={muted} />
            </Press>
          </Glass>

          <Glass className="rounded-2xl mb-2.5">
            <Press accessibilityRole="button" accessibilityState={{ expanded: showCode }} onPress={() => setShowCode((v) => !v)} feedback="row" className="flex-row items-center p-3.5" style={{ gap: 12 }}>
              <IconBubble icon={Hash} tone="purple" size={38} />
              <View className="flex-1">
                <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Ver código</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Para decírselo en persona</Text>
              </View>
            </Press>
            {showCode && (
              <View className="flex-row items-center px-3.5 pb-3.5" style={{ gap: 12 }}>
                <Text selectable className="flex-1 text-[22px] font-extrabold tracking-widest text-text-light dark:text-text-dark">{inviteCode}</Text>
                <Press accessibilityRole="button" accessibilityLabel="Copiar el código de invitación" onPress={copyCode} className="bg-aqua-deep rounded-full px-4 py-2">
                  <Text className="text-white text-xs font-semibold">{copied ? '¡Copiado!' : 'Copiar'}</Text>
                </Press>
              </View>
            )}
          </Glass>

          <Glass className="rounded-2xl">
            <Press
              accessibilityRole="button"
              onPress={() => { close(); router.push({ pathname: '/(tabs)/grupos/agregar', params: { groupId } }); }}
              feedback="row"
              className="flex-row items-center p-3.5"
              style={{ gap: 12 }}
            >
              <IconBubble icon={UserPlus} tone="purple" size={38} />
              <View className="flex-1">
                <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Agregar amigos</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Elige de tu lista de amigos</Text>
              </View>
              <ChevronRight size={14} color={muted} />
            </Press>
          </Glass>
        </Press>
      </Press>
    </Modal>
  );
}
