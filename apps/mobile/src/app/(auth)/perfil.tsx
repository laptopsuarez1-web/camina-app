import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@/lib/avatar';
import { birthToISO, ageFromISO, MIN_AGE } from '@/lib/age';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

// Único paso obligatorio después de crear la cuenta. Zona e intereses ya no
// están acá: zona se pregunta en Canjes la primera vez que hace falta, e
// intereses quedó como sección opcional editable en Perfil (tab).
export default function CompletarPerfilScreen() {
  const [fullName, setFullName] = useState('');
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Camina es para mayores de 13 años', 'Por ahora no podés usar la app. ¡Te esperamos cuando cumplas 13!');
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
      let { error } = await supabase.from('profiles').upsert({ ...base, birth_date: birth });
      // Si la base todavía no tiene la columna de fecha de nacimiento, se guarda igual sin ella.
      if (error && /birth_date/i.test(error.message)) ({ error } = await supabase.from('profiles').upsert(base));
      if (error) throw error;

      await useAuthStore.getState().refreshProfile();
      router.replace('/(auth)/terminos');
    } catch (e) {
      Alert.alert('Algo salió mal', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark px-6 justify-center">
      <Text className="text-xl font-bold mb-1.5 text-text-light dark:text-text-dark">¿Cómo te llamás?</Text>
      <Text className="text-muted-light dark:text-muted-dark text-[13px] mb-7">
        Con esto ya podés empezar a caminar — el resto lo completás cuando quieras, desde Perfil.
      </Text>

      <Pressable onPress={pickPhoto} className="self-center mb-6">
        <View className="w-24 h-24 rounded-full bg-card-light dark:bg-card-dark border-2 border-dashed border-mint items-center justify-center overflow-hidden">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="w-full h-full" />
          ) : (
            <Text className="text-muted-light dark:text-muted-dark text-xs">Foto{'\n'}(opcional)</Text>
          )}
        </View>
      </Pressable>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Tu nombre"
        autoFocus
        className="border border-line-light dark:border-line-dark rounded-xl px-4 py-3.5 mb-4 text-[15px] text-text-light dark:text-text-dark"
      />

      <Text className="text-muted-light dark:text-muted-dark text-[12.5px] mb-2">Fecha de nacimiento</Text>
      <View className="flex-row gap-2.5 mb-2">
        <TextInput value={bDay} onChangeText={(t) => setBDay(t.replace(/\D/g, '').slice(0, 2))} placeholder="Día" keyboardType="number-pad" maxLength={2}
          className="flex-1 border border-line-light dark:border-line-dark rounded-xl px-4 py-3.5 text-[15px] text-text-light dark:text-text-dark text-center" />
        <TextInput value={bMonth} onChangeText={(t) => setBMonth(t.replace(/\D/g, '').slice(0, 2))} placeholder="Mes" keyboardType="number-pad" maxLength={2}
          className="flex-1 border border-line-light dark:border-line-dark rounded-xl px-4 py-3.5 text-[15px] text-text-light dark:text-text-dark text-center" />
        <TextInput value={bYear} onChangeText={(t) => setBYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Año" keyboardType="number-pad" maxLength={4}
          className="flex-[1.4] border border-line-light dark:border-line-dark rounded-xl px-4 py-3.5 text-[15px] text-text-light dark:text-text-dark text-center" />
      </View>
      <Text className="text-muted-light dark:text-muted-dark text-[11px] mb-7">
        La usamos solo para confirmar que tenés 13 años o más. No se muestra a nadie.
      </Text>

      <Pressable
        onPress={handleContinue}
        disabled={loading}
        className="bg-auth-bg rounded-2xl py-4 items-center"
      >
        {loading ? <ActivityIndicator color={colors.mint} /> : <Text className="text-mint font-semibold text-[15px]">Empezar a caminar</Text>}
      </Pressable>
    </View>
  );
}
