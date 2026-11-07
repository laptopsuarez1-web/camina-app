import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GOLD } from '@/components/ruta/RutaPin';
import { Coin } from '@/components/ui/Coin';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { ChevronDown, ChevronUp, Clock, FacebookIcon, Globe, Instagram, MapPin, TiktokIcon, X } from '@/components/icons';
import { DAYS, closesAt, isOpenNow, rangesText, todayIndex, type OpeningHours } from '@/components/BusinessHours';
import { supabase } from '@/lib/supabase';
import { useRutaStopStats, type RutaStop } from '@/hooks/useRuta';

const MINT = '#62F0B6';
const MUTED = '#C4B8E8';
const SHEET = '#1d1729';
const LINE = 'rgba(255,255,255,0.08)';

type Ficha = {
  description: string | null; address: string | null; hours_text: string | null; opening_hours: OpeningHours; cover_url: string | null; photos: string[] | null;
  instagram: string | null; facebook: string | null; tiktok: string | null; website: string | null; phone: string | null;
};

function openDirections(s: RutaStop, address?: string | null) {
  const label = encodeURIComponent(s.name);
  const hasPoint = s.lat != null && s.lng != null;
  const web = hasPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? s.name)}`;
  const native = hasPoint
    ? Platform.select({ ios: `maps:0,0?daddr=${s.lat},${s.lng}&dirflg=w&q=${label}`, android: `google.navigation:q=${s.lat},${s.lng}&mode=w` })
    : undefined;
  (native ? Linking.openURL(native) : Promise.reject()).catch(() => Linking.openURL(web).catch(() => {}));
}

// "https://www.instagram.com/coco_barberpr?igsh=..." → "coco_barberpr". Sirve para Instagram, TikTok y Facebook.
export function handleOf(v: string) {
  const t = v.trim();
  const m = t.match(/(?:instagram\.com|tiktok\.com|facebook\.com|fb\.com)\/(?:@)?([^/?#\s]+)/i);
  return (m ? m[1] : t).replace(/^@/, '').replace(/\/+$/, '');
}

type Social = { key: string; label: string; handle: string; url: string; Icon: typeof Instagram };
function socialsOf(f: Ficha | null | undefined, name: string): Social[] {
  if (!f) return [];
  const out: Social[] = [];
  if (f.instagram) { const h = handleOf(f.instagram); out.push({ key: 'ig', label: 'Instagram', handle: `@${h}`, url: `https://instagram.com/${h}`, Icon: Instagram }); }
  if (f.tiktok) { const h = handleOf(f.tiktok); out.push({ key: 'tt', label: 'TikTok', handle: `@${h}`, url: `https://www.tiktok.com/@${h}`, Icon: TiktokIcon }); }
  if (f.facebook) {
    const h = handleOf(f.facebook);
    // Los links para compartir de Facebook ("/share/19pg...", "profile.php?id=") no dicen nada: se muestra el nombre del local.
    const plain = /^(share|profile\.php|people|p|groups)$/i.test(h) || h.length > 40;
    out.push({ key: 'fb', label: 'Facebook', handle: plain ? name : h, url: /^https?:/i.test(f.facebook) ? f.facebook : `https://facebook.com/${h}`, Icon: FacebookIcon });
  }
  if (f.website) {
    const url = /^https?:/i.test(f.website) ? f.website : `https://${f.website}`;
    out.push({ key: 'web', label: 'Página web', handle: url.replace(/^https?:\/\/(www\.)?/i, '').split(/[/?#]/)[0], url, Icon: Globe });
  }
  return out;
}

// Fila que se abre al tocarla (horario de la semana, redes del local).
function Expand({ icon, title, value, open, onToggle, first, children }: {
  icon: React.ReactNode; title: string; value: string; open: boolean; onToggle: () => void; first?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: LINE }}>
      <Press accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} haptic="selection"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{title}</Text>
          <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{value}</Text>
        </View>
        {open ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
      </Press>
      {open ? <View style={{ paddingBottom: 12, paddingLeft: 42 }}>{children}</View> : null}
    </View>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(98,240,182,0.12)', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, backgroundColor: accent ? 'rgba(98,240,182,0.10)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: accent ? 'rgba(98,240,182,0.35)' : LINE, alignItems: 'center' }}>
      <Text allowFontScaling={false} style={{ color: accent ? MINT : '#fff', fontWeight: '900', fontSize: 20, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 2, lineHeight: 14 }} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const NEXT: Record<string, { label: string; at: number }> = { Visitante: { label: 'Habitual', at: 10 }, Habitual: { label: 'Fan', at: 20 } };

// Ficha del local de la Ruta: foto, qué es, números del local, horario y redes (se abren al tocarlos) y cómo llegar.
// Se cierra con la X, tocando afuera o deslizando hacia abajo desde la parte de arriba.
export function RutaStopSheet({ stop, onClose, onMark, onShare, onPhoto, protagonist = false, prizeTitle }: {
  stop: RutaStop | null; onClose: () => void; onMark: (s: RutaStop) => void; onShare?: (s: RutaStop) => void;
  // Subir la foto de tu visita (una por local): se ve en "Mi ruta" al tocar la insignia.
  onPhoto?: (s: RutaStop) => void;
  protagonist?: boolean; prizeTitle?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Qué fila está abierta, por local: al abrir otro local empieza todo cerrado.
  const [openRow, setOpenRow] = useState<{ id?: string; row: 'hours' | 'nets' | null }>({ row: null });
  const hoursOpen = openRow.id === stop?.business_id && openRow.row === 'hours';
  const netsOpen = openRow.id === stop?.business_id && openRow.row === 'nets';
  const setHoursOpen = (f: (v: boolean) => boolean) => setOpenRow({ id: stop?.business_id, row: f(hoursOpen) ? 'hours' : null });
  const setNetsOpen = (f: (v: boolean) => boolean) => setOpenRow({ id: stop?.business_id, row: f(netsOpen) ? 'nets' : null });
  const { data: f } = useQuery({
    queryKey: ['ruta-ficha', stop?.business_id],
    enabled: !!stop,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Ficha | null> => {
      const { data } = await supabase.from('businesses')
        .select('description, address, hours_text, opening_hours, cover_url, photos, instagram, facebook, tiktok, website, phone')
        .eq('id', stop!.business_id).maybeSingle();
      return (data as Ficha | null) ?? null;
    },
  });
  const { data: stats } = useRutaStopStats(stop?.business_id);

  // Entrada desde abajo y salida deslizando: y = 0 es la hoja abierta.
  const y = useSharedValue(height);
  const shade = useSharedValue(0);
  const visible = !!stop;
  useEffect(() => {
    if (!visible) return;
    y.set(height);
    y.set(withSpring(0, { damping: 20, stiffness: 190, mass: 0.9 }));
    shade.set(withTiming(1, { duration: 260 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stop?.business_id]);
  function close() {
    shade.set(withTiming(0, { duration: 220 }));
    y.set(withTiming(height, { duration: 240, easing: Easing.in(Easing.cubic) }, (ok) => { if (ok) runOnJS(onClose)(); }));
  }
  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => { y.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        shade.set(withTiming(0, { duration: 200 }));
        y.set(withTiming(height, { duration: 220 }, (ok) => { if (ok) runOnJS(onClose)(); }));
      } else {
        y.set(withSpring(0, { damping: 18, stiffness: 220 }));
      }
    });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value * Math.max(0, 1 - y.value / (height * 0.9)) }));

  if (!stop) return null;
  const cover = f?.cover_url ?? f?.photos?.[0] ?? null;
  const address = f?.address ?? stop.address;
  const visited = stop.visit === 'confirmed';
  const waiting = stop.visit === 'pending';
  const week = f?.opening_hours ?? null;
  const today = todayIndex();
  const todayH = week ? week[String(today)] ?? null : null;
  const hoursValue = week
    ? todayH ? (isOpenNow(todayH) ? `Abierto ahora · hasta ${closesAt(todayH)}` : `Hoy ${rangesText(todayH)}`) : 'Hoy cerrado'
    : f?.hours_text ?? null;
  const open = !!todayH && isOpenNow(todayH);
  const nets = socialsOf(f, stop.name);
  const level = stats?.my_level && stats.my_points > 0 ? stats.my_level : null;
  const next = level ? NEXT[level] : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12,6,24,0.6)' }, shadeStyle]}>
          <Press accessibilityLabel="Cerrar" feedback="none" style={{ flex: 1 }} onPress={close} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: height * 0.9, backgroundColor: SHEET, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }, sheetStyle]}>
          {/* Parte de arriba: se arrastra hacia abajo para cerrar. */}
          <GestureDetector gesture={pan}>
            <View>
              <View style={{ height: cover ? 170 : 92, backgroundColor: '#2F1E5C' }}>
                {cover ? <Image source={{ uri: cover }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} /> : null}
                <LinearGradient pointerEvents="none" colors={['rgba(29,23,41,0.35)', 'rgba(29,23,41,0)', 'rgba(29,23,41,0.65)', SHEET]} locations={[0, 0.3, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ position: 'absolute', alignSelf: 'center', top: 8, width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
                <Press accessibilityRole="button" accessibilityLabel="Cerrar la ficha" onPress={close} hitSlop={10}
                  style={{ position: 'absolute', right: 14, top: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(20,12,36,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={17} color="#fff" />
                </Press>
              </View>
              <View style={{ paddingHorizontal: 20, marginTop: -40, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                <View style={{ width: 76, height: 76, borderRadius: 22, borderWidth: 3, borderColor: protagonist ? GOLD : visited ? MINT : SHEET, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                  ...(protagonist ? { shadowColor: GOLD, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } } : null) }}>
                  {stop.logo_url
                    ? <Image source={{ uri: stop.logo_url }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} />
                    : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 28 }}>{stop.name.trim()[0]?.toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1, paddingBottom: 4 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }} numberOfLines={2}>{stop.name}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {stop.category ? <Pill>{stop.category}</Pill> : null}
                    {week ? <Pill tone={open ? 'mint' : 'muted'}>{open ? 'Abierto' : 'Cerrado ahora'}</Pill> : null}
                    {visited ? <Pill tone="mint">✓ Visitado</Pill> : waiting ? <Pill tone="muted">Por confirmar</Pill> : null}
                  </View>
                </View>
              </View>
            </View>
          </GestureDetector>

          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
            {protagonist ? (
              <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(226,179,60,0.10)', borderWidth: 1, borderColor: 'rgba(226,179,60,0.5)' }}>
                <Coin size={26} gold />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: GOLD, fontWeight: '800', fontSize: 10.5, letterSpacing: 1.2 }}>LOCAL PROTAGONISTA DEL MES</Text>
                  <Text style={{ color: '#fff', fontSize: 13, marginTop: 1 }}>{prizeTitle ? `Regala "${prizeTitle}" para el sorteo de la Ruta.` : 'Regala el premio del sorteo de la Ruta.'}</Text>
                </View>
              </View>
            ) : null}

            {f?.description ? <Text style={{ color: '#E6DEFF', fontSize: 14, lineHeight: 20 }} numberOfLines={4}>{f.description}</Text> : null}

            {/* Lo tuyo en este local (nunca quién más fue): tu nivel y lo que suma tu visita. */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Stat accent={!!level} value={level ?? 'Nuevo'} label={next && stats ? `${stats.my_points} de ${next.at} para ${next.label}` : 'tu nivel aquí'} />
              <Stat value={visited ? '✓' : '+2'} label={visited ? 'tu visita ya sumó' : 'suma tu visita a tu nivel'} />
            </View>

            <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: LINE, paddingHorizontal: 14 }}>
              {address ? (
                <Press accessibilityRole="button" onPress={() => openDirections(stop, address)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
                  <IconBox><MapPin size={16} color={MINT} /></IconBox>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>DIRECCIÓN</Text>
                    <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700', marginTop: 1 }}>{address}</Text>
                  </View>
                </Press>
              ) : null}
              {hoursValue ? (
                week ? (
                  <Expand first={!address} icon={<IconBox><Clock size={16} color={MINT} /></IconBox>} title="HORARIO" value={hoursValue} open={hoursOpen} onToggle={() => setHoursOpen((v) => !v)}>
                    <View style={{ gap: 6 }}>
                      {DAYS.map((name, i) => {
                        const h = week[String(i)] ?? null;
                        const isToday = i === today;
                        return (
                          <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: isToday ? '#fff' : MUTED, fontSize: 13, fontWeight: isToday ? '800' : '500' }}>{name}{isToday ? ' (hoy)' : ''}</Text>
                            <Text style={{ color: h ? (isToday ? MINT : '#fff') : MUTED, fontSize: 13, fontWeight: isToday ? '800' : '500' }}>{h ? rangesText(h) : 'Cerrado'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </Expand>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: address ? 1 : 0, borderTopColor: LINE }}>
                    <IconBox><Clock size={16} color={MINT} /></IconBox>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>HORARIO</Text>
                      <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700', marginTop: 1 }}>{hoursValue}</Text>
                    </View>
                  </View>
                )
              ) : null}
              {nets.length === 1 ? (
                <Press accessibilityRole="link" onPress={() => Linking.openURL(nets[0].url).catch(() => {})}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: LINE }}>
                  <IconBox>{(() => { const I = nets[0].Icon; return <I size={16} color={MINT} />; })()}</IconBox>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{nets[0].label.toUpperCase()}</Text>
                    <Text style={{ color: MINT, fontSize: 14.5, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{nets[0].handle}</Text>
                  </View>
                </Press>
              ) : nets.length > 1 ? (
                <Expand icon={<IconBox><Instagram size={16} color={MINT} /></IconBox>} title="REDES" value={nets.map((n) => n.label).join(' · ')} open={netsOpen} onToggle={() => setNetsOpen((v) => !v)}>
                  <View style={{ gap: 8 }}>
                    {nets.map((n) => (
                      <Press key={n.key} accessibilityRole="link" accessibilityLabel={`${n.label}: ${n.handle}`} onPress={() => Linking.openURL(n.url).catch(() => {})}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                        <n.Icon size={18} color={MINT} />
                        <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700', flex: 1 }} numberOfLines={1}>{n.handle}</Text>
                        <Text style={{ color: MUTED, fontSize: 12 }}>{n.label}</Text>
                      </Press>
                    ))}
                  </View>
                </Expand>
              ) : null}
            </View>

            <Press accessibilityRole="button" onPress={() => openDirections(stop, address)} haptic="light"
              style={{ marginTop: 14, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: MINT }}>
              <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>Cómo llegar caminando</Text>
            </Press>
            {!visited && !waiting ? (
              <Press accessibilityRole="button" onPress={() => onMark(stop)}
                style={{ marginTop: 10, borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.45)' }}>
                <Text style={{ color: MINT, fontWeight: '800', fontSize: 15 }}>Ya estoy aquí: marcar visita</Text>
              </Press>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {onPhoto ? (
                  <Press accessibilityRole="button" onPress={() => onPhoto(stop)}
                    style={{ flex: 1, borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.45)' }}>
                    <Text style={{ color: MINT, fontWeight: '800', fontSize: 14.5 }}>Subir mi foto</Text>
                  </Press>
                ) : null}
                {onShare ? (
                  <Press accessibilityRole="button" onPress={() => onShare(stop)}
                    style={{ flex: 1, borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.45)' }}>
                    <Text style={{ color: MINT, fontWeight: '800', fontSize: 14.5 }}>Compartir</Text>
                  </Press>
                ) : null}
              </View>
            )}
            <Text style={{ color: '#8E82AE', fontSize: 12, textAlign: 'center', marginTop: 10 }}>En la Ruta compras lo que quieras: no se usan Puntos ni descuentos.</Text>
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Pill({ children, tone }: { children: string; tone?: 'mint' | 'muted' }) {
  const bg = tone === 'mint' ? 'rgba(98,240,182,0.15)' : 'rgba(255,255,255,0.08)';
  const fg = tone === 'mint' ? MINT : tone === 'muted' ? MUTED : '#E6DEFF';
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}
