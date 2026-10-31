import { useEffect, useState, type Ref } from 'react';
import { Keyboard, Platform, View, Image, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { Instagram, Clock, CheckCircle2, X, Star, Camera } from '@/components/icons';
import { colors } from '@/theme/tokens';
import type { StoryState } from '@/lib/story';

// Historias de Instagram por un canje: la persona sube una foto de lo que canjeó, etiqueta a Camina
// y, cuando el equipo la ve, se le acreditan STORY_REWARD Puntos. La acreditación es manual (panel).
export const STORY_REWARD = 5;
export const CAMINA_INSTAGRAM = '@caminaapp';

export type { StoryState };

// Logo de Instagram: el cuadrado redondeado con su degradé de siempre y la cámara blanca adentro. Solo el logo, sin marco.
function InstagramLogo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Defs>
        <SvgGradient id="ig" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#FEDA77" />
          <Stop offset="0.35" stopColor="#F58529" />
          <Stop offset="0.6" stopColor="#DD2A7B" />
          <Stop offset="1" stopColor="#8134AF" />
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width="24" height="24" rx="6.5" fill="url(#ig)" />
      <Rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.5" />
      <Circle cx="16.1" cy="7.9" r="0.95" fill="#fff" />
    </Svg>
  );
}

// Botón debajo de cada canje confirmado (Inicio > Tus canjes), y su estado después de subir la historia.
export function StoryRewardButton({ state, onPress }: { state: StoryState; onPress?: () => void }) {
  const dark = useColorScheme().colorScheme === 'dark';
  if (state === 'available' || state === 'rejected') {
    return (
      <View style={{ gap: 6 }}>
        {state === 'rejected' ? (
          <Text className="text-[12px] text-center text-warn-deep dark:text-warn-soft">No encontramos tu historia. Puedes volver a subirla.</Text>
        ) : null}
        <Press
          accessibilityRole="button"
          accessibilityLabel={`Subir historia y ganar ${STORY_REWARD} Puntos`}
          onPress={onPress}
          className="bg-aqua-light-light dark:bg-aqua-light-dark rounded-xl flex-row items-center justify-center"
          style={{ gap: 6, paddingVertical: 8 }}
        >
          <Instagram size={14} color={dark ? colors.mint : colors.aquaInk} weight="bold" />
          <Text className="text-aqua-ink dark:text-mint font-bold text-[12.5px]">Subir historia y gana</Text>
          <Coin size={15} />
          <Text className="text-aqua-ink dark:text-mint font-extrabold text-[12.5px]">{STORY_REWARD}</Text>
        </Press>
      </View>
    );
  }
  if (state === 'pending') {
    return (
      <View
        className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl flex-row items-center justify-center"
        style={{ gap: 7, paddingVertical: 10, paddingHorizontal: 12 }}
      >
        <Clock size={15} color={dark ? colors.purpleSoft : colors.purpleInk} weight="bold" />
        <Text className="text-purple-ink dark:text-purple-soft font-semibold text-[12.5px]">Historia en revisión · te avisamos</Text>
      </View>
    );
  }
  return (
    <View className="bg-aqua-light-light dark:bg-aqua-light-dark rounded-2xl flex-row items-center justify-center" style={{ gap: 7, paddingVertical: 10 }}>
      <CheckCircle2 size={15} color={dark ? colors.mint : colors.aquaInk} weight="fill" />
      <Text className="text-aqua-ink dark:text-mint font-bold text-[12.5px]">Te acreditamos</Text>
      <Coin size={15} />
      <Text className="text-aqua-ink dark:text-mint font-extrabold text-[12.5px]">{STORY_REWARD} por tu historia</Text>
    </View>
  );
}

// Pasos del final de un canje confirmado, uno por pantalla: compra extra, reseña opcional en Google Maps e invitación a la historia.
export function FollowupQuestion({ businessName, onAnswer }: { businessName: string; onAnswer: (extra: boolean) => void }) {
  return (
    <View className="w-full items-center">
      <Text className="text-[16px] font-bold text-text-light dark:text-text-dark mb-1 text-center">¿Canjeaste algo más en el local?</Text>
      <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-4 text-center">Nos ayuda a mostrarle a {businessName} lo que Camina le suma.</Text>
      <View className="flex-row gap-2.5 w-full">
        <Press accessibilityRole="button" onPress={() => onAnswer(true)} className="flex-1 bg-aqua-deep rounded-2xl py-3.5 items-center">
          <Text className="text-white font-bold text-[14px]">Sí, algo más</Text>
        </Press>
        <Press accessibilityRole="button" onPress={() => onAnswer(false)} className="flex-1 bg-purple-light-light dark:bg-purple-light-dark rounded-2xl py-3.5 items-center">
          <Text className="text-purple-ink dark:text-purple-soft font-semibold text-[14px]">No, solo esto</Text>
        </Press>
      </View>
    </View>
  );
}

