import { type ReactNode } from 'react';
import { View, Modal, ScrollView, Linking, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { Check, Users, Gift, Calendar, Footprints, X } from '@/components/icons';
import type { PromotionItem } from '@/hooks/usePromotions';
import { usePromotionProgress } from '@/hooks/usePromotions';
import { PROMO_BG, promoBgKey, timeLeftLabel, dateRangeLabel, boliviaDate, boliviaTime, goalParts, participantsLabel, fmtSteps } from '@/lib/promo';

const WHITE_SOFT = 'rgba(255,255,255,0.92)';

// Fondo de la tarjeta: color de Camina o foto. La foto se oscurece sola para que el texto blanco se lea siempre.
function PromoBackground({ p, children, style }: { p: PromotionItem; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [from, to] = PROMO_BG[promoBgKey(p.bg_color)];
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: from }, style]}>
      {p.bg_image_url ? (
        <>
          <Image accessible={false} source={{ uri: p.bg_image_url }} contentFit="cover" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(20,10,40,0.55)', 'rgba(20,10,40,0.82)']} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
      <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

// Desafío: arriba el tiempo y las fechas, después logo y nombre, la meta bien grande y abajo el premio.
export function ChallengeCard({ p, onPress, width }: { p: PromotionItem; onPress: () => void; width?: number }) {
  const goal = goalParts(p);
  const label = `${p.title}, de ${p.business?.name ?? 'un comercio'}. ${goal ? `${goal.big} ${goal.small}. ` : ''}${p.prize ? `Premio: ${p.prize}. ` : ''}${timeLeftLabel(p.starts_at, p.ends_at)}`;
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width }}>
      <PromoBackground p={p} style={{ borderRadius: 28, padding: 16 }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <Pill text={timeLeftLabel(p.starts_at, p.ends_at)} />
            <Pill text={dateRangeLabel(p.starts_at, p.ends_at)} />
          </View>
          <View className="flex-row items-center" style={{ gap: 12, marginTop: 14 }}>
            <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={46} />
            <View className="flex-1">
              <Text numberOfLines={2} style={{ color: '#fff', fontSize: 19, fontWeight: '800', lineHeight: 23 }}>{p.title}</Text>
              <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 13 }}>{p.business?.name ?? 'Comercio'}</Text>
            </View>
          </View>
          {goal ? (
            <View className="flex-row items-end" style={{ gap: 10, marginTop: 12 }}>
              <Text style={{ color: '#7FEDC4', fontSize: 46, lineHeight: 50, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{goal.big}</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', paddingBottom: 6, flexShrink: 1 }}>{goal.small}</Text>
            </View>
          ) : null}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, marginTop: 12 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Gift size={18} color="#5B31A3" />
              <View className="flex-1">
                <Text numberOfLines={2} style={{ color: '#241748', fontSize: 14.5, fontWeight: '800' }}>{p.prize ?? 'Premio sorpresa'}</Text>
                <Text style={{ color: '#5B4A7A', fontSize: 12.5 }}>
                  {p.winners_count > 1 ? `${p.winners_count} ganadores · ` : ''}Sorteo entre quienes cumplan
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center" style={{ gap: 6, marginTop: 10 }}>
            <Users size={15} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '600' }}>{participantsLabel(p.participants)}</Text>
          </View>
        </View>
      </PromoBackground>
    </Press>
  );
}

