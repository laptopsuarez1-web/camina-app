import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

// Único paso obligatorio después de crear la cuenta. Zona e intereses ya no
// están acá: zona se pregunta en Canjes la primera vez que hace falta, e
// intereses quedó como sección opcional editable en Perfil (tab).
export default function CompletarPerfilScreen() {
  const [fullName, setFullName] = useState('');
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
    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Sesión inválida');

      let photoUrl: string | undefined;
      if (photoUri) {
        const base64 = await fetch(photoUri)
          .then((r) => r.blob())
          .then(
            (blob) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              })
          );
        const path = `${userId}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, full_name: fullName.trim(), ...(photoUrl ? { photo_url: photoUrl } : {}) });
      if (error) throw error;

      await useAuthStore.getState().refreshProfile();
      router.replace('/(tabs)');
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
        className="border border-line-light dark:border-line-dark rounded-xl px-4 py-3.5 mb-7 text-[15px] text-text-light dark:text-text-dark"
      />

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