export function ReviewStep({ businessName, onReview, onSkip }: { businessName: string; onReview: () => void; onSkip: () => void }) {
  return (
    <View className="w-full">
      <View className="rounded-3xl px-5 py-5 items-center" style={{ backgroundColor: '#FFF3D1' }}>
        <View className="items-center justify-center rounded-full mb-2.5" style={{ width: 46, height: 46, backgroundColor: '#FFE08A' }}>
          <Star size={24} color="#C98A0B" weight="fill" />
        </View>
        <Text className="text-[16px] font-bold text-center" style={{ color: '#5E4205' }}>¿Dejarías una reseña en Google Maps?</Text>
        <Text className="text-[12.5px] text-center mt-1 mb-4" style={{ color: '#6B4C08' }}>Es opcional. A {businessName} le ayuda mucho.</Text>
        <Press accessibilityRole="link" onPress={onReview} className="w-full rounded-2xl py-3 items-center" style={{ backgroundColor: '#8F6307' }}>
          <Text className="text-white font-bold text-[14px]">Dejar reseña</Text>
        </Press>
      </View>
      <Press accessibilityRole="button" onPress={onSkip} className="items-center py-3.5 mt-1">
        <Text className="text-muted-light dark:text-muted-dark font-semibold text-[14px]">Ahora no</Text>
      </Press>
    </View>
  );
}

