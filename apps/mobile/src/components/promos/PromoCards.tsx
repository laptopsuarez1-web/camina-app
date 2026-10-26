import { type ReactNode } from 'react';
import { Alert, View, Modal, ScrollView, Linking, useWindowDimensions, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Coin } from '@/components/ui/Coin';
import { Press } from '@/components/ui/Press';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { Check, Users, Gift, Calendar, Footprints, ChevronRight, MapPin, Ticket } from '@/components/icons';
import type { PromotionItem } from '@/hooks/usePromotions';
import { usePromotionProgress, useRedeemTicket } from '@/hooks/usePromotions';
import { usePointsBalance } from '@/hooks/usePoints';
import { friendlyServerError } from '@/lib/errors';
import { celebrate } from '@/store/useCelebrationStore';
import { PROMO_BG, promoBgKey, type PromoBg, timeLeftLabel, dateRangeLabel, boliviaDate, boliviaTime, goalParts, participantsLabel, fmtSteps } from '@/lib/promo';

const WHITE_SOFT = 'rgba(255,255,255,0.92)';

// Fondo de la tarjeta: color de Camina, foto/banner o el logo del comercio sobre el color.
// La foto se oscurece sola (`soft` la oscurece menos, para banners donde la imagen es protagonista).
function PromoBackground({ p, children, style, soft, clear }: { p: PromotionItem; children: ReactNode; style?: StyleProp<ViewStyle>; soft?: boolean; clear?: boolean }) {
  const [from, to] = PROMO_BG[promoBgKey(p.bg_color)];
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: from }, style]}>
      {p.bg_image_url ? (
        <>
          <Image accessible={false} source={{ uri: p.bg_image_url }} contentFit="cover" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={clear ? ['rgba(20,10,40,0)', 'rgba(20,10,40,0)', 'rgba(20,10,40,0.82)'] : soft ? ['rgba(20,10,40,0.15)', 'rgba(20,10,40,0.78)'] : ['rgba(20,10,40,0.28)', 'rgba(20,10,40,0.82)']}
            locations={clear ? [0, 0.5, 1] : undefined}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      {!p.bg_image_url && p.bg_logo && p.business?.logo_url ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: -24, bottom: -24, width: 170, height: 170, borderRadius: 48, overflow: 'hidden', opacity: 0.22 }}>
          <Image accessible={false} source={{ uri: p.business.logo_url }} contentFit="cover" style={{ width: 170, height: 170 }} />
        </View>
      ) : null}
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
      <PromoBackground p={p} clear style={{ width: size, height: size, borderRadius: 28, padding: 16, justifyContent: 'space-between' }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden className="flex-row items-start justify-between">
          <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={46} />
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 24, lineHeight: 27, fontWeight: '800' }}>{d.day}</Text>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>{months[d.month]}</Text>
          </View>
        </View>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 13 }}>{p.business?.name ?? 'Comercio'}</Text>
          <Text numberOfLines={3} style={{ color: '#fff', fontSize: 21, lineHeight: 25, fontWeight: '800' }}>{p.title}</Text>
          <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 12.5, marginTop: 6 }}>
            {boliviaTime(p.starts_at)} · {p.ticket_points != null ? `Entrada ${p.ticket_points} Puntos` : p.ticket_price ? `Desde ${p.ticket_price}` : participantsLabel(p.participants)}
          </Text>
        </View>
      </PromoBackground>
    </Press>
  );
}

