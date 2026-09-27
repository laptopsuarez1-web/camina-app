import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { ZONES, INTERESTS_OPTIONS } from '@/constants/catalog';
import { colors } from '@/theme/tokens';

type Step = 0 | 1 | 2 | 3;

export default function SignupScreen() {
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [interests, setInterests] = useState<Set<string>>(new Set());

  const hasSession = !!useAuthStore((s) => s.session);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
    return result;
  }

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Podés elegir tu zona manualmente.');
      return;
    }
    setZone('Centro');
  }

  function toggleInterest(name: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function createAccountAndContinue() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert(
        'Faltan datos',
        'Completá tu nombre, correo y una contraseña de al menos 6 caracteres.'
      );
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error || !data.session) {
      setLoading(false);
      Alert.alert(
        'No pudimos crear tu cuenta',
        error?.message ?? 'Revisá tu correo para confirmar la cuenta y volvé a entrar.'
      );
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.session.user.id, full_name: fullName.trim() });
    setLoading(false);
    if (profileError) {
      Alert.alert('No pudimos guardar tu perfil', profileError.message);
      return;
    }
    setStep(1);
  }

  async function finishSignup() {
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
        .update({
          zone,
          interests: [...interests],
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        })
        .eq('id', userId);
      if (error) throw error;

      await useAuthStore.getState().refreshProfile();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Algo salió mal', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const titles = ['Tu perfil', 'Ubicaciones', 'Tus gustos', '¡Listo!'];

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-6 pb-10">
      {step < 3 && (
        <>
          <View className="flex-row items-center gap-3 mb-5">
            <Pressable onPress={() => (step > 0 ? setStep((s) => (s - 1) as Step) : router.back())}>
              <Text className="text-muted-light dark:text-muted-dark text-lg">‹</Text>
            </Pressable>
            <View className="flex-1 h-1.5 bg-line-light dark:bg-line-dark rounded-full overflow-hidden">
              <View
                className="h-full bg-aqua rounded-full"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              />
            </View>
          </View>
          <Text className="text-xl font-bold mb-1 text-text-light dark:text-text-dark">
            {titles[step]}
          </Text>
        </>
      )}

      {step === 0 && (
        <View className="mt-4">
          <Text className="text-muted-light dark:text-muted-dark text-[13px] mb-6">
            Primero, contanos un poco de vos.
          </Text>
          <Pressable onPress={pickPhoto} className="self-center mb-4">
            <View className="w-24 h-24 rounded-full bg-card-light dark:bg-card-dark border-2 border-dashed border-mint items-center justify-center overflow-hidden">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-full h-full" />
              ) : (
                <Text className="text-muted-light dark:text-muted-dark">Foto</Text>
              )}
            </View>
          </Pressable>
          <Text className="font-semibold text-[13px] mb-2 text-text-light dark:text-text-dark">
            Nombre completo
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
            className="border border-line-light dark:border-line-dark rounded-sm px-3 py-3 mb-4 text-text-light dark:text-text-dark"
          />
          <Text className="font-semibold text-[13px] mb-2 text-text-light dark:text-text-dark">
            Correo electrónico
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            className="border border-line-light dark:border-line-dark rounded-sm px-3 py-3 mb-4 text-text-light dark:text-text-dark"
          />
          <Text className="font-semibold text-[13px] mb-2 text-text-light dark:text-text-dark">
            Contraseña
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            className="border border-line-light dark:border-line-dark rounded-sm px-3 py-3 mb-7 text-text-light dark:text-text-dark"
          />
          <Pressable
            onPress={createAccountAndContinue}
            disabled={loading}
            className="bg-auth-bg rounded-xl py-3.5 items-center"
          >
            {loading ? <ActivityIndicator color={colors.mint} /> : <Text className="text-mint font-semibold">Siguiente</Text>}
          </Pressable>
        </View>
      )}

      {step === 1 && (
        <View className="mt-4">
          <Text className="text-muted-light dark:text-muted-dark text-[13px] mb-6">
            Elegí tu zona para ver comercios cercanos.
          </Text>
          <Pressable
            onPress={useMyLocation}
            className="flex-row items-center gap-2 bg-purple-light-light dark:bg-purple-light-dark rounded-xl py-3.5 px-4 mb-5"
          >
            <Text className="text-purple font-semibold text-[13px]">Usar mi ubicación actual</Text>
          </Pressable>
          <View className="flex-row flex-wrap gap-2 mb-7">
            {ZONES.map((z) => (
              <Pressable
                key={z}
                onPress={() => setZone(z)}
                className="rounded-full px-3.5 py-2 border"
                style={{
                  backgroundColor: zone === z ? colors.authBg : 'transparent',
                  borderColor: zone === z ? colors.authBg : colors.light.line,
                }}
              >
                <Text style={{ color: zone === z ? colors.mint : colors.light.muted }} className="text-[13px] font-semibold">
                  {z}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => zone && setStep(2)}
            disabled={!zone}
            className="rounded-xl py-3.5 items-center"
            style={{ backgroundColor: zone ? colors.authBg : colors.light.line }}
          >
            <Text style={{ color: zone ? colors.mint : colors.light.muted }} className="font-semibold">
              Siguiente
            </Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View className="mt-4">
          <Text className="text-muted-light dark:text-muted-dark text-[13px] mb-5">
            Seleccioná lo que más te gusta.
          </Text>
          <View className="flex-row flex-wrap gap-2.5 mb-7">
            {INTERESTS_OPTIONS.map(([name]) => {
              const active = interests.has(name);
              return (
                <Pressable
                  key={name}
                  onPress={() => toggleInterest(name)}
                  className="rounded-2xl p-3.5 border"
                  style={{
                    width: '47%',
                    backgroundColor: active ? colors.light.aquaLight : colors.light.card,
                    borderColor: active ? colors.aqua : colors.light.line,
                  }}
                >
                  <Text
                    className="text-[12.5px] font-semibold"
                    style={{ color: active ? '#2E9E7C' : colors.light.text }}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => setStep(3)} className="bg-auth-bg rounded-xl py-3.5 items-center">
            <Text className="text-mint font-semibold">Siguiente</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View className="items-center pt-5">
          <Image
            source={require('@/../assets/icon.png')}
            style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 20 }}
          />
          <Text className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">¡Listo!</Text>
          <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center mb-6 max-w-[280px]">
            Ya casi estás. Confirmá tus datos y empezá a caminar.
          </Text>
          <View className="w-full bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-4 mb-7">
            <Text className="text-[13px] text-text-light dark:text-text-dark">
              <Text className="text-muted-light dark:text-muted-dark">Nombre: </Text>
              {fullName}
            </Text>
            <Text className="text-[13px] mt-2 text-text-light dark:text-text-dark">
              <Text className="text-muted-light dark:text-muted-dark">Zona: </Text>
              {zone ?? 'No definida'}, Tarija
            </Text>
            <Text className="text-[13px] mt-2 text-text-light dark:text-text-dark">
              <Text className="text-muted-light dark:text-muted-dark">Gustos: </Text>
              {interests.size ? [...interests].join(', ') : 'Sin definir'}
            </Text>
          </View>
          <Pressable
            onPress={finishSignup}
            disabled={loading || !hasSession}
            className="w-full bg-auth-bg rounded-xl py-3.5 items-center"
          >
            {loading ? <ActivityIndicator color={colors.mint} /> : <Text className="text-mint font-semibold">Comenzar</Text>}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
