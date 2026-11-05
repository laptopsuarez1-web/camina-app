import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinear, Path, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { useSeason } from '@/hooks/useSeason';
import { localDay } from '@/lib/format';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fecha = (iso: string) => `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]}`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

// Caja de regalo dibujada.
export function GiftIcon({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <SvgLinear id="gift-b" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF6B70" />
          <Stop offset="1" stopColor="#B81D33" />
        </SvgLinear>
        <SvgLinear id="gift-r" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE6A0" />
          <Stop offset="1" stopColor="#E6A532" />
        </SvgLinear>
      </Defs>
      <Rect x={8} y={21} width={32} height={22} rx={4} fill="url(#gift-b)" />
      <Rect x={5} y={15} width={38} height={9} rx={3.5} fill="#FF7A7E" />
      <Rect x={21} y={15} width={6} height={28} fill="url(#gift-r)" />
      <Path d="M24 15 C 18 6 9 8 12 13 C 14 16 20 15.5 24 15 Z" fill="url(#gift-r)" />
      <Path d="M24 15 C 30 6 39 8 36 13 C 34 16 28 15.5 24 15 Z" fill="url(#gift-r)" />
      <Rect x={8} y={24} width={32} height={3} fill="#000" opacity={0.12} />
    </Svg>
  );
}

// "Aguinaldo de Camina": un día doble para todos (el 25 de diciembre). La fecha la pone el servidor.
// Antes del día avisa cuánto falta; el mismo día dice que hoy los pasos valen el doble. Después no se muestra.
export function AguinaldoCard() {
  const { data: season } = useSeason();
  const dd = season?.double_day;
  if (!dd) return null;
  const hoy = localDay();
  const faltan = diasEntre(hoy, dd.day);
  if (faltan < 0) return null;
  const today = dd.today || faltan === 0;
  const per = (POINTS_PER_STEP_UNIT / 2).toLocaleString('es-BO');
  return (
    <View accessible accessibilityLabel={today ? `Hoy es el ${dd.label}: tus pasos valen el doble` : `${dd.label}: el ${fecha(dd.day)} tus pasos valen el doble`}
      className="mx-5 mb-4 rounded-3xl overflow-hidden" style={{ borderWidth: 1, borderColor: 'rgba(255,122,126,0.35)' }}>
      <LinearGradient colors={today ? ['#7A1630', '#3B1450', '#200A52'] : ['#4A1747', '#2A1150', '#200A52']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      <View className="flex-row items-center p-4" style={{ gap: 14 }}>
        <GiftIcon size={50} />
        <View className="flex-1">
          <Text style={{ color: '#FFB3B6', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2 }}>{dd.label.toUpperCase()}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
            {today ? '¡Hoy tus pasos valen el doble!' : `El ${fecha(dd.day)} tus pasos valen el doble`}
          </Text>
          <Text style={{ color: '#E6DBF7', fontSize: 12.5, lineHeight: 17, marginTop: 3 }}>
            Cada {per} pasos, 1 Punto, hasta {DAILY_POINTS_CAP * 2} Puntos {today ? 'hasta medianoche' : 'ese día'}. Es para todos.
          </Text>
        </View>
        <View className="items-center justify-center rounded-2xl" style={{ minWidth: 52, paddingVertical: 8, paddingHorizontal: 8, backgroundColor: today ? '#FFD166' : 'rgba(255,255,255,0.1)' }}>
          {today ? (
            <Text style={{ color: '#3B1450', fontSize: 20, fontWeight: '900' }}>x2</Text>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{faltan}</Text>
              <Text style={{ color: '#E6DBF7', fontSize: 10.5, fontWeight: '700' }}>{faltan === 1 ? 'día' : 'días'}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
