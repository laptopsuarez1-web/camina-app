import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { DarkHeader } from '@/components/ui/DarkHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { PersonAvatar } from '@/components/friends/PersonAvatar';
import { ChevronLeft, DotsThree, Check, X } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { useFriendCard, useFriendActions } from '@/hooks/useFriends';
import { REPORT_REASONS, reportContent, useBlocks } from '@/hooks/useModeration';
import { buildDayCells, compactSteps, WEEK_LABELS, type DayCell } from '@/lib/friend-week';
import { localDay } from '@/lib/format';
import { friendlyServerError } from '@/lib/errors';
import { useAuthStore } from '@/store/useAuthStore';
import { celebrate } from '@/store/useCelebrationStore';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Círculo de un día: verde con tilde = llegó a la meta, rojo = abrió la app y no llegó, gris = no abrió la app, vacío = todavía no.
function DayDot({ cell, size }: { cell: DayCell; size: number }) {
  const { dark, line } = useThemeColors();
  const fill = cell.state === 'met' ? colors.aquaDeep : cell.state === 'miss' ? (dark ? 'rgba(255,131,136,0.28)' : '#FBDADB') : cell.state === 'idle' ? (dark ? 'rgba(255,255,255,0.12)' : '#E7E1F0') : 'transparent';
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderWidth: cell.state === 'none' ? 1.5 : 0, borderColor: cell.isToday ? colors.aqua : line, alignItems: 'center', justifyContent: 'center' }}
    >
      {cell.state === 'met' ? <Check size={Math.round(size * 0.42)} color="#fff" /> : cell.state === 'miss' ? <X size={Math.round(size * 0.36)} color={dark ? colors.dangerSoft : colors.dangerInk} /> : null}
    </View>
  );
}

const STATE_TEXT: Record<DayCell['state'], string> = { met: 'llegó a la meta', miss: 'no llegó a la meta', idle: 'no abrió la app', none: 'sin datos' };

