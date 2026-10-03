import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from '@/components/icons';
import { LegalSections } from '@/components/LegalSections';
import { PRIVACY_URL } from '@/constants/contact';

// Términos y privacidad para releer cuando quieras (Perfil y pantalla de inicio de sesión).
export default function LegalScreen() {
  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <View className="bg-auth-bg pt-14 pb-5 px-5" style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View className="flex-row items-center gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Pressable>
          <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Términos y privacidad</Text>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-5 pb-12">
        <LegalSections />
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} className="py-3 items-center">
          <Text className="text-aqua-deep dark:text-mint text-[13px] font-semibold underline">Ver en el navegador</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
