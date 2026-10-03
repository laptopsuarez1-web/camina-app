import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Camera } from '@/components/icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@/lib/avatar';
import { birthToISO, ageFromISO, MIN_AGE } from '@/lib/age';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { PlacePicker } from '@/components/PlacePicker';

// Único paso obligatorio después de crear la cuenta. Ciudad y barrio son opcionales (Tarija por defecto);
// los intereses se editan después desde Perfil.
export default function CompletarPerfilScreen() {
  const [fullName, setFullName] = useState('');
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear] = useState('');
  const [city, setCity] = useState('Tarija');
  const [zone, setZone] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = useColorScheme().colorScheme === 'dark';

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleContinue() {
    if (!fullName.trim()) {
      Alert.alert('Falta tu nombre', 'Contanos cómo te llamás.');
      return;
    }
    const birth = birthToISO(bDay, bMonth, bYear);
    if (!birth) {
      Alert.alert('Falta tu fecha de nacimiento', 'Ingresá día, mes y año (por ejemplo 15 / 04 / 1998).');
      return;
    }
    if (ageFromISO(birth) < MIN_AGE) {
      Alert.alert('Camina es para personas de 13 años o más', 'Por ahora no podés usar la app. ¡Te esperamos cuando cumplas 13!');
      await supabase.auth.signOut();
      router.replace('/(auth)/welcome');
      return;
    }
    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Sesión inválida');

      const photoUrl = photoUri ? await uploadAvatar(userId, photoUri) : undefined;

      const base = { id: userId, full_name: fullName.trim(), ...(photoUrl ? { photo_url: photoUrl } : {}) };
      let { error } = await supabase.from('profiles').upsert({ ...base, birth_date: birth, city, zone });
      // Si la base todavía no tiene alguna de las columnas nuevas, se guarda igual sin ella.
      if (error && /birth_date|city/i.test(error.message)) ({ error } = await supabase.from('profiles').upsert({ ...base, zone }));
      if (error) throw error;

      await useAuthStore.getState().refreshProfile();
      router.replace('/(auth)/terminos');
    } catch (e) {
      Alert.alert('Algo salió mal', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const ready = fullName.trim().length > 0 && bDay.length > 0 && bMonth.length > 0 && bYear.length === 4;
  const field = 'bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-2xl px-4 py-3.5 text-[16px] text-text-light dark:text-text-dark';

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="px-6 pt-20 pb-10 flex-grow justify-center" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" className="text-[26px] font-extrabold mb-1.5 text-text-light dark:text-text-dark">¿Cómo te llamás?</Text>
        <Text className="text-muted-light dark:text-muted-dark text-[14px] leading-5 mb-7">
          Con esto ya podés empezar a caminar. Tu barrio es opcional y el resto lo completás cuando quieras, desde Perfil.
        </Text>

        <Pressable accessibilityRole="button" accessibilityLabel={photoUri ? 'Cambiar foto de perfil' : 'Agregar foto de perfil, opcional'} onPress={pickPhoto} className="self-center mb-7">
          <View className="w-28 h-28 rounded-full bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark items-center justify-center">
            <View className="w-full h-full rounded-full overflow-hidden items-center justify-center">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-full h-full" />
              ) : (
                <Text className="text-aqua-deep dark:text-mint text-[34px] font-extrabold">{(fullName.trim()[0] ?? 'A').toUpperCase()}</Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-aqua-deep items-center justify-center border-2 border-bg-light dark:border-bg-dark">
              <Camera size={17} color="#fff" weight="fill" />
            </View>
          </View>
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] text-center mt-2">Foto (opcional)</Text>
        </Pressable>

        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mb-2 ml-1">Nombre</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Tu nombre"
          placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => undefined}
          className={`${field} mb-5`}
        />

        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mb-2 ml-1">Fecha de nacimiento</Text>
        <View className="flex-row gap-2.5 mb-2">
          <TextInput
            value={bDay}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, '').slice(0, 2);
              setBDay(v);
              if (v.length === 2) monthRef.current?.focus();
            }}
            placeholder="Día"
            placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
            accessibilityLabel="Día de nacimiento"
            keyboardType="number-pad"
            maxLength={2}
            className={`flex-1 text-center ${field}`}
            style={{ minWidth: 0 }}
          />
          <TextInput
            ref={monthRef}
            value={bMonth}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, '').slice(0, 2);
              setBMonth(v);
              if (v.length === 2) yearRef.current?.focus();
            }}
            placeholder="Mes"
            placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
            accessibilityLabel="Mes de nacimiento"
            keyboardType="number-pad"
            maxLength={2}
            className={`flex-1 text-center ${field}`}
            style={{ minWidth: 0 }}
          />
          <TextInput
            ref={yearRef}
            value={bYear}
            onChangeText={(t) => setBYear(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="Año"
            placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
            accessibilityLabel="Año de nacimiento"
            keyboardType="number-pad"
            maxLength={4}
            className={`flex-[1.4] text-center ${field}`}
            style={{ minWidth: 0 }}
          />
        </View>
        <Text className="text-muted-light dark:text-muted-dark text-[12.5px] leading-[18px] ml-1 mb-6">
          La usamos solo para confirmar que tenés 13 años o más. No se muestra a nadie.
        </Text>

        <View className="mb-6">
          <PlacePicker city={city} zone={zone} onChange={(c, z) => { setCity(c); setZone(z); }} />
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] leading-[18px] ml-1">
            Opcional. Te mostramos primero los comercios de tu barrio.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || loading }}
          onPress={handleContinue}
          disabled={loading}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: ready ? colors.aquaDeep : isDark ? colors.dark.line : colors.light.line }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`font-bold text-[16px] ${ready ? 'text-white' : 'text-muted-light dark:text-muted-dark'}`}>Empezar a caminar</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
