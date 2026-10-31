import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Camera, Check, Share2, Trash2, Users, X } from '@/components/icons';
import { GROUP_BACKGROUNDS, groupGradient } from '@/lib/group-look';
import { colors } from '@/theme/tokens';

// Barra lateral del grupo: datos, meta, foto, fondo, invitación y salida. Entra desde la derecha.
export function GroupDrawer({
  visible, onClose, name, photoUrl, background, memberCount, inviteCode, goal, isCreator,
  busy, onRename, onInvite, onEditGoal, onPickPhoto, onPickBackground, onLeave, onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  photoUrl?: string | null;
  background?: string | null;
  memberCount: number;
  inviteCode: string;
  goal: number;
  isCreator: boolean;
  busy?: boolean;
  onInvite: () => void;
  onEditGoal: () => void;
  onPickPhoto: () => void;
  onPickBackground: (key: string) => void;
  onRename: (name: string) => Promise<boolean>;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const panelW = Math.min(340, width * 0.86);
  const x = useRef(new Animated.Value(panelW)).current;
  useEffect(() => {
    if (visible) Animated.timing(x, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else x.setValue(panelW);
  }, [visible, x, panelW]);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  async function saveName() {
    const ok = await onRename(draft.trim());
    if (ok) setRenaming(false);
  }

  const row = 'flex-row items-center py-3.5 border-t border-line-light dark:border-line-dark';
  const initial = name[0]?.toUpperCase() ?? 'G';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 flex-row justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }}>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar menú del grupo" feedback="none" className="flex-1" onPress={onClose} />
        <Animated.View
          accessibilityViewIsModal
          style={{ width: panelW, height, transform: [{ translateX: x }], borderTopLeftRadius: 28, borderBottomLeftRadius: 28, overflow: 'hidden' }}
        >
          <View className="flex-1 bg-card-light dark:bg-card-dark">
          <LinearGradient colors={groupGradient(background)} style={{ paddingTop: insets.top + 14, paddingBottom: 20, paddingHorizontal: 20 }}>
            <View className="flex-row justify-end">
              <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <X size={16} color="#fff" />
              </Press>
            </View>
            <View className="items-center mt-1">
              <Press accessibilityRole="button" accessibilityLabel={isCreator ? 'Cambiar foto del grupo' : 'Foto del grupo'} disabled={!isCreator || busy} onPress={onPickPhoto} feedback={isCreator ? undefined : 'none'}>
                <AvatarImage
                  uri={photoUrl}
                  style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}
                  fallback={
                    <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}>
                      <Text style={{ fontWeight: '900', color: colors.mintDark, fontSize: 32 }}>{initial}</Text>
                    </View>
                  }
                />
                {isCreator && (
                  <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.aquaDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                    <Camera size={14} color="#fff" />
                  </View>
                )}
              </Press>
              <Text accessibilityRole="header" className="text-[18px] font-extrabold text-white mt-3 text-center" numberOfLines={2}>{name}</Text>
              <Text className="text-[12.5px] mt-0.5" style={{ color: colors.authMuted }}>{memberCount} {memberCount === 1 ? 'integrante' : 'integrantes'}</Text>
            </View>
          </LinearGradient>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {isCreator && (
              <View className="py-3.5">
                {renaming ? (
                  <View style={{ gap: 8 }}>
                    <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark">Nombre del grupo</Text>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      maxLength={40}
                      autoFocus
                      accessibilityLabel="Nombre del grupo"
                      className="rounded-xl px-3.5 py-2.5 text-[15px] bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark"
                    />
                    <View className="flex-row" style={{ gap: 8 }}>
                      <Press accessibilityRole="button" disabled={busy || draft.trim().length < 2} onPress={saveName} className="rounded-full px-4 py-2" style={{ backgroundColor: colors.aquaDeep, opacity: busy || draft.trim().length < 2 ? 0.5 : 1 }}>
                        <Text className="text-xs font-semibold text-white">Guardar</Text>
                      </Press>
                      <Press accessibilityRole="button" onPress={() => setRenaming(false)} className="px-3 py-2">
                        <Text className="text-xs text-muted-light dark:text-muted-dark">Cancelar</Text>
                      </Press>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark">Nombre del grupo</Text>
                      <Text className="text-[12px] text-muted-light dark:text-muted-dark" numberOfLines={1}>{name}</Text>
                    </View>
                    <Press accessibilityRole="button" onPress={() => { setDraft(name); setRenaming(true); }} hitSlop={8} className="rounded-full px-3 py-1.5 bg-purple-light-light dark:bg-purple-light-dark">
                      <Text className="text-xs font-semibold text-purple-ink dark:text-purple-soft">Cambiar</Text>
                    </Press>
                  </View>
                )}
              </View>
            )}
            <Press accessibilityRole="button" onPress={onInvite} className={row}>
              <Share2 size={18} color={colors.aquaDeep} />
              <View className="ml-3 flex-1">
                <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark">Invitar amigos</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">Código {inviteCode}</Text>
              </View>
            </Press>

            <View className={row}>
              <Users size={18} color={colors.aquaDeep} />
              <View className="ml-3 flex-1">
                <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark">Meta semanal</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">{goal.toLocaleString('es-BO')} pasos entre todos</Text>
              </View>
              {isCreator && (
                <Press accessibilityRole="button" onPress={onEditGoal} hitSlop={8} className="rounded-full px-3 py-1.5 bg-purple-light-light dark:bg-purple-light-dark">
                  <Text className="text-xs font-semibold text-purple-ink dark:text-purple-soft">Cambiar</Text>
                </Press>
              )}
            </View>

            {isCreator && (
              <View className="py-3.5 border-t border-line-light dark:border-line-dark">
                <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark mb-2.5">Fondo del grupo</Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {GROUP_BACKGROUNDS.map((b) => {
                    const on = (background ?? 'aqua') === b.key;
                    return (
                      <Press key={b.key} accessibilityRole="button" accessibilityLabel={`Fondo ${b.label}`} accessibilityState={{ selected: on }} disabled={busy} onPress={() => onPickBackground(b.key)}>
                        <LinearGradient colors={b.colors} style={{ width: (panelW - 40 - 20) / 3, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 1, borderColor: on ? '#fff' : 'rgba(255,255,255,0.15)' }}>
                          {on ? <Check size={16} color="#fff" weight="bold" /> : null}
                          <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700', marginTop: on ? 1 : 0 }}>{b.label}</Text>
                        </LinearGradient>
                      </Press>
                    );
                  })}
                </View>
              </View>
            )}

            <Press accessibilityRole="button" onPress={onLeave} className={row}>
              <Text className="text-[14.5px] font-semibold" style={{ color: colors.dangerInk }}>Salir del grupo</Text>
            </Press>
            {isCreator && (
              <Press accessibilityRole="button" onPress={onDelete} className={row}>
                <Trash2 size={18} color={colors.dangerInk} />
                <Text className="ml-3 text-[14.5px] font-semibold" style={{ color: colors.dangerInk }}>Eliminar grupo</Text>
              </Press>
            )}
          </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
