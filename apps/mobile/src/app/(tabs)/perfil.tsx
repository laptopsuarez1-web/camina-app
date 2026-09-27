import { View, Text, ScrollView, Pressable, Image, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';
import { INTERESTS_OPTIONS } from '@/constants/catalog';

export default function PerfilScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: balance } = usePointsBalance();

  async function toggleInterest(name: string) {
    if (!profile) return;
    const current = new Set(profile.interests ?? []);
    if (current.has(name)) current.delete(name);
    else current.add(name);
    const { error } = await supabase.from('profiles').update({ interests: [...current] }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function toggleDarkMode(value: boolean) {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ dark_mode: value }).eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function toggleRanking(value: boolean) {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ranking_visible: value })
      .eq('id', profile.id);
    if (!error) await useAuthStore.getState().refreshProfile();
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('No pudimos cerrar sesión', error.message);
    else router.replace('/(auth)/welcome');
  }

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14">
      <Text className="text-[21px] font-extrabold mb-4 text-text-light dark:text-text-dark">
        Perfil
      </Text>

      <View className="flex-row items-center gap-3.5 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-4 mb-4">
        <View className="w-14 h-14 rounded-full bg-mint items-center justify-center overflow-hidden">
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} className="w-full h-full" />
          ) : (
            <Text className="font-bold text-mint-dark text-xl">
              {(profile?.full_name || 'C')[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">
            {profile?.full_name}
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-[13px] mt-0.5">
            {profile?.zone ?? 'Zona no definida'}
          </Text>
        </View>
      </View>

      <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 flex-row items-center gap-3 mb-4">
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">
            {balance ?? 0} Puntos
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs">Balance disponible</Text>
        </View>
      </View>

      <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[15px] mb-1 text-text-light dark:text-text-dark">Tus intereses</Text>
        <Text className="text-muted-light dark:text-muted-dark text-xs mb-3">Opcional — nos ayuda a mostrarte mejores beneficios.</Text>
        <View className="flex-row flex-wrap gap-2">
          {INTERESTS_OPTIONS.map(([name]) => {
            const active = (profile?.interests ?? []).includes(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggleInterest(name)}
                className="rounded-full px-3.5 py-2 border"
                style={{
                  backgroundColor: active ? colors.light.aquaLight : 'transparent',
                  borderColor: active ? colors.aqua : colors.light.line,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? '#2E9E7C' : colors.light.muted }}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md overflow-hidden mb-6">
        <View className="flex-row items-center justify-between p-3.5 border-b border-line-light dark:border-line-dark">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Aparecer en el ranking</Text>
          <Switch
            value={profile?.ranking_visible ?? true}
            onValueChange={toggleRanking}
            trackColor={{ true: colors.aqua, false: colors.light.line }}
          />
        </View>
        <View className="flex-row items-center justify-between p-3.5">
          <Text className="text-[14px] text-text-light dark:text-text-dark">Modo oscuro</Text>
          <Switch
            value={profile?.dark_mode ?? false}
            onValueChange={toggleDarkMode}
            trackColor={{ true: colors.aqua, false: colors.light.line }}
          />
        </View>
      </View>

      <Pressable onPress={handleLogout} className="flex-row items-center justify-center gap-2 py-3.5">
        <LogOut size={15} color={colors.warn} />
        <Text className="text-warn font-semibold">Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
