import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { session, profile, initializing } = useAuthStore();

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile || !profile.full_name.trim()) return <Redirect href="/(auth)/perfil" />;
  return <Redirect href="/(tabs)" />;
}
