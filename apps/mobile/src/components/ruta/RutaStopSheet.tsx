import { Linking, Modal, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { supabase } from '@/lib/supabase';
import type { RutaStop } from '@/hooks/useRuta';

const MINT = '#62F0B6';
const MUTED = '#C4B8E8';

type Ficha = {
  description: string | null; address: string | null; hours_text: string | null; cover_url: string | null; photos: string[] | null;
  instagram: string | null; phone: string | null;
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

// Ficha del local de la Ruta: foto, qué es, horario y cómo llegar caminando. Sin premios (en la Ruta no se usan Puntos).
export function RutaStopSheet({ stop, onClose, onMark }: { stop: RutaStop | null; onClose: () => void; onMark: (s: RutaStop) => void }) {
  const insets = useSafeAreaInsets();
  const { data: f } = useQuery({
    queryKey: ['ruta-ficha', stop?.business_id],
    enabled: !!stop,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Ficha | null> => {
      const { data } = await supabase.from('businesses')
        .select('description, address, hours_text, cover_url, photos, instagram, phone')
        .eq('id', stop!.business_id).maybeSingle();
      return (data as Ficha | null) ?? null;
    },
  });
  if (!stop) return null;
  const cover = f?.cover_url ?? f?.photos?.[0] ?? null;
  const address = f?.address ?? stop.address;
  const visited = stop.visit === 'confirmed';
  const waiting = stop.visit === 'pending';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" onPress={() => {}} style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '82%', overflow: 'hidden', paddingBottom: insets.bottom + 14 }}>
          <ScrollView bounces={false}>
            <View style={{ height: cover ? 150 : 64, backgroundColor: '#2F1E5C' }}>
              {cover ? <Image source={{ uri: cover }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} /> : null}
              <View style={{ position: 'absolute', alignSelf: 'center', top: 8, width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' }} />
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: -34 }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: '#1d1729', overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {stop.logo_url
                  ? <Image source={{ uri: stop.logo_url }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 26 }}>{stop.name.trim()[0]?.toUpperCase()}</Text>}
              </View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 21, marginTop: 8 }}>{stop.name}</Text>
              {stop.category ? <Text style={{ color: MUTED, fontSize: 13 }}>{stop.category}</Text> : null}
              {visited ? <Text style={{ color: MINT, fontWeight: '800', fontSize: 13, marginTop: 6 }}>✓ Ya lo visitaste</Text>
                : waiting ? <Text style={{ color: MUTED, fontWeight: '800', fontSize: 13, marginTop: 6 }}>Tu visita está por confirmar</Text> : null}
              {f?.description ? <Text style={{ color: '#E6DEFF', fontSize: 14, lineHeight: 20, marginTop: 10 }} numberOfLines={5}>{f.description}</Text> : null}

              <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14 }}>
                {address ? (
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ color: MUTED, fontSize: 11.5, fontWeight: '800', letterSpacing: 1 }}>DIRECCIÓN</Text>
                    <Text style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{address}</Text>
                  </View>
                ) : null}
                {f?.hours_text ? (
                  <View style={{ paddingVertical: 12, borderTopWidth: address ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: MUTED, fontSize: 11.5, fontWeight: '800', letterSpacing: 1 }}>HORARIO</Text>
                    <Text style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{f.hours_text}</Text>
                  </View>
                ) : null}
                {f?.instagram ? (
                  <Press onPress={() => Linking.openURL(`https://instagram.com/${f.instagram!.replace(/^@/, '')}`).catch(() => {})}
                    style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: MUTED, fontSize: 11.5, fontWeight: '800', letterSpacing: 1 }}>INSTAGRAM</Text>
                    <Text style={{ color: MINT, fontSize: 14, fontWeight: '700', marginTop: 2 }}>@{f.instagram.replace(/^@/, '')}</Text>
                  </Press>
                ) : null}
              </View>

              <Press accessibilityRole="button" onPress={() => openDirections(stop, address)} haptic="light"
                style={{ marginTop: 14, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: MINT }}>
                <Text style={{ color: '#14093a', fontWeight: '800', fontSize: 15 }}>Cómo llegar caminando</Text>
              </Press>
              {!visited && !waiting ? (
                <Press accessibilityRole="button" onPress={() => onMark(stop)}
                  style={{ marginTop: 10, borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(98,240,182,0.4)' }}>
                  <Text style={{ color: MINT, fontWeight: '800', fontSize: 15 }}>Ya estoy aquí: marcar visita</Text>
                </Press>
              ) : null}
              <Text style={{ color: '#8E82AE', fontSize: 12, textAlign: 'center', marginTop: 10 }}>En la Ruta compras lo que quieras: no se usan Puntos ni descuentos.</Text>
            </View>
          </ScrollView>
        </Press>
      </Press>
    </Modal>
  );
}