function openLink(url: string | null) {
  if (url && /^https:\/\//.test(url)) Linking.openURL(url).catch(() => {});
}

// Anuncio de una marca (con sitio web) arriba de Inicio: fijo, con foto/banner de fondo. Al tocarlo va directo
// al link que eligió la marca. No lleva ninguna etiqueta que lo nombre como publicidad.
export function AdBanner({ p }: { p: PromotionItem }) {
  return (
    <Press
      accessibilityRole="link"
      accessibilityLabel={`${p.title}, de ${p.business?.name ?? 'una marca'}`}
      accessibilityHint="Abre el link de la marca"
      onPress={() => openLink(p.cta_url)}
    >
      <PromoBackground p={p} soft style={{ borderRadius: 24, minHeight: 132, padding: 14, justifyContent: 'flex-end' }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View className="flex-row items-center" style={{ gap: 8, marginBottom: 6 }}>
            <BusinessAvatar logoUrl={p.business?.logo_url} category={p.business?.category} size={30} />
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>{p.business?.name ?? 'Marca'}</Text>
          </View>
          <View className="flex-row items-end justify-between" style={{ gap: 10 }}>
            <View className="flex-1">
              <Text numberOfLines={2} style={{ color: '#fff', fontSize: 19, lineHeight: 23, fontWeight: '800' }}>{p.title}</Text>
              {p.description ? <Text numberOfLines={1} style={{ color: WHITE_SOFT, fontSize: 13, marginTop: 2 }}>{p.description}</Text> : null}
            </View>
            <View className="flex-row items-center" style={{ backgroundColor: '#F5B83A', borderRadius: 999, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, gap: 2 }}>
              <Text style={{ color: '#2A1A00', fontSize: 13.5, fontWeight: '800' }}>Ver más</Text>
              <ChevronRight size={16} color="#2A1A00" />
            </View>
          </View>
        </View>
      </PromoBackground>
    </Press>
  );
}

// Ficha con el detalle: cómo funciona, premio, mi avance y el botón de participar.
type TicketState = 'has' | 'points' | 'sold_out_buy' | 'sold_out' | 'buy' | 'contact' | 'free';

// Qué botón de entrada corresponde: la entrada que ya tiene, canje con Puntos, agotadas (y comprar con plata si el
// organizador puso precio), comprar con plata, consultar (evento libre con contacto) o anotarse (evento libre).
function ticketState(p: PromotionItem): TicketState {
  if (p.has_ticket) return 'has';
  const left = p.ticket_points != null ? Math.max(0, (p.ticket_quota ?? 0) - p.tickets_taken) : 0;
  if (p.ticket_points != null) {
    if (left > 0) return 'points';
    return p.ticket_price && p.ticket_url ? 'sold_out_buy' : 'sold_out';
  }
  if (p.ticket_price) return 'buy';
  return p.ticket_url ? 'contact' : 'free';
}

// Fotos completas (sin recortar ni oscurecer) del evento o desafío: la de fondo y las que sumó el comercio.
function PhotoCarousel({ urls, width }: { urls: string[]; width: number }) {
  if (urls.length === 0) return null;
  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 24, marginBottom: 14 }}>
      {urls.map((u) => (
        <View key={u} style={{ width, height: 240, backgroundColor: '#120a1e', borderRadius: 24, overflow: 'hidden' }}>
          <Image accessibilityLabel="Foto" source={{ uri: u }} contentFit="contain" style={{ width, height: 240 }} />
        </View>
      ))}
    </ScrollView>
  );
}

