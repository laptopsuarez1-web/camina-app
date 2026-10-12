import { useState } from 'react';
import { View, Modal, Linking } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { IconBubble, Instagram, FacebookIcon, TiktokIcon, ChevronRight, Check, Storefront, Users } from '@/components/icons';
import { colors } from '@/theme/tokens';
import { SOCIAL_NETWORKS, SOCIAL_FOLLOW_POINTS, BUSINESS_SIGNUP_URL, type SocialNetwork, type SocialNetworkId } from '@/constants/social';
import { buzz } from '@/lib/haptics';

const ICONS = { instagram: Instagram, facebook: FacebookIcon, tiktok: TiktokIcon } as const;

type FollowState = 'idle' | 'opened' | 'done';

// BOCETO: estado inicial forzado desde el navegador para las capturas. Se saca al implementar.
const preview = (globalThis as { __CAMINA_PREVIEW__?: { hideNew?: boolean; sheet?: boolean; states?: Partial<Record<SocialNetworkId, FollowState>>; networks?: SocialNetwork[]; businessTitle?: string } }).__CAMINA_PREVIEW__;

function NetworkRow({ network, state, onFollow, onConfirm, last }: { network: SocialNetwork; state: FollowState; onFollow: () => void; onConfirm: () => void; last?: boolean }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  const Icon = ICONS[network.id];
  return (
    <View className={`p-3.5 ${last ? '' : 'border-b border-line-light dark:border-line-dark'}`}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <IconBubble icon={Icon} tone="purple" size={40} />
        <View className="flex-1">
          <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark">{network.name}</Text>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">{network.handle}</Text>
        </View>
        {state === 'done' ? (
          <View className="flex-row items-center px-3 py-2 rounded-full bg-purple-light-light dark:bg-purple-light-dark" style={{ gap: 5 }}>
            <Check size={12} color={isDark ? colors.mint : colors.aquaInk} />
            <Text className="text-[12px] font-semibold text-aqua-ink dark:text-mint">Siguiendo</Text>
          </View>
        ) : (
          <Press accessibilityRole="link" accessibilityLabel={`Seguir a Camina en ${network.name}`} onPress={onFollow} hitSlop={8} className={`px-3.5 py-2 rounded-full ${state === 'opened' ? 'bg-purple-light-light dark:bg-purple-light-dark' : 'bg-aqua-deep'}`}>
            <Text className={`text-[12px] font-semibold ${state === 'opened' ? 'text-purple-ink dark:text-purple-soft' : 'text-white'}`}>{state === 'opened' ? 'Abrir' : 'Seguir'}</Text>
          </Press>
        )}
      </View>
      {state === 'opened' && (
        <View className="mt-3 rounded-2xl p-3 bg-purple-light-light dark:bg-purple-light-dark">
          <Text className="text-[13px] text-text-light dark:text-text-dark">¿Ya nos seguís en {network.name}?</Text>
          <Press accessibilityRole="button" onPress={onConfirm} className="flex-row items-center justify-center rounded-full py-2.5 mt-2.5 bg-purple-deep" style={{ gap: 6 }}>
            <Text className="text-[13.5px] font-semibold text-white">Ya te sigo · sumar {SOCIAL_FOLLOW_POINTS} Punto</Text>
          </Press>
        </View>
      )}
      {state === 'done' && (
        <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2 ml-[52px]">Sumaste {SOCIAL_FOLLOW_POINTS} Punto. ¡Gracias por seguirnos!</Text>
      )}
    </View>
  );
}

export function SocialRow() {
  const isDark = useColorScheme().colorScheme === 'dark';
  const networks = preview?.networks ?? SOCIAL_NETWORKS;
  const [open, setOpen] = useState(preview?.sheet ?? false);
  const [states, setStates] = useState<Partial<Record<SocialNetworkId, FollowState>>>(preview?.states ?? {});
  const pending = networks.filter((n) => states[n.id] !== 'done').length;
  if (preview?.hideNew) return null;

  function follow(n: SocialNetwork) {
    Linking.openURL(n.url);
    setStates((s) => ({ ...s, [n.id]: 'opened' }));
  }
  function confirm(n: SocialNetwork) {
    buzz.success();
    setStates((s) => ({ ...s, [n.id]: 'done' }));
  }

  return (
    <>
      <Glass className="rounded-2xl overflow-hidden mb-3">
        <Press
          accessibilityRole="button"
          accessibilityLabel={`Redes sociales${pending > 0 ? `: ganá ${SOCIAL_FOLLOW_POINTS} Punto por red` : ''}`}
          onPress={() => setOpen(true)}
          className="flex-row items-center justify-between p-3.5"
        >
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <IconBubble icon={Instagram} tone="purple" size={34} />
            <Text className="text-[14px] text-text-light dark:text-text-dark">Redes sociales</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {pending > 0 && (
              <View className="px-2.5 py-1 rounded-full bg-purple-light-light dark:bg-purple-light-dark">
                <Text className="text-[11.5px] font-semibold text-purple-ink dark:text-purple-soft">+{SOCIAL_FOLLOW_POINTS} Punto</Text>
              </View>
            )}
            <ChevronRight size={14} color={isDark ? colors.dark.muted : colors.light.muted} />
          </View>
        </Press>
      </Glass>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Press accessibilityRole="button" accessibilityLabel="Cerrar redes sociales" style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.45)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: isDark ? '#1B1530' : '#F4F0FF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-1">
            <Text accessibilityRole="header" className="font-bold text-[17px] text-text-light dark:text-text-dark ml-1">Redes sociales</Text>
            <Press accessibilityRole="button" hitSlop={10} onPress={() => setOpen(false)}>
              <Text className="text-[14px] font-semibold text-aqua-ink dark:text-aqua">Listo</Text>
            </Press>
          </View>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark ml-1 mb-3">Seguinos y sumá {SOCIAL_FOLLOW_POINTS} Punto por cada red.</Text>
          <Glass className="rounded-2xl overflow-hidden">
            {networks.map((n, i) => (
              <NetworkRow key={n.id} network={n} state={states[n.id] ?? 'idle'} onFollow={() => follow(n)} onConfirm={() => confirm(n)} last={i === networks.length - 1} />
            ))}
          </Glass>
        </View>
      </Modal>
    </>
  );
}

export function BusinessCard() {
  const title = preview?.businessTitle ?? '¿Tenés un comercio?';
  const asCommunity = title.startsWith('¿Querés');
  if (preview?.hideNew) return null;
  return (
    <Glass className="rounded-3xl p-4 mb-3">
      <View className="flex-row items-center" style={{ gap: 14 }}>
        <IconBubble icon={asCommunity ? Users : Storefront} tone="gold" size={46} />
        <View className="flex-1">
          <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">{title}</Text>
          <Text className="text-muted-light dark:text-muted-dark text-xs mt-0.5">
            {asCommunity ? 'Sumá tu comercio y llegá a la gente que camina en Tarija.' : 'Sumalo a Camina y recibí clientes que llegan caminando.'}
          </Text>
        </View>
      </View>
      <Press accessibilityRole="link" onPress={() => Linking.openURL(BUSINESS_SIGNUP_URL)} className="flex-row items-center justify-center rounded-full py-3 mt-3 bg-purple-light-light dark:bg-purple-light-dark">
        <Text className="text-[13.5px] font-semibold text-purple-ink dark:text-purple-soft">Conocé más en caminaapp.com</Text>
      </Press>
    </Glass>
  );
}