// Evento: tarjeta cuadrada grande con el sello de la fecha.
export function EventCard({ p, onPress, size }: { p: PromotionItem; onPress: () => void; size: number }) {
  const d = boliviaDate(p.starts_at);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${p.title}, de ${p.business?.name ?? 'un comercio'}. ${dateRangeLabel(p.starts_at, p.ends_at)}, ${boliviaTime(p.starts_at)}. ${participantsLabel(p.participants)}`}
      onPress={onPress}
      style={{ width: size }}
    >
      <PromoBackground p={p} style={{ width: size, height: size, borderRadius: 28, padding: 16, justifyContent: 'space-between' }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden className="flex-row items-start justify-between">
          <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={46} />
          <View style={{ backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ color: '#241748', fontSize: 24, lineHeight: 27, fontWeight: '800' }}>{d.day}</Text>
            <Text style={{ color: '#5B4A7A', fontSize: 12.5, fontWeight: '700' }}>{months[d.month]}</Text>
          </View>
        </View>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 13 }}>{p.business?.name ?? 'Comercio'}</Text>
          <Text numberOfLines={3} style={{ color: '#fff', fontSize: 21, lineHeight: 25, fontWeight: '800' }}>{p.title}</Text>
          <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 12.5, marginTop: 6 }}>
            {boliviaTime(p.starts_at)} · {participantsLabel(p.participants)}
          </Text>
        </View>
      </PromoBackground>
    </Press>
  );
}

// Publicidad: franja grande arriba de Inicio, siempre marcada como publicidad y con botón para cerrarla.
export function AdBanner({ p, onPress, onClose }: { p: PromotionItem; onPress: () => void; onClose: () => void }) {
  return (
    <View>
      <PromoBackground p={p} style={{ borderRadius: 28, padding: 16 }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Cerrar publicidad"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onClose}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={14} color="#fff" />
        </Press>
        <Press accessibilityRole="button" accessibilityLabel={`Publicidad. ${p.title}, de ${p.business?.name ?? 'un comercio'}`} onPress={onPress}>
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#7FEDC4', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 }}>
              <Text style={{ color: '#12281F', fontSize: 12, fontWeight: '800' }}>PRESENTADO POR {(p.business?.name ?? 'UN COMERCIO').toUpperCase()}</Text>
            </View>
            <Text numberOfLines={3} style={{ color: '#fff', fontSize: 23, lineHeight: 28, fontWeight: '800', marginTop: 12, paddingRight: 24 }}>{p.title}</Text>
            <Text numberOfLines={2} style={{ color: WHITE_SOFT, fontSize: 14, marginTop: 4 }}>{p.description}</Text>
            <View className="flex-row items-center justify-between" style={{ marginTop: 14, gap: 10 }}>
              <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={36} />
                <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 }}>{timeLeftLabel(p.starts_at, p.ends_at)}</Text>
              </View>
              <View style={{ backgroundColor: '#F5B83A', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ color: '#2A1A00', fontSize: 14, fontWeight: '800' }}>Ver más</Text>
              </View>
            </View>
          </View>
        </Press>
      </PromoBackground>
      <Text className="text-muted-light dark:text-muted-dark text-right mt-1.5 mr-1" style={{ fontSize: 12 }}>Publicidad · de un comercio de Camina</Text>
    </View>
  );
}

function openLink(url: string | null) {
  if (url && /^https:\/\//.test(url)) Linking.openURL(url).catch(() => {});
}

// Ficha con el detalle: cómo funciona, premio, mi avance y el botón de participar.
export function PromoSheet({ p, onClose, onJoin, joining }: { p: PromotionItem | null; onClose: () => void; onJoin: (p: PromotionItem) => void; joining: boolean }) {
  const goal = p ? goalParts(p) : null;
  const isChallenge = p?.kind === 'desafio' || p?.kind === 'sorteo';
  const { data: progress } = usePromotionProgress(p?.id, !!p && isChallenge && p.joined);
  const target = p ? (p.goal_mode === 'total' ? p.goal_steps ?? 0 : p.goal_mode === 'daily' ? p.goal_days ?? 0 : p.req_days ?? 0) : 0;
  const done = p?.goal_mode === 'total' ? progress?.steps ?? 0 : progress?.days ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const steps: { icon: ReactNode; text: string }[] = p
    ? p.kind === 'publicidad'
      ? []
      : p.kind === 'evento'
        ? [
            { icon: <Calendar size={18} color="#5B31A3" />, text: `${dateRangeLabel(p.starts_at, p.ends_at)} · desde las ${boliviaTime(p.starts_at)}.` },
            { icon: <Check size={18} color="#5B31A3" />, text: 'Tocá "Anotarme" para avisar que vas.' },
            ...(p.prize ? [{ icon: <Gift size={18} color="#5B31A3" />, text: p.prize }] : []),
          ]
        : [
            { icon: <Check size={18} color="#5B31A3" />, text: 'Tocá "Participar". Tus pasos cuentan desde ese momento.' },
            { icon: <Footprints size={18} color="#5B31A3" />, text: goal ? `Cumplí la meta: ${goal.big} ${goal.small}.` : 'Cumplí la meta del desafío.' },
            { icon: <Gift size={18} color="#5B31A3" />, text: `Al terminar, Camina sortea ${p.prize ? `"${p.prize}"` : 'los premios'} entre quienes cumplieron.` },
          ]
    : [];
  return (
    <Modal visible={!!p} transparent animationType="fade" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] pt-3" style={{ maxHeight: '88%' }} onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-3" />
          {p ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              <PromoBackground p={p} style={{ borderRadius: 24, padding: 16 }}>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={46} />
                  <View className="flex-1">
                    <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 24 }}>{p.title}</Text>
                    <Text style={{ color: WHITE_SOFT, fontSize: 13 }}>{p.business?.name ?? 'Comercio'} · {timeLeftLabel(p.starts_at, p.ends_at)}</Text>
                  </View>
                </View>
                {goal ? (
                  <View className="flex-row items-end" style={{ gap: 10, marginTop: 12 }}>
                    <Text style={{ color: '#7FEDC4', fontSize: 40, lineHeight: 44, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{goal.big}</Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', paddingBottom: 5, flexShrink: 1 }}>{goal.small}</Text>
                  </View>
                ) : null}
              </PromoBackground>
              <Text className="text-text-light dark:text-text-dark mt-4 leading-5" style={{ fontSize: 14.5 }}>{p.description}</Text>
              {steps.length > 0 ? (
                <>
                  <Text accessibilityRole="header" className="text-text-light dark:text-text-dark mt-5 mb-2" style={{ fontSize: 16, fontWeight: '800' }}>Cómo funciona</Text>
                  {steps.map((s, i) => (
                    <View key={i} className="flex-row items-start" style={{ gap: 10, marginBottom: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,79,209,0.14)' }}>{s.icon}</View>
                      <Text className="flex-1 text-text-light dark:text-text-dark leading-5 pt-1" style={{ fontSize: 14 }}>{s.text}</Text>
                    </View>
                  ))}
                </>
              ) : null}
              {p.joined && isChallenge && target > 0 ? (
                <View className="mt-2">
                  <View className="h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden">
                    <View className="h-full bg-aqua rounded-full" style={{ width: `${pct}%` }} />
                  </View>
                  <Text className="text-muted-light dark:text-muted-dark mt-1.5" style={{ fontSize: 13 }}>
                    {p.goal_mode === 'total' ? `${fmtSteps(done)} de ${fmtSteps(target)} pasos` : `${done} de ${target} días cumplidos`}
                  </Text>
                </View>
              ) : null}
              <Text className="text-muted-light dark:text-muted-dark mt-3" style={{ fontSize: 13 }}>{participantsLabel(p.participants)}</Text>
              {p.kind === 'publicidad' ? (
                p.cta_url ? (
                  <Press accessibilityRole="button" onPress={() => openLink(p.cta_url)} className="bg-purple-deep rounded-2xl py-3.5 items-center mt-5">
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Ir a la página</Text>
                  </Press>
                ) : null
              ) : p.won ? (
                <View className="rounded-2xl py-3.5 items-center mt-5" style={{ backgroundColor: '#FFF3D1' }}>
                  <Text style={{ color: '#8F6307', fontWeight: '800', fontSize: 14 }}>¡Ganaste! Te vamos a contactar</Text>
                </View>
              ) : p.joined ? (
                <View className="rounded-2xl py-3.5 items-center mt-5 bg-mint/15">
                  <Text className="text-mint-dark dark:text-mint" style={{ fontWeight: '800', fontSize: 14.5 }}>
                    {p.kind === 'evento' ? 'Ya estás anotado' : '¡Ya sos parte del desafío!'}
                  </Text>
                </View>
              ) : (
                <Press accessibilityRole="button" onPress={() => onJoin(p)} disabled={joining} className="bg-purple-deep rounded-2xl py-3.5 items-center mt-5">
                  {joining ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '800' }}>{p.kind === 'evento' ? 'Anotarme' : 'Participar'}</Text>
                  )}
                </Press>
              )}
              <Press accessibilityRole="button" onPress={onClose} className="py-3 items-center mt-1">
                <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 14 }}>Cerrar</Text>
              </Press>
            </ScrollView>
          ) : null}
        </Press>
      </Press>
    </Modal>
  );
}
