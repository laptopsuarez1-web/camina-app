import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Ingresá tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('No pudimos iniciar sesión', error.message);
    // index.tsx redirige solo apenas useAuthStore recibe la sesión.
  }

  return (
    <View className="flex-1 bg-auth-bg px-6 justify-center items-center">
      <Image
        source={require('@/../assets/icon.png')}
        style={{ width: 84, height: 84, borderRadius: 42 }}
      />
      <Text className="text-white text-2xl font-bold mt-5 mb-1.5">¡Bienvenido!</Text>
      <Text className="text-auth-muted text-center text-[13px] leading-5 mb-8 max-w-[260px]">
        Comenzá tu camino. Registrate o iniciá sesión para seguir.
      </Text>

      <View className="w-full max-w-[320px] gap-2.5">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-white/95 rounded-xl px-3.5 py-3.5 text-[13.5px]"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          className="bg-white/95 rounded-xl px-3.5 py-3.5 text-[13.5px]"
        />
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="bg-mint rounded-xl py-3.5 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color={colors.mintDark} />
          ) : (
            <Text className="text-mint-dark font-semibold text-sm">Iniciar sesión</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/signup')} className="mt-1.5">
          <Text className="text-auth-muted text-xs text-center">
            ¿Todavía no tenés cuenta? Crear cuenta
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
