import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { heavy } from '@/components/ruta/heavy';
import { RutaRing } from '@/components/ruta/RutaRing';
import type { RutaStop } from '@/hooks/useRuta';

const MINT = '#62F0B6';
const MUTED = '#C4B8E8';
// Tamaño de la historia (9:16). Se exporta a 1080 px de ancho.
export const SHARE_SIZE = { width: 360, height: 640 };

// Historia para Instagram/WhatsApp: "Mi Ruta 1/3 · en Bloom". Los locales que todavía no visitaste van con "?"
// (la ruta de cada persona es sorpresa para los demás hasta que la recorre).
export function RutaShareCard({ month, monthShort, stops, at, completed }: {
  month: string; monthShort: string; stops: RutaStop[]; at: RutaStop | null; completed: boolean;
}) {
  const done = stops.filter((s) => s.visit === 'confirmed').length;
  const count = Math.max(done, at && at.visit ? stops.filter((s) => s.visit).length : done);
  return (
    <LinearGradient colors={['#2B1263', '#1A0B40', '#0F0726']} locations={[0, 0.55, 1]} style={{ width: SHARE_SIZE.width, height: SHARE_SIZE.height, alignItems: 'center', paddingTop: 54, paddingHorizontal: 26 }}>
      <View style={{ position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 70, backgroundColor: 'rgba(98,240,182,0.06)' }} />
      <Text style={{ color: MINT, fontWeight: '800', letterSpacing: 2.2, fontSize: 12.5 }}>MI RUTA DE {month.toUpperCase()}</Text>
      <Text style={{ ...heavy(), color: '#fff', fontSize: 74, lineHeight: 84, marginTop: 6 }}>
        {completed ? '3/3' : `${count}/3`}
      </Text>
      <View style={{ marginTop: 6 }}>
        <RutaRing size={150} done={completed ? 3 : count} month={monthShort} />
      </View>
      {at ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {at.logo_url ? <Image source={{ uri: at.logo_url }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#200A52', fontWeight: '900', fontSize: 18 }}>{at.name.trim()[0]?.toUpperCase()}</Text>}
          </View>
          <View>
            <Text style={{ color: MUTED, fontSize: 12, fontWeight: '700' }}>{completed ? 'Completé mi ruta' : 'Hoy pasé por'}</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{at.name}</Text>
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
        {stops.slice(0, 3).map((s) => {
          const seen = !!s.visit;
          return (
            <View key={s.business_id} style={{ alignItems: 'center', width: 76 }}>
              <View style={{ width: 60, height: 60, borderRadius: 16, borderWidth: 2.5, borderColor: s.visit === 'confirmed' ? MINT : 'rgba(255,255,255,0.25)', overflow: 'hidden', backgroundColor: seen ? '#fff' : '#2F1E5C', alignItems: 'center', justifyContent: 'center' }}>
                {seen && s.logo_url ? <Image source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={{ color: seen ? '#200A52' : MINT, fontWeight: '900', fontSize: 24 }}>{seen ? s.name.trim()[0]?.toUpperCase() : '?'}</Text>}
              </View>
              <Text style={{ color: seen ? '#fff' : MUTED, fontSize: 11.5, fontWeight: '700', marginTop: 5 }} numberOfLines={1}>{seen ? s.name : 'Sorpresa'}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ position: 'absolute', bottom: 34, alignItems: 'center' }}>
        <Text style={{ ...heavy(), color: '#fff', fontSize: 22, letterSpacing: 3 }}>CAMINA</Text>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Súmate a la Ruta del mes · caminaapp.com</Text>
      </View>
    </LinearGradient>
  );
}