export function PromoSheet({ p, onClose, onJoin, joining }: { p: PromotionItem | null; onClose: () => void; onJoin: (p: PromotionItem) => void; joining: boolean }) {
  const goal = p ? goalParts(p) : null;
  const { width: screenW } = useWindowDimensions();
  const redeem = useRedeemTicket();
  const { data: balance } = usePointsBalance();
  const ticket = p?.kind === 'evento' ? ticketState(p) : null;
  async function redeemTicket() {
    if (!p) return;
    try {
      const before = balance ?? 0;
      await redeem.mutateAsync(p.id);
      onClose();
      celebrate({
        kind: 'ticket-bought',
        title: p.title,
        business: p.business?.name,
        when: `${dateRangeLabel(p.starts_at, p.ends_at)} · ${boliviaTime(p.starts_at)}`,
        place: p.place_name ?? p.place_address ?? undefined,
        points: p.ticket_points ?? 0,
        balanceBefore: before,
      });
    } catch (e) {
      Alert.alert('No pudimos canjear', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }
  const photoUrls = p ? [...(p.bg_image_url ? [p.bg_image_url] : []), ...(p.photos ?? [])] : [];
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
            ...(ticket === 'free' ? [{ icon: <Check size={18} color="#5B31A3" />, text: 'Toca "Anotarme" para avisar que vas.' }] : []),
            ...(p.prize ? [{ icon: <Gift size={18} color="#5B31A3" />, text: p.prize }] : []),
          ]
        : [
            { icon: <Check size={18} color="#5B31A3" />, text: 'Toca "Participar". Tus pasos cuentan desde ese momento.' },
            { icon: <Footprints size={18} color="#5B31A3" />, text: goal ? `Cumple la meta: ${goal.big} ${goal.small}.` : 'Cumple la meta del desafío.' },
            { icon: <Gift size={18} color="#5B31A3" />, text: `Al terminar, Camina sortea ${p.prize ? `"${p.prize}"` : 'los premios'} entre quienes cumplieron.` },
          ]
    : [];
  return (
    <Modal visible={!!p} transparent animationType="fade" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] pt-3" style={{ maxHeight: '88%' }} onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-3" />
          {p ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              <PhotoCarousel urls={photoUrls} width={screenW - 40} />
              <PromoBackground p={photoUrls.length > 0 ? { ...p, bg_image_url: null } : p} style={{ borderRadius: 24, padding: 16 }}>
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
              {p.place_name || p.place_address ? (
                <Press accessibilityRole="link" accessibilityLabel="Cómo llegar" disabled={!p.place_url} onPress={() => openLink(p.place_url)} className="flex-row items-center mt-4" style={{ gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,79,209,0.14)' }}><MapPin size={18} color="#5B31A3" /></View>
                  <View className="flex-1">
                    <Text className="text-text-light dark:text-text-dark" style={{ fontSize: 14.5, fontWeight: '800' }}>{p.place_name ?? p.place_address}</Text>
                    {p.place_name && p.place_address ? <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 13 }}>{p.place_address}</Text> : null}
                  </View>
                  {p.place_url ? <Text style={{ color: '#5B31A3', fontWeight: '800', fontSize: 13 }}>Cómo llegar</Text> : null}
                </Press>
              ) : null}
              {p.kind === 'evento' && ticket && ticket !== 'free' && ticket !== 'contact' ? (
                <View className="flex-row items-center mt-3" style={{ gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,79,209,0.14)' }}><Ticket size={18} color="#5B31A3" /></View>
                  <View className="flex-1">
                    <Text className="text-text-light dark:text-text-dark" style={{ fontSize: 14.5, fontWeight: '800' }}>
                      {p.ticket_points != null ? `Entrada: ${p.ticket_points} Puntos` : `Entrada desde ${p.ticket_price}`}
                    </Text>
                    {p.ticket_points != null ? (
                      <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 13 }}>
                        {ticket === 'sold_out' || ticket === 'sold_out_buy' ? 'Se agotaron las entradas con Puntos' : `Quedan ${Math.max(0, (p.ticket_quota ?? 0) - p.tickets_taken)} de ${p.ticket_quota}`}
                        {p.ticket_price ? ` · o desde ${p.ticket_price}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
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
              {p.kind === 'evento' && !p.won && (ticket === 'has' || ticket === 'points' || ticket === 'sold_out' || ticket === 'sold_out_buy' || ticket === 'buy' || ticket === 'contact') ? (
                <View style={{ gap: 8 }}>
                  {ticket === 'has' ? (
                    <View className="rounded-2xl py-3.5 items-center mt-5 bg-mint/15">
                      <Text className="text-mint-dark dark:text-mint" style={{ fontWeight: '800', fontSize: 14.5 }}>Ya tienes tu entrada</Text>
                    </View>
                  ) : null}
                  {ticket === 'sold_out' ? (
                    <View className="rounded-2xl py-3.5 items-center mt-5 bg-line-light dark:bg-line-dark">
                      <Text className="text-muted-light dark:text-muted-dark" style={{ fontWeight: '800', fontSize: 14.5 }}>Entradas agotadas</Text>
                    </View>
                  ) : null}
                  {ticket === 'points' ? (
                    <Press accessibilityRole="button" onPress={redeemTicket} disabled={redeem.isPending || (balance ?? 0) < (p.ticket_points ?? 0)} className="bg-purple-deep rounded-2xl py-3.5 items-center mt-5" style={(balance ?? 0) < (p.ticket_points ?? 0) ? { opacity: 0.5 } : undefined}>
                      {redeem.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '800' }}>{`Canjear entrada · ${p.ticket_points} Puntos`}</Text>}
                    </Press>
                  ) : null}
                  {ticket === 'points' && (balance ?? 0) < (p.ticket_points ?? 0) ? (
                    <Text className="text-muted-light dark:text-muted-dark text-center" style={{ fontSize: 13 }}>Te faltan {(p.ticket_points ?? 0) - (balance ?? 0)} Puntos</Text>
                  ) : null}
                  {(ticket === 'sold_out_buy' || ticket === 'buy') && p.ticket_url ? (
                    <Press accessibilityRole="link" onPress={() => openLink(p.ticket_url)} className="bg-purple-deep rounded-2xl py-3.5 items-center mt-5">
                      <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '800' }}>{`Comprar desde ${p.ticket_price}`}</Text>
                    </Press>
                  ) : null}
                  {ticket === 'contact' && p.ticket_url ? (
                    <Press accessibilityRole="link" onPress={() => openLink(p.ticket_url)} className="bg-purple-deep rounded-2xl py-3.5 items-center mt-5">
                      <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '800' }}>Contactar al organizador</Text>
                    </Press>
                  ) : null}
                  {(ticket === 'has' || ticket === 'points') && p.ticket_url ? (
                    <Press accessibilityRole="link" onPress={() => openLink(p.ticket_url)} className="py-2 items-center">
                      <Text style={{ color: '#5B31A3', fontSize: 14, fontWeight: '700' }}>Hablar con el organizador</Text>
                    </Press>
                  ) : null}
                </View>
              ) : p.kind === 'publicidad' ? (
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
                    {p.kind === 'evento' ? 'Ya estás anotado' : '¡Ya eres parte del desafío!'}
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

// Reto Camina (automático, sin "Participar"): misma familia visual que los desafíos, con el avance bien grande.
export function RetoCamina({
  icon, title, description, reward, pct, met, target, claimable, claimed, claiming, onClaim, tone,
}: {
  icon: ReactNode; title: string; description: string; reward: number; pct: number; met: number; target: number;
  claimable: boolean; claimed: boolean; claiming: boolean; onClaim: () => void; tone: PromoBg;
}) {
  const [from, to] = PROMO_BG[tone];
  return (
    <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: from, padding: 16 }}>
      <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 3 }}>{icon}</View>
        <View className="flex-1">
          <Text style={{ color: '#fff', fontSize: 16.5, fontWeight: '800', lineHeight: 21 }}>{title}</Text>
          <Text style={{ color: WHITE_SOFT, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{description}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Coin size={14} />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>+{reward}</Text>
        </View>
      </View>
      <View className="flex-row items-end justify-between" style={{ marginTop: 12 }}>
        <View className="flex-row items-end" style={{ gap: 6 }}>
          <Text style={{ color: '#7FEDC4', fontSize: 34, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{claimed ? '✓' : met}</Text>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', paddingBottom: 4 }}>{claimed ? 'Ya lo cobraste' : `de ${target}`}</Text>
        </View>
        {claimable ? (
          <Press accessibilityRole="button" hitSlop={{ top: 9, bottom: 9, left: 8, right: 8 }} onPress={onClaim} haptic="light" disabled={claiming} style={{ backgroundColor: '#F5B83A', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }}>
            {claiming ? <ActivityIndicator size="small" color="#2A1A00" /> : <Text style={{ color: '#2A1A00', fontSize: 13.5, fontWeight: '800' }}>Reclamar +{reward}</Text>}
          </Press>
        ) : null}
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 10 }}>
        <View style={{ width: `${claimed ? 100 : pct}%`, height: '100%', backgroundColor: '#7FEDC4', borderRadius: 4 }} />
      </View>
    </View>
  );
}