export default function FriendProfileScreen() {
  const tabSpace = useTabBarSpace();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: card, isLoading, isError, refetch } = useFriendCard(userId);
  const { send, respond, remove } = useFriendActions();
  const blocks = useBlocks();
  const meId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);
  // Ya son amigos (acepté yo, o la otra persona ya me había pedido): escena corta con los dos.
  const friendsNow = () => {
    if (!meId || !card) return;
    celebrate({
      kind: 'friend-made',
      me: { id: meId, name: profile?.full_name ?? 'Tú', photoUrl: profile?.photo_url ?? null },
      friend: { id: userId!, name: card.full_name, photoUrl: card.photo_url },
      onCreateGroup: () => router.push({ pathname: '/(tabs)/grupos/nuevo', params: { friend: userId! } }),
      onRanking: () => router.push({ pathname: '/(tabs)/ranking', params: { view: 'amigos' } }),
    });
  };
  const { text, muted, line } = useThemeColors();
  const [span, setSpan] = useState<'semana' | 'mes'>('semana');
  const [menu, setMenu] = useState(false);
  const [reasons, setReasons] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const fail = (title: string) => (e: unknown) => Alert.alert(title, friendlyServerError(e, 'Intenta de nuevo.'));

  const isSelf = card?.relation === 'self';
  const isFriend = card?.relation === 'friend';
  const showData = isSelf || isFriend;
  const cells = buildDayCells(card?.days ?? [], localDay(), span === 'semana' ? 1 : 5);

  function confirmRemove() {
    Alert.alert(`¿Quitar a ${card?.full_name}?`, 'Dejan de ver los pasos del otro. No le avisamos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => remove.mutate(userId!, { onSuccess: back, onError: fail('No se pudo quitar') }) },
    ]);
  }
  function confirmBlock() {
    Alert.alert(`¿Bloquear a ${card?.full_name}?`, 'Deja de ser tu amigo, no vas a ver sus mensajes ni va a poder mandarte solicitudes.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => blocks.block.mutate(userId!, { onSuccess: back, onError: fail('No se pudo bloquear') }) },
    ]);
  }

  const menuActions: SheetAction[] = [
    ...(isFriend ? [{ label: 'Crear grupo juntos', onPress: () => router.push({ pathname: '/(tabs)/grupos/nuevo', params: { friend: userId } }) }] : []),
    ...(isFriend ? [{ label: 'Quitar amigo', danger: true, onPress: confirmRemove }] : []),
    { label: 'Reportar', danger: true, onPress: () => setReasons(true) },
    { label: 'Bloquear', danger: true, onPress: confirmBlock },
  ];
  const reasonActions: SheetAction[] = REPORT_REASONS.map((r) => ({
    label: r.label,
    danger: true,
    onPress: async () => {
      try {
        await reportContent('user', userId!, null, r.key);
        Alert.alert('Gracias', 'Recibimos tu reporte. Lo revisamos y, si corresponde, actuamos.');
      } catch (e) {
        Alert.alert('No se pudo enviar', friendlyServerError(e, 'Intenta de nuevo.'));
      }
    },
  }));

  const since = card?.friends_since ? new Date(card.friends_since).toLocaleDateString('es-BO', { day: 'numeric', month: 'long' }) : null;

  if (!isLoading && !isError && !card) {
    return (
      <View className="flex-1 px-5 justify-center">
        <EmptyState title="Esta persona no está disponible" text="Puede que ya no esté en Camina o que haya un bloqueo entre ustedes." actionLabel="Volver" onAction={back} />
      </View>
    );
  }
  if (isError && !card) {
    return (
      <View className="flex-1 px-5 justify-center">
        <EmptyState mascot="confundido" title="No pudimos cargar el perfil" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: tabSpace }}>
        <DarkHeader style={{ paddingBottom: 56 }}>
          <View className="flex-row items-center justify-between">
            <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={back} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ChevronLeft size={18} color="#fff" />
            </Press>
            <Text className="text-[13px] font-semibold" style={{ color: colors.authMuted }}>
              {isFriend ? (since ? `Amigos desde el ${since}` : 'Amigos') : isSelf ? 'Así te ven tus amigos' : ''}
            </Text>
            {isSelf || !card ? (
              <View style={{ width: 36 }} />
            ) : (
              <Press accessibilityRole="button" accessibilityLabel="Más opciones" onPress={() => setMenu(true)} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <DotsThree size={20} color="#fff" />
              </Press>
            )}
          </View>
          <View className="items-center mt-5">
            <View style={{ padding: 4, borderRadius: 52, borderWidth: 3, borderColor: colors.mint }}>
              <PersonAvatar name={card?.full_name ?? ''} photoUrl={card?.photo_url} size={84} />
            </View>
            <Text accessibilityRole="header" className="text-[22px] font-extrabold text-white mt-3 text-center" numberOfLines={2}>{card?.full_name ?? ' '}</Text>
            {card?.bio ? <Text className="text-[13.5px] text-center mt-1.5" style={{ color: colors.authMuted, lineHeight: 19, maxWidth: 300 }}>{card.bio}</Text> : null}
          </View>
        </DarkHeader>

        {card && !showData && (
          <Glass className="rounded-3xl p-4 mx-5 -mt-7" style={{ gap: 10 }}>
            <Text className="text-[13px] text-center text-muted-light dark:text-muted-dark" style={{ lineHeight: 18 }}>
              {card.relation === 'pending_out' ? 'Le mandaste una solicitud. Cuando acepte, van a ver los pasos del otro.' : card.relation === 'pending_in' ? 'Quiere ser tu amigo. Si aceptas, van a ver los pasos del otro.' : 'Agrega a esta persona a tus amigos para ver su racha y sus pasos. Solo los amigos que aceptaron los ven.'}
            </Text>
            {card.relation === 'none' && (
              <Press accessibilityRole="button" disabled={send.isPending} onPress={() => send.mutate(userId!, { onSuccess: (r) => { if (r === 'accepted') friendsNow(); }, onError: fail('No se pudo enviar') })} className="rounded-2xl py-3.5 items-center" style={{ backgroundColor: colors.aquaDeep }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{send.isPending ? 'Enviando…' : 'Agregar amigo'}</Text>
              </Press>
            )}
            {card.relation === 'pending_out' && (
              <Press accessibilityRole="button" disabled={remove.isPending} onPress={() => remove.mutate(userId!, { onError: fail('No se pudo cancelar') })} className="rounded-2xl py-3.5 items-center" style={{ borderWidth: 1, borderColor: line }}>
                <Text style={{ color: muted, fontSize: 15, fontWeight: '700' }}>Cancelar solicitud</Text>
              </Press>
            )}
            {card.relation === 'pending_in' && (
              <View className="flex-row" style={{ gap: 10 }}>
                <Press accessibilityRole="button" disabled={respond.isPending} onPress={() => respond.mutate({ personId: userId!, accept: true }, { onSuccess: friendsNow, onError: fail('No se pudo aceptar') })} className="flex-1 rounded-2xl py-3.5 items-center" style={{ backgroundColor: colors.aquaDeep }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Aceptar</Text>
                </Press>
                <Press accessibilityRole="button" disabled={respond.isPending} onPress={() => respond.mutate({ personId: userId!, accept: false }, { onSuccess: back, onError: fail('No se pudo rechazar') })} className="flex-1 rounded-2xl py-3.5 items-center" style={{ borderWidth: 1, borderColor: line }}>
                  <Text style={{ color: muted, fontSize: 15, fontWeight: '700' }}>Rechazar</Text>
                </Press>
              </View>
            )}
          </Glass>
        )}

        {card && showData && (
          <>
            <Glass className="flex-row rounded-3xl mx-5 -mt-7 py-3.5">
              {[
                { value: `${card.streak ?? 0} ${card.streak === 1 ? 'día' : 'días'}`, label: 'Racha' },
                { value: (card.avg_week ?? 0).toLocaleString('es-BO'), label: 'Promedio diario' },
                { value: (card.goal ?? 0).toLocaleString('es-BO'), label: 'Meta' },
              ].map((s, i) => (
                <View key={s.label} className="flex-1 items-center" style={{ borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: line }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: text, fontVariant: ['tabular-nums'] }}>{s.value}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark">{s.label}</Text>
                </View>
              ))}
            </Glass>

            <View className="flex-row items-center justify-between mx-5 mt-5 mb-2.5">
              <Text accessibilityRole="header" style={[typo.section, { color: text }]}>{span === 'semana' ? 'Esta semana' : 'Último mes'}</Text>
              <View className="flex-row" style={{ gap: 6 }}>
                {(['semana', 'mes'] as const).map((k) => (
                  <Press
                    key={k}
                    accessibilityRole="button"
                    accessibilityState={{ selected: span === k }}
                    haptic="selection"
                    onPress={() => setSpan(k)}
                    className="rounded-full px-3 py-1.5"
                    style={{ backgroundColor: span === k ? colors.aquaDeep : 'transparent', borderWidth: 1, borderColor: span === k ? colors.aquaDeep : line }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: span === k ? '#fff' : text }}>{k === 'semana' ? '7 días' : 'Mes'}</Text>
                  </Press>
                ))}
              </View>
            </View>

            <Glass className="rounded-3xl mx-5 px-2.5 py-4">
              {span === 'semana' ? (
                <View className="flex-row justify-between">
                  {cells.map((c) => (
                    <View key={c.key} accessible accessibilityLabel={`${c.label} ${c.key.slice(8)}: ${c.steps.toLocaleString('es-BO')} pasos, ${STATE_TEXT[c.state]}`} className="items-center" style={{ gap: 6, flex: 1 }}>
                      <DayDot cell={c} size={38} />
                      <Text className="text-[12px] font-bold text-muted-light dark:text-muted-dark">{c.label}</Text>
                      <Text className="text-[12px] text-muted-light dark:text-muted-dark" style={{ fontVariant: ['tabular-nums'] }}>{c.state === 'none' && c.steps === 0 ? '·' : compactSteps(c.steps)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <View className="flex-row justify-between">
                    {WEEK_LABELS.map((l) => <Text key={l} className="flex-1 text-center text-[12px] font-bold text-muted-light dark:text-muted-dark">{l}</Text>)}
                  </View>
                  {Array.from({ length: 5 }, (_, w) => (
                    <View key={w} className="flex-row justify-between">
                      {cells.slice(w * 7, w * 7 + 7).map((c) => (
                        <View key={c.key} accessible accessibilityLabel={`${c.key.slice(8)}: ${c.steps.toLocaleString('es-BO')} pasos, ${STATE_TEXT[c.state]}`} className="flex-1 items-center">
                          <DayDot cell={c} size={32} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </Glass>
            <Text className="text-[12px] text-center mt-3 text-muted-light dark:text-muted-dark">
              {isSelf ? 'Tus amigos ven esto de ti.' : 'Solo la ven los amigos que aceptó.'}
            </Text>
          </>
        )}
      </ScrollView>

      <ActionSheet visible={menu} onClose={() => setMenu(false)} actions={menuActions} />
      <ActionSheet visible={reasons} title="¿Por qué lo reportas?" onClose={() => setReasons(false)} actions={reasonActions} />
    </View>
  );
}
