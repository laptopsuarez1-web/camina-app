import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Check } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { PersonAvatar } from '@/components/friends/PersonAvatar';
import type { Friend } from '@/hooks/useFriends';

// Lista de amigos con casilla para elegir a quiénes invitar. `taken` = ya están en el grupo (no se pueden elegir).
export function FriendPicker({
  friends, selected, taken = [], onToggle,
}: { friends: Friend[]; selected: string[]; taken?: string[]; onToggle: (id: string) => void }) {
  const { line } = useThemeColors();
  return (
    <Glass className="rounded-3xl overflow-hidden">
      {friends.map((f, i) => {
        const isTaken = taken.includes(f.user_id);
        const on = selected.includes(f.user_id);
        return (
          <Press
            key={f.user_id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on || isTaken, disabled: isTaken }}
            accessibilityLabel={`${f.full_name}${isTaken ? ', ya está en el grupo' : ''}`}
            disabled={isTaken}
            feedback="row"
            onPress={() => onToggle(f.user_id)}
            className="flex-row items-center p-3.5"
            style={{ gap: 12, borderBottomWidth: i === friends.length - 1 ? 0 : 1, borderBottomColor: line, opacity: isTaken ? 0.55 : 1 }}
          >
            <PersonAvatar name={f.full_name} photoUrl={f.photo_url} size={40} />
            <View className="flex-1">
              <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{f.full_name}</Text>
              <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">{isTaken ? 'Ya está en el grupo' : f.streak > 0 ? `Racha de ${f.streak} ${f.streak === 1 ? 'día' : 'días'}` : 'Amigo'}</Text>
            </View>
            <View
              style={{
                width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                borderWidth: on || isTaken ? 0 : 2, borderColor: line,
                backgroundColor: isTaken ? line : on ? colors.aquaDeep : 'transparent',
              }}
            >
              {on || isTaken ? <Check size={14} color={isTaken ? colors.light.muted : '#fff'} /> : null}
            </View>
          </Press>
        );
      })}
    </Glass>
  );
}