export function StoryStep({ onStory, onSkip }: { onStory: () => void; onSkip: () => void }) {
  return (
    <View className="w-full">
      <Glass className="rounded-3xl" style={{ paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' }}>
        <View className="flex-row items-center mb-1.5" style={{ gap: 6 }}>
          <Instagram size={18} color={colors.purple} weight="bold" />
          <Text className="text-[16px] font-bold text-text-light dark:text-text-dark">Sube una historia y gana</Text>
          <Coin size={18} />
          <Text className="text-[16px] font-extrabold text-text-light dark:text-text-dark">{STORY_REWARD}</Text>
        </View>
        <Text className="text-[12.5px] text-muted-light dark:text-muted-dark text-center mb-4" style={{ lineHeight: 18 }}>
          Sácale una foto a lo que canjeaste, súbela a tu historia y etiqueta a {CAMINA_INSTAGRAM}.
        </Text>
        <Press accessibilityRole="button" onPress={onStory} className="w-full bg-aqua-deep rounded-2xl py-3 flex-row items-center justify-center" style={{ gap: 7 }}>
          <Camera size={16} color="#fff" weight="bold" />
          <Text className="text-white font-bold text-[14px]">Sacar o elegir foto</Text>
        </Press>
      </Glass>
      <Press accessibilityRole="button" onPress={onSkip} className="items-center py-3.5 mt-1">
        <Text className="text-muted-light dark:text-muted-dark font-semibold text-[14px]">Ahora no</Text>
      </Press>
    </View>
  );
}

// Pantalla completa con la foto en formato historia (9:16), sin textos encima, lista para publicar.
export function StoryComposer({
  photo,
  businessName,
  benefitName,
  onClose,
  onPublish,
  onChangePhoto,
  topInset = 0,
  shotRef,
  busy,
}: {
  photo: ImageSourcePropType;
  // Vista que se captura como imagen (foto + sticker) para compartir y subir.
  shotRef?: Ref<View>;
  busy?: boolean;
  businessName: string;
  benefitName: string;
  onClose: () => void;
  onPublish: () => void;
  onChangePhoto: () => void;
  topInset?: number;
}) {
  return (
    <View className="flex-1" style={{ backgroundColor: '#120A1E', paddingTop: topInset + 8 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Press accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <X size={16} color="#fff" weight="bold" />
        </Press>
        <Text accessibilityRole="header" className="text-white font-bold text-[16px]">Tu historia</Text>
        <View style={{ width: 36 }} />
      </View>

      <View className="flex-1 px-6 items-center">
        {/* Así se va a ver en Instagram: foto limpia a pantalla completa, sin textos encima. */}
        <View ref={shotRef} collapsable={false} style={{ flex: 1, aspectRatio: 9 / 16, maxWidth: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' }}>
          <Image source={photo} accessibilityLabel="Tu foto" resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} />
        </View>
      </View>

      <View className="px-5 pt-4 pb-8" style={{ gap: 10 }}>
        <Text className="text-center text-[12.5px]" style={{ color: '#C4B8E8', lineHeight: 18 }}>
          Publícala en tu historia y etiquetá a <Text style={{ color: '#fff', fontWeight: '800' }}>{CAMINA_INSTAGRAM}</Text>. Cuando la veamos, te acreditamos {STORY_REWARD} Puntos.
        </Text>
        <Press accessibilityRole="button" accessibilityState={{ busy: !!busy }} disabled={busy} onPress={onPublish} className="rounded-2xl py-4 flex-row items-center justify-center" style={{ gap: 8, backgroundColor: colors.aquaDeep, opacity: busy ? 0.7 : 1 }}>
          <Instagram size={18} color="#fff" weight="bold" />
          <Text className="text-white font-bold text-[15px]">Publicar en Instagram</Text>
        </Press>
        <Press accessibilityRole="button" onPress={onChangePhoto} className="py-2 items-center">
          <Text className="text-[13.5px] font-semibold" style={{ color: '#C4B8E8' }}>Cambiar foto</Text>
        </Press>
      </View>
    </View>
  );
}

// Al volver de Instagram: confirmar que la subió y con qué usuario, para encontrarla.
export function StoryConfirmSheet({
  handle,
  onChangeHandle,
  onConfirm,
  onLater,
  busy,
}: {
  handle: string;
  busy?: boolean;
  onChangeHandle: (v: string) => void;
  onConfirm: () => void;
  onLater: () => void;
}) {
  const dark = useColorScheme().colorScheme === 'dark';
  // Con el teclado abierto la hoja se compacta (sin el ícono grande ni el aire de abajo) para que el campo y el botón queden bien a la vista.
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <View className={`bg-card-light dark:bg-card-dark rounded-t-[32px] px-6 pt-3 ${kb ? 'pb-4' : 'pb-10'}`}>
      <View className={`w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center ${kb ? 'mb-3' : 'mb-5'}`} />
      <View className="items-center mb-4">
        {!kb && (
          <View className="mb-3">
            <InstagramLogo />
          </View>
        )}
        <Text accessibilityRole="header" className="text-[17px] font-extrabold text-text-light dark:text-text-dark">¿Ya subiste la historia?</Text>
        <Text className="text-[12.5px] text-center text-muted-light dark:text-muted-dark mt-1" style={{ lineHeight: 18 }}>
          Dinos tu usuario de Instagram para encontrarla. Acuérdate de etiquetar a {CAMINA_INSTAGRAM}.
        </Text>
      </View>
      <View className="flex-row items-center bg-bg-light dark:bg-bg-dark rounded-2xl border border-line-light dark:border-line-dark px-4 mb-4" style={{ height: 52 }}>
        <Text className="text-[15px] font-bold text-muted-light dark:text-muted-dark mr-1">@</Text>
        <TextInput
          value={handle}
          onChangeText={onChangeHandle}
          placeholder="tu.usuario"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => { if (handle.trim() && !busy) onConfirm(); }}
          accessibilityLabel="Tu usuario de Instagram"
          className="flex-1 text-[15px] text-text-light dark:text-text-dark"
          placeholderTextColor={dark ? colors.dark.muted : colors.light.muted}
        />
      </View>
      <Press accessibilityRole="button" accessibilityState={{ busy: !!busy, disabled: !handle.trim() }} onPress={onConfirm} disabled={!handle.trim() || busy} className="bg-aqua-deep rounded-2xl py-4 items-center mb-2.5" style={{ opacity: handle.trim() && !busy ? 1 : 0.5 }}>
        <Text className="text-white font-bold text-[15px]">{busy ? 'Enviando…' : 'Sí, ya la sube'}</Text>
      </Press>
      <Press accessibilityRole="button" onPress={onLater} className="py-2 items-center">
        <Text className="text-[13.5px] font-semibold text-muted-light dark:text-muted-dark">Todavía no</Text>
      </Press>
    </View>
  );
}

// Después de confirmar: queda pendiente hasta que el equipo de Camina la apruebe.
export function StoryPendingSheet({ onDone }: { onDone: () => void }) {
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <View className="bg-card-light dark:bg-card-dark rounded-t-[32px] px-6 pt-3 pb-10">
      <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-5" />
      <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-3xl py-6 px-5 items-center mb-4">
        <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: dark ? 'rgba(201,173,245,0.16)' : '#fff' }}>
          <Clock size={30} color={dark ? colors.purpleSoft : colors.purpleInk} weight="bold" />
        </View>
        <Text accessibilityLiveRegion="polite" className="text-[17px] font-extrabold text-text-light dark:text-text-dark">¡Gracias! La estamos revisando</Text>
        <View className="flex-row items-center flex-wrap justify-center mt-1.5" style={{ gap: 4 }}>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark text-center">Cuando confirmemos tu historia te acreditamos</Text>
          <Coin size={14} />
          <Text className="text-[12.5px] font-bold text-text-light dark:text-text-dark">{STORY_REWARD} Puntos.</Text>
        </View>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark text-center mt-2">Te avisamos con una notificación.</Text>
      </View>
      <Press accessibilityRole="button" onPress={onDone} className="bg-aqua-deep rounded-2xl py-4 items-center">
        <Text className="text-white font-bold text-[15px]">Listo</Text>
      </Press>
    </View>
  );
}
