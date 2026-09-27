import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

// Onboarding + login + signup fusionados en una sola pantalla: antes eran
// 3 slides de intro + login + 4 pasos de signup (8 pantallas) antes de que
// alguien viera un solo Punto. "Zona" se pregunta después, la primera vez que
// se abre Canjes; "Intereses" queda como algo opcional editable en Perfil.
type Mode = 'intro' | 'auth';
type AuthKind = 'login' | 'signup';

export default function WelcomeScreen() {
  const [mode, setMode] = useState<Mode>('intro');
  const [authKind, setAuthKind] = useState<AuthKind>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function comingSoon() {
    Alert.alert('Muy pronto', 'El acceso con esta cuenta todavía no está disponible — usá tu email por ahora.');
  }

  async function afterAuth() {
    await useAuthStore.getState().refreshProfile();
    const profile = useAuthStore.getState().profile;
    router.replace(profile?.full_name?.trim() ? '/(tabs)' : '/(auth)/perfil');
  }

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Faltan datos', 'Ingresá tu correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error } =
      authKind === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert(authKind === 'login' ? 'No pudimos iniciar sesión' : 'No pudimos crear tu cuenta', error.message);
      return;
    }
    if (authKind === 'signup' && !data.session) {
      Alert.alert('Revisá tu correo', 'Te mandamos un link para confirmar la cuenta. Volvé a entrar después de confirmar.');
      return;
    }
    await afterAuth();
  }

  return (
    <LinearGradient
      colors={['#3a2668', '#1c1030', '#120a1e']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(127,237,196,0.14)', top: -80, right: -70 }} />
      <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(139,79,209,0.20)', bottom: 140, left: -90 }} />

      {mode === 'intro' ? (
        <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 56 }}>
          <View />
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
              }}
            >
              <Image source={require('@/../assets/icon.png')} style={{ width: 64, height: 64, borderRadius: 16 }} />
            </View>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center', lineHeight: 36 }}>
              Caminá.{'\n'}Ganá Puntos.
            </Text>
            <Text style={{ color: '#B9AEDC', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280, marginTop: 10 }}>
              Cada 1000 pasos suman un Punto. Canjealos en los comercios de Tarija que ya conocés.
            </Text>
          </View>

          <View>
            <Pressable
              onPress={comingSoon}
              style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15, marginBottom: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#141019', fontWeight: '600', fontSize: 15 }}>Continuar con Google</Text>
            </Pressable>
            <Pressable
              onPress={comingSoon}
              style={{
                backgroundColor: '#000',
                borderRadius: 16,
                paddingVertical: 15,
                marginBottom: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Continuar con Apple</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <Text style={{ color: '#7A6E9C', fontSize: 12 }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            </View>

            <Pressable
              onPress={() => {
                setAuthKind('signup');
                setMode('auth');
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ color: '#E4DBFA', fontWeight: '600', fontSize: 14 }}>Continuar con email</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAuthKind('login');
                setMode('auth');
              }}
            >
              <Text style={{ color: '#8C7DB8', fontSize: 12.5, textAlign: 'center' }}>¿Ya tenés cuenta? Iniciar sesión</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          <Pressable onPress={() => setMode('intro')} style={{ position: 'absolute', top: 56, left: 24 }}>
            <Text style={{ color: '#B9AEDC', fontSize: 14 }}>‹ Volver</Text>
          </Pressable>

          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 }}>
            {authKind === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
          </Text>
          <Text style={{ color: '#B9AEDC', fontSize: 13, marginBottom: 24 }}>
            {authKind === 'login' ? 'Volvé a caminar por tus Puntos.' : 'Solo tu email y una contraseña — el resto lo completás después.'}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor="#6E6291"
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 14, marginBottom: 10, fontSize: 14 }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor="#6E6291"
            secureTextEntry
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 14, marginBottom: 20, fontSize: 14 }}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: '#7FEDC4', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 14 }}
          >
            {loading ? (
              <ActivityIndicator color={colors.mintDark} />
            ) : (
              <Text style={{ color: '#12281F', fontWeight: '700', fontSize: 15 }}>
                {authKind === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setAuthKind(authKind === 'login' ? 'signup' : 'login')}>
            <Text style={{ color: '#8C7DB8', fontSize: 12.5, textAlign: 'center' }}>
              {authKind === 'login' ? '¿Sos nuevo? Crear cuenta' : '¿Ya tenés cuenta? Iniciar sesión'}
            </Text>
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}
