import { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { consumeNewGroupFormStale } from '@/lib/new-group-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { FriendPicker } from '@/components/friends/FriendPicker';
import { ChevronLeft } from '@/components/icons';
import { GroupLookPicker, type GroupPhoto } from '@/components/GroupLookPicker';
import { useFriends } from '@/hooks/useFriends';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Grupo nuevo, paso 1: nombre y, si quieres, amigos para invitar de entrada. El grupo se crea en el paso 2 (nuevo-meta), después de elegir la meta.
export default function NuevoGrupoScreen() {
  const insets = useSafeAreaInsets();
  const { dark, text, muted, accentIcon } = useThemeColors();
  const { friend } = useLocalSearchParams<{ friend?: string }>();
  const { data: friends } = useFriends();
  const [name, setName] = useState('');
  const [background, setBackground] = useState<string>('aqua');
  const [photo, setPhoto] = useState<GroupPhoto | null>(null);
  const [picked, setPicked] = useState<string[]>(friend ? [friend] : []);

  // Al volver después de crear o eliminar un grupo, el formulario arranca limpio.
  useFocusEffect(
    useCallback(() => {
      if (consumeNewGroupFormStale()) {
        setName('');
        setBackground('aqua');
        setPhoto(null);
        setPicked(friend ? [friend] : []);
      }
    }, [friend])
  );

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const ready = name.trim().length >= 2;

  return (
    <KeyboardSafe className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Grupo nuevo</Text>
          <View style={{ width: 40 }} />
        </View>

        <Glass className="rounded-3xl px-4 pt-3 pb-1 mb-2">
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Nombre del grupo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Caminata de la familia"
            placeholderTextColor={muted}
            accessibilityLabel="Nombre del grupo"
            maxLength={40}
            autoFocus={!friend}
            className="text-[17px] font-semibold py-2 text-text-light dark:text-text-dark"
          />
        </Glass>

        <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 14, marginBottom: 10 }]}>Foto y fondo</Text>
        <GroupLookPicker photo={photo} onPhoto={setPhoto} background={background} onBackground={setBackground} />

        {(friends ?? []).length > 0 ? (
          <>
            <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 14, marginBottom: 10 }]}>Invita a tus amigos</Text>
            <FriendPicker friends={friends!} selected={picked} onToggle={toggle} />
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2.5 mx-1">Les llega la invitación y entran cuando aceptan. Después también puedes compartir el link o el código.</Text>
          </>
        ) : (
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-3 mx-1" style={{ lineHeight: 18 }}>
            Cuando lo crees vas a poder compartir el link o el código del grupo.
          </Text>
        )}

        <Press
          accessibilityRole="button"
          disabled={!ready}
          onPress={() => router.push({ pathname: '/(tabs)/grupos/nuevo-meta', params: { name: name.trim(), friends: picked.join(','), background, ...(photo ? { photo: photo.uri } : {}) } })}
          className="rounded-2xl py-3.5 items-center mt-5"
          style={{ backgroundColor: colors.aquaDeep, opacity: ready ? 1 : 0.5 }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {picked.length > 0 ? `Crear e invitar a ${picked.length}` : 'Crear grupo'}
          </Text>
        </Press>
      </ScrollView>
    </KeyboardSafe>
  );
}
