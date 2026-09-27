import { View, Text, ScrollView } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export default function EventosScreen() {
  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14">
      <Text className="text-[21px] font-extrabold mb-0.5 text-text-light dark:text-text-dark">
        Eventos
      </Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-5">
        Viví experiencias únicas con tus marcas favoritas
      </Text>
      <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md py-7 px-6 items-center">
        <View className="w-14 h-14 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center mb-3.5">
          <Calendar size={24} color={colors.purple} />
        </View>
        <Text className="font-bold text-[15px] mb-1.5 text-text-light dark:text-text-dark">
          Sin eventos de comercios próximos
        </Text>
        <Text className="text-muted-light dark:text-muted-dark text-xs text-center leading-5">
          Estamos armando alianzas con comercios de tu zona. Volvé pronto.
        </Text>
      </View>
    </ScrollView>
  );
}
